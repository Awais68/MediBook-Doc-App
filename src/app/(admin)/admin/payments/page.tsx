import type { Metadata } from "next";
import type { PaymentStatus, Prisma } from "@prisma/client";
import { Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import { formatDayDate, formatPKR } from "@/lib/utils";
import { addDays, startOfLocalDay } from "@/lib/time";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefundButton } from "@/components/admin/refund-button";

export const metadata: Metadata = { title: "Payments · Admin" };

const PAGE_SIZE = 25;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePermission("analytics.platform");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status && sp.status in PAYMENT_STATUS ? (sp.status as PaymentStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.PaymentWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { providerRef: { contains: q, mode: "insensitive" } },
            { appointment: { code: { contains: q, mode: "insensitive" } } },
            { appointment: { patient: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const monthAgo = addDays(startOfLocalDay(new Date()), -30);
  const [rows, total, paid30d, refunded30d, pendingCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        platformFee: true,
        method: true,
        status: true,
        provider: true,
        providerRef: true,
        paidAt: true,
        refundAmount: true,
        createdAt: true,
        appointment: {
          select: {
            code: true,
            patient: { select: { name: true } },
            doctor: { select: { user: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthAgo } },
      _sum: { amount: true, platformFee: true },
    }),
    prisma.payment.aggregate({
      where: { status: "REFUNDED", refundedAt: { gte: monthAgo } },
      _sum: { refundAmount: true },
    }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "REFUND_PENDING"] } } }),
  ]);

  const cards = [
    { label: "Collected (30d)", value: formatPKR(paid30d._sum.amount ?? 0) },
    { label: "Platform fee (30d)", value: formatPKR(paid30d._sum.platformFee ?? 0) },
    { label: "Refunded (30d)", value: formatPKR(refunded30d._sum.refundAmount ?? 0) },
    { label: "Needs attention", value: pendingCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Gateway settlements and refunds." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/payments">
        <Input name="q" defaultValue={q} placeholder="Ref, code or patient" className="max-w-xs" />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments match" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appointment</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.appointment.code}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {formatDayDate(p.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>{p.appointment.patient.name}</TableCell>
                  <TableCell>{p.appointment.doctor.user.name}</TableCell>
                  <TableCell>
                    {formatPKR(p.amount)}
                    {p.refundAmount ? (
                      <span className="block text-xs text-muted-foreground">
                        −{formatPKR(p.refundAmount)} refunded
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs">
                    {PAYMENT_METHOD[p.method]}
                    {p.provider ? <span className="block text-muted-foreground">{p.provider}</span> : null}
                  </TableCell>
                  <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                  <TableCell>
                    {p.status === "PAID" ? <RefundButton paymentId={p.id} amount={p.amount} /> : null}
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
        basePath="/admin/payments"
      />
    </div>
  );
}
