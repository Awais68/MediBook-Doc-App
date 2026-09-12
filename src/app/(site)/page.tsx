import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  Clock,
  FileHeart,
  Quote,
  Repeat2,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getFeaturedDoctors, getSearchFacets } from "@/lib/services/doctors";
import { getNextAvailable } from "@/lib/services/availability";
import { Button } from "@/components/ui/button";
import { DoctorSearchBar } from "@/components/search/doctor-search-bar";
import { RatingStars } from "@/components/shared/rating-stars";
import { SpecialtyIcon } from "@/components/shared/specialty-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime, formatPKR, initials } from "@/lib/utils";

export const revalidate = 300;

/** Image-led feature blocks, alternating sides. */
const FEATURES = [
  {
    image: "/images/feature-phone.jpg",
    alt: "A doctor in a white coat checking appointments on a phone",
    eyebrow: "Booking",
    title: "Real slots, real fees. No call-backs.",
    body: "Availability comes straight from the doctor's live schedule and is confirmed the moment you tap. The fee you see is the fee at that hospital — the same consultant can charge differently across locations, and we show each one.",
    points: [
      { icon: CalendarCheck, text: "Instant confirmation with a booking code and token number" },
      { icon: Wallet, text: "Fee shown per hospital, before you commit" },
    ],
    href: "/doctors",
    cta: "Find a doctor",
  },
  {
    image: "/images/feature-consult.jpg",
    alt: "Two doctors reviewing a scan together on a monitor",
    eyebrow: "Records",
    title: "Every prescription and report, in one timeline.",
    body: "Visit summaries, prescriptions and lab orders land in your account automatically. Upload older reports yourself, then decide which doctor can see what — and for how long.",
    points: [
      { icon: FileHeart, text: "Prescriptions your pharmacist can actually read" },
      { icon: ShieldCheck, text: "Share a record with a doctor, revoke it any time" },
    ],
    href: "/register",
    cta: "Create a free account",
  },
  {
    image: "/images/feature-family.jpg",
    alt: "A nurse giving an older woman a vaccination",
    eyebrow: "Family",
    title: "One account for your parents and your kids.",
    body: "Add family members once and book on their behalf without juggling logins. When a doctor says 'come back in two weeks', the reminder and the discounted follow-up fee are handled for you.",
    points: [
      { icon: Users, text: "Book for anyone in your household" },
      { icon: Repeat2, text: "Follow-ups scheduled and discounted automatically" },
    ],
    href: "/family",
    cta: "Add your family",
  },
];

const STEPS = [
  {
    title: "Search",
    body: "Type a symptom, a specialty, a doctor or a hospital. Narrow by city, fee and rating.",
  },
  {
    title: "Pick a slot",
    body: "Choose the hospital, the day and the exact time. The fee for that location is right there.",
  },
  {
    title: "Confirm",
    body: "Pay online or at the clinic. You get a booking code, reminders and a token number.",
  },
];

const POPULAR = ["Chest pain", "Skin allergy", "Pregnancy", "Child fever", "Back pain"];

async function getTestimonials() {
  const reviews = await prisma.review.findMany({
    where: { status: "PUBLISHED", rating: { gte: 4 }, comment: { not: null } },
    orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      isAnonymous: true,
      patient: { select: { name: true, city: true } },
      doctor: {
        select: {
          user: { select: { name: true } },
          specialties: { select: { specialty: { select: { name: true } } }, take: 1 },
        },
      },
    },
  });
  return reviews.filter((r) => (r.comment ?? "").trim().length > 40).slice(0, 3);
}

