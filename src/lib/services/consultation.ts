import "server-only";
import { prisma } from "@/lib/prisma";
import { forbidden, invalid, notFound } from "@/lib/errors";
import { generateCode, formatDate } from "@/lib/utils";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/time";

export type PrescriptionItemInput = {
  drugName: string;
  strength?: string;
  form?: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  instructions?: string;
};

export type ConsultationInput = {
  appointmentId: string;
  doctorUserId: string;
  chiefComplaint?: string;
  historyOfIllness?: string;
  examination?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  advice?: string;
  bloodPressure?: string;
  pulseBpm?: number;
  temperatureC?: number;
  spo2?: number;
  weightKg?: number;
  heightCm?: number;
  bloodSugar?: number;
  followUpAfterDays?: number | null;
  followUpReason?: string;
  prescriptionNotes?: string;
  medicines?: PrescriptionItemInput[];
  labTests?: { testName: string; instructions?: string }[];
  markCompleted?: boolean;
};

/**
 * Writes the clinical record for a visit: notes, vitals, prescription, lab orders
 * and the follow-up plan — in one transaction, so a half-saved chart is impossible.
 */
export async function saveConsultation(input: ConsultationInput) {
  const appt = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      status: true,
      scheduledAt: true,
      slotId: true,
      doctor: { select: { userId: true, user: { select: { name: true } } } },
      consultation: { select: { id: true } },
    },
  });
  if (!appt) throw notFound("Appointment not found.");
  if (appt.doctor.userId !== input.doctorUserId) throw forbidden("This is not your appointment.");
  if (["CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "RESCHEDULED"].includes(appt.status)) {
    throw invalid("You cannot write notes on a cancelled appointment.");
  }

  const followUpDate =
    input.followUpAfterDays && input.followUpAfterDays > 0
      ? addDays(new Date(), input.followUpAfterDays)
      : null;

  const medicines = (input.medicines ?? []).filter((m) => m.drugName?.trim());
  const labTests = (input.labTests ?? []).filter((t) => t.testName?.trim());

  const result = await prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.upsert({
      where: { appointmentId: appt.id },
      create: {
        appointmentId: appt.id,
        chiefComplaint: input.chiefComplaint,
        historyOfIllness: input.historyOfIllness,
        examination: input.examination,
        diagnosis: input.diagnosis,
        clinicalNotes: input.clinicalNotes,
        advice: input.advice,
        bloodPressure: input.bloodPressure,
        pulseBpm: input.pulseBpm,
        temperatureC: input.temperatureC,
        spo2: input.spo2,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        bloodSugar: input.bloodSugar,
        followUpAfterDays: input.followUpAfterDays ?? null,
        followUpDate,
        followUpReason: input.followUpReason,
      },
      update: {
        chiefComplaint: input.chiefComplaint,
        historyOfIllness: input.historyOfIllness,
        examination: input.examination,
        diagnosis: input.diagnosis,
        clinicalNotes: input.clinicalNotes,
        advice: input.advice,
        bloodPressure: input.bloodPressure,
        pulseBpm: input.pulseBpm,
        temperatureC: input.temperatureC,
        spo2: input.spo2,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        bloodSugar: input.bloodSugar,
        followUpAfterDays: input.followUpAfterDays ?? null,
        followUpDate,
        followUpReason: input.followUpReason,
      },
    });

    // Prescription is replace-on-save: the doctor edits the whole sheet at once.
    if (medicines.length) {
      const existing = await tx.prescription.findUnique({
        where: { consultationId: consultation.id },
        select: { id: true },
      });
      if (existing) {
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: existing.id } });
        await tx.prescription.update({
          where: { id: existing.id },
          data: {
            notes: input.prescriptionNotes,
            items: {
              create: medicines.map((m, i) => ({
                drugName: m.drugName.trim(),
                strength: m.strength,
                form: m.form,
                dosage: m.dosage,
                frequency: m.frequency,
                durationDays: m.durationDays,
                instructions: m.instructions,
                sortOrder: i,
              })),
            },
          },
        });
      } else {
        await tx.prescription.create({
          data: {
            consultationId: consultation.id,
            doctorId: appt.doctorId,
            patientId: appt.patientId,
            code: generateCode("RX"),
            notes: input.prescriptionNotes,
            items: {
              create: medicines.map((m, i) => ({
                drugName: m.drugName.trim(),
                strength: m.strength,
                form: m.form,
                dosage: m.dosage,
                frequency: m.frequency,
                durationDays: m.durationDays,
                instructions: m.instructions,
                sortOrder: i,
              })),
            },
          },
        });
      }
    }

    if (labTests.length) {
      await tx.labOrder.deleteMany({ where: { consultationId: consultation.id, status: "ORDERED" } });
      await tx.labOrder.createMany({
        data: labTests.map((t) => ({
          consultationId: consultation.id,
          testName: t.testName.trim(),
          instructions: t.instructions,
        })),
      });
    }

    if (input.markCompleted && appt.status !== "COMPLETED") {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.doctor.update({
        where: { id: appt.doctorId },
        data: { completedVisits: { increment: 1 } },
      });
      await tx.slot.delete({ where: { id: appt.slotId } }).catch(() => undefined);
    }

    return consultation;
  });

  await Promise.allSettled([
    medicines.length
      ? notify({
          userId: appt.patientId,
          type: "PRESCRIPTION_READY",
          title: "Your prescription is ready",
          body: `Dr. ${appt.doctor.user.name} added ${medicines.length} medicine(s) to your record.`,
          actionUrl: `/appointments/${appt.id}`,
          alsoSms: true,
        })
      : null,
    followUpDate
      ? notify({
          userId: appt.patientId,
          type: "FOLLOW_UP_DUE",
          title: `Follow-up scheduled for ${formatDate(followUpDate)}`,
          body: input.followUpReason ?? "Your doctor asked you to come back for a follow-up visit.",
          actionUrl: `/appointments/${appt.id}`,
        })
      : null,
    audit({
      actorId: input.doctorUserId,
      action: "consultation.save",
      entity: "Consultation",
      entityId: result.id,
      meta: { medicines: medicines.length, labTests: labTests.length, completed: !!input.markCompleted },
    }),
  ]);

  return result;
}

/**
 * Follow-ups that are due (or due within `windowDays`) and not yet booked.
 * The cron endpoint uses this to nudge patients — the piece OlaDoc simply doesn't have.
 */
export async function getDueFollowUps(windowDays = 2) {
  return prisma.consultation.findMany({
    where: {
      followUpDate: { lte: addDays(new Date(), windowDays), gte: addDays(new Date(), -30) },
      followUpBookedId: null,
    },
    select: {
      id: true,
      followUpDate: true,
      followUpReason: true,
      appointment: {
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          doctorHospitalId: true,
          reminderSentAt: true,
          doctor: { select: { slug: true, user: { select: { name: true } } } },
        },
      },
    },
  });
}

export async function getPatientFollowUps(patientId: string) {
  const rows = await prisma.consultation.findMany({
    where: {
      followUpDate: { not: null },
      followUpBookedId: null,
      appointment: { patientId },
    },
    orderBy: { followUpDate: "asc" },
    select: {
      id: true,
      followUpDate: true,
      followUpReason: true,
      diagnosis: true,
      appointment: {
        select: {
          id: true,
          code: true,
          doctorHospitalId: true,
          scheduledAt: true,
          doctor: { select: { slug: true, user: { select: { name: true, image: true } } } },
          hospital: { select: { name: true } },
        },
      },
    },
  });
  return rows;
}
