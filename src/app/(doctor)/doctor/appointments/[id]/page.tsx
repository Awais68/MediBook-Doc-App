import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { formatDayDate, formatTime, initials, calculateAge, formatPKR } from "@/lib/utils";
import { CONSULTATION_TYPE } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusButton, CollectCashButton } from "@/components/doctor-portal/queue-actions";
import {
  ConsultationForm,
  type ConsultationDraft,
} from "@/components/doctor-portal/consultation-form";

export const metadata: Metadata = { title: "Consultation · Doctor" };

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default async function DoctorAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { doctor } = await requireDoctor();

  const appt = await prisma.appointment.findFirst({
    where: { id, doctorId: doctor.id },
    select: {
      id: true,
      code: true,
      scheduledAt: true,
      status: true,
      fee: true,
      tokenNumber: true,
      isFollowUp: true,
      consultationType: true,
      reasonForVisit: true,
      patientNotes: true,
      patientId: true,
      patient: {
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          patientProfile: true,
        },
      },
      familyMember: { select: { name: true, relation: true, gender: true, dateOfBirth: true } },
      doctorHospital: { select: { hospital: { select: { name: true, city: true } } } },
      payment: { select: { status: true, method: true, amount: true } },
      parentAppointment: { select: { id: true, code: true, scheduledAt: true } },
      consultation: {
        include: { prescription: { include: { items: true } }, labOrders: true },
      },
    },
  });
  if (!appt) notFound();

  // Past completed visits with this doctor, so the chart carries context.
  const history = await prisma.appointment.findMany({
    where: {
      patientId: appt.patientId,
      doctorId: doctor.id,
      status: "COMPLETED",
      id: { not: appt.id },
    },
    orderBy: { scheduledAt: "desc" },
    take: 5,
    select: {
      id: true,
      scheduledAt: true,
      consultation: {
        select: {
          diagnosis: true,
          chiefComplaint: true,
          prescription: { select: { items: { select: { drugName: true } } } },
        },
      },
    },
  });

  const c = appt.consultation;
  const initial: ConsultationDraft = {
    chiefComplaint: str(c?.chiefComplaint),
    historyOfIllness: str(c?.historyOfIllness),
    examination: str(c?.examination),
    diagnosis: str(c?.diagnosis),
    clinicalNotes: str(c?.clinicalNotes),
    advice: str(c?.advice),
    bloodPressure: str(c?.bloodPressure),
    pulseBpm: str(c?.pulseBpm),
    temperatureC: str(c?.temperatureC),
    spo2: str(c?.spo2),
    weightKg: str(c?.weightKg),
    heightCm: str(c?.heightCm),
    bloodSugar: str(c?.bloodSugar),
    followUpAfterDays: str(c?.followUpAfterDays),
    followUpReason: str(c?.followUpReason),
    prescriptionNotes: str(c?.prescription?.notes),
    medicines:
      c?.prescription?.items.map((i) => ({
        drugName: i.drugName,
        strength: str(i.strength),
        form: str(i.form),
        dosage: str(i.dosage),
        frequency: str(i.frequency),
        durationDays: str(i.durationDays),
        instructions: str(i.instructions),
      })) ?? [],
    labTests: c?.labOrders.map((l) => ({ testName: l.testName, instructions: str(l.instructions) })) ?? [],
  };

  // Booking for a family member means the chart subject is not the account holder.
  const subjectName = appt.familyMember?.name ?? appt.patient.name ?? "Patient";
  const subjectDob = appt.familyMember?.dateOfBirth ?? appt.patient.dateOfBirth;
  const subjectGender = appt.familyMember?.gender ?? appt.patient.gender;
  const age = calculateAge(subjectDob);
  const profile = appt.patient.patientProfile;
  const locked = ["COMPLETED", "CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "NO_SHOW"].includes(
    appt.status,
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/doctor/appointments">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to appointments
        </Link>
      </Button>

      <PageHeader
        title={subjectName}
        description={`${appt.code} · ${formatDayDate(appt.scheduledAt)} at ${formatTime(appt.scheduledAt)} · ${appt.doctorHospital.hospital.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            {appt.status === "PENDING" ? <StatusButton appointmentId={appt.id} to="CONFIRMED" /> : null}
            {appt.status === "CONFIRMED" ? (
              <StatusButton appointmentId={appt.id} to="CHECKED_IN" variant="outline" />
            ) : null}
            {appt.status === "CHECKED_IN" ? <StatusButton appointmentId={appt.id} to="IN_PROGRESS" /> : null}
            {["PENDING", "CONFIRMED", "CHECKED_IN"].includes(appt.status) ? (
              <StatusButton appointmentId={appt.id} to="NO_SHOW" variant="ghost" />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {locked && appt.status !== "COMPLETED" ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-4 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                This visit is {appt.status.toLowerCase().replace(/_/g, " ")} — the chart is read-only.
              </CardContent>
            </Card>
          ) : null}

          {appt.reasonForVisit || appt.patientNotes ? (
            <Card>
              <CardHeader>
                <CardTitle>What the patient wrote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {appt.reasonForVisit ? <p>{appt.reasonForVisit}</p> : null}
                {appt.patientNotes ? (
                  <p className="text-muted-foreground">{appt.patientNotes}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <ConsultationForm appointmentId={appt.id} initial={initial} readOnly={locked} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={appt.patient.image ?? undefined} alt="" />
                  <AvatarFallback>{initials(subjectName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[subjectGender, age ? `${age} yrs` : null].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>

              {appt.familyMember ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Booked by {appt.patient.name} ({appt.familyMember.relation})
                </p>
              ) : null}

              {appt.patient.phone ? (
                <a
                  href={`tel:${appt.patient.phone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" /> {appt.patient.phone}
                </a>
              ) : null}

              <Separator />
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><AppointmentStatusBadge status={appt.status} /></dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{CONSULTATION_TYPE[appt.consultationType]}</dd>
                </div>
                {appt.tokenNumber ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Token</dt>
                    <dd>#{appt.tokenNumber}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Fee</dt>
                  <dd>{formatPKR(appt.fee, { free: "Free follow-up" })}</dd>
                </div>
                {appt.payment ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Payment</dt>
                    <dd><PaymentStatusBadge status={appt.payment.status} /></dd>
                  </div>
                ) : null}
              </dl>

              {appt.payment && appt.payment.status !== "PAID" && appt.payment.method === "CASH_AT_CLINIC" ? (
                <CollectCashButton appointmentId={appt.id} />
              ) : null}

              {appt.parentAppointment ? (
                <p className="text-xs text-muted-foreground">
                  Follow-up of{" "}
                  <Link
                    href={`/doctor/appointments/${appt.parentAppointment.id}`}
                    className="text-primary hover:underline"
                  >
                    {appt.parentAppointment.code}
                  </Link>{" "}
                  ({formatDayDate(appt.parentAppointment.scheduledAt)})
                </p>
              ) : null}
            </CardContent>
          </Card>

          {profile ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient background</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {profile.bloodGroup ? (
                  <p>
                    <span className="text-muted-foreground">Blood group: </span>
                    {profile.bloodGroup}
                  </p>
                ) : null}
                {profile.allergies.length ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-destructive">Allergies</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.allergies.map((a) => (
                        <Badge key={a} variant="destructive">{a}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {profile.chronicConditions.length ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Conditions</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.chronicConditions.map((a) => (
                        <Badge key={a} variant="secondary">{a}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {profile.currentMedications.length ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">On medication</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.currentMedications.map((a) => (
                        <Badge key={a} variant="outline">{a}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!profile.bloodGroup &&
                !profile.allergies.length &&
                !profile.chronicConditions.length &&
                !profile.currentMedications.length ? (
                  <p className="text-muted-foreground">The patient hasn&apos;t filled this in.</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Previous visits with you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {history.length === 0 ? (
                <p className="text-muted-foreground">First visit with you.</p>
              ) : (
                history.map((h) => (
                  <Link
                    key={h.id}
                    href={`/doctor/appointments/${h.id}`}
                    className="block rounded-md border p-3 hover:bg-accent"
                  >
                    <p className="text-xs text-muted-foreground">{formatDayDate(h.scheduledAt)}</p>
                    <p className="font-medium">
                      {h.consultation?.diagnosis ?? h.consultation?.chiefComplaint ?? "No diagnosis recorded"}
                    </p>
                    {h.consultation?.prescription?.items.length ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {h.consultation.prescription.items.map((i) => i.drugName).join(", ")}
                      </p>
                    ) : null}
                  </Link>
                ))
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/doctor/patients/${appt.patientId}`}>Open full chart</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
