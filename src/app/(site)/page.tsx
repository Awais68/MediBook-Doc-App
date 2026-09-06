import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileHeart,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getFeaturedDoctors, getSearchFacets } from "@/lib/services/doctors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DoctorSearchBar } from "@/components/search/doctor-search-bar";
import { RatingStars } from "@/components/shared/rating-stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPKR, initials } from "@/lib/utils";

export const revalidate = 300;

const FEATURES = [
  {
    icon: Wallet,
    title: "Fees that are per hospital, not per doctor",
    body: "The same consultant can be PKR 4,000 at one hospital and PKR 3,500 at another. We show the real fee for the location you pick — before you book.",
  },
  {
    icon: ShieldCheck,
    title: "Reviews only from people who actually went",
    body: "A review can only be written against a completed appointment. No paid ratings, no fake five stars.",
  },
  {
    icon: Repeat2,
    title: "Follow-ups that remind you",
    body: "When a doctor says 'come back in 2 weeks', we schedule the reminder and apply the discounted follow-up fee automatically.",
  },
  {
    icon: FileHeart,
    title: "Your records, in one timeline",
    body: "Every prescription, lab order and visit summary stays in your account — and you decide which doctor can see what.",
  },
  {
    icon: Users,
    title: "Book for your family",
    body: "One account, many patients. Add your parents or children and book on their behalf without juggling logins.",
  },
  {
    icon: CalendarCheck,
    title: "Real availability, not a request form",
    body: "Slots are derived from the doctor's live schedule and confirmed instantly. No 'we'll call you back'.",
  },
];

const STEPS = [
  { title: "Search", body: "Type a symptom, specialty, doctor or hospital. Filter by city, fee and rating." },
  { title: "Pick a slot", body: "Choose the hospital, the day and the exact time. See the fee for that location." },
  { title: "Confirm", body: "Pay online or at the clinic. You get a booking code, reminders and a token number." },
];

export default async function HomePage() {
  const [facets, featured, stats] = await Promise.all([
    getSearchFacets(),
    getFeaturedDoctors(6),
    Promise.all([
      prisma.doctor.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.hospital.count({ where: { isActive: true } }),
      prisma.appointment.count({ where: { status: "COMPLETED" } }),
      prisma.review.count({ where: { status: "PUBLISHED" } }),
    ]),
  ]);

  const [doctorCount, hospitalCount, visitCount, reviewCount] = stats;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="container relative py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1">
              <Sparkles className="h-3 w-3" />
              {doctorCount} verified doctors across {facets.cities.length} cities
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Find the right doctor.
              <br />
              <span className="text-primary">Book in under a minute.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Search by symptom or specialty, compare real consultation fees at each hospital, and confirm a slot
              instantly — then keep every prescription and report in one place.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <DoctorSearchBar />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {["Chest pain", "Skin allergy", "Pregnancy", "Child fever", "Back pain"].map((s) => (
                <Link
                  key={s}
                  href={`/doctors?q=${encodeURIComponent(s)}`}
                  className="rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: "Verified doctors", value: doctorCount },
              { label: "Hospitals & clinics", value: hospitalCount },
              { label: "Visits completed", value: visitCount },
              { label: "Verified reviews", value: reviewCount },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <dt className="order-2 text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
                <dd className="order-1 text-2xl font-semibold sm:text-3xl">{s.value.toLocaleString("en-PK")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Specialties */}
      <section className="container py-14 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse by specialty</h2>
            <p className="mt-1 text-sm text-muted-foreground">Not sure who to see? Search your symptom instead.</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href="/specialties">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {facets.specialties.slice(0, 12).map((s) => (
            <Link key={s.slug} href={`/doctors?specialty=${s.slug}`}>
              <Card className="h-full p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <p className="font-medium">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s._count.doctors} {s._count.doctors === 1 ? "doctor" : "doctors"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Why MediBook */}
      <section className="border-y bg-muted/30 py-14 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built to fix what booking apps get wrong</h2>
            <p className="mt-3 text-muted-foreground">
              Most platforms stop at "request an appointment". This one handles the whole visit — and everything after it.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top doctors */}
      <section className="container py-14 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Top rated this month</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ranked by verified patient reviews only.</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href="/doctors">
              All doctors <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((d) => (
            <Card key={d.slug} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={d.user.image ?? undefined} alt={d.user.name ?? ""} />
                  <AvatarFallback>{initials(d.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link href={`/doctors/${d.slug}`} className="block truncate font-semibold hover:text-primary">
                    {d.user.name}
                  </Link>
                  <p className="truncate text-sm text-primary">{d.specialties[0]?.specialty.name}</p>
                  <div className="mt-2">
                    <RatingStars value={d.avgRating} showValue count={d.reviewCount} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">{d.hospitals[0]?.hospital.city}</p>
                  <p className="font-semibold">{formatPKR(d.hospitals[0]?.consultationFee ?? 0)}</p>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/doctors/${d.slug}`}>Book</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 py-14 md:py-20">
        <div className="container">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Three steps, no phone calls</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-14 md:py-20">
        <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Are you a doctor?</h2>
              <p className="mt-2 max-w-xl text-primary-foreground/80">
                List your practice, set a different fee for each hospital you sit at, manage your weekly schedule, and
                write prescriptions your patients can actually read.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/apply">
                  Join as a doctor <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
