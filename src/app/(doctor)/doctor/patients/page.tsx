import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { formatDayDate, initials, calculateAge } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Patients · Doctor" };

const PAGE_SIZE = 20;

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { doctor } = await requireDoctor();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  // "My patients" = anyone who has ever had an appointment with me. Grouping on
  // the appointment keeps the last-visit date in one round trip.
  const where = {
    doctorId: doctor.id,
    ...(q
      ? { patient: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } }
      : {}),
  };

  const grouped = await prisma.appointment.groupBy({
    by: ["patientId"],
    where,
    _count: { _all: true },
    _max: { scheduledAt: true },
    orderBy: { _max: { scheduledAt: "desc" } },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const totalGroups = await prisma.appointment.groupBy({ by: ["patientId"], where });

  const patients = grouped.length
    ? await prisma.user.findMany({
        where: { id: { in: grouped.map((g) => g.patientId) } },
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          patientProfile: { select: { bloodGroup: true, allergies: true } },
        },
      })
    : [];
  const byId = new Map(patients.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" description="Everyone who has booked with you, most recent first." />

      <form className="flex gap-2" action="/doctor/patients">
        <Input name="q" defaultValue={q} placeholder="Search by name or phone" className="max-w-sm" />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {grouped.length === 0 ? (
        <EmptyState icon={Users} title="No patients yet" description="Your patient list builds up as appointments come in." />
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const p = byId.get(g.patientId);
            if (!p) return null;
            const age = calculateAge(p.dateOfBirth);
            return (
              <Card key={g.patientId}>
                <CardContent className="flex flex-wrap items-center gap-4 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.image ?? undefined} alt="" />
                    <AvatarFallback>{initials(p.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/doctor/patients/${p.id}`} className="font-medium hover:underline">
                        {p.name ?? "Patient"}
                      </Link>
                      {p.patientProfile?.bloodGroup ? (
                        <Badge variant="outline">{p.patientProfile.bloodGroup}</Badge>
                      ) : null}
                      {p.patientProfile?.allergies.length ? (
                        <Badge variant="destructive">
                          {p.patientProfile.allergies.length} allergy alert
                          {p.patientProfile.allergies.length > 1 ? "s" : ""}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[p.gender, age ? `${age} yrs` : null, p.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{g._count._all} visit{g._count._all > 1 ? "s" : ""}</p>
                    {g._max.scheduledAt ? <p>Last: {formatDayDate(g._max.scheduledAt)}</p> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(totalGroups.length / PAGE_SIZE)}
        baseParams={{ q: q || undefined }}
        basePath="/doctor/patients"
      />
    </div>
  );
}
