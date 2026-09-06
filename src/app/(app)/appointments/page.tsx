import Link from "next/link";
import { CalendarX2, Stethoscope } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ACTIVE_STATUSES } from "@/lib/services/booking";
import { AppointmentRow } from "@/components/app/appointment-row";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@prisma/client";

export const metadata = { title: "My appointments" };
export const dynamic = "force-dynamic";

const PER_PAGE = 10;

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function statusFilter(tab: TabKey): { status: { in: AppointmentStatus[] } } {
  if (tab === "past") return { status: { in: ["COMPLETED"] } };
  if (tab === "cancelled") return { status: { in: ["CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "NO_SHOW", "RESCHEDULED"] } };
  return { status: { in: ACTIVE_STATUSES } };
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { tab: rawTab, page: rawPage } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "upcoming";
  const page = Math.max(1, Number(rawPage) || 1);

  const user = await requireUser();
  const where = { patientId: user.id, ...statusFilter(tab) };

  const [appointments, total, counts] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: tab === "upcoming" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
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
      },
    }),
    prisma.appointment.count({ where }),
    prisma.$transaction(
      TABS.map((t) => prisma.appointment.count({ where: { patientId: user.id, ...statusFilter(t.key) } })),
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="My appointments"
        description="Every booking, its payment state and what happened in the visit."
        action={
          <Button asChild>
            <Link href="/doctors">Book new</Link>
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {TABS.map((t, i) => (
          <Link key={t.key} href={`/appointments?tab=${t.key}`}>
            <Badge variant={tab === t.key ? "solid" : "outline"} className="gap-1.5 px-3 py-1.5">
              {t.label}
              <span className="opacity-70">{counts[i]}</span>
            </Badge>
          </Link>
        ))}
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={tab === "upcoming" ? Stethoscope : CalendarX2}
          title={tab === "upcoming" ? "Nothing booked yet" : `No ${tab} appointments`}
          description={
            tab === "upcoming"
              ? "Find a verified doctor and pick a slot that suits you."
              : "Anything in this state will show up here."
          }
          action={
            tab === "upcoming" ? (
              <Button asChild>
                <Link href="/doctors">Find a doctor</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
          baseParams={{ tab }}
          basePath="/appointments"
        />
      </div>
    </div>
  );
}
