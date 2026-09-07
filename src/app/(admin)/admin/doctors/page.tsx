import Link from "next/link";
import type { Metadata } from "next";
import type { VerificationStatus } from "@prisma/client";
import { BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatDayDate, initials, formatPKR } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { VerificationBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifyButton, ReasonDialog } from "@/components/admin/verify-actions";

export const metadata: Metadata = { title: "Doctor verification · Admin" };

const PAGE_SIZE = 15;
const TABS = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"] as const;

export default async function AdminDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requirePermission("doctor.verify");
  const sp = await searchParams;
  const status = (TABS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as VerificationStatus)
    : "PENDING";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = { verificationStatus: status };
  const [doctors, total, counts] = await Promise.all([
    prisma.doctor.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        pmdcNumber: true,
        bio: true,
        yearsOfExperience: true,
        languages: true,
        createdAt: true,
        verificationStatus: true,
        rejectionReason: true,
        user: { select: { name: true, email: true, phone: true, image: true } },
        specialties: { select: { isPrimary: true, specialty: { select: { name: true } } } },
        educations: { select: { id: true, degree: true, institute: true, year: true } },
        experiences: { select: { id: true, title: true, organization: true, startYear: true, endYear: true } },
        hospitals: {
          select: {
            id: true,
            consultationFee: true,
            hospital: { select: { name: true, city: true } },
          },
        },
      },
    }),
    prisma.doctor.count({ where }),
    Promise.all(TABS.map((t) => prisma.doctor.count({ where: { verificationStatus: t } }))),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor verification"
        description="Check the PMDC number against the council register before approving. Approval flips the user's role to DOCTOR."
      />

      <Tabs value={status}>
        <TabsList className="flex-wrap">
          {TABS.map((t, i) => (
            <TabsTrigger key={t} value={t} asChild>
              <Link href={`/admin/doctors?status=${t}`}>
                {t.replace(/_/g, " ").toLowerCase()}
                <span className="ml-1.5 text-xs text-muted-foreground">{counts[i]}</span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {doctors.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="Nothing in this bucket" />
      ) : (
        <div className="space-y-4">
          {doctors.map((d) => (
            <Card key={d.id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={d.user.image ?? undefined} alt="" />
                    <AvatarFallback>{initials(d.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{d.user.name}</p>
                      <VerificationBadge status={d.verificationStatus} />
                      <Badge variant="outline">PMDC {d.pmdcNumber}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {d.user.email ?? "no email"} · {d.user.phone ?? "no phone"} · applied{" "}
                      {formatDayDate(d.createdAt)} · {d.yearsOfExperience} yrs experience
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.specialties.map((s) => (
                        <Badge key={s.specialty.name} variant={s.isPrimary ? "default" : "secondary"}>
                          {s.specialty.name}
                        </Badge>
                      ))}
                      {d.languages.map((l) => (
                        <Badge key={l} variant="outline">{l}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {d.bio ? <p className="text-sm text-muted-foreground">{d.bio}</p> : null}

                <div className="grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Education</p>
                    {d.educations.map((e) => (
                      <p key={e.id}>
                        {e.degree} — {e.institute}
                        {e.year ? ` (${e.year})` : ""}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Experience</p>
                    {d.experiences.map((e) => (
                      <p key={e.id}>
                        {e.title}, {e.organization} ({e.startYear}–{e.endYear ?? "now"})
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Practice</p>
                    {d.hospitals.map((h) => (
                      <p key={h.id}>
                        {h.hospital.name}, {h.hospital.city} — {formatPKR(h.consultationFee)}
                      </p>
                    ))}
                  </div>
                </div>

                {d.rejectionReason ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Reason on file: {d.rejectionReason}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {status !== "APPROVED" ? (
                    <VerifyButton doctorId={d.id} decision="APPROVED" label="Approve" />
                  ) : null}
                  {status === "PENDING" ? (
                    <VerifyButton doctorId={d.id} decision="UNDER_REVIEW" label="Mark under review" variant="outline" />
                  ) : null}
                  {status !== "REJECTED" ? (
                    <ReasonDialog doctorId={d.id} decision="REJECTED" label="Reject" title="Reject this application" />
                  ) : null}
                  {status === "APPROVED" ? (
                    <ReasonDialog doctorId={d.id} decision="SUSPENDED" label="Suspend" title="Suspend this doctor" />
                  ) : null}
                  {status === "APPROVED" ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/doctors/${d.slug}`}>View public page</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{ status }}
        basePath="/admin/doctors"
      />
    </div>
  );
}
