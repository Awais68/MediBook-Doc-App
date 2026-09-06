import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquare,
  Stethoscope,
  ThumbsUp,
  Users,
  Video,
} from "lucide-react";
import { getDoctorBySlug, getDoctorReviews } from "@/lib/services/doctors";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BookingWidget, type BookingPractice } from "@/components/booking/booking-widget";
import { ReviewList, ReviewSummary } from "@/components/doctor/review-list";
import { RatingStars } from "@/components/shared/rating-stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAY_SHORT } from "@/lib/constants";
import { formatPKR, initials } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ followUp?: string }>;
};

export const revalidate = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await getDoctorBySlug(slug);
  if (!doctor) return { title: "Doctor not found" };

  const primary = doctor.specialties.find((s) => s.isPrimary)?.specialty.name ?? "Doctor";
  const city = doctor.hospitals[0]?.hospital.city ?? doctor.user.city ?? "Pakistan";
  const fee = doctor.hospitals[0]?.consultationFee;

  return {
    title: `${doctor.user.name} — ${primary} in ${city}`,
    description:
      doctor.bio?.slice(0, 155) ??
      `Book an appointment with ${doctor.user.name}, ${primary} in ${city}. ${doctor.yearsOfExperience} years of experience${fee ? `, fee ${formatPKR(fee)}` : ""}.`,
    alternates: { canonical: `/doctors/${doctor.slug}` },
  };
}

