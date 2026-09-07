import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/app/onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, city: true, dateOfBirth: true },
  });
  // Nothing to collect for a profile that is already filled in.
  if (user?.city && user.dateOfBirth) redirect("/dashboard");

  return (
    <div className="container flex max-w-lg flex-col py-12">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to MediBook</CardTitle>
          <CardDescription>
            Two minutes now saves typing this at every booking. You can change it any time in
            settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultName={user?.name ?? ""} />
        </CardContent>
      </Card>
      <Link
        href="/dashboard"
        className="mt-4 text-center text-sm text-muted-foreground hover:underline"
      >
        Skip for now
      </Link>
    </div>
  );
}
