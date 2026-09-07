import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SiteHeader } from "@/components/layout/site-header";
import { AppNav, type NavItem } from "@/components/app/app-nav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const DOCTOR_NAV: NavItem[] = [
  { href: "/doctor", label: "Overview", icon: "dashboard" },
  { href: "/doctor/appointments", label: "Appointments", icon: "calendar" },
  { href: "/doctor/schedule", label: "Schedule", icon: "calendarRange" },
  { href: "/doctor/patients", label: "Patients", icon: "users" },
  { href: "/doctor/reviews", label: "Reviews", icon: "star" },
  { href: "/doctor/profile", label: "Profile", icon: "userCog" },
];

/**
 * The doctor shell resolves verification status itself instead of calling
 * requireDoctor(), so a PENDING doctor sees an explanation rather than a 403.
 */
export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/doctor");
  if (user.role !== "DOCTOR") redirect("/403");

  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.id },
    select: { verificationStatus: true, rejectionReason: true },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="container flex flex-1 flex-col gap-6 py-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <AppNav items={DOCTOR_NAV} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-10">
          {!doctor ? (
            <Alert>
              <AlertTitle>Finish your doctor application</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>We don&apos;t have a doctor profile linked to this account yet.</p>
                <Button asChild size="sm">
                  <Link href="/apply">Start the application</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : doctor.verificationStatus === "APPROVED" ? (
            children
          ) : doctor.verificationStatus === "REJECTED" ? (
            <Alert variant="destructive">
              <AlertTitle>Application rejected</AlertTitle>
              <AlertDescription>
                {doctor.rejectionReason ?? "Contact support@medibook.pk to re-apply."}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>Verification in progress</AlertTitle>
              <AlertDescription>
                Our team is checking your PMDC registration. You&apos;ll get an email as soon as
                your profile goes live — usually within one working day.
              </AlertDescription>
            </Alert>
          )}
        </main>
      </div>
    </div>
  );
}
