import type { Metadata } from "next";
import { Plus, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpecialtyDialog } from "@/components/admin/hospital-dialogs";

export const metadata: Metadata = { title: "Specialties · Admin" };

export default async function AdminSpecialtiesPage() {
  await requirePermission("specialty.manage");

  const specialties = await prisma.specialty.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      sortOrder: true,
      _count: { select: { doctors: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specialties"
        description="The taxonomy behind search, the homepage grid and doctor profiles."
        action={
          <SpecialtyDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add specialty
              </Button>
            }
          />
        }
      />

      {specialties.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No specialties yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {specialties.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {s.icon ? <span className="mr-1">{s.icon}</span> : null}
                      {s.name}
                    </p>
                    <Badge variant="outline">{s._count.doctors} doctors</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">/{s.slug}</p>
                  {s.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  ) : null}
                </div>
                <SpecialtyDialog
                  specialty={{
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    icon: s.icon,
                    sortOrder: s.sortOrder,
                  }}
                  trigger={<Button size="sm" variant="ghost">Edit</Button>}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
