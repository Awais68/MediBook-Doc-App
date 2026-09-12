import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/utils";

/** How often a JWT session is re-checked against the DB for suspension / role changes. */
const SESSION_RECHECK_MS = 5 * 60 * 1000;

/** Loads the fields the session needs, in one query. */
async function loadSessionUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      role: true,
      isActive: true,
      doctor: { select: { id: true } },
    },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,

    // ── Email + password ────────────────────────────────────
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = String(raw?.email ?? "").toLowerCase().trim();
        const password = String(raw?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            role: true,
            passwordHash: true,
            isActive: true,
            doctor: { select: { id: true } },
          },
        });
        // Constant-ish work either way so timing doesn't leak account existence.
        const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali";
        const ok = await bcrypt.compare(password, hash);
        if (!user || !user.passwordHash || !ok || !user.isActive) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone,
          role: user.role,
          doctorId: user.doctor?.id ?? null,
        };
      },
    }),

    // ── Phone OTP ───────────────────────────────────────────
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: { phone: {}, code: {} },
      async authorize(raw) {
        const phone = normalizePhone(String(raw?.phone ?? ""));
        const code = String(raw?.code ?? "");
        if (!phone || !/^\d{6}$/.test(code)) return null;

        await verifyOtp(phone, "LOGIN", code); // throws on bad/expired code

        // OTP login doubles as sign-up: first valid code creates the account.
        const user = await prisma.user.upsert({
          where: { phone },
          update: { phoneVerified: new Date(), lastLoginAt: new Date() },
          create: { phone, phoneVerified: new Date(), role: "PATIENT", lastLoginAt: new Date() },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            role: true,
            isActive: true,
            doctor: { select: { id: true } },
          },
        });
        if (!user.isActive) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone,
          role: user.role,
          doctorId: user.doctor?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role ?? "PATIENT";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.phone = (user as any).phone ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.doctorId = (user as any).doctorId ?? null;
      }
      // Roles change (patient → doctor after approval, or an admin suspension).
      // JWT sessions never touch the DB on their own, so re-read on explicit
      // session.update() AND every few minutes — otherwise a suspended user
      // keeps a working session for up to 30 days.
      const now = Date.now();
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      const stale = now - checkedAt > SESSION_RECHECK_MS;
      if (user) token.checkedAt = now;
      else if (token.id && (trigger === "update" || stale)) {
        const fresh = await loadSessionUser(token.id);
        if (!fresh || !fresh.isActive) return null; // invalidates the session cookie
        token.role = fresh.role;
        token.name = fresh.name;
        token.picture = fresh.image;
        token.phone = fresh.phone;
        token.doctorId = fresh.doctor?.id ?? null;
        token.checkedAt = now;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.patientProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    },
  },
});
