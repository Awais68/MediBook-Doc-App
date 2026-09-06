import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/app/print-button";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAge, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const p = await prisma.prescription.findFirst({
    where: { id, OR: [{ patientId: user.id }, { doctor: { userId: user.id } }] },
    select: {
      id: true,
      code: true,
      notes: true,
      issuedAt: true,
      doctor: {
        select: {
          pmdcNumber: true,
          user: { select: { name: true } },
          educations: { select: { degree: true }, orderBy: { year: "desc" } },
          specialties: { select: { specialty: { select: { name: true } } } },
        },
      },
      items: { orderBy: { sortOrder: "asc" } },
      consultation: {
        select: {
          diagnosis: true,
          advice: true,
          followUpDate: true,
          appointment: {
            select: {
              id: true,
              scheduledAt: true,
              hospital: { select: { name: true, city: true, phone: true } },
              familyMember: { select: { name: true, dateOfBirth: true, gender: true } },
              patient: { select: { name: true, dateOfBirth: true, gender: true } },
            },
          },
        },
      },
    },
  });

  if (!p) notFound();

  const appt = p.consultation.appointment;
  const subject = appt.familyMember ?? appt.patient;
  const age = calculateAge(subject.dateOfBirth);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print-hide">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/appointments/${appt.id}`}>
            <ChevronLeft />
            Back to visit
          </Link>
        </Button>
        <PrintButton label="Print prescription" />
      </div>

      <div className="print-full rounded-xl border bg-background p-6 sm:p-8">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{p.doctor.user.name}</p>
            <p className="text-sm text-muted-foreground">
              {p.doctor.educations.map((e) => e.degree).join(", ")}
            </p>
            <p className="text-sm text-muted-foreground">
              {p.doctor.specialties.map((s) => s.specialty.name).join(", ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PMDC #{p.doctor.pmdcNumber}</p>
          </div>
          <div className="text-right">
            <Logo />
            <p className="mt-2 text-sm font-medium">{appt.hospital.name}</p>
            <p className="text-xs text-muted-foreground">{appt.hospital.city}</p>
            {appt.hospital.phone ? (
              <p className="text-xs text-muted-foreground">{appt.hospital.phone}</p>
            ) : null}
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Patient</p>
            <p className="font-medium">{subject.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Age / Gender</p>
            <p className="font-medium">
              {age !== null ? `${age} yrs` : "—"}
              {subject.gender ? ` / ${subject.gender.charAt(0)}${subject.gender.slice(1).toLowerCase()}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(p.issuedAt)}</p>
          </div>
        </div>

        {p.consultation.diagnosis ? (
          <>
            <Separator className="my-5" />
            <p className="text-xs text-muted-foreground">Diagnosis</p>
            <p className="font-medium">{p.consultation.diagnosis}</p>
          </>
        ) : null}

        <Separator className="my-5" />

        <h2 className="mb-3 text-2xl font-serif italic">℞</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.items.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {m.drugName} {m.strength ?? ""}
                    </p>
                    {m.form ? <p className="text-xs text-muted-foreground">{m.form}</p> : null}
                    {m.instructions ? (
                      <p className="text-xs text-muted-foreground">{m.instructions}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{m.dosage ?? "—"}</TableCell>
                  <TableCell>{m.frequency ?? "—"}</TableCell>
                  <TableCell>{m.durationDays ? `${m.durationDays} days` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {p.consultation.advice ? (
          <>
            <Separator className="my-5" />
            <p className="text-xs text-muted-foreground">Advice</p>
            <p className="text-sm">{p.consultation.advice}</p>
          </>
        ) : null}

        {p.notes ? (
          <>
            <Separator className="my-5" />
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm">{p.notes}</p>
          </>
        ) : null}

        {p.consultation.followUpDate ? (
          <p className="mt-5 text-sm">
            <span className="text-muted-foreground">Follow-up on </span>
            <span className="font-medium">{formatDate(p.consultation.followUpDate)}</span>
          </p>
        ) : null}

        <Separator className="my-6" />

        <div className="flex items-end justify-between text-xs text-muted-foreground">
          <span className="font-mono">{p.code}</span>
          <div className="text-right">
            <div className="mb-1 h-10 w-40 border-b" />
            <span>Doctor&apos;s signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}
