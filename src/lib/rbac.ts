import type { Role } from "@prisma/client";

/**
 * Central permission table. Every server action / route handler asks *this*,
 * never re-implements a role check inline.
 */
export const PERMISSIONS = {
  "appointment.book": ["PATIENT", "ADMIN", "HOSPITAL_ADMIN"],
  "appointment.cancel.own": ["PATIENT", "DOCTOR", "ADMIN", "HOSPITAL_ADMIN"],
  "appointment.manage": ["DOCTOR", "ADMIN", "HOSPITAL_ADMIN"],
  "consultation.write": ["DOCTOR"],
  "prescription.write": ["DOCTOR"],
  "records.upload": ["PATIENT", "DOCTOR", "ADMIN"],
  "records.readOthers": ["DOCTOR", "ADMIN"],
  "review.write": ["PATIENT"],
  "review.reply": ["DOCTOR"],
  "review.moderate": ["ADMIN"],
  "doctor.verify": ["ADMIN"],
  "hospital.manage": ["ADMIN", "HOSPITAL_ADMIN"],
  "specialty.manage": ["ADMIN"],
  "user.manage": ["ADMIN"],
  "analytics.platform": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const isAdmin = (role?: Role | null) => role === "ADMIN";
export const isDoctor = (role?: Role | null) => role === "DOCTOR";
export const isPatient = (role?: Role | null) => role === "PATIENT";
