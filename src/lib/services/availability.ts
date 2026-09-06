import "server-only";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import {
  dateKey,
  zonedDateTime,
  timeToMinutes,
  minutesToTime,
  addMinutes,
  addDays,
  localDayOfWeek,
} from "@/lib/time";
import type { ConsultationType } from "@prisma/client";

export type SlotView = {
  startAt: string; // ISO UTC
  endAt: string;
  time: string; // "09:15" clinic-local
  consultationType: ConsultationType;
  available: boolean;
  reason?: "booked" | "past" | "blocked" | "full";
};

export type DayAvailability = {
  date: string; // yyyy-MM-dd, clinic-local
  dayOfWeek: number;
  isOpen: boolean;
  totalSlots: number;
  availableCount: number;
  sessions: { label: string; slots: SlotView[] }[];
};

/** "09:00"–"13:00" → "Morning" so the UI can group slots the way a clinic thinks. */
function sessionLabel(startMinutes: number) {
  if (startMinutes < 12 * 60) return "Morning";
  if (startMinutes < 17 * 60) return "Afternoon";
  return "Evening";
}

/**
 * Computes bookable slots for a doctor at one hospital across a date range.
 *
 * Availability is DERIVED (schedule − exceptions − reservations) rather than
 * pre-materialised, so adding a doctor never writes thousands of rows and
 * changing a schedule takes effect instantly.
 *
 * Reservations are checked per DOCTOR (not per hospital) so a doctor can never
 * be double-booked across two locations at the same instant.
 */
export async function getAvailability(opts: {
  doctorHospitalId: string;
  days?: number;
  from?: Date;
}): Promise<{ days: DayAvailability[]; doctorHospitalId: string }> {
  const { doctorHospitalId } = opts;
  const from = opts.from ?? new Date();

  const dh = await prisma.doctorHospital.findUnique({
    where: { id: doctorHospitalId },
    select: {
      id: true,
      doctorId: true,
      isActive: true,
      slotDurationMinutes: true,
      bookingWindowDays: true,
      minAdvanceMinutes: true,
      schedules: { where: { isActive: true } },
      doctor: { select: { isAcceptingPatients: true, verificationStatus: true } },
    },
  });
  if (!dh) throw notFound("This practice location no longer exists.");

  const days = Math.min(opts.days ?? 14, dh.bookingWindowDays);
  const rangeStart = zonedDateTime(dateKey(from), "00:00");
  const rangeEnd = addDays(rangeStart, days + 1);

  const bookable =
    dh.isActive &&
    dh.doctor.isAcceptingPatients &&
    dh.doctor.verificationStatus === "APPROVED";

  const [exceptions, reservations] = await Promise.all([
    prisma.scheduleException.findMany({
      where: {
        doctorId: dh.doctorId,
        date: { gte: rangeStart, lt: rangeEnd },
        OR: [{ doctorHospitalId: null }, { doctorHospitalId }],
      },
    }),
    prisma.slot.findMany({
      where: {
        doctorId: dh.doctorId,
        startAt: { gte: rangeStart, lt: rangeEnd },
        OR: [
          { status: { in: ["BOOKED", "BLOCKED"] } },
          { status: "HELD", holdExpiresAt: { gt: new Date() } },
        ],
      },
      select: { startAt: true, status: true },
    }),
  ]);

  const taken = new Map(reservations.map((r) => [r.startAt.getTime(), r.status]));
  const now = Date.now();
  const earliest = now + dh.minAdvanceMinutes * 60 * 1000;

  const result: DayAvailability[] = [];

  for (let i = 0; i < days; i++) {
    const dayDate = addDays(rangeStart, i);
    const key = dateKey(dayDate);
    const dow = localDayOfWeek(dayDate);
    const daySchedules = dh.schedules.filter((s) => s.dayOfWeek === dow);

    const dayExceptions = exceptions.filter((e) => dateKey(e.date) === key);
    const fullDayOff = dayExceptions.some((e) => e.isFullDay);

    const sessions: { label: string; slots: SlotView[] }[] = [];
    let total = 0;
    let available = 0;

    if (bookable && !fullDayOff) {
      for (const schedule of daySchedules) {
        const step = schedule.slotDurationMinutes ?? dh.slotDurationMinutes;
        const startMin = timeToMinutes(schedule.startTime);
        const endMin = timeToMinutes(schedule.endTime);
        if (endMin <= startMin || step <= 0) continue;

        const capacity = schedule.maxPatients ?? Infinity;
        const slots: SlotView[] = [];
        let issued = 0;

        for (let m = startMin; m + step <= endMin; m += step) {
          const hhmm = minutesToTime(m);
          const startAt = zonedDateTime(key, hhmm);
          const endAt = addMinutes(startAt, step);

          let reason: SlotView["reason"];
          const status = taken.get(startAt.getTime());
          if (status === "BLOCKED") reason = "blocked";
          else if (status) reason = "booked";
          else if (startAt.getTime() < earliest) reason = "past";
          else if (issued >= capacity) reason = "full";
          else if (
            dayExceptions.some(
              (e) =>
                !e.isFullDay &&
                e.startTime &&
                e.endTime &&
                m >= timeToMinutes(e.startTime) &&
                m < timeToMinutes(e.endTime),
            )
          )
            reason = "blocked";

          const isFree = !reason;
          if (isFree) issued++;
          total++;
          if (isFree) available++;

          slots.push({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            time: hhmm,
            consultationType: schedule.consultationType,
            available: isFree,
            reason,
          });
        }

        if (slots.length) {
          const label = sessionLabel(startMin);
          const existing = sessions.find((s) => s.label === label);
          if (existing) existing.slots.push(...slots);
          else sessions.push({ label, slots });
        }
      }
    }

    result.push({
      date: key,
      dayOfWeek: dow,
      isOpen: sessions.length > 0,
      totalSlots: total,
      availableCount: available,
      sessions,
    });
  }

  return { days: result, doctorHospitalId };
}

/** Earliest bookable slot across every location a doctor practises at. */
export async function getNextAvailable(doctorId: string, withinDays = 14) {
  const locations = await prisma.doctorHospital.findMany({
    where: { doctorId, isActive: true },
    select: { id: true, hospital: { select: { name: true, city: true } }, consultationFee: true },
  });

  let best: {
    startAt: string;
    doctorHospitalId: string;
    hospitalName: string;
    city: string;
    fee: number;
  } | null = null;

  for (const loc of locations) {
    const { days } = await getAvailability({ doctorHospitalId: loc.id, days: withinDays });
    for (const day of days) {
      const slot = day.sessions.flatMap((s) => s.slots).find((s) => s.available);
      if (slot && (!best || slot.startAt < best.startAt)) {
        best = {
          startAt: slot.startAt,
          doctorHospitalId: loc.id,
          hospitalName: loc.hospital.name,
          city: loc.hospital.city,
          fee: loc.consultationFee,
        };
      }
      if (slot) break; // days are ordered; first hit for this location is its earliest
    }
  }

  return best;
}

/** Removes expired checkout holds. Called by the cron endpoint and before booking. */
export async function releaseExpiredHolds() {
  const { count } = await prisma.slot.deleteMany({
    where: { status: "HELD", holdExpiresAt: { lt: new Date() } },
  });
  return count;
}
