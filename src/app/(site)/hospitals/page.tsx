import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, Phone, Stethoscope } from "lucide-react";
import { listHospitals, listHospitalCities } from "@/lib/services/hospitals";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Hospitals & clinics",
  description: "Browse verified hospitals, clinics and diagnostic centres and see which doctors sit where.",
};

export const revalidate = 600;

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  const [hospitals, cities] = await Promise.all([listHospitals(city), listHospitalCities()]);

  return (
    <div className="container py-8">
      <PageHeader
        title="Hospitals & clinics"
        description="Every facility here is linked to the doctors who actually sit there — with their fee at that location."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/hospitals">
          <Badge variant={city ? "outline" : "solid"}>All cities</Badge>
        </Link>
        {cities.map((c) => (
          <Link key={c.city} href={`/hospitals?city=${encodeURIComponent(c.city)}`}>
            <Badge variant={city === c.city ? "solid" : "outline"}>
              {c.city} ({c.count})
            </Badge>
          </Link>
        ))}
      </div>

      {hospitals.length === 0 ? (
        <EmptyState icon={Building2} title="No facilities found" description="Try a different city." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.map((h) => (
            <Link key={h.id} href={`/hospitals/${h.slug}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-tight group-hover:text-primary">{h.name}</h2>
                    {h.isVerified ? <Badge variant="success">Verified</Badge> : null}
                  </div>

                  <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {h.area ? `${h.area}, ` : ""}
                    {h.city}
                  </p>
                  {h.phone ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {h.phone}
                    </p>
                  ) : null}

                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Stethoscope className="h-4 w-4" />
                    {h._count.doctors} {pluralize(h._count.doctors, "doctor")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {h.facilities.slice(0, 4).map((f) => (
                      <Badge key={f} variant="secondary" className="text-[10px]">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
