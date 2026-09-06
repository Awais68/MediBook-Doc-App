import Link from "next/link";
import { CalendarCheck2, ExternalLink, FileText, FlaskConical, Pill, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPatientTimeline } from "@/lib/services/records";
import { AddRecordDialog, DeleteRecordButton, ShareRecordDialog } from "@/components/app/record-dialogs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Medical records" };
export const dynamic = "force-dynamic";

const RECORD_TYPE_LABEL: Record<string, string> = {
  LAB_REPORT: "Lab report",
  IMAGING: "Imaging",
  PRESCRIPTION: "Prescription",
  DISCHARGE_SUMMARY: "Discharge summary",
  VACCINATION: "Vaccination",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

export default async function RecordsPage() {
  const user = await requireUser();

  const [{ appointments, records }, seenDoctors] = await Promise.all([
    getPatientTimeline(user.id),
    prisma.doctor.findMany({
      where: { appointments: { some: { patientId: user.id, status: "COMPLETED" } } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ]);

  const doctorOptions = seenDoctors.map((d) => ({ id: d.id, name: d.user.name ?? "Doctor" }));

  return (
    <div>
      <PageHeader
        title="Medical records"
        description="Your visit history plus anything you upload — one timeline you control."
        action={<AddRecordDialog />}
      />

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Visit timeline ({appointments.length})</TabsTrigger>
          <TabsTrigger value="files">My uploads ({records.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="pt-6">
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="No completed visits yet"
              description="Once a doctor completes your consultation, the notes and prescription land here automatically."
            />
          ) : (
            <ol className="relative space-y-6 border-l pl-6">
              {appointments.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{a.doctor.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {a.hospital.name}, {a.hospital.city}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatDate(a.scheduledAt)}</p>
                          <Link
                            href={`/appointments/${a.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Open visit
                          </Link>
                        </div>
                      </div>

                      {a.consultation ? (
                        <>
                          <Separator className="my-4" />
                          {a.consultation.diagnosis ? (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Diagnosis: </span>
                              <span className="font-medium">{a.consultation.diagnosis}</span>
                            </p>
                          ) : null}
                          {a.consultation.advice ? (
                            <p className="mt-1 text-sm text-muted-foreground">{a.consultation.advice}</p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {a.consultation.prescription ? (
                              <Badge variant="secondary" className="gap-1">
                                <Pill className="h-3 w-3" />
                                {a.consultation.prescription.items.length} medicines
                              </Badge>
                            ) : null}
                            {a.consultation.labOrders.length ? (
                              <Badge variant="secondary" className="gap-1">
                                <FlaskConical className="h-3 w-3" />
                                {a.consultation.labOrders.length} lab tests
                              </Badge>
                            ) : null}
                            {a.consultation.bloodPressure ? (
                              <Badge variant="outline">BP {a.consultation.bloodPressure}</Badge>
                            ) : null}
                            {a.consultation.weightKg ? (
                              <Badge variant="outline">{a.consultation.weightKg} kg</Badge>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">No consultation notes were recorded.</p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="files" className="pt-6">
          {records.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No uploads yet"
              description="Add old lab reports, scans or discharge summaries so a new doctor sees the full picture."
              action={<AddRecordDialog />}
            />
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.title}</p>
                        <Badge variant="outline">{RECORD_TYPE_LABEL[r.type] ?? r.type}</Badge>
                        {r.shares.length ? (
                          <Badge variant="success" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Shared with {r.shares.length}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(r.recordDate)} · added by {r.uploadedBy.name ?? "you"}
                      </p>
                      {r.notes ? <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p> : null}
                    </div>

                    <div className="flex items-center gap-1">
                      {r.fileUrl ? (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                          aria-label="Open file"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                      <ShareRecordDialog
                        recordId={r.id}
                        doctors={doctorOptions}
                        sharedWith={r.shares.map((s) => s.doctorId)}
                      />
                      <DeleteRecordButton id={r.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
