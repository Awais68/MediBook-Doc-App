"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  CalendarRange,
  FileText,
  Home,
  LayoutDashboard,
  Pill,
  Settings,
  Star,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icons are resolved here, not passed in. A Lucide component is a function, and
 * server layouts cannot hand functions to a client component.
 */
const ICONS = {
  badgeCheck: BadgeCheck,
  bell: Bell,
  building: Building2,
  calendar: CalendarDays,
  calendarRange: CalendarRange,
  file: FileText,
  home: Home,
  dashboard: LayoutDashboard,
  pill: Pill,
  settings: Settings,
  star: Star,
  stethoscope: Stethoscope,
  userCog: UserCog,
  users: Users,
  wallet: Wallet,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon };

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
