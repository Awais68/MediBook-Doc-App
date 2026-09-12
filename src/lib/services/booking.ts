import "server-only";
import { Prisma, type AppointmentStatus, type ConsultationType, type PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { generateCode, formatDateTime, formatPKR } from "@/lib/utils";
import { getAvailability, releaseExpiredHolds } from "@/lib/services/availability";
import { dateKey, addMinutes } from "@/lib/time";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/**
 * Platform commission on online payments, in percent of the consultation fee.
 * Cash collected at the clinic never passes through us, so it carries none.
 */
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 0);

export function platformFeeFor(amount: number, method: PaymentMethod) {
  if (method === "CASH_AT_CLINIC" || amount <= 0) return 0;
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

/** How long an unpaid online booking may sit on a slot before it is released. */
export const UNPAID_BOOKING_TTL_MINUTES = Number(process.env.UNPAID_BOOKING_TTL_MINUTES ?? 20);

/** Statuses that still occupy the doctor's calendar. */
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];

export const TERMINAL_STATUSES: AppointmentStatus[] = [
  "COMPLETED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "NO_SHOW",
  "RESCHEDULED",
];

export type BookInput = {
  patientId: string;
  doctorHospitalId: string;
  startAt: Date;
  consultationType?: ConsultationType;
  reasonForVisit?: string;
  patientNotes?: string;
  familyMemberId?: string | null;
  paymentMethod: PaymentMethod;
  parentAppointmentId?: string | null;
};

/**
 * Re-derives whether `startAt` is a genuinely open slot. Never trust the client's
 * idea of availability — a stale tab or a crafted request must not create a booking
 * outside the doctor's hours.
 */
async function assertSlotIsOffered(doctorHospitalId: string, startAt: Date) {
  const { days } = await getAvailability({
    doctorHospitalId,
    from: startAt,
    days: 1,
  });
  const day = days.find((d) => d.date === dateKey(startAt));
  const slot = day?.sessions
    .flatMap((s) => s.slots)
    .find((s) => new Date(s.startAt).getTime() === startAt.getTime());

  if (!slot) throw invalid("That time is not part of the doctor's schedule.");
  if (!slot.available) {
    throw conflict(
      slot.reason === "past"
        ? "That time has already passed. Please pick a later slot."
        : "Sorry, that slot was just taken. Please choose another.",
    );
  }
  return slot;
}

/**
 * Follow-up pricing: a visit is a discounted follow-up only if the parent
 * appointment is the patient's own COMPLETED visit with the SAME doctor, and
 * we're still inside the location's follow-up window.
 */
async function resolveFee(opts: {
  doctorHospitalId: string;
  patientId: string;
  parentAppointmentId?: string | null;
  consultationType: ConsultationType;
}) {
  const dh = await prisma.doctorHospital.findUnique({
    where: { id: opts.doctorHospitalId },
    select: {
      id: true,
      doctorId: true,
      hospitalId: true,
      consultationFee: true,
      followUpFee: true,
      followUpValidDays: true,
      slotDurationMinutes: true,
      acceptsCashAtClinic: true,
      acceptsOnlinePayment: true,
      isActive: true,
      doctor: { select: { videoConsultFee: true, videoConsultEnabled: true } },
    },
  });
  if (!dh || !dh.isActive) throw notFound("This practice location is not accepting bookings.");

  if (opts.consultationType === "VIDEO") {
    if (!dh.doctor.videoConsultEnabled) throw invalid("This doctor does not offer video consultations.");
    return { dh, fee: dh.doctor.videoConsultFee ?? dh.consultationFee, isFollowUp: false };
  }

  if (!opts.parentAppointmentId) return { dh, fee: dh.consultationFee, isFollowUp: false };

  const parent = await prisma.appointment.findUnique({
    where: { id: opts.parentAppointmentId },
    select: { id: true, patientId: true, doctorId: true, status: true, completedAt: true },
  });
  if (!parent || parent.patientId !== opts.patientId || parent.doctorId !== dh.doctorId) {
    throw invalid("That follow-up reference is not valid for this doctor.");
  }
  if (parent.status !== "COMPLETED" || !parent.completedAt) {
    throw invalid("Follow-up pricing applies only after the first visit is completed.");
  }

  const daysSince = (Date.now() - parent.completedAt.getTime()) / 86_400_000;
  if (daysSince > dh.followUpValidDays) {
    // Window lapsed — book it, but at the full fee, and say so.
    return { dh, fee: dh.consultationFee, isFollowUp: true, windowLapsed: true };
  }
  return { dh, fee: dh.followUpFee, isFollowUp: true };
}

