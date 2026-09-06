import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  FlaskConical,
  MapPin,
  Pill,
  Printer,
  Stethoscope,
  User,
  Video,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ACTIVE_STATUSES } from "@/lib/services/booking";
import { CancelAppointmentButton, RescheduleButton } from "@/components/app/appointment-actions";
import { ReviewForm } from "@/components/app/review-form";
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_METHOD, CONSULTATION_TYPE } from "@/lib/labels";
import { formatDateTime, formatPKR, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const a = await prisma.appointment.findFirst({
    where: {
      id,
      // Patients see their own; doctors and admins reach visits through their own portals.
      OR: [{ patientId: user.id }, { doctor: { userId: user.id } }],
    },
    select: {
      id: true,
      code: true,
      scheduledAt: true,
      endAt: true,
      status: true,
      consultationType: true,
      fee: true,
      isFollowUp: true,
      tokenNumber: true,
      reasonForVisit: true,
      patientNotes: true,
      videoRoomUrl: true,
      cancellationReason: true,
      patientId: true,
      doctorHospitalId: true,
      doctor: {
        select: {
          slug: true,
          avgRating: true,
          reviewCount: true,
          user: { select: { name: true, image: true } },
          specialties: { select: { specialty: { select: { name: true } } } },
        },
      },
      doctorHospital: { select: { cancellationHours: true, roomNumber: true, followUpValidDays: true } },
      hospital: { select: { name: true, city: true, address: true, phone: true } },
      familyMember: { select: { name: true, relation: true } },
      payment: { select: { status: true, method: true, amount: true, paidAt: true, refundAmount: true } },
      review: { select: { id: true, rating: true, comment: true } },
      consultation: {
        select: {
          id: true,
          chiefComplaint: true,
          diagnosis: true,
          advice: true,
          followUpDate: true,
          followUpReason: true,
          bloodPressure: true,
          pulseBpm: true,
          temperatureC: true,
          spo2: true,
          weightKg: true,
          prescription: {
            select: {
              id: true,
              code: true,
              notes: true,
              items: {
                select: {
                  id: true,
                  drugName: true,
                  strength: true,
                  dosage: true,
                  frequency: true,
                  durationDays: true,
                  instructions: true,
                },
              },
            },
          },
          labOrders: { select: { id: true, testName: true, status: true, resultText: true } },
        },
      },
    },
  });

  if (!a) notFound();

  const isPatient = a.patientId === user.id;
  const isLive = ACTIVE_STATUSES.includes(a.status);
  const hoursAway = (a.scheduledAt.getTime() - Date.now()) / 3.6e6;
  const freeCancel = hoursAway >= a.doctorHospital.cancellationHours;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Appointment</h1>
            <AppointmentStatusBadge status={a.status} />
            {a.isFollowUp ? <Badge variant="secondary">Follow-up</Badge> : null}
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{a.code}</p>
        </div>

        <div className="flex flex-wrap gap-2 print-hide">
          {a.consultation ? (
            <Button variant="outline" asChild>
              <Link href={`/prescriptions/${a.consultation.prescription?.id ?? ""}`}>
                <Printer />
                Prescription
              </Link>
            </Button>
          ) : null}
          {isPatient && isLive ? (
            <>
              <RescheduleButton appointmentId={a.id} doctorHospitalId={a.doctorHospitalId} />
              <CancelAppointmentButton
                appointmentId={a.id}
                refundNote={
                  freeCancel
                    ? `You're outside the ${a.doctorHospital.cancellationHours}-hour window, so any online payment is refunded in full.`
                    : `You're inside the ${a.doctorHospital.cancellationHours}-hour window — the clinic may keep part of the fee.`
                }
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Visit card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={a.doctor.user.image ?? undefined} alt={a.doctor.user.name ?? ""} />
                  <AvatarFallback>{initials(a.doctor.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link href={`/doctors/${a.doctor.slug}`} className="font-semibold hover:text-primary">
                    {a.doctor.user.name}
                  </Link>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Stethoscope className="h-4 w-4" />
                    {a.doctor.specialties.map((s) => s.specialty.name).join(", ")}
                  </p>
                  <RatingStars value={a.doctor.avgRating} showValue count={a.doctor.reviewCount} className="mt-1" />
                </div>
              </div>

              <Separator className="my-5" />

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    When
                  </dt>
                  <dd className="mt-1 font-medium">{formatDateTime(a.scheduledAt)}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {a.consultationType === "VIDEO" ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5" />
                    )}
                    Type
                  </dt>
                  <dd className="mt-1 font-medium">{CONSULTATION_TYPE[a.consultationType]}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Where
                  </dt>
                  <dd className="mt-1 font-medium">{a.hospital.name}</dd>
                  <dd className="text-sm text-muted-foreground">
                    {a.hospital.address}, {a.hospital.city}
                    {a.doctorHospital.roomNumber ? ` · Room ${a.doctorHospital.roomNumber}` : ""}
                  </dd>
                  {a.hospital.phone ? (
                    <dd className="text-sm text-muted-foreground">{a.hospital.phone}</dd>
                  ) : null}
                </div>
                {a.familyMember ? (
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Patient
                    </dt>
                    <dd className="mt-1 font-medium">
                      {a.familyMember.name} ({a.familyMember.relation})
                    </dd>
                  </div>
                ) : null}
                {a.tokenNumber ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Token</dt>
                    <dd className="mt-1 font-medium">#{a.tokenNumber}</dd>
                  </div>
                ) : null}
              </dl>

              {a.reasonForVisit ? (
                <>
                  <Separator className="my-5" />
                  <p className="text-xs text-muted-foreground">Reason for visit</p>
                  <p className="mt-1 text-sm">{a.reasonForVisit}</p>
                </>
              ) : null}

              {a.cancellationReason ? (
                <>
                  <Separator className="my-5" />
                  <p className="text-xs text-muted-foreground">Cancellation reason</p>
                  <p className="mt-1 text-sm">{a.cancellationReason}</p>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Consultation notes */}
          {a.consultation ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-primary" />
                  Consultation notes
                </h2>

                <dl className="mt-4 space-y-3 text-sm">
                  {a.consultation.chiefComplaint ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Chief complaint</dt>
                      <dd>{a.consultation.chiefComplaint}</dd>
                    </div>
                  ) : null}
                  {a.consultation.diagnosis ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Diagnosis</dt>
                      <dd className="font-medium">{a.consultation.diagnosis}</dd>
                    </div>
                  ) : null}
                  {a.consultation.advice ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Advice</dt>
                      <dd>{a.consultation.advice}</dd>
                    </div>
                  ) : null}
                </dl>

                {(() => {
                  const c = a.consultation!;
                  const vitals = [
                    ["BP", c.bloodPressure],
                    ["Pulse", c.pulseBpm ? `${c.pulseBpm} bpm` : null],
                    ["Temp", c.temperatureC ? `${c.temperatureC} °C` : null],
                    ["SpO₂", c.spo2 ? `${c.spo2}%` : null],
                    ["Weight", c.weightKg ? `${c.weightKg} kg` : null],
                  ].filter(([, v]) => v) as [string, string][];
                  if (!vitals.length) return null;
                  return (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {vitals.map(([k, v]) => (
                        <span key={k} className="rounded-md border px-2.5 py-1 text-xs">
                          <span className="text-muted-foreground">{k}</span>{" "}
                          <span className="font-medium">{v}</span>
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <dl className="mt-4 space-y-3 text-sm">
                  {a.consultation.followUpDate ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Follow-up</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        {formatDateTime(a.consultation.followUpDate)}
                        {a.consultation.followUpReason ? `— ${a.consultation.followUpReason}` : ""}
                        {isPatient ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/doctors/${a.doctor.slug}?followUp=${a.id}`}>Book it</Link>
                          </Button>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {a.consultation.prescription?.items.length ? (
                  <>
                    <Separator className="my-5" />
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Pill className="h-4 w-4 text-primary" />
                      Medicines
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {a.consultation.prescription.items.map((m) => (
                        <li key={m.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">
                            {m.drugName} {m.strength ?? ""}
                          </p>
                          <p className="text-muted-foreground">
                            {[m.dosage, m.frequency, m.durationDays ? `${m.durationDays} days` : null].filter(Boolean).join(" · ")}
                          </p>
                          {m.instructions ? (
                            <p className="mt-1 text-xs text-muted-foreground">{m.instructions}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {a.consultation.labOrders.length ? (
                  <>
                    <Separator className="my-5" />
                    <h3 className="flex items-center gap-2 font-semibold">
                      <FlaskConical className="h-4 w-4 text-primary" />
                      Lab tests
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {a.consultation.labOrders.map((l) => (
                        <li key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <span>{l.testName}</span>
                          <Badge variant="outline">{l.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Review */}
          {isPatient && a.status === "COMPLETED" ? (
            a.review ? (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-lg font-semibold">Your review</h2>
                  <RatingStars value={a.review.rating} className="mt-2" />
                  {a.review.comment ? (
                    <p className="mt-2 text-sm text-muted-foreground">{a.review.comment}</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <ReviewForm appointmentId={a.id} doctorName={a.doctor.user.name ?? "your doctor"} />
            )
          ) : null}
        </div>

        {/* Payment rail */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment
              </h2>
              <Separator className="my-4" />

              {a.payment ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <PaymentStatusBadge status={a.payment.status} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Method</dt>
                    <dd>{PAYMENT_METHOD[a.payment.method]}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd className="font-semibold">{formatPKR(a.payment.amount, { free: "Free" })}</dd>
                  </div>
                  {a.payment.refundAmount ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Refunded</dt>
                      <dd>{formatPKR(a.payment.refundAmount)}</dd>
                    </div>
                  ) : null}
                  {a.payment.paidAt ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Paid on</dt>
                      <dd>{formatDateTime(a.payment.paidAt)}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No payment record for this booking.</p>
              )}

              {isPatient && a.payment && a.payment.status !== "PAID" && a.payment.method !== "CASH_AT_CLINIC" && isLive ? (
                <Button className="mt-4 w-full" asChild>
                  <Link href={`/checkout/${a.id}`}>Pay {formatPKR(a.payment.amount)}</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {a.consultationType === "VIDEO" && a.videoRoomUrl && isLive ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold">Video consultation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The join link opens 10 minutes before your slot.
                </p>
                <Button className="mt-3 w-full" asChild>
                  <a href={a.videoRoomUrl} target="_blank" rel="noreferrer">
                    <Video />
                    Join call
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
