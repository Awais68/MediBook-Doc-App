import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, Phone } from "lucide-react";
import { requireDoctor } from "@/lib/session";
import { getPatientChartForDoctor } from "@/lib/services/records";
import { guarded } from "@/lib/page-guard";
import { formatDayDate, initials, calculateAge } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Patient chart · Doctor" };

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const { doctor } = await requireDoctor();

  // Throws if this doctor has never treated the patient — the care-relationship guard.
  const { patient, visits, sharedRecords, prescriptions } = await guarded(
    getPatientChartForDoctor(doctor.id, patientId),
  );

  const age = calculateAge(patient.dateOfBirth);
  const profile = patient.patientProfile;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/doctor/patients">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to patients
        </Link>
      </Button>

      <PageHeader
        title={patient.name ?? "Patient"}
        description={[patient.gender, age ? `${age} yrs` : null, patient.city].filter(Boolean).join(" · ")}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={patient.image ?? undefined} alt="" />
                  <AvatarFallback>{initials(patient.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{patient.name}</p>
                  {profile?.bloodGroup ? (
                    <p className="text-xs text-muted-foreground">Blood group {profile.bloodGroup}</p>
                  ) : null}
                </div>
              </div>
              {patient.phone ? (
                <a href={`tel:${patient.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="h-4 w-4" /> {patient.phone}
                </a>
              ) : null}
              <Separator />
              {profile?.allergies.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-destructive">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.allergies.map((a) => <Badge key={a} variant="destructive">{a}</Badge>)}
                  </div>
                </div>
              ) : null}
              {profile?.chronicConditions.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.chronicConditions.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                  </div>
                </div>
              ) : null}
              {profile?.currentMedications.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Current medication</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.currentMedications.map((a) => <Badge key={a} variant="outline">{a}</Badge>)}
                  </div>
                </div>
              ) : null}
              {profile?.emergencyContactPhone ? (
                <p className="text-xs text-muted-foreground">
                  Emergency: {profile.emergencyContactName} · {profile.emergencyContactPhone}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0">
          <Tabs defaultValue="visits">
            <TabsList>
              <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
              <TabsTrigger value="records">Shared records ({sharedRecords.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="mt-4 space-y-3">
              {visits.length === 0 ? (
                <EmptyState icon={FileText} title="No completed visits yet" />
              ) : (
                visits.map((v) => (
                  <Card key={v.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">
                          {v.consultation?.diagnosis ?? v.consultation?.chiefComplaint ?? "Consultation"}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {formatDayDate(v.scheduledAt)} · {v.hospital.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {v.doctorId === doctor.id ? "Seen by you" : `Seen by ${v.doctor.user.name}`}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {v.consultation?.advice ? <p>{v.consultation.advice}</p> : null}
                      {v.consultation?.prescription?.items.length ? (
                        <p className="text-muted-foreground">
                          Rx: {v.consultation.prescription.items.map((i) =>
                            [i.drugName, i.strength].filter(Boolean).join(" ")).join(", ")}
                        </p>
                      ) : null}
                      {v.consultation?.labOrders.length ? (
                        <p className="text-muted-foreground">
                          Labs: {v.consultation.labOrders.map((l) => l.testName).join(", ")}
                        </p>
                      ) : null}
                      {v.doctorId === doctor.id ? (
                        <Button asChild size="sm" variant="ghost" className="-ml-3">
                          <Link href={`/doctor/appointments/${v.id}`}>Open chart</Link>
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-4 space-y-3">
              {prescriptions.length === 0 ? (
                <EmptyState icon={FileText} title="No prescriptions on file" />
              ) : (
                prescriptions.map((p) => (
                  <Card key={p.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{p.code}</CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {formatDayDate(p.issuedAt)} · {p.doctor.user.name}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {p.items.map((i) => [i.drugName, i.strength, i.frequency].filter(Boolean).join(" ")).join(" · ")}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="records" className="mt-4 space-y-3">
              {sharedRecords.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nothing shared with you"
                  description="The patient controls this — they can share reports from their records page."
                />
              ) : (
                sharedRecords.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex flex-wrap items-center gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDayDate(r.recordDate)} · {r.type.replace(/_/g, " ").toLowerCase()}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                      {r.fileUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={r.fileUrl} target="_blank" rel="noreferrer">Open</a>
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
