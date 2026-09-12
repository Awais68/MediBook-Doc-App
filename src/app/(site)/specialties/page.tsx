import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listSpecialtiesWithCounts } from "@/lib/services/hospitals";
import { PageHeader } from "@/components/shared/page-header";
import { SpecialtyIcon } from "@/components/shared/specialty-icon";
import { Badge } from "@/components/ui/badge";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Specialties",
  description: "Find the right kind of specialist for your symptoms — cardiology, dermatology, gynaecology and more.",
};

export const revalidate = 3600;

export default async function SpecialtiesPage() {
  const specialties = await listSpecialtiesWithCounts();

  return (
    <div className="container py-10">
      <PageHeader
        eyebrow="Specialties"
        title="Browse by specialty"
        description="Not sure who to see? Each specialty lists the symptoms it usually treats."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.map((s) => (
          <Link key={s.id} href={`/doctors?specialty=${s.slug}`} className="group card-lift relative flex flex-col rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <SpecialtyIcon name={s.icon} className="h-6 w-6" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {pluralize(s._count.doctors, "doctor")}
              </span>
            </div>
            <h2 className="mt-4 text-lg font-semibold transition-colors group-hover:text-primary">{s.name}</h2>
            {s.description ? <p className="mt-1 text-sm text-muted-foreground">{s.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.symptoms.map((sym) => (
                <Badge key={sym.name} variant="secondary" className="text-[10px] font-normal">
                  {sym.name}
                </Badge>
              ))}
            </div>
            <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