export default async function HomePage() {
  const [facets, featured, testimonials, stats] = await Promise.all([
    getSearchFacets(),
    getFeaturedDoctors(6),
    getTestimonials(),
    Promise.all([
      prisma.doctor.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.hospital.count({ where: { isActive: true } }),
      prisma.appointment.count({ where: { status: "COMPLETED" } }),
      prisma.review.count({ where: { status: "PUBLISHED" } }),
    ]),
  ]);

  const [doctorCount, hospitalCount, visitCount, reviewCount] = stats;
  const heroDoctor = featured[0];
  const nextSlot = heroDoctor ? await getNextAvailable(heroDoctor.id).catch(() => null) : null;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-glow grain">
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="container relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:py-20">
          <div className="animate-fade-up">
            <p className="eyebrow">
              <BadgeCheck className="h-4 w-4" />
              {doctorCount.toLocaleString("en-PK")} verified doctors · {facets.cities.length} cities
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
              Find the right doctor.
              <br />
              <span className="bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">
                Book in under a minute.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Search by symptom or specialty, compare the real consultation fee at each hospital, and confirm a
              slot instantly. Then keep every prescription and report in one place.
            </p>

            <div className="mt-8 max-w-2xl">
              <DoctorSearchBar className="shadow-lift" />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Popular:</span>
                {POPULAR.map((s) => (
                  <Link
                    key={s}
                    href={`/doctors?q=${encodeURIComponent(s)}`}
                    className="rounded-full border bg-background/80 px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {featured.slice(0, 4).map((d) => (
                  <Avatar key={d.slug} className="h-9 w-9 border-2 border-background">
                    <AvatarImage src={d.user.image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{initials(d.user.name)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{visitCount.toLocaleString("en-PK")}</span> visits
                booked through MediBook
              </p>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto w-full max-w-md lg:ml-auto lg:max-w-[440px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-border/60">
              <Image
                src="/images/hero-doctor.jpg"
                alt="A confident doctor in a white coat with arms crossed"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 448px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(190,45%,8%)]/55 via-transparent to-transparent" />
            </div>

            {/* Floating: next available slot of the top-rated doctor (live data) */}
            {nextSlot ? (
              <div className="absolute -left-4 top-10 hidden animate-float rounded-2xl border bg-card/95 p-4 shadow-lift backdrop-blur sm:block lg:-left-10">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Next slot · {nextSlot.hospitalName}</p>
                    <p className="text-sm font-semibold">{formatDateTime(nextSlot.startAt)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Floating: top doctor */}
            {heroDoctor ? (
              <Link
                href={`/doctors/${heroDoctor.slug}`}
                className="absolute -bottom-6 right-2 w-[min(100%,300px)] rounded-2xl border bg-card/95 p-4 shadow-lift backdrop-blur transition-transform hover:-translate-y-1 sm:-right-6 lg:-right-8"
                style={{ animationDelay: "1.5s" }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 rounded-xl">
                    <AvatarImage src={heroDoctor.user.image ?? undefined} alt="" />
                    <AvatarFallback className="rounded-xl">{initials(heroDoctor.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{heroDoctor.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {heroDoctor.specialties[0]?.specialty.name} · {heroDoctor.hospitals[0]?.hospital.city}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <RatingStars value={heroDoctor.avgRating} showValue count={heroDoctor.reviewCount} />
                  <span className="text-sm font-semibold">{formatPKR(heroDoctor.hospitals[0]?.consultationFee ?? 0)}</span>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="border-y bg-muted/30">
        <dl className="container grid grid-cols-2 divide-border/70 sm:grid-cols-4 sm:divide-x">
          {[
            { label: "Verified doctors", value: doctorCount },
            { label: "Hospitals & clinics", value: hospitalCount },
            { label: "Visits completed", value: visitCount },
            { label: "Verified reviews", value: reviewCount },
          ].map((s) => (
            <div key={s.label} className="flex flex-col px-4 py-6 sm:items-center sm:py-8">
              <dd className="order-1 text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">
                {s.value.toLocaleString("en-PK")}
              </dd>
              <dt className="order-2 mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Specialties ──────────────────────────────────────── */}
      <section className="container py-16 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="eyebrow">Specialties</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Who should you see?</h2>
            <p className="mt-2 text-muted-foreground">Pick a specialty, or search your symptom and let the results decide.</p>
          </div>
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/specialties">
              All specialties <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {facets.specialties.slice(0, 12).map((s) => (
            <Link
              key={s.slug}
              href={`/doctors?specialty=${s.slug}`}
              className="group card-lift relative flex flex-col gap-4 rounded-2xl border bg-card p-4"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <SpecialtyIcon name={s.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold leading-tight">{s.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s._count.doctors} {s._count.doctors === 1 ? "doctor" : "doctors"}
                </p>
              </div>
              <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Feature zig-zag ──────────────────────────────────── */}
      <section className="relative border-y bg-muted/30 py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <p className="eyebrow">Why MediBook</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Built to fix what booking apps get wrong.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Most platforms stop at &ldquo;request an appointment&rdquo;. This one handles the whole visit, and
              everything after it.
            </p>
          </div>

          <div className="mt-14 space-y-20 md:space-y-28">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-14 lg:gap-20"
              >
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift ring-1 ring-border/60">
                    <Image
                      src={f.image}
                      alt={f.alt}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                    />
                  </div>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : ""}>
                  <p className="eyebrow">{f.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{f.title}</h3>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{f.body}</p>
                  <ul className="mt-6 space-y-3">
                    {f.points.map((p) => (
                      <li key={p.text} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <p.icon className="h-3.5 w-3.5" />
                        </span>
                        {p.text}
                      </li>
                    ))}
                  </ul>
                  <Button variant="link" asChild className="mt-6 h-auto p-0 text-base">
                    <Link href={f.href}>
                      {f.cta} <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top doctors ──────────────────────────────────────── */}
      <section className="container py-16 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Top rated</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Doctors patients keep coming back to</h2>
            <p className="mt-2 text-muted-foreground">Ranked by verified reviews only. A review needs a completed visit.</p>
          </div>
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/doctors">
              All doctors <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((d) => (
            <article key={d.slug} className="card-lift flex flex-col rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 rounded-2xl">
                  <AvatarImage src={d.user.image ?? undefined} alt={d.user.name ?? ""} />
                  <AvatarFallback className="rounded-2xl text-base">{initials(d.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/doctors/${d.slug}`}
                    className="block truncate font-semibold transition-colors hover:text-primary"
                  >
                    {d.user.name}
                  </Link>
                  <p className="truncate text-sm text-primary">{d.specialties[0]?.specialty.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.yearsOfExperience} yrs experience</p>
                  <div className="mt-2">
                    <RatingStars value={d.avgRating} showValue count={d.reviewCount} />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">{d.hospitals[0]?.hospital.city}</p>
                  <p className="font-semibold tabular-nums">{formatPKR(d.hospitals[0]?.consultationFee ?? 0)}</p>
                </div>
                <Button size="sm" asChild className="rounded-full px-4">
                  <Link href={`/doctors/${d.slug}`}>Book</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y">
        <Image
          src="/images/care-hands.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.07] dark:opacity-[0.12]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-glow" aria-hidden />
        <div className="container relative py-16 md:py-24">
          <div className="max-w-xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Three steps. No phone calls.</h2>
          </div>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            <span
              className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
              aria-hidden
            />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-glow">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Testimonials (real reviews only) ─────────────────── */}
      {testimonials.length > 0 ? (
        <section className="container py-16 md:py-24">
          <div className="max-w-xl">
            <p className="eyebrow">From patients</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Written after the visit, not before.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => {
              const who = t.isAnonymous ? "A verified patient" : (t.patient.name ?? "A verified patient");
              return (
                <figure
                  key={t.id}
                  className={`flex flex-col rounded-2xl border bg-card p-6 ${i === 0 ? "md:row-span-2 md:p-8" : ""}`}
                >
                  <Quote className="h-6 w-6 text-primary/50" />
                  <blockquote className={`mt-4 flex-1 leading-relaxed ${i === 0 ? "text-lg" : "text-sm"}`}>
                    {t.comment}
                  </blockquote>
                  <figcaption className="mt-6 border-t pt-4">
                    <div className="flex items-center gap-1 text-warning">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {who}
                      {t.patient.city && !t.isAnonymous ? (
                        <span className="font-normal text-muted-foreground">, {t.patient.city}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visited {t.doctor.user.name}
                      {t.doctor.specialties[0] ? ` · ${t.doctor.specialties[0].specialty.name}` : ""}
                    </p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Doctor CTA ───────────────────────────────────────── */}
      <section className="container pb-20 pt-4 md:pb-28">
        <div className="relative overflow-hidden rounded-[2rem] shadow-lift">
          <Image
            src="/images/doctor-cta.jpg"
            alt="A doctor in a white coat smiling outdoors"
            fill
            sizes="(min-width: 1360px) 1328px, 100vw"
            className="object-cover object-[80%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(178,70%,12%)] via-[hsl(178,70%,12%)]/90 to-[hsl(178,70%,12%)]/40" />
          <div className="relative grid gap-8 p-8 text-white sm:p-12 lg:grid-cols-[1.2fr_0.8fr] lg:p-16">
            <div>
              <p className="eyebrow text-teal-300">For doctors</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Your schedule, fees and patients — one portal.
              </h2>
              <p className="mt-4 max-w-xl text-white/80">
                List your practice, set a different fee for each hospital you sit at, manage your weekly schedule,
                and write prescriptions your patients can actually read.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="secondary" asChild className="rounded-full">
                  <Link href="/apply">
                    Join as a doctor <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="rounded-full text-white hover:bg-white/10 hover:text-white">
                  <Link href="/doctors">See how profiles look</Link>
                </Button>
              </div>
            </div>
            <ul className="hidden self-end rounded-2xl border border-white/15 bg-black/30 p-5 text-sm text-white/90 backdrop-blur-md lg:block lg:space-y-3">
              {[
                "A different fee for every hospital you sit at",
                "Weekly schedule with time-off and slot lengths",
                "Digital prescriptions and lab orders per visit",
              ].map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-teal-300" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
