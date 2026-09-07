import type { Metadata } from "next";
import type { Prisma, Role } from "@prisma/client";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatDayDate, initials, maskPhone } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleSelect, ToggleUserButton } from "@/components/admin/moderate-actions";

export const metadata: Metadata = { title: "Users · Admin" };

const PAGE_SIZE = 25;
const ROLES: Role[] = ["PATIENT", "DOCTOR", "HOSPITAL_ADMIN", "ADMIN"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const admin = await requirePermission("user.manage");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const role = ROLES.includes(sp.role as Role) ? (sp.role as Role) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        emailVerified: true,
        phoneVerified: true,
        _count: { select: { appointments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Deactivating a user revokes their live sessions immediately."
      />

      <form className="flex flex-wrap gap-2" action="/admin/users">
        <Input name="q" defaultValue={q} placeholder="Name, email or phone" className="max-w-xs" />
        <select
          name="role"
          defaultValue={role ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ").toLowerCase()}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users match" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.image ?? undefined} alt="" />
                  <AvatarFallback>{initials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{u.name ?? "Unnamed"}</p>
                    {!u.isActive ? <Badge variant="destructive">Deactivated</Badge> : null}
                    {u.emailVerified ? <Badge variant="outline">Email verified</Badge> : null}
                    {u.phoneVerified ? <Badge variant="outline">Phone verified</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[u.email, maskPhone(u.phone)].filter(Boolean).join(" · ")} · joined{" "}
                    {formatDayDate(u.createdAt)} · {u._count.appointments} appointments
                  </p>
                </div>
                {u.id === admin.id ? (
                  <Badge variant="secondary">You</Badge>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleSelect userId={u.id} role={u.role} />
                    <ToggleUserButton userId={u.id} isActive={u.isActive} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{ q: q || undefined, role }}
        basePath="/admin/users"
      />
    </div>
  );
}
