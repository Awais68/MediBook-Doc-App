import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { FACILITY_TYPE_LABEL } from "@/lib/labels";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HospitalDialog, ToggleHospitalButton } from "@/components/admin/hospital-dialogs";

export const metadata: Metadata = { title: "Hospitals · Admin" };

const PAGE_SIZE = 20;

export default async function AdminHospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission("hospital.manage");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { city: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [hospitals, total] = await Promise.all([
    prisma.hospital.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        area: true,
        city: true,
        province: true,
        phone: true,
        email: true,
        description: true,
        facilities: true,
        isActive: true,
        _count: { select: { doctors: true } },
      },
    }),
    prisma.hospital.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospitals &amp; clinics"
        description="Deactivating a facility hides it from search but keeps existing appointments intact."
        action={
          <HospitalDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add facility
              </Button>
            }
          />
        }
      />

      <form className="flex gap-2" action="/admin/hospitals">
        <Input name="q" defaultValue={q} placeholder="Search by name or city" className="max-w-sm" />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {hospitals.length === 0 ? (
        <EmptyState icon={Building2} title="No facilities found" />
      ) : (
        <div className="space-y-3">
          {hospitals.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{h.name}</p>
                    <Badge variant="secondary">{FACILITY_TYPE_LABEL[h.type]}</Badge>
                    {!h.isActive ? <Badge variant="outline">Inactive</Badge> : null}
                    <Badge variant="outline">{h._count.doctors} doctors</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[h.area, h.city, h.province].filter(Boolean).join(", ")} · {h.address}
                  </p>
                  {h.phone ? <p className="text-xs text-muted-foreground">{h.phone}</p> : null}
                </div>
                <div className="flex gap-2">
                  <HospitalDialog
                    hospital={{
                      id: h.id,
                      name: h.name,
                      type: h.type,
                      address: h.address,
                      area: h.area,
                      city: h.city,
                      province: h.province,
                      phone: h.phone,
                      email: h.email,
                      description: h.description,
                      facilities: h.facilities,
                    }}
                    trigger={<Button size="sm" variant="ghost">Edit</Button>}
                  />
                  <ToggleHospitalButton id={h.id} isActive={h.isActive} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{ q: q || undefined }}
        basePath="/admin/hospitals"
      />
    </div>
  );
}
