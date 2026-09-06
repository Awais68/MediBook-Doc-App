import "server-only";
import { prisma } from "@/lib/prisma";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/**
 * Recomputes a doctor's cached rating aggregates. Called after every review
 * write so `Doctor.avgRating` stays truthful without a nightly job.
 */
export async function recomputeDoctorRating(doctorId: string) {
  const agg = await prisma.review.aggregate({
    where: { doctorId, status: "PUBLISHED" },
    _avg: { rating: true, bedsideManner: true, waitTimeScore: true, explanation: true },
    _count: { _all: true },
  });

  const subScores = [
    agg._avg.bedsideManner,
    agg._avg.waitTimeScore,
    agg._avg.explanation,
  ].filter((v): v is number => v !== null);

  const satisfaction = subScores.length
    ? Math.round((subScores.reduce((a, b) => a + b, 0) / subScores.length / 5) * 100)
    : 0;

  await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      avgRating: Number((agg._avg.rating ?? 0).toFixed(2)),
      reviewCount: agg._count._all,
      satisfactionScore: satisfaction,
    },
  });
}

/**
 * Verified-visit reviews only: the patient must own a COMPLETED appointment,
 * and each appointment yields at most one review. That single rule is what
 * separates a trustworthy rating from a spam magnet.
 */
export async function createReview(input: {
  appointmentId: string;
  patientId: string;
  rating: number;
  bedsideManner?: number;
  waitTimeScore?: number;
  explanation?: number;
  cleanliness?: number;
  title?: string;
  comment?: string;
  isAnonymous?: boolean;
}) {
  const appt = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      hospitalId: true,
      status: true,
      completedAt: true,
      review: { select: { id: true } },
      doctor: { select: { userId: true, user: { select: { name: true } } } },
    },
  });

  if (!appt) throw notFound("Appointment not found.");
  if (appt.patientId !== input.patientId) throw forbidden("You can only review your own visits.");
  if (appt.status !== "COMPLETED") throw invalid("You can review a visit once it's completed.");
  if (appt.review) throw conflict("You've already reviewed this visit.");
  if (input.rating < 1 || input.rating > 5) throw invalid("Rating must be between 1 and 5.");

  const review = await prisma.review.create({
    data: {
      appointmentId: appt.id,
      patientId: input.patientId,
      doctorId: appt.doctorId,
      hospitalId: appt.hospitalId,
      rating: input.rating,
      bedsideManner: input.bedsideManner,
      waitTimeScore: input.waitTimeScore,
      explanation: input.explanation,
      cleanliness: input.cleanliness,
      title: input.title,
      comment: input.comment,
      isAnonymous: input.isAnonymous ?? false,
      status: "PUBLISHED",
    },
  });

  await recomputeDoctorRating(appt.doctorId);
  await Promise.allSettled([
    notify({
      userId: appt.doctor.userId,
      type: "SYSTEM",
      title: `New ${input.rating}-star review`,
      body: input.comment?.slice(0, 140) ?? "A patient rated their visit.",
      actionUrl: "/doctor/reviews",
    }),
    audit({
      actorId: input.patientId,
      action: "review.create",
      entity: "Review",
      entityId: review.id,
      meta: { rating: input.rating },
    }),
  ]);

  return review;
}

export async function replyToReview(opts: { reviewId: string; doctorUserId: string; reply: string }) {
  const review = await prisma.review.findUnique({
    where: { id: opts.reviewId },
    select: { id: true, doctorId: true, patientId: true, doctor: { select: { userId: true } } },
  });
  if (!review) throw notFound("Review not found.");
  if (review.doctor.userId !== opts.doctorUserId) throw forbidden();

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { doctorReply: opts.reply.trim(), doctorRepliedAt: new Date() },
  });

  await notify({
    userId: review.patientId,
    type: "SYSTEM",
    title: "Your doctor replied to your review",
    body: opts.reply.slice(0, 140),
    actionUrl: "/appointments",
  });

  return updated;
}

export async function moderateReview(opts: {
  reviewId: string;
  adminId: string;
  status: "PUBLISHED" | "REJECTED";
  note?: string;
}) {
  const review = await prisma.review.update({
    where: { id: opts.reviewId },
    data: { status: opts.status, moderationNote: opts.note },
    select: { id: true, doctorId: true },
  });
  await recomputeDoctorRating(review.doctorId);
  await audit({
    actorId: opts.adminId,
    action: "review.moderate",
    entity: "Review",
    entityId: review.id,
    meta: { status: opts.status },
  });
  return review;
}

/** Completed visits the patient hasn't reviewed yet — powers the "rate your visit" nudge. */
export async function pendingReviews(patientId: string) {
  return prisma.appointment.findMany({
    where: { patientId, status: "COMPLETED", review: null },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: {
      id: true,
      code: true,
      scheduledAt: true,
      doctor: { select: { slug: true, user: { select: { name: true, image: true } } } },
      hospital: { select: { name: true } },
    },
  });
}
