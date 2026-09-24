import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe half of the auth config. It must not import Prisma, bcrypt, or any
 * Node-only module, because `proxy.ts` builds a NextAuth instance from it.
 */

/** Route prefix → roles allowed. First match wins. */
const ROUTE_GUARDS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN", "HOSPITAL_ADMIN"] },
  // "/doctors" (public listing) does not match this — guardFor requires an
  // exact hit or a "/doctor/" prefix.
  { prefix: "/doctor", roles: ["DOCTOR"] },
  { prefix: "/dashboard", roles: ["PATIENT", "DOCTOR", "ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/appointments", roles: ["PATIENT", "DOCTOR", "ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/records", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/prescriptions", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/family", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/book", roles: ["PATIENT", "ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/checkout", roles: ["PATIENT", "ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/settings", roles: ["PATIENT", "DOCTOR", "ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/apply", roles: ["PATIENT", "DOCTOR", "ADMIN"] },
  { prefix: "/onboarding", roles: ["PATIENT", "DOCTOR", "ADMIN", "HOSPITAL_ADMIN"] },
];

export function guardFor(pathname: string) {
  return ROUTE_GUARDS.find((g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`));
}

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login", error: "/login", newUser: "/onboarding" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Registration does not verify email ownership, so auto-linking a Google
      // login to an existing email would let anyone take over a password account
      // by registering its address first. The login form explains
      // OAuthAccountNotLinked to the user instead.
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role ?? "PATIENT";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.phone = (user as any).phone ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.doctorId = (user as any).doctorId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone ?? null;
        session.user.doctorId = token.doctorId ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
