import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/app/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { maskPhone } from "@/lib/utils";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      phoneVerified: true,
      gender: true,
      dateOfBirth: true,
      city: true,
      patientProfile: true,
    },
  });

  const p = user.patientProfile;

  return (
    <div>
      <PageHeader title="Settings" description="Your details, health profile and account preferences." />

      <div className="space-y-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Account</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="flex items-center gap-2 text-sm">
                  {user.email ?? "Not set"}
                  {user.emailVerified ? <Badge variant="success">Verified</Badge> : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="flex items-center gap-2 text-sm">
                  {user.phone ? maskPhone(user.phone) : "Not set"}
                  {user.phoneVerified ? <Badge variant="success">Verified</Badge> : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Theme</dt>
                <dd className="mt-1">
                  <ThemeToggle />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <ProfileForm
              initial={{
                name: user.name ?? "",
                gender: user.gender,
                dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
                city: user.city,
                cnic: p?.cnic ?? "",
                bloodGroup: p?.bloodGroup ?? "",
                heightCm: p?.heightCm ?? null,
                weightKg: p?.weightKg ?? null,
                allergies: p?.allergies ?? [],
                chronicConditions: p?.chronicConditions ?? [],
                currentMedications: p?.currentMedications ?? [],
                emergencyContactName: p?.emergencyContactName ?? "",
                emergencyContactPhone: p?.emergencyContactPhone ?? "",
                address: p?.address ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
