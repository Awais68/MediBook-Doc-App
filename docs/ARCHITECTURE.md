# Architecture

## Layers

```
Request
  └─ proxy.ts                 role guard from auth.config.ts ROUTE_GUARDS
      └─ layout / page        Server Component — reads via Prisma or a service
          └─ client component interactivity only; no data access
              └─ server action re-checks permission, calls a service, revalidates
                  └─ src/lib/services  business rules, the only place invariants live
                      └─ Prisma → Postgres
```

Nothing in `components/` talks to the database. Nothing in `services/` reads the session — the
caller passes an already-authorised actor id. That split is what makes the permission checks
auditable: every write path goes `action → requirePermission → service`.

## Auth

`src/auth.config.ts` is the edge-safe half (providers list, callbacks, `ROUTE_GUARDS`).
`src/auth.ts` is the Node half that touches Prisma and bcrypt. The proxy only imports the first,
so the route guard stays light and never pulls the Prisma client into that bundle.

Four ways in, all landing on the same JWT session:

| Provider | id | Notes |
| --- | --- | --- |
| Email + password | `credentials` | bcrypt, constant-ish timing so a wrong email and a wrong password are indistinguishable |
| Phone OTP | `phone-otp` | 6-digit code in `OtpCode`, rate-limited, single use |
| Google | `google` | `allowDangerousEmailAccountLinking` so an existing email account is linked, not duplicated |
| Doctor / admin | same credentials provider | separated by role, not by a second user table |

`session.role` and `session.doctorId` are put on the token at sign-in, so a guard never needs a
database round trip.

### Route protection

`ROUTE_GUARDS` is a prefix → allowed-roles table. `guardFor()` matches an exact path or a
`prefix/` path, which is why the public `/doctors` listing does not fall under the `/doctor`
portal guard. Unauthenticated → `/login?callbackUrl=…`; authenticated with the wrong role →
`/403`.

Guards inside a page (a doctor opening a chart, a patient opening someone else's appointment) are
resource-level and live in the services. `guarded()` in `src/lib/page-guard.ts` maps the resulting
`AppError` onto Next's `notFound()` / redirect, so those come back as a real 404 or 403 rather
than a generic 500.

## Availability

Slot rows are **not** pre-generated. `Slot` only ever holds HELD, BOOKED or BLOCKED. Free time is
computed on read:

```
offered = Schedule (weekly, per doctor+hospital, with slotDurationMinutes)
        − ScheduleException (dated leave / half-day / one-off session)
        − existing Slot rows in the window
        − anything in the past or beyond the booking horizon
```

Why: pre-generating slots means a nightly job, a horizon you can run off the end of, and a
migration every time a doctor edits their timings. Deriving costs one indexed query per day view
and can never drift from the schedule.

Double-booking is prevented by the database, not by a read-then-write check: `@@unique([doctorId,
startAt])` on `Slot`. Two concurrent bookings race, one gets `P2002`, and that is translated into
"someone just booked that slot".

## Clinical access control

Three independent gates:

1. **Role** — `PERMISSIONS` in `src/lib/rbac.ts` says which roles may attempt an operation.
2. **Care relationship** — `assertCareRelationship(doctorId, patientId)` requires a real
   appointment between the two before any chart, prescription or visit history is returned.
3. **Explicit share** — patient-uploaded documents are invisible even to a treating doctor until
   the patient shares them through `MedicalRecordShare`. Shares are revocable and can expire.

Sensitive reads and every write land in `AuditLog` through `audit()`.

## Money

Whole PKR integers everywhere; no floats, no decimals. Fee resolution is per
`DoctorHospital`, not per doctor — the same doctor charges differently at a private clinic and a
teaching hospital. `resolveFee()` decides between the consultation fee and the follow-up fee by
looking at `parentAppointmentId` and the location's `followUpValidDays`.

`platformFeeFor()` applies `PLATFORM_FEE_PERCENT` to online payments only; cash collected at the
clinic never passes through the platform.

## Time

Stored in UTC, rendered in `Asia/Karachi` via `src/lib/time.ts`. Schedules are stored as
minutes-from-midnight in the clinic's local day, then materialised into UTC instants with
`zonedDateTime()` — so a schedule stays correct regardless of the server's timezone.

## Notifications

`notify()` writes a `Notification` row and optionally fans out to email and SMS through the
provider seam in `src/lib/providers`. In dev both providers are `console`, so nothing leaves the
machine. Notification sends are wrapped in `Promise.allSettled` — a dead SMS gateway must never
roll back a booking.
