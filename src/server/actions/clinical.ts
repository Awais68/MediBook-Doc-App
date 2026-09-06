"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDoctor, requireUser, requirePermission } from "@/lib/session";
import { toActionError, forbidden, type ActionResult } from "@/lib/errors";
import { consultationSchema, reviewSchema } from "@/lib/validations";
import { saveConsultation } from "@/lib/services/consultation";
import { createReview, replyToReview, moderateReview } from "@/lib/services/reviews";

export async function saveConsultationAction(raw: unknown): Promise<ActionResult> {
  try {
    const { user } = await requireDoctor();
    const input = consultationSchema.parse(raw);
    await saveConsultation({
      ...input,
      bloodPressure: input.bloodPressure || undefined,
      doctorUserId: user.id,
    });
    revalidatePath(`/doctor/appointments/${input.appointmentId}`);
    revalidatePath("/doctor/appointments");
    return {
      ok: true,
      data: undefined,
      message: input.markCompleted ? "Visit completed and notes saved." : "Notes saved.",
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function createReviewAction(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("review.write");
    const input = reviewSchema.parse(raw);
    await createReview({ ...input, patientId: user.id });
    revalidatePath("/appointments");
    revalidatePath("/doctors");
    return { ok: true, data: undefined, message: "Thanks — your review is live." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function replyToReviewAction(reviewId: string, reply: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("review.reply");
    await replyToReview({ reviewId, doctorUserId: user.id, reply });
    revalidatePath("/doctor/reviews");
    return { ok: true, data: undefined, message: "Reply posted." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function moderateReviewAction(
  reviewId: string,
  status: "PUBLISHED" | "REJECTED",
  note?: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("review.moderate");
    await moderateReview({ reviewId, adminId: user.id, status, note });
    revalidatePath("/admin/reviews");
    return { ok: true, data: undefined, message: `Review ${status.toLowerCase()}.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function markHelpfulAction(reviewId: string): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } });
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateLabResultAction(
  labOrderId: string,
  data: { status?: "ORDERED" | "SAMPLE_COLLECTED" | "RESULT_READY" | "CANCELLED"; resultText?: string },
): Promise<ActionResult> {
  try {
    const { doctor } = await requireDoctor();
    const order = await prisma.labOrder.findUnique({
      where: { id: labOrderId },
      select: { consultation: { select: { appointment: { select: { doctorId: true, id: true } } } } },
    });
    if (!order || order.consultation.appointment.doctorId !== doctor.id) throw forbidden();

    await prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        ...data,
        reportedAt: data.status === "RESULT_READY" ? new Date() : undefined,
      },
    });
    revalidatePath(`/doctor/appointments/${order.consultation.appointment.id}`);
    return { ok: true, data: undefined, message: "Lab order updated." };
  } catch (e) {
    return toActionError(e);
  }
}
