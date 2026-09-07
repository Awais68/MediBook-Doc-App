import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApplyForm } from "@/components/doctor-portal/apply-form";

export const metadata: Metadata = {
  title: "Join as a doctor",
  description: "List your practice on MediBook and start taking online appointments.",
};

export default async function ApplyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/apply");

  const existing = await prisma.doctor.findUnique({
    where: { userId: user.id },
    select: { verificationStatus: true, rejectionReason: true },
  });

  const [specialties, hospitals] = await Promise.all([
    prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.hospital.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="container max-w-4xl py-10">
      <PageHeader
        title="Join MediBook as a doctor"
        description="One application, then your schedule, fees and patient records live in one place."
      />

      {existing ? (
        <Alert className="mt-6">
          <AlertTitle>
            {existing.verificationStatus === "REJECTED"
              ? "Your application was not approved"
              : "Application already submitted"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {existing.verificationStatus === "REJECTED"
                ? (existing.rejectionReason ?? "Contact support to re-apply.")
                : "We'll email you as soon as the review is complete."}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/doctor">Go to doctor portal</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="mt-6">
          <ApplyForm specialties={specialties} hospitals={hospitals} />
        </div>
      )}
    </div>
  );
}
