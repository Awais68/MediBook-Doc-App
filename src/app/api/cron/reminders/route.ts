import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { formatDateTime } from "@/lib/utils";
import { assertCron } from "../_guard";

export const dynamic = "force-dynamic";

/**
 * Sends a reminder for every confirmed appointment starting in the next 24 hours
 * that hasn't been reminded yet. Run hourly.
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const due = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: now, lte: horizon },
      reminderSentAt: null,
    },
    select: {
      id: true,
      code: true,
      patientId: true,
      scheduledAt: true,
      doctor: { select: { user: { select: { name: true } } } },
      hospital: { select: { name: true } },
    },
    take: 200,
  });

  for (const appt of due) {
    await notify({
      userId: appt.patientId,
      type: "APPOINTMENT_REMINDER",
      title: "Appointment reminder",
      body: `${appt.doctor.user.name} — ${formatDateTime(appt.scheduledAt)} at ${appt.hospital.name}. Booking ${appt.code}.`,
      actionUrl: `/appointments/${appt.id}`,
      alsoSms: true,
      alsoEmail: true,
    });
    await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, reminded: due.length });
}
