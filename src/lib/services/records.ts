import "server-only";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound } from "@/lib/errors";
import { audit } from "@/lib/audit";

/**
 * A doctor may read a patient's history only if there is a real care relationship:
 * an appointment that is (or was) live between them. Anything else is a hard no —
 * this is the guard that keeps the record system from being a public database.
 */
export async function assertCareRelationship(doctorId: string, patientId: string) {
  const link = await prisma.appointment.findFirst({
    where: {
      doctorId,
      patientId,
      status: { in: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"] },
    },
    select: { id: true },
  });
  if (!link) throw forbidden("You can only view records for your own patients.");
  return true;
}

export async function getPatientTimeline(patientId: string) {
  const [appointments, records, prescriptions] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, status: { in: ["COMPLETED", "NO_SHOW"] } },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        code: true,
        scheduledAt: true,
        status: true,
        consultationType: true,
        doctor: { select: { slug: true, user: { select: { name: true, image: true } } } },
        hospital: { select: { name: true, city: true } },
        consultation: {
          select: {
            id: true,
            diagnosis: true,
            chiefComplaint: true,
            advice: true,
            followUpDate: true,
            bloodPressure: true,
            pulseBpm: true,
            temperatureC: true,
            weightKg: true,
            prescription: { select: { id: true, code: true, items: true } },
            labOrders: true,
          },
        },
      },
    }),
    prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { recordDate: "desc" },
      include: {
        uploadedBy: { select: { name: true } },
        shares: { where: { revokedAt: null }, select: { doctorId: true } },
      },
    }),
    prisma.prescription.findMany({
      where: { patientId },
      orderBy: { issuedAt: "desc" },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        doctor: { select: { slug: true, user: { select: { name: true } } } },
      },
    }),
  ]);

  return { appointments, records, prescriptions };
}

/** What the doctor sees: the patient's history filtered to shared + own-authored data. */
export async function getPatientChartForDoctor(doctorId: string, patientId: string) {
  await assertCareRelationship(doctorId, patientId);

  const [patient, visits, sharedRecords, prescriptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        image: true,
        gender: true,
        dateOfBirth: true,
        phone: true,
        city: true,
        patientProfile: true,
      },
    }),
    prisma.appointment.findMany({
      where: { patientId, status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        code: true,
        scheduledAt: true,
        doctorId: true,
        doctor: { select: { user: { select: { name: true } } } },
        hospital: { select: { name: true } },
        consultation: { include: { prescription: { include: { items: true } }, labOrders: true } },
      },
    }),
    prisma.medicalRecord.findMany({
      where: {
        patientId,
        OR: [
          {
            shares: {
              some: { doctorId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            },
          },
          { uploadedBy: { doctor: { id: doctorId } } },
        ],
      },
      orderBy: { recordDate: "desc" },
    }),
    prisma.prescription.findMany({
      where: { patientId },
      orderBy: { issuedAt: "desc" },
      take: 20,
      include: { items: true, doctor: { select: { user: { select: { name: true } } } } },
    }),
  ]);

  if (!patient) throw notFound("Patient not found.");

  await audit({
    actorId: undefined,
    action: "records.read",
    entity: "User",
    entityId: patientId,
    meta: { doctorId },
  });

  return { patient, visits, sharedRecords, prescriptions };
}

export async function shareRecordWithDoctor(opts: {
  recordId: string;
  patientId: string;
  doctorId: string;
  expiresInDays?: number;
}) {
  const record = await prisma.medicalRecord.findUnique({
    where: { id: opts.recordId },
    select: { patientId: true },
  });
  if (!record) throw notFound("Record not found.");
  if (record.patientId !== opts.patientId) throw forbidden();

  return prisma.medicalRecordShare.upsert({
    where: { recordId_doctorId: { recordId: opts.recordId, doctorId: opts.doctorId } },
    update: {
      revokedAt: null,
      sharedAt: new Date(),
      expiresAt: opts.expiresInDays
        ? new Date(Date.now() + opts.expiresInDays * 86_400_000)
        : null,
    },
    create: {
      recordId: opts.recordId,
      doctorId: opts.doctorId,
      expiresAt: opts.expiresInDays
        ? new Date(Date.now() + opts.expiresInDays * 86_400_000)
        : null,
    },
  });
}

export async function revokeRecordShare(opts: { recordId: string; doctorId: string; patientId: string }) {
  const record = await prisma.medicalRecord.findUnique({
    where: { id: opts.recordId },
    select: { patientId: true },
  });
  if (!record || record.patientId !== opts.patientId) throw forbidden();

  return prisma.medicalRecordShare.updateMany({
    where: { recordId: opts.recordId, doctorId: opts.doctorId },
    data: { revokedAt: new Date() },
  });
}
