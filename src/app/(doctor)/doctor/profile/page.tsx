import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { VerificationBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorProfileForm } from "@/components/doctor-portal/doctor-profile-form";

export const metadata: Metadata = { title: "Profile · Doctor" };

export default async function DoctorProfilePage() {
  const { doctor } = await requireDoctor();

  const row = await prisma.doctor.findUnique({
    where: { id: doctor.id },
    select: {
      slug: true,
      pmdcNumber: true,
      bio: true,
      yearsOfExperience: true,
      languages: true,
      isAcceptingPatients: true,
      videoConsultEnabled: true,
      videoConsultFee: true,
      avgWaitMinutes: true,
      verificationStatus: true,
      specialties: { select: { isPrimary: true, specialty: { select: { name: true } } } },
      educations: { orderBy: { year: "desc" }, select: { id: true, degree: true, institute: true, year: true } },
      experiences: { orderBy: { startYear: "desc" }, select: { id: true, title: true, organization: true, startYear: true, endYear: true } },
    },
  });
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description={`PMDC ${row.pmdcNumber}`}
        action={
          <div className="flex items-center gap-2">
            <VerificationBadge status={row.verificationStatus} />
            <Button asChild variant="outline">
              <Link href={`/doctors/${row.slug}`}>View public page</Link>
            </Button>
          </div>
        }
      />

      <DoctorProfileForm
        initial={{
          bio: row.bio ?? "",
          yearsOfExperience: row.yearsOfExperience,
          languages: row.languages,
          isAcceptingPatients: row.isAcceptingPatients,
          videoConsultEnabled: row.videoConsultEnabled,
          videoConsultFee: row.videoConsultFee,
          avgWaitMinutes: row.avgWaitMinutes,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Specialties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {row.specialties.map((s) => (
            <Badge key={s.specialty.name} variant={s.isPrimary ? "default" : "secondary"}>
              {s.specialty.name}
            </Badge>
          ))}
          <p className="w-full text-xs text-muted-foreground">
            Specialty changes go through admin so the directory stays trustworthy — email
            support@medibook.pk.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {row.educations.length === 0 ? (
              <p className="text-muted-foreground">Nothing on file.</p>
            ) : (
              row.educations.map((e) => (
                <div key={e.id}>
                  <p className="font-medium">{e.degree}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.institute}
                    {e.year ? ` · ${e.year}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {row.experiences.length === 0 ? (
              <p className="text-muted-foreground">Nothing on file.</p>
            ) : (
              row.experiences.map((e) => (
                <div key={e.id}>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.organization} · {e.startYear}–{e.endYear ?? "present"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
