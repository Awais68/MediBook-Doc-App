import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      doctorId?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    doctorId?: string | null;
    phone?: string | null;
    /** Last time the token was re-validated against the users table (ms epoch). */
    checkedAt?: number;
  }
}