export async function bookAppointment(input: BookInput) {
  const consultationType = input.consultationType ?? "IN_PERSON";
  await releaseExpiredHolds();

  const { dh, fee, isFollowUp } = await resolveFee({
    doctorHospitalId: input.doctorHospitalId,
    patientId: input.patientId,
    parentAppointmentId: input.parentAppointmentId,
    consultationType,
  });

  if (input.paymentMethod === "CASH_AT_CLINIC" && !dh.acceptsCashAtClinic) {
    throw invalid("This clinic requires online payment for bookings.");
  }
  if (input.paymentMethod !== "CASH_AT_CLINIC" && !dh.acceptsOnlinePayment) {
    throw invalid("This clinic only accepts payment at the counter.");
  }

  if (input.familyMemberId) {
    const member = await prisma.familyMember.findUnique({
      where: { id: input.familyMemberId },
      select: { ownerId: true },
    });
    if (!member || member.ownerId !== input.patientId) throw forbidden("Invalid family member.");
  }

  await assertSlotIsOffered(input.doctorHospitalId, input.startAt);

  // Guard against the same patient holding two live bookings with one doctor.
  const duplicate = await prisma.appointment.findFirst({
    where: {
      patientId: input.patientId,
      doctorId: dh.doctorId,
      familyMemberId: input.familyMemberId ?? null,
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { gte: new Date() },
    },
    select: { id: true, code: true, scheduledAt: true },
  });
  if (duplicate) {
    throw conflict(
      `You already have an upcoming appointment (${duplicate.code}) with this doctor on ${formatDateTime(duplicate.scheduledAt)}.`,
    );
  }

  const endAt = addMinutes(input.startAt, dh.slotDurationMinutes);
  const isOnline = input.paymentMethod !== "CASH_AT_CLINIC";

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      // The unique index on (doctorId, startAt) is what actually prevents
      // double-booking — two concurrent requests, one winner, no lock needed.
      const slot = await tx.slot.create({
        data: {
          doctorId: dh.doctorId,
          doctorHospitalId: dh.id,
          startAt: input.startAt,
          endAt,
          status: "BOOKED",
        },
      });

      const created = await tx.appointment.create({
        data: {
          code: generateCode(),
          patientId: input.patientId,
          familyMemberId: input.familyMemberId ?? null,
          doctorId: dh.doctorId,
          doctorHospitalId: dh.id,
          hospitalId: dh.hospitalId,
          slotId: slot.id,
          scheduledAt: input.startAt,
          endAt,
          consultationType,
          status: "PENDING",
          reasonForVisit: input.reasonForVisit,
          patientNotes: input.patientNotes,
          isFollowUp,
          parentAppointmentId: input.parentAppointmentId ?? null,
          fee,
          payment: {
            create: {
              amount: fee,
              platformFee: platformFeeFor(fee, input.paymentMethod),
              method: input.paymentMethod,
              // Online payments start PENDING and are settled by the gateway callback.
              status: fee === 0 ? "PAID" : isOnline ? "PENDING" : "UNPAID",
              provider: isOnline ? (process.env.PAYMENT_PROVIDER ?? "mock") : null,
              paidAt: fee === 0 ? new Date() : null,
            },
          },
        },
        include: {
          doctor: { include: { user: { select: { id: true, name: true } } } },
          hospital: { select: { name: true, city: true } },
        },
      });

      if (input.parentAppointmentId) {
        await tx.consultation.updateMany({
          where: { appointmentId: input.parentAppointmentId },
          data: { followUpBookedId: created.id },
        });
      }

      return created;
    });

    await Promise.allSettled([
      notify({
        userId: input.patientId,
        type: "APPOINTMENT_BOOKED",
        title: `Appointment booked — ${appointment.code}`,
        body: `Dr. ${appointment.doctor.user.name} · ${appointment.hospital.name} · ${formatDateTime(appointment.scheduledAt)} · ${formatPKR(fee)}`,
        actionUrl: `/appointments/${appointment.id}`,
        alsoEmail: true,
        alsoSms: true,
      }),
      notify({
        userId: appointment.doctor.user.id,
        type: "APPOINTMENT_BOOKED",
        title: "New appointment request",
        body: `${formatDateTime(appointment.scheduledAt)} at ${appointment.hospital.name}.`,
        actionUrl: `/doctor/appointments/${appointment.id}`,
      }),
      audit({
        actorId: input.patientId,
        action: "appointment.book",
        entity: "Appointment",
        entityId: appointment.id,
        meta: { fee, isFollowUp, method: input.paymentMethod },
      }),
    ]);

    return appointment;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Sorry, someone just booked that slot. Please pick another time.");
    }
    throw e;
  }
}