export default async function DoctorProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { followUp } = await searchParams;

  const doctor = await getDoctorBySlug(slug);
  if (!doctor) notFound();

  const [{ reviews, total, distribution }, sessionUser] = await Promise.all([
    getDoctorReviews(doctor.id, 10),
    getSessionUser(),
  ]);

  // A follow-up link is only honoured if the appointment really belongs to this
  // patient and this doctor — the query string alone is not trusted.
  const parent =
    followUp && sessionUser
      ? await prisma.appointment.findFirst({
          where: { id: followUp, patientId: sessionUser.id, doctorId: doctor.id, status: "COMPLETED" },
          select: { id: true, doctorHospitalId: true },
        })
      : null;

  const primary = doctor.specialties.find((s) => s.isPrimary)?.specialty;
  const practices: BookingPractice[] = doctor.hospitals.map((h) => ({
    id: h.id,
    consultationFee: h.consultationFee,
    followUpFee: h.followUpFee,
    followUpValidDays: h.followUpValidDays,
    cancellationHours: h.cancellationHours,
    acceptsCashAtClinic: h.acceptsCashAtClinic,
    acceptsOnlinePayment: h.acceptsOnlinePayment,
    roomNumber: h.roomNumber,
    hospital: {
      name: h.hospital.name,
      city: h.hospital.city,
      area: h.hospital.area,
      address: h.hospital.address,
    },
  }));

  const stats = [
    { icon: Briefcase, label: "Experience", value: `${doctor.yearsOfExperience} yrs` },
    { icon: Users, label: "Patients seen", value: doctor.completedVisits.toLocaleString("en-PK") },
    { icon: ThumbsUp, label: "Satisfaction", value: `${doctor.satisfactionScore}%` },
    { icon: Clock, label: "Avg wait", value: `${doctor.avgWaitMinutes} min` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.user.name,
    medicalSpecialty: primary?.name,
    address: doctor.hospitals.map((h) => ({
      "@type": "PostalAddress",
      streetAddress: h.hospital.address,
      addressLocality: h.hospital.city,
      addressCountry: "PK",
    })),
    ...(doctor.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: doctor.avgRating,
        reviewCount: doctor.reviewCount,
      },
    }),
  };

  return (
    <div className="container py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/doctors" className="hover:text-foreground">
          Doctors
        </Link>
        {primary ? (
          <>
            <span className="mx-2">/</span>
            <Link href={`/doctors?specialty=${primary.slug}`} className="hover:text-foreground">
              {primary.name}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{doctor.user.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-5 sm:flex-row">
            <Avatar className="h-24 w-24 shrink-0 text-xl">
              {doctor.user.image ? <AvatarImage src={doctor.user.image} alt={doctor.user.name ?? ""} /> : null}
              <AvatarFallback>{initials(doctor.user.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{doctor.user.name}</h1>
                {doctor.verifiedAt ? (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    PMDC verified
                  </Badge>
                ) : null}
                {doctor.videoConsultEnabled ? (
                  <Badge variant="secondary" className="gap-1">
                    <Video className="h-3.5 w-3.5" />
                    Video available
                  </Badge>
                ) : null}
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <Stethoscope className="h-4 w-4" />
                {doctor.specialties.map((s) => s.specialty.name).join(", ")}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {doctor.educations.map((e) => e.degree).join(", ")}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <RatingStars value={doctor.avgRating} showValue count={doctor.reviewCount} />
                <span className="text-muted-foreground">PMDC #{doctor.pmdcNumber}</span>
                {!doctor.isAcceptingPatients ? <Badge variant="warning">Not accepting new patients</Badge> : null}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <s.icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-lg font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="locations">Locations &amp; fees</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({total})</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6 pt-6">
              {doctor.bio ? (
                <section>
                  <h2 className="mb-2 text-lg font-semibold">About {doctor.user.name}</h2>
                  <p className="leading-relaxed text-muted-foreground">{doctor.bio}</p>
                </section>
              ) : null}

              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Education
                </h2>
                <ul className="space-y-3">
                  {doctor.educations.map((e) => (
                    <li key={e.id} className="border-l-2 pl-4">
                      <p className="font-medium">{e.degree}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.institute}
                        {e.year ? ` · ${e.year}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {doctor.experiences.length ? (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Experience
                  </h2>
                  <ul className="space-y-3">
                    {doctor.experiences.map((e) => (
                      <li key={e.id} className="border-l-2 pl-4">
                        <p className="font-medium">{e.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {e.organization} · {e.startYear}–{e.endYear ?? "present"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <Languages className="h-5 w-5 text-primary" />
                  Languages
                </h2>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages.map((l) => (
                    <Badge key={l} variant="secondary">
                      {l}
                    </Badge>
                  ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="locations" className="space-y-4 pt-6">
              {doctor.hospitals.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-2 font-semibold">
                          <Building2 className="h-4 w-4 text-primary" />
                          {h.hospital.name}
                        </h3>
                        <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          {h.hospital.address}, {h.hospital.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="flex items-center justify-end gap-1.5 text-lg font-semibold">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          {formatPKR(h.consultationFee)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Follow-up {formatPKR(h.followUpFee, { free: "free" })} · {h.followUpValidDays} days
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-2 sm:grid-cols-2">
                      {h.schedules.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                          <span className="font-medium">{DAY_SHORT[s.dayOfWeek]}</span>
                          <span className="text-muted-foreground">
                            {s.startTime} – {s.endTime}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {h.acceptsCashAtClinic ? <Badge variant="outline">Cash at clinic</Badge> : null}
                      {h.acceptsOnlinePayment ? <Badge variant="outline">Online payment</Badge> : null}
                      <Badge variant="outline">{h.slotDurationMinutes} min slots</Badge>
                      <Badge variant="outline">Free cancel {h.cancellationHours}h before</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6 pt-6">
              {total > 0 ? (
                <ReviewSummary avgRating={doctor.avgRating} reviewCount={total} distribution={distribution} />
              ) : null}
              <ReviewList reviews={reviews} />
              {total > reviews.length ? (
                <div className="flex justify-center">
                  <Button variant="outline" asChild>
                    <Link href={`/doctors/${doctor.slug}/reviews`}>
                      <MessageSquare />
                      See all {total} reviews
                    </Link>
                  </Button>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        {/* Booking rail */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BookingWidget
            doctor={{
              slug: doctor.slug,
              name: doctor.user.name ?? "Doctor",
              videoConsultEnabled: doctor.videoConsultEnabled,
              videoConsultFee: doctor.videoConsultFee,
            }}
            practices={practices}
            isSignedIn={Boolean(sessionUser)}
            followUpFor={parent ? { appointmentId: parent.id, doctorHospitalId: parent.doctorHospitalId } : null}
          />
        </aside>
      </div>
    </div>
  );
}
