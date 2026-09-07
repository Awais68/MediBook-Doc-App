import Link from "next/link";
import type { Metadata } from "next";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { startOfLocalDay, addDays } from "@/lib/time";
import { formatDayDate, formatTime, initials, formatPKR } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Appointments · Doctor" };

const PAGE_SIZE = 20;

type Range = "today" | "upcoming" | "past" | "cancelled";

const CANCELLED: AppointmentStatus[] = [
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "NO_SHOW",
  "RESCHEDULED",
];

function whereFor(range: Range, doctorId: string): Prisma.AppointmentWhereInput {
  const dayStart = startOfLocalDay(new Date());
  switch (range) {
    case "today":
      return {
        doctorId,
        scheduledAt: { gte: dayStart, lt: addDays(dayStart, 1) },
        status: { notIn: CANCELLED },
      };
    case "upcoming":
      return {
        doctorId,
        scheduledAt: { gte: addDays(dayStart, 1) },
        status: { notIn: CANCELLED },
      };
    case "cancelled":
      return { doctorId, status: { in: CANCELLED } };
    default:
      return { doctorId, scheduledAt: { lt: dayStart }, status: { notIn: CANCELLED } };
  }
}

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { doctor } = await requireDoctor();
  const sp = await searchParams;
  const range = (["today", "upcoming", "past", "cancelled"] as const).includes(sp.tab as Range)
    ? (sp.tab as Range)
    : "today";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = whereFor(range, doctor.id);
  const [rows, total, counts] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: range === "past" || range === "cancelled" ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        scheduledAt: true,
        status: true,
        fee: true,
        tokenNumber: true,
        isFollowUp: true,
        reasonForVisit: true,
        patient: { select: { name: true, image: true, phone: true } },
        familyMember: { select: { name: true } },
        doctorHospital: { select: { hospital: { select: { name: true } } } },
        payment: { select: { status: true } },
        consultation: { select: { id: true } },
      },
    }),
    prisma.appointment.count({ where }),
    Promise.all(
      (["today", "upcoming", "past", "cancelled"] as const).map((r) =>
        prisma.appointment.count({ where: whereFor(r, doctor.id) }),
      ),
    ),
  ]);

  const tabs = [
    { key: "today", label: "Today", count: counts[0] },
    { key: "upcoming", label: "Upcoming", count: counts[1] },
    { key: "past", label: "Past", count: counts[2] },
    { key: "cancelled", label: "Cancelled", count: counts[3] },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Every booking across all your practice locations." />

      <Tabs value={range}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} asChild>
              <Link href={`/doctor/appointments?tab=${t.key}`}>
                {t.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing here yet" description="Bookings will show up as patients reserve your slots." />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const name = a.familyMember?.name ?? a.patient.name ?? "Patient";
            return (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center gap-4 py-4">
                  <Avatar className="h-10 w-10">
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
                      {a.payment ? <PaymentStatusBadge status={a.payment.status} /> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDayDate(a.scheduledAt)} · {formatTime(a.scheduledAt)} ·{" "}
                      {a.doctorHospital.hospital.name} · {formatPKR(a.fee, { free: "Free" })}
                    </p>
                    {a.reasonForVisit ? (
                      <p className="mt-1 truncate text-sm text-muted-foreground">{a.reasonForVisit}</p>
                    ) : null}
                  </div>
                  <Button asChild size="sm" variant={a.consultation ? "outline" : "default"}>
                    <Link href={`/doctor/appointments/${a.id}`}>
                      {a.consultation ? "View chart" : "Open chart"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{ tab: range }}
        basePath="/doctor/appointments"
      />
    </div>
  );
}
