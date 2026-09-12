"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { toActionError, notFound, invalid, type ActionResult } from "@/lib/errors";
import { hospitalSchema, specialtySchema, refundAmountSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { processRefund } from "@/lib/services/payments";

export async function reviewDoctorApplicationAction(
  doctorId: string,
  decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW" | "SUSPENDED",
  reason?: string,
): Promise<ActionResult> {
  try {
    const admin = await requirePermission("doctor.verify");
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, userId: true, slug: true, user: { select: { name: true } } },
    });
    if (!doctor) throw notFound("Doctor not found.");
    if (decision === "REJECTED" && !reason?.trim()) {
      throw invalid("Give a reason so the applicant knows what to fix.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.doctor.update({
        where: { id: doctorId },
        data: {
          verificationStatus: decision,
          verifiedAt: decision === "APPROVED" ? new Date() : null,
          verifiedById: admin.id,
          rejectionReason: decision === "REJECTED" ? reason : null,
          // A suspended doctor disappears from search immediately.
          isAcceptingPatients: decision === "APPROVED",
        },
      });
      // The role is what unlocks the doctor portal.
      await tx.user.update({
        where: { id: doctor.userId },
        data: { role: decision === "APPROVED" ? "DOCTOR" : "PATIENT" },
      });
    });

    await Promise.allSettled([
      notify({
        userId: doctor.userId,
        type: decision === "APPROVED" ? "DOCTOR_APPROVED" : "DOCTOR_REJECTED",
        title:
          decision === "APPROVED"
            ? "You're verified on MediBook"
            : decision === "SUSPENDED"
              ? "Your MediBook profile is suspended"
              : decision === "REJECTED"
                ? "Your application needs changes"
                : "Your application is under review",
        body:
          decision === "APPROVED"
            ? "Set your clinic timings to start receiving bookings."
            : (reason ?? "Our team is reviewing your documents."),
        actionUrl: decision === "APPROVED" ? "/doctor/schedule" : "/apply",
        alsoEmail: true,
      }),
      audit({
        actorId: admin.id,
        action: `doctor.${decision.toLowerCase()}`,
        entity: "Doctor",
        entityId: doctorId,
        meta: { reason },
      }),
    ]);

    revalidatePath("/admin/doctors");
    revalidatePath("/doctors");
    return { ok: true, data: undefined, message: `Application ${decision.toLowerCase()}.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function upsertHospitalAction(raw: unknown, id?: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("hospital.manage");
    const d = hospitalSchema.parse(raw);

    if (id) {
      await prisma.hospital.update({ where: { id }, data: { ...d, email: d.email || null } });
    } else {
      const base = slugify(`${d.name}-${d.city}`);
      let slug = base;
      for (let i = 2; await prisma.hospital.findUnique({ where: { slug }, select: { id: true } }); i++) {
        slug = `${base}-${i}`;
      }
      await prisma.hospital.create({
        data: { ...d, email: d.email || null, slug, isVerified: true },
      });
    }

    await audit({ actorId: admin.id, action: id ? "hospital.update" : "hospital.create", entity: "Hospital", entityId: id });
    revalidatePath("/admin/hospitals");
    revalidatePath("/hospitals");
    return { ok: true, data: undefined, message: "Hospital saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function toggleHospitalAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requirePermission("hospital.manage");
    await prisma.hospital.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/hospitals");
    return { ok: true, data: undefined, message: isActive ? "Hospital activated." : "Hospital deactivated." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function upsertSpecialtyAction(
  raw: { name: string; description?: string; icon?: string; sortOrder?: number },
  id?: string,
): Promise<ActionResult> {
  try {
    await requirePermission("specialty.manage");
    const data = specialtySchema.parse(raw);
    if (id) {
      await prisma.specialty.update({ where: { id }, data });
    } else {
      await prisma.specialty.create({ data: { ...data, slug: slugify(data.name) } });
    }
    revalidatePath("/admin/specialties");
    revalidatePath("/doctors");
    return { ok: true, data: undefined, message: "Specialty saved." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const admin = await requirePermission("user.manage");
    if (admin.id === userId) throw invalid("You cannot deactivate your own account.");

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { isActive } }),
      // Revoke live sessions so a ban takes effect immediately.
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    await audit({
      actorId: admin.id,
      action: isActive ? "user.activate" : "user.deactivate",
      entity: "User",
      entityId: userId,
    });
    revalidatePath("/admin/users");
    return { ok: true, data: undefined, message: isActive ? "User activated." : "User deactivated." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUserRoleAction(
  userId: string,
  role: "PATIENT" | "DOCTOR" | "HOSPITAL_ADMIN" | "ADMIN",
): Promise<ActionResult> {
  try {
    const admin = await requirePermission("user.manage");
    if (admin.id === userId) throw invalid("You cannot change your own role.");
    await prisma.user.update({ where: { id: userId }, data: { role } });
    await audit({ actorId: admin.id, action: "user.role_change", entity: "User", entityId: userId, meta: { role } });
    revalidatePath("/admin/users");
    return { ok: true, data: undefined, message: `Role set to ${role}.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function refundPaymentAction(paymentId: string, amount?: number): Promise<ActionResult> {
  try {
    const admin = await requirePermission("payment.refund");
    await processRefund({ paymentId, actorId: admin.id, amount: refundAmountSchema.parse(amount) });
    revalidatePath("/admin/payments");
    return { ok: true, data: undefined, message: "Refund recorded." };
  } catch (e) {
    return toActionError(e);
  }
}
