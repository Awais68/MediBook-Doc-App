"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toActionError, forbidden, type ActionResult } from "@/lib/errors";
import { patientProfileSchema, familyMemberSchema, medicalRecordSchema, shareDaysSchema } from "@/lib/validations";
import { shareRecordWithDoctor, revokeRecordShare } from "@/lib/services/records";

export async function updatePatientProfileAction(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = patientProfileSchema.parse(raw);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: d.name,
          gender: d.gender,
          city: d.city || null,
          dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
        },
      }),
      prisma.patientProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          cnic: d.cnic || null,
          bloodGroup: d.bloodGroup || null,
          heightCm: d.heightCm,
          weightKg: d.weightKg,
          allergies: d.allergies,
          chronicConditions: d.chronicConditions,
          currentMedications: d.currentMedications,
          emergencyContactName: d.emergencyContactName || null,
          emergencyContactPhone: d.emergencyContactPhone || null,
          address: d.address || null,
        },
        update: {
          cnic: d.cnic || null,
          bloodGroup: d.bloodGroup || null,
          heightCm: d.heightCm,
          weightKg: d.weightKg,
          allergies: d.allergies,
          chronicConditions: d.chronicConditions,
          currentMedications: d.currentMedications,
          emergencyContactName: d.emergencyContactName || null,
          emergencyContactPhone: d.emergencyContactPhone || null,
          address: d.address || null,
        },
      }),
    ]);

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined, message: "Profile saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function addFamilyMemberAction(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = familyMemberSchema.parse(raw);
    await prisma.familyMember.create({
      data: {
        ownerId: user.id,
        name: d.name,
        relation: d.relation,
        gender: d.gender,
        dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
        phone: d.phone || null,
        bloodGroup: d.bloodGroup || null,
      },
    });
    revalidatePath("/family");
    return { ok: true, data: undefined, message: "Family member added." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteFamilyMemberAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const member = await prisma.familyMember.findUnique({ where: { id }, select: { ownerId: true } });
    if (!member || member.ownerId !== user.id) throw forbidden();
    await prisma.familyMember.delete({ where: { id } });
    revalidatePath("/family");
    return { ok: true, data: undefined, message: "Removed." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function addMedicalRecordAction(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = medicalRecordSchema.parse(raw);
    await prisma.medicalRecord.create({
      data: {
        patientId: user.id,
        uploadedById: user.id,
        title: d.title,
        type: d.type,
        notes: d.notes,
        fileUrl: d.fileUrl || null,
        fileName: d.fileName,
        recordDate: new Date(d.recordDate),
      },
    });
    revalidatePath("/records");
    return { ok: true, data: undefined, message: "Record added." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteMedicalRecordAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const record = await prisma.medicalRecord.findUnique({ where: { id }, select: { patientId: true } });
    if (!record || record.patientId !== user.id) throw forbidden();
    await prisma.medicalRecord.delete({ where: { id } });
    revalidatePath("/records");
    return { ok: true, data: undefined, message: "Record deleted." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function shareRecordAction(recordId: string, doctorId: string, days?: number) {
  try {
    const user = await requireUser();
    await shareRecordWithDoctor({ recordId, patientId: user.id, doctorId, expiresInDays: shareDaysSchema.parse(days) });
    revalidatePath("/records");
    return { ok: true as const, data: undefined, message: "Shared with your doctor." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function revokeShareAction(recordId: string, doctorId: string) {
  try {
    const user = await requireUser();
    await revokeRecordShare({ recordId, doctorId, patientId: user.id });
    revalidatePath("/records");
    return { ok: true as const, data: undefined, message: "Access revoked." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function toggleFavoriteAction(doctorId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const user = await requireUser();
    const existing = await prisma.favorite.findUnique({
      where: { userId_doctorId: { userId: user.id, doctorId } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { userId_doctorId: { userId: user.id, doctorId } } });
      revalidatePath("/dashboard");
      return { ok: true, data: { favorited: false } };
    }
    await prisma.favorite.create({ data: { userId: user.id, doctorId } });
    revalidatePath("/dashboard");
    return { ok: true, data: { favorited: true } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    revalidatePath("/notifications");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}
