import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/providers/sms";
import { sendEmail, emailLayout } from "@/lib/providers/email";
import { rateLimited, invalid } from "@/lib/errors";
import type { OtpPurpose } from "@prisma/client";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_PER_HOUR = 5;

function randomCode() {
  // 6 digits, uniformly distributed, crypto-grade.
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
}

/**
 * Issues a hashed OTP and delivers it. Rate limited per identifier so an attacker
 * can't burn a victim's SMS quota or brute-force a code.
 */
export async function issueOtp(opts: {
  identifier: string;
  purpose: OtpPurpose;
  channel: "sms" | "email";
  ip?: string;
}) {
  const { identifier, purpose, channel, ip } = opts;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [recentCount, lastCode] = await Promise.all([
    prisma.otpCode.count({ where: { identifier, purpose, createdAt: { gte: hourAgo } } }),
    prisma.otpCode.findFirst({
      where: { identifier, purpose },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (recentCount >= MAX_PER_HOUR) throw rateLimited("Too many codes requested. Try again in an hour.");
  if (lastCode && Date.now() - lastCode.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - lastCode.createdAt.getTime())) / 1000,
    );
    throw rateLimited(`Please wait ${wait}s before requesting another code.`);
  }

  const code = randomCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate any outstanding codes for this identifier+purpose.
  await prisma.otpCode.updateMany({
    where: { identifier, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otpCode.create({
    data: { identifier, purpose, codeHash: await bcrypt.hash(code, 10), expiresAt, ip },
  });

  const message = `${code} is your MediBook verification code. It expires in ${OTP_TTL_MINUTES} minutes. Never share this code.`;
  if (channel === "sms") {
    await sendSms({ to: identifier, body: message });
  } else {
    await sendEmail({
      to: identifier,
      subject: `${code} — your MediBook code`,
      html: emailLayout(
        "Your verification code",
        `<p>Use this code to continue:</p><p style="font-size:30px;letter-spacing:7px;font-weight:700;color:#101828">${code}</p><p>It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
      ),
      text: message,
    });
  }

  return { expiresAt, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

/** Consumes an OTP. Returns true only once per code. */
export async function verifyOtp(identifier: string, purpose: OtpPurpose, code: string) {
  const record = await prisma.otpCode.findFirst({
    where: { identifier, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw invalid("This code has expired. Please request a new one.");
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    throw rateLimited("Too many wrong attempts. Request a new code.");
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw invalid(`Incorrect code. ${MAX_ATTEMPTS - record.attempts - 1} attempts left.`);
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return true;
}
