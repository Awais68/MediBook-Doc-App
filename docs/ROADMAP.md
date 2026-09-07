# Roadmap

What is deliberately unfinished, in the order it should be picked up.

## Blocking a real launch

1. **Payment gateway.** `PAYMENT_PROVIDER=mock` renders an in-app sandbox checkout. The seam is
   `createCheckout` in `src/lib/services/payments.ts` plus the webhook at
   `/api/webhooks/payment`; JazzCash, EasyPaisa and Stripe are stubbed comments. The webhook must
   verify the provider signature before it trusts anything.
2. **File storage.** `MedicalRecord.fileUrl` and `DoctorDocument` currently take a URL string with
   no upload pipeline. Needs S3/R2 with server-issued signed URLs, a MIME and size allowlist, and
   virus scanning. Health documents must never sit on a public bucket.
3. **Rate limiting.** OTP requests, login and booking are unthrottled. Upstash Redis or a Postgres
   token bucket keyed by IP + identifier.
4. **Real migrations.** The schema was developed with `db push`. Cut `migrate dev --name init`
   before anything reaches production.
5. **Tests.** There are none. The highest-value first suite is the booking service: concurrent
   booking of one slot, follow-up fee resolution, cancellation refund windows, and the care
   relationship guard.

## Next

6. **Video consultations.** `ConsultationType.VIDEO` and `Appointment.videoRoomUrl` exist and the
   UI already offers the choice; no room is provisioned. Daily.co or LiveKit, with the room
   created on confirmation and torn down after the visit.
7. **Real-time queue.** The doctor's day view is request/response. Server-sent events or Pusher
   would let the waiting-room screen and the patient's "you are number 4" update live.
8. **Search quality.** Search is `ILIKE contains` across doctor name, bio, specialty, symptom and
   hospital. It cannot handle a typo ("cardilogist"), an Urdu transliteration, or ranking by
   relevance. Postgres full-text plus `pg_trgm` similarity, with the query planner given a GIN
   index, is the upgrade.
9. **Notification delivery tracking.** `notify()` fires and forgets. Store provider message ids and
   delivery status so a missed reminder is visible instead of invisible.
10. **Doctor earnings and payouts.** `Payment.platformFee` is now populated, but there is no payout
    ledger, no settlement cycle and no doctor-facing statement.

## Later

11. **Hospital admin console.** `HOSPITAL_ADMIN` can reach `/admin` but sees platform-wide data.
    It should be scoped to their own hospital's doctors, schedules and revenue.
12. **Patient app polish.** Insurance/panel support, appointment ICS export, and a printable
    prescription that matches what pharmacies expect.
13. **Analytics depth.** Cohort retention, no-show prediction per doctor, slot utilisation
    heatmaps — the data is already there.
14. **Internationalisation.** Urdu UI. The content model is ready; the strings are not extracted.
15. **Accessibility audit.** Radix gives keyboard and ARIA behaviour for free, but the custom
    calendar and slot grid need a real screen-reader pass.
