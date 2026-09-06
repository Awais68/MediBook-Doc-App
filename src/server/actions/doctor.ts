"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireDoctor } from "@/lib/session";
import { toActionError, conflict, invalid, forbidden, type ActionResult } from "@/lib/errors";
import { doctorApplicationSchema, scheduleSchema, timeOffSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { timeToMinutes, zonedDateTime } from "@/lib/time";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

/** Doctor onboarding: creates the profile in PENDING and waits for admin verification. */
export async function applyAsDoctorAction(raw: unknown): Promise<ActionResult<{ slug: string }>> {
  try {
    const user = await requireUser();
    const d = doctorApplicationSchema.parse(raw);

    const existing = await prisma.doctor.findUnique({
      where: { userId: user.id },
      select: { id: true, verificationStatus: true },
    });
    if (existing) {
      throw conflict(
        existing.verificationStatus === "REJECTED"
          ? "Your previous application was rejected. Contact support to re-apply."
          : "You have already applied. We'll email you once the review is complete.",
      );
    }

    const pmdcTaken = await prisma.doctor.findUnique({
      where: { pmdcNumber: d.pmdcNumber },
      select: { id: true },
    });
    if (pmdcTaken) throw conflict("That PMDC number is already registered with us.");

    // Unique, stable public slug: dr-ayesha-khan, dr-ayesha-khan-2, …
    const base = slugify(`dr-${user.name ?? "doctor"}`);
    let slug = base;
    for (let i = 2; await prisma.doctor.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${base}-${i}`;
    }

    const doctor = await prisma.$transaction(async (tx) => {
      const created = await tx.doctor.create({
        data: {
          userId: user.id,
          slug,
          pmdcNumber: d.pmdcNumber,
          bio: d.bio,
          yearsOfExperience: d.yearsOfExperience,
          languages: d.languages,
          verificationStatus: "PENDING",
          specialties: {
            create: d.specialtyIds.map((id, i) => ({ specialtyId: id, isPrimary: i === 0 })),
          },
          educations: { create: d.educations },
          experiences: { create: d.experiences },
          hospitals: {
            create: {
              hospitalId: d.practice.hospitalId,
              consultationFee: d.practice.consultationFee,
              followUpFee: d.practice.followUpFee,
              followUpValidDays: d.practice.followUpValidDays,
              slotDurationMinutes: d.practice.slotDurationMinutes,
            },
          },
        },
        select: { id: true, slug: true },
      });

      await tx.user.update({ where: { id: user.id }, data: { gender: d.gender } });
      return created;
    });

    // Every admin sees the queue item immediately.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.allSettled([
      ...admins.map((a) =>
        notify({
          userId: a.id,
          type: "SYSTEM",
          title: "New doctor application",
          body: `${user.name ?? "A user"} applied with PMDC ${d.pmdcNumber}.`,
          actionUrl: "/admin/doctors",
        }),
      ),
      audit({ actorId: user.id, action: "doctor.apply", entity: "Doctor", entityId: doctor.id }),
    ]);

    revalidatePath("/apply");
    return {
      ok: true,
      data: { slug: doctor.slug },
      message: "Application submitted. We'll verify your PMDC details and email you.",
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateDoctorProfileAction(raw: {
  bio?: string;
  yearsOfExperience?: number;
  languages?: string[];
  isAcceptingPatients?: boolean;
  videoConsultEnabled?: boolean;
  videoConsultFee?: number | null;
  avgWaitMinutes?: number;
}): Promise<ActionResult> {
  try {
    const { doctor } = await requireDoctor();
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        bio: raw.bio,
        yearsOfExperience: raw.yearsOfExperience,
        languages: raw.languages,
        isAcceptingPatients: raw.isAcceptingPatients,
        videoConsultEnabled: raw.videoConsultEnabled,
        videoConsultFee: raw.videoConsultFee ?? null,
        avgWaitMinutes: raw.avgWaitMinutes,
      },
    });
    revalidatePath("/doctor/profile");
    revalidatePath(`/doctors/${doctor.slug}`);
    return { ok: true, data: undefined, message: "Profile updated." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function upsertPracticeAction(raw: {
  id?: string;
  hospitalId: string;
  consultationFee: number;
  followUpFee: number;
  followUpValidDays: number;
  slotDurationMinutes: number;
  roomNumber?: string;
  acceptsCashAtClinic: boolean;
  acceptsOnlinePayment: boolean;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    const { doctor } = await requireDoctor();
    if (!raw.acceptsCashAtClinic && !raw.acceptsOnlinePayment) {
      throw invalid("Enable at least one payment method for this location.");
    }

    if (raw.id) {
      const owned = await prisma.doctorHospital.findFirst({
        where: { id: raw.id, doctorId: doctor.id },
        select: { id: true },
      });
      if (!owned) throw forbidden();
      await prisma.doctorHospital.update({ where: { id: raw.id }, data: { ...raw, id: undefined } });
    } else {
      await prisma.doctorHospital.create({ data: { ...raw, id: undefined, doctorId: doctor.id } });
    }

    revalidatePath("/doctor/schedule");
    revalidatePath(`/doctors/${doctor.slug}`);
    return { ok: true, data: undefined, message: "Practice location saved." };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "You already have a practice at that hospital." };
    }
    return toActionError(e);
  }
}

export async function addScheduleAction(raw: unknown): Promise<ActionResult> {
  try {
    const { doctor } = await requireDoctor();
    const d = scheduleSchema.parse(raw);

    if (timeToMinutes(d.endTime) <= timeToMinutes(d.startTime)) {
      throw invalid("End time must be after start time.");
    }

    const dh = await prisma.doctorHospital.findFirst({
      where: { id: d.doctorHospitalId, doctorId: doctor.id },
      select: { id: true },
    });
    if (!dh) throw forbidden();

    // A doctor cannot be in two places at once — reject overlapping sessions
    // across ALL of this doctor's locations, not just this one.
    const sameDay = await prisma.schedule.findMany({
      where: { doctorId: doctor.id, dayOfWeek: d.dayOfWeek, isActive: true },
      select: { startTime: true, endTime: true, doctorHospital: { select: { hospital: { select: { name: true } } } } },
    });
    const start = timeToMinutes(d.startTime);
    const end = timeToMinutes(d.endTime);
    const clash = sameDay.find(
      (s) => start < timeToMinutes(s.endTime) && end > timeToMinutes(s.startTime),
    );
    if (clash) {
      throw conflict(
        `This overlaps your ${clash.startTime}–${clash.endTime} session at ${clash.doctorHospital.hospital.name}.`,
      );
    }

    await prisma.schedule.create({ data: { ...d, doctorId: doctor.id } });
    revalidatePath("/doctor/schedule");
    revalidatePath(`/doctors/${doctor.slug}`);
    return { ok: true, data: undefined, message: "Session added." };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "A session already starts at that time." };
    }
    return toActionError(e);
  }
}

export async function deleteScheduleAction(id: string): Promise<ActionResult> {
  try {
    const { doctor } = await requireDoctor();
    const owned = await prisma.schedule.findFirst({ where: { id, doctorId: doctor.id } });
    if (!owned) throw forbidden();
    await prisma.schedule.delete({ where: { id } });
    revalidatePath("/doctor/schedule");
    return { ok: true, data: undefined, message: "Session removed." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function addTimeOffAction(raw: unknown): Promise<ActionResult<{ affected: number }>> {
  try {
    const { doctor } = await requireDoctor();
    const d = timeOffSchema.parse(raw);

    const exception = await prisma.scheduleException.create({
      data: {
        doctorId: doctor.id,
        doctorHospitalId: d.doctorHospitalId || null,
        date: new Date(`${d.date}T00:00:00Z`),
        isFullDay: d.isFullDay,
        startTime: d.isFullDay ? null : d.startTime,
        endTime: d.isFullDay ? null : d.endTime,
        reason: d.reason,
      },
    });

    // Existing bookings inside the time-off must be surfaced, not silently orphaned.
    const from = zonedDateTime(d.date, d.isFullDay ? "00:00" : (d.startTime ?? "00:00"));
    const to = zonedDateTime(d.date, d.isFullDay ? "23:59" : (d.endTime ?? "23:59"));
    const affected = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: { gte: from, lte: to },
        status: { in: ["PENDING", "CONFIRMED"] },
        ...(d.doctorHospitalId ? { doctorHospitalId: d.doctorHospitalId } : {}),
      },
      select: { id: true, patientId: true, code: true },
    });

    await Promise.allSettled(
      affected.map((a) =>
        notify({
          userId: a.patientId,
          type: "SYSTEM",
          title: `Action needed for appointment ${a.code}`,
          body: `Your doctor marked ${d.date} as unavailable. Please reschedule or cancel.`,
          actionUrl: `/appointments/${a.id}`,
          alsoSms: true,
        }),
      ),
    );

    await audit({
      actorId: doctor.id,
      action: "doctor.time_off",
      entity: "ScheduleException",
      entityId: exception.id,
      meta: { date: d.date, affected: affected.length },
    });

    revalidatePath("/doctor/schedule");
    return {
      ok: true,
      data: { affected: affected.length },
      message: affected.length
        ? `Time off saved. ${affected.length} existing appointment(s) need rescheduling.`
        : "Time off saved.",
    };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteTimeOffAction(id: string): Promise<ActionResult> {
  try {
    const { doctor } = await requireDoctor();
    const owned = await prisma.scheduleException.findFirst({ where: { id, doctorId: doctor.id } });
    if (!owned) throw forbidden();
    await prisma.scheduleException.delete({ where: { id } });
    revalidatePath("/doctor/schedule");
    return { ok: true, data: undefined, message: "Time off removed." };
  } catch (e) {
    return toActionError(e);
  }
}
