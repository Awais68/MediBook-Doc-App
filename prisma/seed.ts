/**
 * MediBook seed — realistic Pakistani demo data.
 *
 * Creates: specialties + symptom map, hospitals, verified doctors with per-hospital
 * fees and weekly schedules, patients with family members, a full appointment history
 * (completed visits -> consultations -> prescriptions -> lab orders -> reviews),
 * upcoming bookings, payments, favourites and notifications.
 *
 * Safe to re-run: it wipes the domain tables first.
 */
import { PrismaClient, type Gender, type FacilityType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify, generateCode } from "@/lib/utils";
import { dateKey, zonedDateTime, addMinutes } from "@/lib/time";
import {
  SPECIALTIES,
  SYMPTOMS,
  HOSPITALS,
  DOCTORS,
  SCHEDULE_TEMPLATES,
  PATIENTS,
  REVIEW_TEXTS,
  DIAGNOSES,
} from "./seed-data";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123";
const TEMPLATE_KEYS = ["morning", "evening", "split"] as const;

/** Deterministic pseudo-random so re-seeding produces the same demo dataset. */
let seedState = 42;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Walk back/forward from today to the n-th date that falls on `dayOfWeek`. */
function dateOnWeekday(dayOfWeek: number, weeksOffset: number, direction: -1 | 1): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    d.setDate(d.getDate() + direction);
    if (d.getDay() === dayOfWeek) break;
  }
  d.setDate(d.getDate() + direction * 7 * weeksOffset);
  return d;
}

