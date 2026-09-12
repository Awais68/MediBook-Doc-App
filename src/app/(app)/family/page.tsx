import { Users } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AddFamilyMemberDialog, DeleteFamilyMemberButton } from "@/components/app/family-dialogs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { calculateAge, initials, pluralize } from "@/lib/utils";

export const metadata = { title: "Family" };
export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const user = await requireUser();

  const members = await prisma.familyMember.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      relation: true,
      gender: true,
      dateOfBirth: true,
      phone: true,
      bloodGroup: true,
      _count: { select: { appointments: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Family members"
        description="Book for parents and children from your own account — no separate logins to manage."
        action={<AddFamilyMemberDialog />}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No family members yet"
          description="Add whoever you usually book for. They'll show up as an option at checkout."
          action={<AddFamilyMemberDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {members.map((m) => {
            const age = calculateAge(m.dateOfBirth);
            return (
              <Card key={m.id}>
                <CardContent className="flex items-start gap-4 p-5">
                  <Avatar>
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.relation}
                      {age !== null ? ` · ${age} yrs` : ""}
                      {m.gender ? ` · ${m.gender.charAt(0)}${m.gender.slice(1).toLowerCase()}` : ""}
                    </p>
                    {m.phone ? <p className="text-sm text-muted-foreground">{m.phone}</p> : null}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.bloodGroup ? <Badge variant="outline">{m.bloodGroup}</Badge> : null}
                      <Badge variant="secondary">
                        {pluralize(m._count.appointments, "visit")}
                      </Badge>
                    </div>
                  </div>

                  <DeleteFamilyMemberButton id={m.id} name={m.name} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
