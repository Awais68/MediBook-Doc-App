import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Star,
  UserX,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { getDoctorStats } from "@/lib/services/analytics";
import { startOfLocalDay, addDays } from "@/lib/time";
import { formatPKR, formatTime, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AppointmentStatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusButton } from "@/components/doctor-portal/queue-actions";

export const metadata: Metadata = { title: "Doctor dashboard" };

export default async function DoctorHomePage() {
  const { user, doctor } = await requireDoctor();
  const dayStart = startOfLocalDay(new Date());

  const [stats, today, pendingCount] = await Promise.all([
    getDoctorStats(doctor.id),
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: { gte: dayStart, lt: addDays(dayStart, 1) },
        status: { notIn: ["CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "RESCHEDULED"] },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        code: true,
        scheduledAt: true,
        status: true,
        tokenNumber: true,
        isFollowUp: true,
        reasonForVisit: true,
        patient: { select: { name: true, image: true } },
        familyMember: { select: { name: true } },
        doctorHospital: { select: { hospital: { select: { name: true } } } },
      },
    }),
    prisma.appointment.count({ where: { doctorId: doctor.id, status: "PENDING" } }),
  ]);

  const cards = [
    { label: "Today", value: stats.todayCount, icon: CalendarDays, hint: `${pendingCount} awaiting confirmation` },
    { label: "Upcoming", value: stats.upcoming, icon: CalendarCheck, hint: "confirmed + pending" },
    { label: "Earnings (30d)", value: formatPKR(stats.earnings30d), icon: Wallet, hint: `${stats.completed30d} visits completed` },
    { label: "Rating", value: stats.avgRating ? stats.avgRating.toFixed(1) : "—", icon: Star, hint: `${stats.reviewCount} reviews` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Assalam-o-alaikum, ${user.name?.split(" ")[0] ?? "Doctor"}`}
        description="Your clinic day at a glance."
        action={
          <Button asChild variant="outline">
            <Link href={`/doctors/${doctor.slug}`}>View public profile</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.noShows30d > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <UserX className="h-4 w-4 text-amber-600" />
            <span>
              <strong>{stats.noShows30d}</strong> no-shows in the last 30 days. Consider enabling
              advance payment on your busiest location.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Today&apos;s queue</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctor/appointments">
              All appointments <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {today.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments today"
              description="Patients who book for today will appear here in token order."
              className="border-0"
            />
          ) : (
            <ul className="divide-y">
              {today.map((a) => {
                const name = a.familyMember?.name ?? a.patient.name ?? "Patient";
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="w-14 shrink-0 text-sm font-medium tabular-nums">
                      {formatTime(a.scheduledAt)}
                    </div>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={a.patient.image ?? undefined} alt="" />
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/doctor/appointments/${a.id}`} className="font-medium hover:underline">
                          {name}
                        </Link>
                        {a.tokenNumber ? <Badge variant="outline">#{a.tokenNumber}</Badge> : null}
                        {a.isFollowUp ? <Badge variant="secondary">Follow-up</Badge> : null}
                        <AppointmentStatusBadge status={a.status} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.reasonForVisit ?? "No reason given"} · {a.doctorHospital.hospital.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {a.status === "PENDING" ? (
                        <StatusButton appointmentId={a.id} to="CONFIRMED" />
                      ) : a.status === "CONFIRMED" ? (
                        <StatusButton appointmentId={a.id} to="CHECKED_IN" variant="outline" />
                      ) : a.status === "CHECKED_IN" ? (
                        <StatusButton appointmentId={a.id} to="IN_PROGRESS" />
                      ) : null}
                      {a.status === "IN_PROGRESS" || a.status === "CHECKED_IN" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/doctor/appointments/${a.id}`}>Open chart</Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Satisfaction score {stats.satisfactionScore || "—"}% · {stats.completedVisits} lifetime visits.
      </p>
    </div>
  );
}
