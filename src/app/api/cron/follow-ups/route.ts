import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDueFollowUps } from "@/lib/services/consultation";
import { notify } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";
import { assertCron } from "../_guard";

export const dynamic = "force-dynamic";

/**
 * Nudges patients whose doctor asked them to come back and who have not
 * booked the follow-up yet. Run once a day.
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const due = await getDueFollowUps(2);
  let sent = 0;

  for (const c of due) {
    const appt = c.appointment;
    if (!appt || !c.followUpDate) continue;

    // Don't nudge twice: skip if a follow-up notification already exists for this consultation.
    const already = await prisma.notification.findFirst({
      where: { userId: appt.patientId, type: "FOLLOW_UP_DUE", data: { path: ["consultationId"], equals: c.id } },
      select: { id: true },
    });
    if (already) continue;

    await notify({
      userId: appt.patientId,
      type: "FOLLOW_UP_DUE",
      title: "Follow-up due",
      body: `${appt.doctor.user.name} advised a follow-up around ${formatDate(c.followUpDate)}${c.followUpReason ? ` — ${c.followUpReason}` : ""}.`,
      actionUrl: `/book/${appt.doctor.slug}?followUp=${appt.id}`,
      data: { consultationId: c.id, appointmentId: appt.id },
      alsoSms: true,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, candidates: due.length, notified: sent });
}