export async function cancelAppointment(opts: {
  appointmentId: string;
  actorId: string;
  actorRole: string;
  reason?: string;
}) {
  const appt = await prisma.appointment.findUnique({
    where: { id: opts.appointmentId },
    include: {
      doctor: { select: { userId: true, user: { select: { name: true } } } },
      doctorHospital: { select: { cancellationHours: true } },
      payment: true,
      hospital: { select: { name: true } },
    },
  });
  if (!appt) throw notFound("Appointment not found.");

  const isPatient = appt.patientId === opts.actorId;
  const isTheDoctor = appt.doctor.userId === opts.actorId;
  const isStaff = opts.actorRole === "ADMIN" || opts.actorRole === "HOSPITAL_ADMIN";
  if (!isPatient && !isTheDoctor && !isStaff) throw forbidden();

  if (TERMINAL_STATUSES.includes(appt.status)) {
    throw invalid("This appointment is already closed.");
  }

  const hoursUntil = (appt.scheduledAt.getTime() - Date.now()) / 3_600_000;
  const lateCancel = isPatient && hoursUntil < appt.doctorHospital.cancellationHours && hoursUntil > 0;

  const status = isPatient ? "CANCELLED_BY_PATIENT" : "CANCELLED_BY_DOCTOR";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id: appt.id },
      data: {
        status,
        cancelledAt: new Date(),
        cancelledById: opts.actorId,
        cancellationReason: opts.reason,
      },
    });

    // Free the calendar immediately so the slot can be rebooked.
    await tx.slot.delete({ where: { id: appt.slotId } }).catch(() => undefined);

    if (appt.payment && appt.payment.status === "PAID") {
      await tx.payment.update({
        where: { id: appt.payment.id },
        data: {
          // A late patient cancellation forfeits the fee; everything else is refundable.
          status: lateCancel && !isStaff ? "PAID" : "REFUND_PENDING",
          refundAmount: lateCancel && !isStaff ? 0 : appt.payment.amount,
        },
      });
    }

    return result;
  });

  await Promise.allSettled([
    notify({
      userId: appt.patientId,
      type: "APPOINTMENT_CANCELLED",
      title: `Appointment ${appt.code} cancelled`,
      body: isPatient
        ? `Your visit with Dr. ${appt.doctor.user.name} on ${formatDateTime(appt.scheduledAt)} is cancelled.${lateCancel ? " Cancelled inside the free-cancellation window, so the fee is not refundable." : ""}`
        : `Dr. ${appt.doctor.user.name} cancelled your visit on ${formatDateTime(appt.scheduledAt)}. Any payment will be refunded.`,
      actionUrl: `/appointments/${appt.id}`,
      alsoEmail: true,
      alsoSms: true,
    }),
    notify({
      userId: appt.doctor.userId,
      type: "APPOINTMENT_CANCELLED",
      title: `Appointment ${appt.code} cancelled`,
      body: `${formatDateTime(appt.scheduledAt)} at ${appt.hospital.name} is now free.`,
      actionUrl: `/doctor/appointments`,
    }),
    audit({
      actorId: opts.actorId,
      action: "appointment.cancel",
      entity: "Appointment",
      entityId: appt.id,
      meta: { status, lateCancel, reason: opts.reason },
    }),
  ]);

  return updated;
}

