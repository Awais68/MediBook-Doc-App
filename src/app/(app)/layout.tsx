import {
  Bell,
  CalendarDays,
  FileText,
  Home,
  Pill,
  Settings,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { AppNav, type NavItem } from "@/components/app/app-nav";

const PATIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/records", label: "Medical records", icon: FileText },
  { href: "/prescriptions", label: "Prescriptions", icon: Pill },
  { href: "/family", label: "Family", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="container flex flex-1 flex-col gap-6 py-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <AppNav items={PATIENT_NAV} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
