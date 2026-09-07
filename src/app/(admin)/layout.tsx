import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { SiteHeader } from "@/components/layout/site-header";
import { AppNav, type NavItem } from "@/components/app/app-nav";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/doctors", label: "Verification", icon: "badgeCheck" },
  { href: "/admin/hospitals", label: "Hospitals", icon: "building" },
  { href: "/admin/specialties", label: "Specialties", icon: "stethoscope" },
  { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
  { href: "/admin/payments", label: "Payments", icon: "wallet" },
  { href: "/admin/reviews", label: "Reviews", icon: "star" },
  { href: "/admin/users", label: "Users", icon: "users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN" && user.role !== "HOSPITAL_ADMIN") redirect("/403");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="container flex flex-1 flex-col gap-6 py-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <AppNav items={ADMIN_NAV} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
