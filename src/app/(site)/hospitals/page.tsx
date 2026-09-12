import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Building2, MapPin, Phone, Stethoscope } from "lucide-react";
import { listHospitals, listHospitalCities } from "@/lib/services/hospitals";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
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
      {/* Photo banner */}
      <section className="relative mb-8 overflow-hidden rounded-3xl shadow-lift">
        <Image
          src="/images/hospital-ward.jpg"
          alt="A bright, empty hospital ward with made beds"
          fill
          priority
          sizes="(min-width: 1360px) 1328px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(190,45%,8%)]/90 via-[hsl(190,45%,8%)]/70 to-[hsl(190,45%,8%)]/20" />
        <div className="relative max-w-xl p-8 text-white sm:p-12">
          <p className="eyebrow text-teal-300">
            <Building2 className="h-4 w-4" />
            {pluralize(hospitals.length, "facility", "facilities")}
            {city ? ` in ${city}` : ""}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Hospitals &amp; clinics</h1>
          <p className="mt-3 text-white/80">
            Every facility here is linked to the doctors who actually sit there, with their fee at that location.
          </p>
        </div>
      </section>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/hospitals">
          <Badge variant={city ? "outline" : "solid"} className="px-3 py-1">All cities</Badge>
        </Link>
        {cities.map((c) => (
          <Link key={c.city} href={`/hospitals?city=${encodeURIComponent(c.city)}`}>
            <Badge variant={city === c.city ? "solid" : "outline"} className="px-3 py-1">
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
            <Link key={h.id} href={`/hospitals/${h.slug}`} className="group card-lift flex flex-col rounded-2xl border bg-card">
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-2">
                  {h.isVerified ? <Badge variant="success">Verified</Badge> : null}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-semibold leading-tight transition-colors group-hover:text-primary">{h.name}</h2>
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
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {h.facilities.slice(0, 4).map((f) => (
                    <Badge key={f} variant="secondary" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                </div>
                <p className="mt-auto flex items-center gap-1.5 border-t pt-4 text-sm font-semibold text-primary">
                  <Stethoscope className="h-4 w-4" />
                  {pluralize(h._count.doctors, "doctor")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