async function wipe() {
  // Order matters: children first.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.medicalRecordShare.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.scheduleException.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.doctorHospital.deleteMany();
  await prisma.doctorDocument.deleteMany();
  await prisma.doctorExperience.deleteMany();
  await prisma.doctorEducation.deleteMany();
  await prisma.doctorSpecialty.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.hospitalAdmin.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("🧹 Clearing existing data…");
  await wipe();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Specialties & symptoms ────────────────────────────────
  console.log("🩺 Specialties & symptoms…");
  const specialtyByName = new Map<string, string>();
  for (const s of SPECIALTIES) {
    const row = await prisma.specialty.create({
      data: { name: s.name, slug: slugify(s.name), description: s.description, icon: s.icon, sortOrder: s.sortOrder },
    });
    specialtyByName.set(s.name, row.id);

    const symptoms = SYMPTOMS[s.name] ?? [];
    if (symptoms.length) {
      await prisma.symptom.createMany({
        data: symptoms.map((name) => ({ name, slug: slugify(name), specialtyId: row.id })),
        skipDuplicates: true,
      });
    }
  }

  // ── Hospitals ─────────────────────────────────────────────
  console.log("🏥 Hospitals…");
  const hospitalByName = new Map<string, string>();
  for (const h of HOSPITALS) {
    const row = await prisma.hospital.create({
      data: {
        name: h.name,
        slug: slugify(h.name),
        type: h.type as FacilityType,
        address: h.address,
        area: h.area,
        city: h.city,
        province: ["Lahore", "Faisalabad", "Rawalpindi"].includes(h.city) ? "Punjab" : h.city === "Karachi" ? "Sindh" : "Islamabad Capital Territory",
        phone: h.phone,
        latitude: h.lat,
        longitude: h.lng,
        facilities: h.facilities,
        isVerified: true,
      },
    });
    hospitalByName.set(h.name, row.id);
  }

  // ── Platform admin ────────────────────────────────────────
  console.log("👑 Admin…");
  const admin = await prisma.user.create({
    data: {
      name: "MediBook Admin",
      email: "admin@medibook.pk",
      phone: "+923000000000",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
      phoneVerified: new Date(),
      city: "Lahore",
    },
  });

  // ── Doctors ───────────────────────────────────────────────
  console.log("👨‍⚕️ Doctors, practices & schedules…");
  type PracticeRef = { id: string; hospitalId: string; fee: number; followUpFee: number; slotMinutes: number };
  type DoctorRef = {
    id: string;
    userId: string;
    name: string;
    practices: PracticeRef[];
    schedules: { id: string; doctorHospitalId: string; dayOfWeek: number; startTime: string; slotMinutes: number }[];
  };
  const doctorRefs: DoctorRef[] = [];

  for (const [i, d] of DOCTORS.entries()) {
    const user = await prisma.user.create({
      data: {
        name: `Dr. ${d.name}`,
        email: `${slugify(d.name)}@medibook.pk`,
        phone: `+9230011${String(10000 + i).slice(-5)}`,
        passwordHash,
        role: "DOCTOR",
        gender: d.gender as Gender,
        city: d.city,
        emailVerified: new Date(),
        phoneVerified: new Date(),
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name)}`,
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        slug: `dr-${slugify(d.name)}`,
        pmdcNumber: d.pmdc,
        bio: d.bio,
        yearsOfExperience: d.exp,
        languages: d.langs,
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
        verifiedById: admin.id,
        videoConsultEnabled: Boolean(d.video),
        videoConsultFee: d.video ? d.videoFee : null,
        avgWaitMinutes: randInt(8, 30),
        specialties: {
          create: [{ specialtyId: specialtyByName.get(d.specialty)!, isPrimary: true }],
        },
        educations: {
          create: d.degrees.map(([degree, institute, year]) => ({
            degree: degree as string,
            institute: institute as string,
            year: year as number,
          })),
        },
        experiences: {
          create: [
            {
              title: `Consultant ${d.specialty}`,
              organization: d.hospitals[0]!,
              startYear: new Date().getFullYear() - Math.min(d.exp, 10),
              isCurrent: true,
            },
          ],
        },
      },
    });

    const practices: PracticeRef[] = [];
    const schedules: DoctorRef["schedules"] = [];

    for (const [j, hospitalName] of d.hospitals.entries()) {
      const hospitalId = hospitalByName.get(hospitalName)!;
      // Second location is usually a bit cheaper — mirrors how doctors actually price.
      const fee = j === 0 ? d.fee : Math.max(1000, d.fee - 500);
      const slotMinutes = d.fee >= 4000 ? 20 : 15;

      const practice = await prisma.doctorHospital.create({
        data: {
          doctorId: doctor.id,
          hospitalId,
          consultationFee: fee,
          followUpFee: d.followUp,
          followUpValidDays: 14,
          slotDurationMinutes: slotMinutes,
          bookingWindowDays: 30,
          minAdvanceMinutes: 60,
          cancellationHours: 4,
          roomNumber: `${randInt(1, 4)}0${randInt(1, 9)}`,
          acceptsOnlinePayment: true,
          acceptsCashAtClinic: true,
        },
      });
      practices.push({ id: practice.id, hospitalId, fee, followUpFee: d.followUp, slotMinutes });

      // Location 0 gets morning-ish, location 1 gets evening — no overlap for the doctor.
      const key = j === 0 ? TEMPLATE_KEYS[i % 2 === 0 ? 0 : 2] : "evening";
      for (const s of SCHEDULE_TEMPLATES[key]) {
        // A doctor with two locations must not run the same weekday twice.
        if (d.hospitals.length > 1 && j === 1 && [2, 4].includes(s.dayOfWeek) === false && key === "evening" && s.dayOfWeek === 1) continue;
        const row = await prisma.schedule.create({
          data: {
            doctorId: doctor.id,
            doctorHospitalId: practice.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDurationMinutes: slotMinutes,
            maxPatients: randInt(12, 24),
            consultationType: "IN_PERSON",
          },
        }).catch(() => null);
        if (row) schedules.push({ id: row.id, doctorHospitalId: practice.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, slotMinutes });
      }
    }

    doctorRefs.push({ id: doctor.id, userId: user.id, name: `Dr. ${d.name}`, practices, schedules });
  }

  // ── Patients ──────────────────────────────────────────────
  console.log("🧑 Patients & family members…");
  const patientIds: string[] = [];
  for (const p of PATIENTS) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        passwordHash,
        role: "PATIENT",
        gender: p.gender as Gender,
        city: p.city,
        dateOfBirth: new Date(p.dob),
        emailVerified: new Date(),
        phoneVerified: new Date(),
        patientProfile: {
          create: {
            bloodGroup: p.blood,
            heightCm: randInt(150, 185),
            weightKg: randInt(50, 95),
            allergies: rand() > 0.6 ? ["Penicillin"] : [],
            chronicConditions: rand() > 0.7 ? ["Hypertension"] : [],
            emergencyContactName: "Next of kin",
            emergencyContactPhone: "+923001112222",
            address: `${randInt(1, 200)}-${pick(["A", "B", "C"])} Block, ${p.city}`,
          },
        },
      },
    });
    patientIds.push(user.id);

    if (rand() > 0.4) {
      await prisma.familyMember.create({
        data: {
          ownerId: user.id,
          name: pick(["Abdullah", "Zoya", "Ibrahim", "Ayaan", "Eman"]) + " " + p.name.split(" ")[1],
          relation: pick(["Son", "Daughter", "Spouse", "Mother", "Father"]),
          gender: pick(["MALE", "FEMALE"]) as Gender,
          dateOfBirth: new Date(`${randInt(1955, 2020)}-0${randInt(1, 9)}-1${randInt(0, 8)}`),
          bloodGroup: pick(["A+", "B+", "O+", "AB+"]),
        },
      });
    }
  }

  // ── Appointment history ───────────────────────────────────
  console.log("📅 Appointments, consultations, prescriptions & reviews…");
  const usedSlots = new Set<string>();
  let completedCount = 0;
  let upcomingCount = 0;

  async function createAppointment(opts: {
    doctor: DoctorRef;
    patientId: string;
    schedule: DoctorRef["schedules"][number];
    weeksOffset: number;
    direction: -1 | 1;
    slotIndex: number;
    completed: boolean;
  }) {
    const { doctor, patientId, schedule, weeksOffset, direction, slotIndex, completed } = opts;
    const practice = doctor.practices.find((p) => p.id === schedule.doctorHospitalId)!;

    const day = dateOnWeekday(schedule.dayOfWeek, weeksOffset, direction);
    const startAt = addMinutes(zonedDateTime(dateKey(day), schedule.startTime), slotIndex * schedule.slotMinutes);
    const endAt = addMinutes(startAt, schedule.slotMinutes);

    // Respect the DB's double-booking guard.
    const key = `${doctor.id}|${startAt.toISOString()}`;
    if (usedSlots.has(key)) return null;
    if (completed && startAt.getTime() > Date.now()) return null;
    if (!completed && startAt.getTime() < Date.now() + 2 * 60 * 60 * 1000) return null;
    usedSlots.add(key);

    const slot = await prisma.slot.create({
      data: { doctorId: doctor.id, doctorHospitalId: practice.id, startAt, endAt, status: "BOOKED" },
    });

    const payOnline = rand() > 0.45;
    const status = completed ? "COMPLETED" : rand() > 0.35 ? "CONFIRMED" : "PENDING";
    const dx = pick(DIAGNOSES);

    const appointment = await prisma.appointment.create({
      data: {
        code: generateCode(),
        patientId,
        doctorId: doctor.id,
        doctorHospitalId: practice.id,
        hospitalId: practice.hospitalId,
        slotId: slot.id,
        scheduledAt: startAt,
        endAt,
        tokenNumber: slotIndex + 1,
        consultationType: "IN_PERSON",
        status,
        reasonForVisit: dx.complaint,
        fee: practice.fee,
        completedAt: completed ? endAt : null,
        payment: {
          create: {
            amount: practice.fee,
            method: payOnline ? "JAZZCASH" : "CASH_AT_CLINIC",
            status: completed ? "PAID" : payOnline ? "PAID" : "UNPAID",
            provider: payOnline ? "mock" : null,
            providerRef: payOnline ? `MOCK-${generateCode("TX")}` : null,
            paidAt: completed || payOnline ? startAt : null,
          },
        },
      },
    });

    if (!completed) {
      upcomingCount++;
      return appointment;
    }

    completedCount++;

    // Clinical encounter
    const followUpDate = new Date(endAt.getTime() + dx.followUp * 24 * 60 * 60 * 1000);
    const consultation = await prisma.consultation.create({
      data: {
        appointmentId: appointment.id,
        chiefComplaint: dx.complaint,
        historyOfIllness: `Symptoms started roughly ${randInt(2, 20)} days ago. No prior hospitalisation for this complaint.`,
        examination: "Patient alert and oriented. Systemic examination unremarkable except as noted.",
        diagnosis: dx.diagnosis,
        advice: dx.advice,
        bloodPressure: `${randInt(110, 145)}/${randInt(70, 95)}`,
        pulseBpm: randInt(64, 98),
        temperatureC: Number((36.4 + rand() * 2).toFixed(1)),
        spo2: randInt(94, 99),
        weightKg: randInt(52, 95),
        heightCm: randInt(150, 185),
        followUpAfterDays: dx.followUp,
        followUpDate,
        followUpReason: "Review response to treatment and lab results.",
      },
    });

    await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        doctorId: doctor.id,
        patientId,
        code: generateCode("RX"),
        notes: "Complete the full course. Contact the clinic if symptoms worsen.",
        issuedAt: endAt,
        items: {
          create: dx.meds.map((m, idx) => ({ ...m, sortOrder: idx })),
        },
      },
    });

    if (dx.labs.length) {
      await prisma.labOrder.createMany({
        data: dx.labs.map((testName) => ({
          consultationId: consultation.id,
          testName,
          status: rand() > 0.5 ? "RESULT_READY" : "ORDERED",
          resultText: rand() > 0.5 ? "Within normal limits." : null,
          orderedAt: endAt,
        })),
      });
    }

    // Most, not all, completed visits get reviewed.
    if (rand() > 0.25) {
      const r = pick(REVIEW_TEXTS);
      await prisma.review.create({
        data: {
          appointmentId: appointment.id,
          patientId,
          doctorId: doctor.id,
          hospitalId: practice.hospitalId,
          rating: r.rating,
          bedsideManner: Math.min(5, r.rating + (rand() > 0.5 ? 0 : -1)),
          waitTimeScore: Math.max(1, r.rating - randInt(0, 1)),
          explanation: r.rating,
          cleanliness: Math.min(5, r.rating + (rand() > 0.7 ? 0 : -1)),
          title: r.title,
          comment: r.comment,
          isAnonymous: rand() > 0.85,
          status: "PUBLISHED",
          helpfulCount: randInt(0, 24),
          createdAt: new Date(endAt.getTime() + 24 * 60 * 60 * 1000),
          doctorReply: rand() > 0.7 ? "Thank you for the feedback — it genuinely helps us improve." : null,
          doctorRepliedAt: rand() > 0.7 ? new Date(endAt.getTime() + 48 * 60 * 60 * 1000) : null,
        },
      });
    }

    // A record the patient can see in their timeline.
    await prisma.medicalRecord.create({
      data: {
        patientId,
        uploadedById: patientId,
        appointmentId: appointment.id,
        title: `${dx.labs[0] ?? "Consultation summary"} — ${dx.diagnosis}`,
        type: dx.labs.length ? "LAB_REPORT" : "PRESCRIPTION",
        notes: "Uploaded from the clinic visit.",
        recordDate: endAt,
      },
    });

    return appointment;
  }

  for (const [pi, patientId] of patientIds.entries()) {
    // Past visits across a few different doctors.
    for (let k = 0; k < 4; k++) {
      const doctor = doctorRefs[(pi * 3 + k) % doctorRefs.length]!;
      if (!doctor.schedules.length) continue;
      const schedule = doctor.schedules[(k + pi) % doctor.schedules.length]!;
      await createAppointment({
        doctor,
        patientId,
        schedule,
        weeksOffset: k + 1,
        direction: -1,
        slotIndex: (pi * 2 + k) % 8,
        completed: true,
      });
    }

    // Upcoming bookings.
    for (let k = 0; k < 2; k++) {
      const doctor = doctorRefs[(pi + k * 5) % doctorRefs.length]!;
      if (!doctor.schedules.length) continue;
      const schedule = doctor.schedules[(k + 1) % doctor.schedules.length]!;
      await createAppointment({
        doctor,
        patientId,
        schedule,
        weeksOffset: k,
        direction: 1,
        slotIndex: (pi + k * 3) % 10,
        completed: false,
      });
    }

    // Favourites + a welcome notification.
    await prisma.favorite.createMany({
      data: [
        { userId: patientId, doctorId: doctorRefs[pi % doctorRefs.length]!.id },
        { userId: patientId, doctorId: doctorRefs[(pi + 4) % doctorRefs.length]!.id },
      ],
      skipDuplicates: true,
    });

    await prisma.notification.create({
      data: {
        userId: patientId,
        type: "SYSTEM",
        title: "Welcome to MediBook",
        body: "Search verified doctors, compare fees across hospitals, and keep every prescription in one place.",
        actionUrl: "/doctors",
      },
    });
  }

  // ── Doctor time-off sample ────────────────────────────────
  const offDoctor = doctorRefs[0]!;
  const offDate = new Date();
  offDate.setDate(offDate.getDate() + 10);
  await prisma.scheduleException.create({
    data: {
      doctorId: offDoctor.id,
      date: new Date(dateKey(offDate)),
      isFullDay: true,
      reason: "Conference — out of city",
    },
  });

  // ── Recompute denormalised doctor ratings ─────────────────
  console.log("⭐ Recomputing doctor ratings…");
  for (const d of doctorRefs) {
    const reviews = await prisma.review.findMany({
      where: { doctorId: d.id, status: "PUBLISHED" },
      select: { rating: true, bedsideManner: true, waitTimeScore: true, explanation: true, cleanliness: true },
    });
    const visits = await prisma.appointment.count({ where: { doctorId: d.id, status: "COMPLETED" } });

    if (!reviews.length) {
      await prisma.doctor.update({ where: { id: d.id }, data: { completedVisits: visits } });
      continue;
    }
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const subs = reviews.flatMap((r) => [r.bedsideManner, r.waitTimeScore, r.explanation, r.cleanliness].filter((v): v is number => typeof v === "number"));
    const satisfaction = subs.length ? Math.round((subs.reduce((s, v) => s + v, 0) / subs.length / 5) * 100) : Math.round((avg / 5) * 100);

    await prisma.doctor.update({
      where: { id: d.id },
      data: {
        avgRating: Number(avg.toFixed(2)),
        reviewCount: reviews.length,
        completedVisits: visits,
        satisfactionScore: satisfaction,
      },
    });
  }

  const counts = {
    specialties: await prisma.specialty.count(),
    symptoms: await prisma.symptom.count(),
    hospitals: await prisma.hospital.count(),
    doctors: await prisma.doctor.count(),
    practices: await prisma.doctorHospital.count(),
    schedules: await prisma.schedule.count(),
    patients: patientIds.length,
    completed: completedCount,
    upcoming: upcomingCount,
    reviews: await prisma.review.count(),
  };

  console.log("\n✅ Seed complete\n");
  console.table(counts);
  console.log(`\n🔑 Demo logins (password: ${DEMO_PASSWORD})`);
  console.log("   Admin   admin@medibook.pk");
  console.log(`   Doctor  ${slugify(DOCTORS[0]!.name)}@medibook.pk`);
  console.log(`   Patient ${PATIENTS[0]!.email}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
