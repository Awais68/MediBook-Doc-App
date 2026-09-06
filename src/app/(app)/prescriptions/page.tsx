import Link from "next/link";
import { Pill } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Prescriptions" };
export const dynamic = "force-dynamic";

export default async function PrescriptionsPage() {
  const user = await requireUser();

  const prescriptions = await prisma.prescription.findMany({
    where: { patientId: user.id },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      code: true,
      issuedAt: true,
      doctor: { select: { user: { select: { name: true } } } },
      items: { select: { id: true, drugName: true, strength: true }, orderBy: { sortOrder: "asc" } },
      consultation: { select: { diagnosis: true, appointment: { select: { id: true } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        description="Every prescription written for you on MediBook, ready to print or show at the pharmacy."
      />

      {prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions yet"
          description="After a completed consultation, your doctor's prescription appears here."
        />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => (
            <Link key={p.id} href={`/prescriptions/${p.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{p.doctor.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.issuedAt)} · <span className="font-mono">{p.code}</span>
                    </p>
                    {p.consultation.diagnosis ? (
                      <p className="mt-1 text-sm text-muted-foreground">{p.consultation.diagnosis}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.items.slice(0, 4).map((i) => (
                        <Badge key={i.id} variant="secondary" className="text-[10px] font-normal">
                          {i.drugName} {i.strength ?? ""}
                        </Badge>
                      ))}
                      {p.items.length > 4 ? (
                        <Badge variant="outline" className="text-[10px]">
                          +{p.items.length - 4} more
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Badge variant="outline">{p.items.length} medicines</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
