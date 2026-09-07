# MediBook

A production-grade doctor appointment, consultation and patient-records platform for Pakistan —
the OlaDoc problem space, rebuilt with a real clinical data model behind it.

Next.js 16 (App Router) · React 19 · TypeScript (strict) · PostgreSQL 16 · Prisma 6 · Auth.js v5 · Tailwind 3

---

## What it does

**Patients**
- Search doctors by specialty, city, hospital, fee range, gender, language, availability and rating
- See per-hospital fees — the same doctor can charge differently at each practice location
- Book in-person or video consultations, pay online or at the clinic
- Book for family members (spouse, parents, children) from one account
- Medical records vault: upload reports, share with a specific doctor, revoke any time
- Prescriptions, lab orders, visit history, follow-up reminders
- Review a doctor only after a completed, verified visit

**Doctors**
- Apply with PMDC number → admin verification → live profile
- Multiple practice locations, each with its own fee, follow-up fee and slot length
- Weekly recurring schedule plus dated exceptions (leave, conference, half-day)
- Daily queue with one-click status transitions, token numbers, cash collection
- Full consultation chart: notes, vitals, prescription, lab orders, follow-up plan
- Patient charts limited to patients they have actually treated
- Reply to reviews, track rating breakdown and earnings

**Admins**
- Doctor verification queue with approve / reject / suspend and a reason trail
- Hospitals, specialties, appointments, payments, refunds, review moderation, user management
- 30-day booking trend, status mix, busiest doctors

---

## Quick start

```bash
cp .env.example .env          # then set AUTH_SECRET: openssl rand -base64 32
npm install
npm run setup                 # docker postgres + prisma db push + seed
npm run dev                   # http://localhost:3000
```

`npm run setup` is `db:up` → `db:push` → `db:seed`. Postgres runs on **5433** so it does not
collide with a local Postgres on 5432.

### Demo logins (from the seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@medibook.pk` | `Password123` |
| Doctor | `ayesha-khan@medibook.pk` | `Password123` |
| Patient | `ahmed@example.com` | `Password123` |

In dev, `SMS_PROVIDER=console` and `EMAIL_PROVIDER=console` print OTPs and emails to the server
log instead of sending them. `PAYMENT_PROVIDER=mock` gives you a sandbox checkout page — no money
moves.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate and re-seed |

---

## Architecture

```
src/
  app/
    (site)/        public — home, doctors, hospitals, specialties, apply, legal
    (auth)/        login, register, forgot/reset password
    (app)/         patient portal — dashboard, appointments, records, prescriptions, family
    (doctor)/      doctor portal — queue, schedule, patients, reviews, profile
    (admin)/       admin console — verification, catalogue, payments, moderation, users
    api/           auth handler, payment webhook, cron endpoints
  server/actions/  server actions — the write surface (auth, appointments, clinical, doctor, patient, admin)
  lib/
    services/      business logic — availability, booking, consultation, payments, records, reviews, analytics
    validations/   Zod schemas shared by forms and actions
    rbac.ts        permissions per role
    session.ts     requireUser / requireRole / requirePermission / requireDoctor
  components/      ui primitives, shared, app, doctor-portal, admin, layout
  auth.config.ts   edge-safe auth config + ROUTE_GUARDS
  middleware.ts    route protection
```

**Three rules the codebase holds to:**

1. **Pages read, actions write.** Server components query Prisma directly; every mutation goes
   through a server action that re-checks permission. There is no trusted client input.
2. **Availability is derived, not stored.** `Slot` rows exist only for HELD, BOOKED and BLOCKED.
   A free slot is computed from `Schedule` − `ScheduleException` − live reservations, so there is
   no nightly slot-generation job and no drift.
3. **Clinical data needs a care relationship.** A doctor can open a patient chart only if a real
   appointment links them (`assertCareRelationship`). Uploaded documents stay private until the
   patient shares them, and every share is revocable and can expire.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) ·
[`docs/API.md`](docs/API.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md)

---

## Booking flow

```
patient picks a slot
   → Slot row created BOOKED inside a transaction
       the unique index on (doctorId, startAt) is what prevents double-booking:
       two concurrent requests, one winner, no table lock
   → Appointment PENDING + Payment PENDING (online) or UNPAID (pay at clinic)
   → gateway callback / mock checkout → Payment PAID → Appointment CONFIRMED
   → doctor: CHECKED_IN → IN_PROGRESS → COMPLETED  (the chart locks on completion)
   → follow-up window opens; a follow-up booked inside it is charged the follow-up fee
```

An online booking whose payment never lands is released by `/api/cron/release-holds`
(`UNPAID_BOOKING_TTL_MINUTES`, default 20) — appointment cancelled, payment marked failed, slot
freed. Reminders and follow-up nudges run from `/api/cron/reminders` and `/api/cron/follow-ups`.
All three are protected by `CRON_SECRET`.

Cancellation refunds respect `DoctorHospital.cancellationHours`: a patient cancelling inside that
window forfeits the fee, everything else goes to `REFUND_PENDING`.

---

## Conventions

- Times are stored in UTC and rendered in `Asia/Karachi`.
- Money is whole PKR integers — never floats.
- Ratings on `Doctor` (`avgRating`, `reviewCount`, `satisfactionScore`) are denormalised and
  recomputed on review changes; do not compute them at read time.
- Zod 4 syntax (`z.email()`, `z.iso.datetime()`, `z.coerce.number()`).
- Toasts come from `sonner`.

## Status

Build and typecheck are green. Payments run against a mock provider; JazzCash/EasyPaisa adapters
and video consultations are stubbed at the interface but not implemented — see
[`docs/ROADMAP.md`](docs/ROADMAP.md).
