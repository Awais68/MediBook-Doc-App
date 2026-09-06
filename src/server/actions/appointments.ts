"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requirePermission } from "@/lib/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { bookingSchema, cancelSchema, rescheduleSchema } from "@/lib/validations";
import {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  transitionAppointment,
} from "@/lib/services/booking";
import { createCheckout, markCashCollected, settlePayment } from "@/lib/services/payments";
import { getAvailability, type DayAvailability } from "@/lib/services/availability";
import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@prisma/client";

export async function bookAppointmentAction(
  raw: unknown,
): Promise<ActionResult<{ appointmentId: string; code: string; checkoutUrl?: string }>> {
  try {
    const user = await requirePermission("appointment.book");
    const input = bookingSchema.parse(raw);

    const appointment = await bookAppointment({
      patientId: user.id,
      doctorHospitalId: input.doctorHospitalId,
      startAt: new Date(input.startAt),
      consultationType: input.consultationType,
      reasonForVisit: input.reasonForVisit,
      patientNotes: input.patientNotes,
      familyMemberId: input.familyMemberId ?? null,
      paymentMethod: input.paymentMethod,
      parentAppointmentId: input.parentAppointmentId ?? null,
    });

    let checkoutUrl: string | undefined;
    if (input.paymentMethod !== "CASH_AT_CLINIC" && appointment.fee > 0) {
      checkoutUrl = (await createCheckout(appointment.id)).url;
    }

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: { appointmentId: appointment.id, code: appointment.code, checkoutUrl },
      message: `Booked — your reference is ${appointment.code}.`,
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelAppointmentAction(raw: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const input = cancelSchema.parse(raw);
    await cancelAppointment({
      appointmentId: input.appointmentId,
      actorId: user.id,
      actorRole: user.role,
      reason: input.reason,
    });
    revalidatePath("/appointments");
    revalidatePath("/doctor/appointments");
    revalidatePath("/admin/appointments");
    return { ok: true, data: undefined, message: "Appointment cancelled." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function rescheduleAppointmentAction(
  raw: unknown,
): Promise<ActionResult<{ appointmentId: string; code: string }>> {
  try {
    const user = await requireUser();
    const input = rescheduleSchema.parse(raw);
    const next = await rescheduleAppointment({
      appointmentId: input.appointmentId,
      actorId: user.id,
      actorRole: user.role,
      newStartAt: new Date(input.startAt),
      doctorHospitalId: input.doctorHospitalId,
    });
    revalidatePath("/appointments");
    revalidatePath("/doctor/appointments");
    return {
      ok: true,
      data: { appointmentId: next.id, code: next.code },
      message: "Appointment rescheduled.",
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function transitionAppointmentAction(
  appointmentId: string,
  to: AppointmentStatus,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("appointment.manage");
    await transitionAppointment({ appointmentId, actorId: user.id, actorRole: user.role, to });
    revalidatePath("/doctor/appointments");
    revalidatePath(`/doctor/appointments/${appointmentId}`);
    revalidatePath("/admin/appointments");
    return { ok: true, data: undefined, message: "Updated." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function markCashCollectedAction(appointmentId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("appointment.manage");
    await markCashCollected({ appointmentId, actorId: user.id });
    revalidatePath(`/doctor/appointments/${appointmentId}`);
    return { ok: true, data: undefined, message: "Payment marked as collected." };
  } catch (e) {
    return toActionError(e);
  }
}

/** Sandbox-only: the mock checkout page calls this to simulate a gateway callback. */
export async function completeMockPaymentAction(
  providerRef: string,
  success: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    if ((process.env.PAYMENT_PROVIDER ?? "mock") !== "mock") {
      return { ok: false, error: "Mock checkout is disabled." };
    }
    await settlePayment({ providerRef, success, failureReason: success ? undefined : "Declined in sandbox" });
    revalidatePath("/appointments");
    return {
      ok: true,
      data: undefined,
      message: success ? "Payment successful." : "Payment failed.",
    };
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * Read-only availability for the booking widget. Public: anyone comparing doctors
 * can see open slots without signing in — the guard is on booking, not on looking.
 */
export async function loadAvailabilityAction(
  doctorHospitalId: string,
  days = 14,
  fromISO?: string,
): Promise<ActionResult<DayAvailability[]>> {
  try {
    const { days: result } = await getAvailability({
      doctorHospitalId,
      days,
      from: fromISO ? new Date(fromISO) : undefined,
    });
    return { ok: true, data: result };
  } catch (e) {
    return toActionError(e);
  }
}

/** Family members the signed-in patient can book on behalf of. */
export async function loadFamilyMembersAction(): Promise<
  ActionResult<{ id: string; name: string; relation: string }[]>
> {
  try {
    const user = await requireUser();
    const members = await prisma.familyMember.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, relation: true },
    });
    return { ok: true, data: members };
  } catch (e) {
    return toActionError(e);
  }
}
