import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { getHospitalBySlug } from "@/lib/services/hospitals";
import { DoctorCard } from "@/components/shared/doctor-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { FACILITY_TYPE_LABEL } from "@/lib/labels";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hospital = await getHospitalBySlug(slug);
  if (!hospital) return { title: "Facility not found" };
  return {
    title: `${hospital.name}, ${hospital.city}`,
    description:
      hospital.description ??
      `Doctors, timings and consultation fees at ${hospital.name}, ${hospital.city}. Book online with MediBook.`,
    alternates: { canonical: `/hospitals/${hospital.slug}` },
  };
}

export default async function HospitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hospital = await getHospitalBySlug(slug);
  if (!hospital) notFound();

  return (
    <div className="container py-8">
      <div className="rounded-xl border bg-muted/30 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{hospital.name}</h1>
          {hospital.isVerified ? <Badge variant="success">Verified</Badge> : null}
          <Badge variant="secondary">{FACILITY_TYPE_LABEL[hospital.type]}</Badge>
        </div>

        {hospital.description ? (
          <p className="mt-3 max-w-3xl text-muted-foreground">{hospital.description}</p>
        ) : null}

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {hospital.address}, {hospital.city}
          </p>
          {hospital.phone ? (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {hospital.phone}
            </p>
          ) : null}
          {hospital.email ? (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {hospital.email}
            </p>
          ) : null}
        </div>

        {hospital.facilities.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {hospital.facilities.map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <h2 className="mb-4 mt-8 text-xl font-semibold">
        Doctors at {hospital.name} ({hospital.doctors.length})
      </h2>

      {hospital.doctors.length === 0 ? (
        <EmptyState icon={Building2} title="No doctors listed yet" description="This facility has no active practice listings." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {hospital.doctors.map((dh) => (
            <DoctorCard
              key={dh.id}
              doctor={{
                slug: dh.doctor.slug,
                yearsOfExperience: dh.doctor.yearsOfExperience,
                avgRating: dh.doctor.avgRating,
                reviewCount: dh.doctor.reviewCount,
                satisfactionScore: dh.doctor.satisfactionScore,
                avgWaitMinutes: dh.doctor.avgWaitMinutes,
                videoConsultEnabled: dh.doctor.videoConsultEnabled,
                user: dh.doctor.user,
                specialties: dh.doctor.specialties,
                hospitals: [
                  {
                    consultationFee: dh.consultationFee,
                    hospital: { name: hospital.name, city: hospital.city, area: hospital.area },
                  },
                ],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
