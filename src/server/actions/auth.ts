"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { conflict, invalid, toActionError, type ActionResult } from "@/lib/errors";
import {
  registerSchema,
  requestOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/providers/email";

export async function registerAction(
  raw: unknown,
): Promise<ActionResult<{ email: string }>> {
  try {
    const data = registerSchema.parse(raw);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])] },
      select: { id: true, email: true },
    });
    if (existing) {
      throw conflict(
        existing.email === data.email
          ? "An account with this email already exists. Try signing in."
          : "An account with this phone number already exists.",
      );
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: "PATIENT",
        patientProfile: { create: {} },
      },
      select: { id: true, email: true },
    });

    await Promise.allSettled([
      sendEmail({
        to: data.email,
        subject: "Welcome to MediBook",
        html: emailLayout(
          `Welcome, ${data.name.split(" ")[0]}`,
          "<p>Your MediBook account is ready. Find a doctor, check real availability, and book in under a minute.</p>",
          { label: "Find a doctor", url: `${process.env.NEXT_PUBLIC_APP_URL}/doctors` },
        ),
      }),
      audit({ actorId: user.id, action: "user.register", entity: "User", entityId: user.id }),
    ]);

    return { ok: true, data: { email: user.email! }, message: "Account created. You can sign in now." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function requestLoginOtpAction(
  raw: unknown,
): Promise<ActionResult<{ phone: string; devCode?: string }>> {
  try {
    const { phone } = requestOtpSchema.parse(raw);
    const { devCode } = await issueOtp({ identifier: phone, purpose: "LOGIN", channel: "sms" });
    return {
      ok: true,
      data: { phone, devCode },
      message: `We sent a 6-digit code to ${phone}.`,
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function forgotPasswordAction(raw: unknown): Promise<ActionResult<{ email: string }>> {
  try {
    const { email } = forgotPasswordSchema.parse(raw);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    // Always report success — never confirm whether an email is registered.
    if (user) {
      await issueOtp({ identifier: email, purpose: "PASSWORD_RESET", channel: "email" });
    }
    return {
      ok: true,
      data: { email },
      message: "If that email is registered, a reset code is on its way.",
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetPasswordAction(raw: unknown): Promise<ActionResult> {
  try {
    const data = resetPasswordSchema.parse(raw);
    await verifyOtp(data.email, "PASSWORD_RESET", data.code);

    const user = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (!user) throw invalid("We couldn't reset that account.");

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(data.password, 12) },
    });
    // Kill every live session so a stolen cookie can't outlive the reset.
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await audit({ actorId: user.id, action: "user.password_reset", entity: "User", entityId: user.id });

    return { ok: true, data: undefined, message: "Password updated. Please sign in." };
  } catch (e) {
    return toActionError(e);
  }
}