export async function rescheduleAppointment(opts: {
  appointmentId: string;
  actorId: string;
  actorRole: string;
  newStartAt: Date;
  doctorHospitalId?: string;
}) {
  const appt = await prisma.appointment.findUnique({
    where: { id: opts.appointmentId },
    include: { doctor: { select: { userId: true, user: { select: { name: true } } } }, payment: true },
  });
  if (!appt) throw notFound("Appointment not found.");

  const allowed =
    appt.patientId === opts.actorId ||
    appt.doctor.userId === opts.actorId ||
    opts.actorRole === "ADMIN" ||
    opts.actorRole === "HOSPITAL_ADMIN";
  if (!allowed) throw forbidden();
  if (TERMINAL_STATUSES.includes(appt.status)) throw invalid("This appointment is already closed.");

  const targetDhId = opts.doctorHospitalId ?? appt.doctorHospitalId;
  await releaseExpiredHolds();
  await assertSlotIsOffered(targetDhId, opts.newStartAt);

  const dh = await prisma.doctorHospital.findUniqueOrThrow({
    where: { id: targetDhId },
    select: { id: true, doctorId: true, hospitalId: true, slotDurationMinutes: true },
  });
  // A reschedule moves the visit to another location of the SAME doctor — never
  // to a different doctor (that would be a new booking with a new fee).
  if (dh.doctorId !== appt.doctorId) throw invalid("You can only reschedule with the same doctor.");
  const endAt = addMinutes(opts.newStartAt, dh.slotDurationMinutes);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { status: "RESCHEDULED" },
      });
      // The provider reference moves to the new payment row; leaving it on the
      // old one would let a webhook replay settle the stale appointment.
      if (appt.payment?.providerRef) {
        await tx.payment.update({ where: { id: appt.payment.id }, data: { providerRef: null } });
      }
      await tx.slot.delete({ where: { id: appt.slotId } }).catch(() => undefined);

      const slot = await tx.slot.create({
        data: {
          doctorId: dh.doctorId,
          doctorHospitalId: dh.id,
          startAt: opts.newStartAt,
          endAt,
          status: "BOOKED",
        },
      });

      const next = await tx.appointment.create({
        data: {
          code: generateCode(),
          patientId: appt.patientId,
          familyMemberId: appt.familyMemberId,
          doctorId: dh.doctorId,
          doctorHospitalId: dh.id,
          hospitalId: dh.hospitalId,
          slotId: slot.id,
          scheduledAt: opts.newStartAt,
          endAt,
          consultationType: appt.consultationType,
          status: appt.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
          reasonForVisit: appt.reasonForVisit,
          patientNotes: appt.patientNotes,
          isFollowUp: appt.isFollowUp,
          parentAppointmentId: appt.parentAppointmentId,
          fee: appt.fee,
          rescheduledFromId: appt.id,
          payment: appt.payment
            ? {
                create: {
                  amount: appt.payment.amount,
                  method: appt.payment.method,
                  status: appt.payment.status,
                  provider: appt.payment.provider,
                  providerRef: appt.payment.providerRef,
                  paidAt: appt.payment.paidAt,
                },
              }
            : undefined,
        },
      });

      await notify({
        userId: appt.patientId,
        type: "APPOINTMENT_RESCHEDULED",
        title: `Appointment moved to ${formatDateTime(opts.newStartAt)}`,
        body: `Your visit with Dr. ${appt.doctor.user.name} has a new time. New code: ${next.code}.`,
        actionUrl: `/appointments/${next.id}`,
        alsoEmail: true,
        alsoSms: true,
      });

      return next;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("That new time was just taken. Please pick another.");
    }
    throw e;
  }
}

