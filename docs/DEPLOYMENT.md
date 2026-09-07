# Deployment

## Environment

Every variable lives in `.env.example`. The ones that must change before production:

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | managed Postgres with connection pooling (Neon, Supabase, RDS) |
| `AUTH_SECRET` | `openssl rand -base64 32` — rotating it signs everyone out |
| `NEXT_PUBLIC_APP_URL` | used in emails, callbacks and OAuth redirect URIs |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud console, redirect `${APP_URL}/api/auth/callback/google` |
| `SMS_PROVIDER` | `console` prints OTPs to the log. Anything other than `console` in production |
| `EMAIL_PROVIDER` | same |
| `PAYMENT_PROVIDER` | `mock` is a sandbox. Leaving it on in production means free appointments |
| `PLATFORM_FEE_PERCENT` | commission on online payments; `0` disables it |
| `UNPAID_BOOKING_TTL_MINUTES` | how long an abandoned checkout holds a slot (default 20) |
| `CRON_SECRET` | long random string; without it anyone can trigger the sweeps |
| `TZ_DEFAULT` | `Asia/Karachi` |

## Migrations

Development used `prisma db push` for speed. Before the first deploy, cut a real migration and
never push against production again:

```bash
npx prisma migrate dev --name init      # once, from the current schema
npx prisma migrate deploy               # in CI, on every release
```

## Vercel

1. Import the repo; the framework preset is Next.js.
2. Build command `npm run build` (it runs `prisma generate` first).
3. Add every variable above to Production and Preview.
4. Point `DATABASE_URL` at a **pooled** connection string — serverless functions open many
   short-lived connections. Keep the direct URL for migrations.
5. Add the cron jobs:

```json
{
  "crons": [
    { "path": "/api/cron/release-holds", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/reminders",     "schedule": "0 * * * *" },
    { "path": "/api/cron/follow-ups",    "schedule": "0 4 * * *" }
  ]
}
```

`assertCron` in `src/app/api/cron/_guard.ts` requires `Authorization: Bearer $CRON_SECRET` and
nothing else. Vercel Cron does not send that header — it sends `x-vercel-cron`. So either extend
`assertCron` to accept that header on Vercel, or drive the sweeps from an external scheduler
(GitHub Actions, cron-job.org, a systemd timer) that can send the bearer token.

## Self-hosted (Docker)

```bash
docker compose up -d db
npm ci
npx prisma migrate deploy
npm run build
npm start            # behind nginx/caddy with TLS
```

Run the three cron endpoints from system `cron` or a systemd timer with the bearer header.

## Pre-launch checklist

- [ ] `AUTH_SECRET` rotated, not the example value
- [ ] `PAYMENT_PROVIDER` is a real gateway and its webhook signature is verified
- [ ] `SMS_PROVIDER` and `EMAIL_PROVIDER` are not `console`
- [ ] Migrations applied with `migrate deploy`; the seed has **not** been run against production
- [ ] Demo accounts (`admin@medibook.pk`, `Password123`) deleted
- [ ] Database backups scheduled and a restore actually tested
- [ ] Uploaded records moved to object storage with signed, expiring URLs
- [ ] Rate limiting in front of login, OTP and booking
- [ ] Error tracking (Sentry) and uptime checks on the three cron endpoints
- [ ] `/terms` and `/privacy` reviewed by a lawyer — the shipped copy is a template
- [ ] Retention job for `AuditLog` and `Notification`

## Health

There is no `/api/health` yet. A trivial one that runs `SELECT 1` through Prisma is the first
thing to add for a load balancer.
