# API surface

There is no public REST API. Writes go through **server actions**; reads happen inside server
components. HTTP route handlers exist only where an outside caller needs one: auth, the payment
webhook, and cron.

## Server actions

All return `ActionResult<T>` — `{ ok: true, data, message? }` or
`{ ok: false, error, code?, fieldErrors? }`. Never a thrown error across the client boundary.
Every one calls `requireUser` / `requireRole` / `requirePermission` first; input is parsed with a
Zod schema from `src/lib/validations`.

### `auth.ts`
| Action | Who |
| --- | --- |
| `registerAction` | public |
| `requestLoginOtpAction` | public |
| `forgotPasswordAction`, `resetPasswordAction` | public |

### `appointments.ts`
| Action | Who |
| --- | --- |
| `bookAppointmentAction` | `appointment.book` |
| `cancelAppointmentAction` | patient, treating doctor or staff |
| `rescheduleAppointmentAction` | patient or staff |
| `transitionAppointmentAction` | `appointment.manage` |
| `markCashCollectedAction` | `appointment.manage` |
| `completeMockPaymentAction` | booking owner (sandbox only) |
| `loadAvailabilityAction`, `loadFamilyMembersAction` | signed-in reads used by the booking widget |

### `clinical.ts`
| Action | Who |
| --- | --- |
| `saveConsultationAction` | `consultation.write` + care relationship |
| `updateLabResultAction` | treating doctor |
| `createReviewAction` | patient with a COMPLETED visit |
| `replyToReviewAction` | the reviewed doctor |
| `moderateReviewAction`, `markHelpfulAction` | `review.moderate` / any signed-in user |

### `doctor.ts`
`applyAsDoctorAction`, `updateDoctorProfileAction`, `upsertPracticeAction`, `addScheduleAction`,
`deleteScheduleAction`, `addTimeOffAction`, `deleteTimeOffAction` — the doctor themself.

### `patient.ts`
`updatePatientProfileAction`, `addFamilyMemberAction`, `deleteFamilyMemberAction`,
`addMedicalRecordAction`, `deleteMedicalRecordAction`, `shareRecordAction`, `revokeShareAction`,
`toggleFavoriteAction`, `markNotificationsReadAction` — the record owner.

### `admin.ts`
`reviewDoctorApplicationAction` (`doctor.verify`), `upsertHospitalAction` / `toggleHospitalAction`
(`hospital.manage`), `upsertSpecialtyAction` (`specialty.manage`), `setUserActiveAction` /
`setUserRoleAction` (`user.manage`), `refundPaymentAction` (`payment.refund`).

## Route handlers

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | GET/POST | — | Auth.js handler |
| `/api/webhooks/payment` | POST | provider signature | settles a payment, confirms the appointment |
| `/api/cron/release-holds` | GET | `Authorization: Bearer $CRON_SECRET` | frees expired holds and abandoned unpaid bookings |
| `/api/cron/reminders` | GET | same | 24h and 2h appointment reminders |
| `/api/cron/follow-ups` | GET | same | nudges patients whose follow-up date has arrived |

Cron endpoints are idempotent — running one twice does not double-send or double-cancel. Suggested
schedule: holds every 5 minutes, reminders hourly, follow-ups daily.

## Permission table

`src/lib/rbac.ts` is the single source of truth. No inline role checks anywhere else.

| Permission | Roles |
| --- | --- |
| `appointment.book` | PATIENT, ADMIN, HOSPITAL_ADMIN |
| `appointment.cancel.own` | PATIENT, DOCTOR, ADMIN, HOSPITAL_ADMIN |
| `appointment.manage` | DOCTOR, ADMIN, HOSPITAL_ADMIN |
| `consultation.write`, `prescription.write` | DOCTOR |
| `records.upload` | PATIENT, DOCTOR, ADMIN |
| `records.readOthers` | DOCTOR, ADMIN |
| `review.write` | PATIENT |
| `review.reply` | DOCTOR |
| `review.moderate`, `doctor.verify`, `specialty.manage`, `user.manage`, `payment.refund`, `analytics.platform` | ADMIN |
| `hospital.manage` | ADMIN, HOSPITAL_ADMIN |
