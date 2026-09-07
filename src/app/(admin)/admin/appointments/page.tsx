import Link from "next/link";
import type { Metadata } from "next";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { APPOINTMENT_STATUS } from "@/lib/labels";
import { formatDayDate, formatTime, formatPKR } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Appointments · Admin" };

const PAGE_SIZE = 25;

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePermission("analytics.platform");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status && isAppointmentStatus(sp.status) ? (sp.status as AppointmentStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.AppointmentWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { patient: { name: { contains: q, mode: "insensitive" } } },
            { doctor: { user: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        scheduledAt: true,
        status: true,
        fee: true,
        patient: { select: { name: true } },
        doctor: { select: { slug: true, user: { select: { name: true } } } },
        hospital: { select: { name: true, city: true } },
        payment: { select: { status: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Every booking on the platform." />

      <form className="flex flex-wrap gap-2" action="/admin/appointments">
        <Input name="q" defaultValue={q} placeholder="Code, patient or doctor" className="max-w-xs" />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No appointments match" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.code}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDayDate(a.scheduledAt)}
                    <br />
                    <span className="text-muted-foreground">{formatTime(a.scheduledAt)}</span>
                  </TableCell>
                  <TableCell>{a.patient.name}</TableCell>
                  <TableCell>
                    <Link href={`/doctors/${a.doctor.slug}`} className="hover:underline">
                      {a.doctor.user.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.hospital.name}
                    <br />
                    <span className="text-muted-foreground">{a.hospital.city}</span>
                  </TableCell>
                  <TableCell>{formatPKR(a.fee, { free: "Free" })}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <AppointmentStatusBadge status={a.status} />
                      {a.payment ? <PaymentStatusBadge status={a.payment.status} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{ q: q || undefined, status }}
        basePath="/admin/appointments"
      />
    </div>
  );
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return value in APPOINTMENT_STATUS;
}
