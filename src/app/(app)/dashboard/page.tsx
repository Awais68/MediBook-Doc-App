import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarPlus,
  ClipboardList,
  FileText,
  Pill,
  Star,
  Stethoscope,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPatientFollowUps } from "@/lib/services/consultation";
import { pendingReviews } from "@/lib/services/reviews";
import { ACTIVE_STATUSES } from "@/lib/services/booking";
import { AppointmentRow } from "@/components/app/appointment-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const APPOINTMENT_SELECT = {
  id: true,
  code: true,
  scheduledAt: true,
  status: true,
  consultationType: true,
  fee: true,
  isFollowUp: true,
  tokenNumber: true,
  doctor: { select: { slug: true, user: { select: { name: true, image: true } } } },
  hospital: { select: { name: true, city: true } },
  familyMember: { select: { name: true } },
  payment: { select: { status: true } },
} as const;

export default async function DashboardPage() {
  const user = await requireUser();

  const [upcoming, past, followUps, reviewable, counts] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: user.id, status: { in: ACTIVE_STATUSES } },
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: APPOINTMENT_SELECT,
    }),
    prisma.appointment.findMany({
      where: { patientId: user.id, status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
      take: 3,
      select: APPOINTMENT_SELECT,
    }),
    getPatientFollowUps(user.id),
    pendingReviews(user.id),
    prisma.$transaction([
      prisma.appointment.count({ where: { patientId: user.id, status: "COMPLETED" } }),
      prisma.prescription.count({ where: { consultation: { appointment: { patientId: user.id } } } }),
      prisma.medicalRecord.count({ where: { patientId: user.id } }),
    ]),
  ]);

  const dueFollowUps = followUps.filter((f) => f.followUpDate && f.followUpDate <= new Date(Date.now() + 14 * 864e5));

  const stats = [
    { label: "Visits completed", value: counts[0], icon: CalendarCheck2, href: "/appointments?tab=past" },
    { label: "Prescriptions", value: counts[1], icon: Pill, href: "/prescriptions" },
    { label: "Records on file", value: counts[2], icon: FileText, href: "/records" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Salaam{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your care.</p>
        </div>
        <Button asChild>
          <Link href="/doctors">
            <CalendarPlus />
            Book an appointment
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Follow-ups the doctor asked for but the patient hasn't booked */}
      {dueFollowUps.length ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" />
            Follow-ups your doctor asked for
          </h2>
          <div className="space-y-3">
            {dueFollowUps.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{f.appointment.doctor.user.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {f.followUpReason ?? f.diagnosis ?? "Routine follow-up"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due {f.followUpDate ? formatDate(f.followUpDate) : "soon"} · seen at {f.appointment.hospital.name}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/doctors/${f.appointment.doctor.slug}?followUp=${f.appointment.id}`}>
                      Book follow-up
                      <ArrowRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Upcoming */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming appointments</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/appointments">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No upcoming appointments"
            description="Search verified doctors by city, specialty or symptom and book in a couple of taps."
            action={
              <Button asChild>
                <Link href="/doctors">Find a doctor</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </section>

      {/* Reviews waiting */}
      {reviewable.length ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Star className="h-5 w-5 text-amber-500" />
            Rate your recent visits
          </h2>
          <div className="space-y-3">
            {reviewable.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{a.doctor.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.hospital.name} · {formatDate(a.scheduledAt)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/appointments/${a.id}#review`}>Write a review</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Past */}
      {past.length ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent visits</h2>
            <Badge variant="secondary">{counts[0]} total</Badge>
          </div>
          <div className="space-y-3">
            {past.map((a) => (
              <AppointmentRow key={a.id} appointment={a} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
