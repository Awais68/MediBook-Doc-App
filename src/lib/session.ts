import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized, forbidden } from "@/lib/errors";
import { can, type Permission } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  role: Role;
  doctorId?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw forbidden();
  return user;
}

/** Resolves the Doctor row for the signed-in doctor, verifying they're approved. */
export async function requireDoctor() {
  const user = await requireRole("DOCTOR");
  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.id },
    select: { id: true, verificationStatus: true, slug: true },
  });
  if (!doctor) throw forbidden("No doctor profile is linked to this account.");
  if (doctor.verificationStatus !== "APPROVED") {
    throw forbidden("Your doctor profile is still awaiting verification.");
  }
  return { user, doctor };
}
