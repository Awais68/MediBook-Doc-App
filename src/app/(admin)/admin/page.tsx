import Link from "next/link";
import type { Metadata } from "next";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getPlatformStats, getAppointmentTrend } from "@/lib/services/analytics";
import { formatPKR, formatDayDate, initials } from "@/lib/utils";
import { APPOINTMENT_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/admin/trend-chart";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminHomePage() {
  await requirePermission("analytics.platform");

  const [stats, trend, pendingDoctors, topDoctors] = await Promise.all([
    getPlatformStats(),
    getAppointmentTrend(30),
    prisma.doctor.findMany({
      where: { verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        pmdcNumber: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
        specialties: { take: 1, select: { specialty: { select: { name: true } } } },
      },
    }),
    prisma.doctor.findMany({
      where: { verificationStatus: "APPROVED", reviewCount: { gt: 0 } },
      orderBy: [{ completedVisits: "desc" }],
      take: 5,
      select: {
        id: true,
        slug: true,
        avgRating: true,
        completedVisits: true,
        user: { select: { name: true, image: true } },
      },
    }),
  ]);

  const cards = [
    { label: "Patients", value: stats.patients.toLocaleString(), icon: Users, href: "/admin/users" },
    { label: "Verified doctors", value: stats.doctors, icon: BadgeCheck, href: "/admin/doctors", hint: `${stats.pendingDoctors} pending` },
    { label: "Hospitals", value: stats.hospitals, icon: Building2, href: "/admin/hospitals" },
    { label: "Appointments today", value: stats.appointmentsToday, icon: CalendarDays, href: "/admin/appointments", hint: `${stats.appointmentsTotal.toLocaleString()} all time` },
    { label: "Revenue (30d)", value: formatPKR(stats.revenue30d), icon: Wallet, href: "/admin/payments", hint: `${stats.paidCount30d} payments` },
    { label: "Reviews pending", value: stats.reviewsPending, icon: Star, href: "/admin/reviews" },
  ];

  const statusRows = Object.entries(stats.statusCounts).sort((a, b) => b[1] - a[1]);
  const totalStatus = statusRows.reduce((sum, [, n]) => sum + n, 0) || 1;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Last 30 days unless stated otherwise." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-xl transition-shadow hover:shadow-md">
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{c.value}</p>
                {c.hint ? <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p> : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Verification queue</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/doctors">Open queue</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Queue is clear.</p>
            ) : (
              pendingDoctors.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={d.user.image ?? undefined} alt="" />
                    <AvatarFallback>{initials(d.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      PMDC {d.pmdcNumber} · {d.specialties[0]?.specialty.name ?? "No specialty"} ·
                      applied {formatDayDate(d.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment status mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusRows.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-muted-foreground">
                  {APPOINTMENT_STATUS[status as keyof typeof APPOINTMENT_STATUS]?.label ?? status}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${(count / totalStatus) * 100}%` }} />
                </div>
                <span className="w-12 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Busiest doctors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topDoctors.map((d) => (
            <div key={d.id} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={d.user.image ?? undefined} alt="" />
                <AvatarFallback>{initials(d.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link href={`/doctors/${d.slug}`} className="text-sm font-medium hover:underline">
                  {d.user.name}
                </Link>
              </div>
              <Badge variant="secondary">{d.completedVisits} visits</Badge>
              <Badge variant="outline">{d.avgRating.toFixed(1)} ★</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
