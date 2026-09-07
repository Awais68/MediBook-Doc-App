# Data model

32 models. The ones that carry the design decisions are described below; the rest are
self-explanatory join or lookup tables. Source of truth is `prisma/schema.prisma`.

## Identity

- **User** — one table for every role (`PATIENT`, `DOCTOR`, `HOSPITAL_ADMIN`, `ADMIN`). Separate
  tables per role look tidy and then fall apart the first time a doctor also books an appointment.
- **PatientProfile** — medical identity split off from `User` so clinical fields are not loaded on
  every session lookup: blood group, allergies, chronic conditions, current medications,
  emergency contact.
- **FamilyMember** — a dependent booked for by an account holder. An appointment carries
  `familyMemberId`, so "who is the patient" and "who booked and pays" stay separate.
- **OtpCode** — phone/email codes with purpose, expiry and single-use marking.

## Practice

- **Doctor** — profile, `verificationStatus`, and the denormalised
  `avgRating` / `reviewCount` / `satisfactionScore` / `completedVisits` used for sorting the
  listing without a join.
- **Hospital** → **DoctorHospital** ← **Doctor** — the pivot that makes the whole fee model work.
  It holds `consultationFee`, `followUpFee`, `followUpValidDays`, `slotDurationMinutes`,
  `cancellationHours`, `roomNumber`, `acceptsOnlinePayment`, `acceptsCashAtClinic`. Fees belong to
  a doctor **at a place**, never to a doctor alone.
- **Schedule** — recurring weekly session: day of week, start/end minutes, per-`DoctorHospital`.
- **ScheduleException** — dated override: leave, a half day, or an extra one-off session.
- **Slot** — reservations only (HELD / BOOKED / BLOCKED), never the free grid.
  `@@unique([doctorId, startAt])` is the double-booking guard.

## Visit

- **Appointment** — `code` (human reference), `tokenNumber`, `status`, `consultationType`,
  `scheduledAt`/`endAt`, `fee`, `isFollowUp`, `parentAppointmentId` (links a follow-up to its
  original visit), `videoRoomUrl`.
- **Consultation** — one per completed appointment. Vitals are individual typed columns
  (`bloodPressure`, `pulseBpm`, `temperatureC`, `spo2`, `weightKg`, `heightCm`, `bloodSugar`), not
  a JSON blob, so they can be charted over time. Carries the follow-up plan:
  `followUpAfterDays`, `followUpDate`, `followUpReason`, `followUpBookedId`.
- **Prescription** / **PrescriptionItem** — issued against a consultation; items hold medicine,
  dose, frequency, duration and instructions.
- **LabOrder** — ordered test, instructions, status, result text/file.
- **MedicalRecord** / **MedicalRecordShare** — patient-owned documents and the revocable,
  optionally expiring grants that let a named doctor see one.

## Commerce and trust

- **Payment** — one per appointment: `amount`, `platformFee`, `method`, `status`, `provider`,
  `providerRef`, `paidAt`, `refundedAt`, `refundAmount`, `failureReason`, `receiptUrl`.
- **Review** — tied to an appointment, so only a completed visit can produce one. Sub-scores
  (`bedsideManner`, `waitTimeScore`, `explanation`, `cleanliness`) alongside the overall rating,
  plus `status` for moderation and `doctorReply`.
- **AuditLog** — actor, action, entity, entity id, metadata. Append-only.

## Status machines

```
AppointmentStatus
  PENDING ──▶ CONFIRMED ──▶ CHECKED_IN ──▶ IN_PROGRESS ──▶ COMPLETED
     │            │              │              │
     └────────────┴──────────────┴──────────────┴──▶ CANCELLED_BY_PATIENT
                                                     CANCELLED_BY_DOCTOR
                                                     NO_SHOW
                                                     RESCHEDULED
```

`ACTIVE_STATUSES` (PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS) still occupy the calendar.
`TERMINAL_STATUSES` do not, and their slot row is deleted so the time can be rebooked.

```
PaymentStatus:  UNPAID → PENDING → PAID → REFUND_PENDING → REFUNDED
                              └──▶ FAILED
ReviewStatus:   PENDING → PUBLISHED | REJECTED
VerificationStatus: PENDING → UNDER_REVIEW → APPROVED | REJECTED | SUSPENDED
```

## Indexing notes

Indexes exist for the queries that actually run:

- listing and ranking — `Doctor(verificationStatus, isAcceptingPatients)`, `Doctor(avgRating)`,
  `DoctorHospital(consultationFee)`, `Hospital(city)`
- the day view — `Slot(doctorHospitalId, startAt)`, plus `Slot(status, holdExpiresAt)` for expiry
- appointment lookups — by patient, doctor, status and hospital, each paired with `scheduledAt`
- follow-up sweeps — `Consultation(followUpDate)`
- moderation and payments — `Review(doctorId, status, createdAt)`, `Payment(status, createdAt)`,
  `Payment(providerRef)` for webhook lookups
- audit — `AuditLog(entity, entityId)` and `AuditLog(actorId, createdAt)`