/** Doctor/clinic-side status transitions, with a legal-move table. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED_BY_DOCTOR", "CANCELLED_BY_PATIENT", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED_BY_DOCTOR", "CANCELLED_BY_PATIENT"],
  CHECKED_IN: ["IN_PROGRESS", "COMPLETED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED_BY_PATIENT: [],
  CANCELLED_BY_DOCTOR: [],
  NO_SHOW: [],
  RESCHEDULED: [],
};

export async function transitionAppointment(opts: {
  appointmentId: string;
  actorId: string;
  actorRole: string;
  to: AppointmentStatus;
}) {
  const appt = await prisma.appointment.findUnique({
    where: { id: opts.appointmentId },
    include: { doctor: { select: { userId: true, id: true } } },
  });
  if (!appt) throw notFound("Appointment not found.");

  const isStaff = opts.actorRole === "ADMIN" || opts.actorRole === "HOSPITAL_ADMIN";
  if (appt.doctor.userId !== opts.actorId && !isStaff) throw forbidden();

  if (!TRANSITIONS[appt.status].includes(opts.to)) {
    throw invalid(`Cannot move an appointment from ${appt.status} to ${opts.to}.`);
  }

  const now = new Date();
  const data: Prisma.AppointmentUpdateInput = { status: opts.to };
  if (opts.to === "CHECKED_IN") data.checkedInAt = now;
  if (opts.to === "IN_PROGRESS") data.startedAt = now;
  if (opts.to === "COMPLETED") data.completedAt = now;
  if (opts.to.startsWith("CANCELLED")) {
    data.cancelledAt = now;
    data.cancelledBy = { connect: { id: opts.actorId } };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({ where: { id: appt.id }, data });

    if (opts.to === "COMPLETED") {
      await tx.doctor.update({
        where: { id: appt.doctorId },
        data: { completedVisits: { increment: 1 } },
      });
      // A completed visit owes a clinical record — create the shell so the
      // doctor's notes screen always has somewhere to write.
      await tx.consultation.upsert({
        where: { appointmentId: appt.id },
        update: {},
        create: { appointmentId: appt.id },
      });
    }
    if (opts.to.startsWith("CANCELLED") || opts.to === "NO_SHOW") {
      await tx.slot.delete({ where: { id: appt.slotId } }).catch(() => undefined);
    }
    return result;
  });

  const messages: Partial<Record<AppointmentStatus, { title: string; body: string }>> = {
    CONFIRMED: {
      title: `Appointment ${appt.code} confirmed`,
      body: `Your visit on ${formatDateTime(appt.scheduledAt)} is confirmed.`,
    },
    COMPLETED: {
      title: "How was your visit?",
      body: "Your appointment is complete. Add a review to help other patients.",
    },
    NO_SHOW: {
      title: `Appointment ${appt.code} marked as missed`,
      body: "You did not check in for this appointment.",
    },
  };
  const msg = messages[opts.to];
  if (msg) {
    await notify({
      userId: appt.patientId,
      type: opts.to === "COMPLETED" ? "REVIEW_REQUEST" : "APPOINTMENT_CONFIRMED",
      title: msg.title,
      body: msg.body,
      actionUrl: `/appointments/${appt.id}`,
      alsoEmail: opts.to === "CONFIRMED",
      alsoSms: opts.to === "CONFIRMED",
    });
  }

  await audit({
    actorId: opts.actorId,
    action: `appointment.${opts.to.toLowerCase()}`,
    entity: "Appointment",
    entityId: appt.id,
  });

  return updated;
}

/**
 * An online booking occupies its slot the moment it is created, so an abandoned
 * checkout would block that time forever. This expires those: the appointment is
 * cancelled, the payment is marked failed and the slot is freed for someone else.
 */
export async function expireUnpaidBookings(minutes = UNPAID_BOOKING_TTL_MINUTES) {
  const cutoff = new Date(Date.now() - minutes * 60_000);

  const stale = await prisma.appointment.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      scheduledAt: { gt: new Date() },
      payment: { is: { status: { in: ["PENDING", "FAILED"] }, method: { not: "CASH_AT_CLINIC" } } },
    },
    select: { id: true, code: true, slotId: true, patientId: true, payment: { select: { id: true } } },
  });

  for (const appt of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appt.id },
        data: {
          status: "CANCELLED_BY_PATIENT",
          cancelledAt: new Date(),
          cancellationReason: "Payment not completed in time.",
        },
      });
      if (appt.payment) {
        await tx.payment.update({
          where: { id: appt.payment.id },
          data: { status: "FAILED", failureReason: "Checkout abandoned." },
        });
      }
      await tx.slot.delete({ where: { id: appt.slotId } }).catch(() => undefined);
    });

    await Promise.allSettled([
      notify({
        userId: appt.patientId,
        type: "APPOINTMENT_CANCELLED",
        title: `Booking ${appt.code} released`,
        body: "We couldn't confirm your payment, so the slot has been released. Please book again.",
        actionUrl: "/appointments",
      }),
      audit({
        actorId: appt.patientId,
        action: "appointment.expire_unpaid",
        entity: "Appointment",
        entityId: appt.id,
      }),
    ]);
  }

  return stale.length;
}
