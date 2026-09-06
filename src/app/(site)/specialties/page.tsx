import type { Metadata } from "next";
import Link from "next/link";
import { listSpecialtiesWithCounts } from "@/lib/services/hospitals";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Specialties",
  description: "Find the right kind of specialist for your symptoms — cardiology, dermatology, gynaecology and more.",
};

export const revalidate = 3600;

export default async function SpecialtiesPage() {
  const specialties = await listSpecialtiesWithCounts();

  return (
    <div className="container py-8">
      <PageHeader
        title="Browse by specialty"
        description="Not sure who to see? Each specialty lists the symptoms it usually treats."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.map((s) => (
          <Link key={s.id} href={`/doctors?specialty=${s.slug}`} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold group-hover:text-primary">{s.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {s._count.doctors} {pluralize(s._count.doctors, "doctor")}
                  </span>
                </div>
                {s.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.symptoms.map((sym) => (
                    <Badge key={sym.name} variant="secondary" className="text-[10px] font-normal">
                      {sym.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
