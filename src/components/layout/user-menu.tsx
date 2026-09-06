"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { CalendarDays, FileText, LayoutDashboard, LogOut, Settings, Users, Stethoscope, ShieldCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export type MenuUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
};

export function UserMenu({ user }: { user: MenuUser }) {
  const patientLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/appointments", label: "My appointments", icon: CalendarDays },
    { href: "/records", label: "Medical records", icon: FileText },
    { href: "/family", label: "Family members", icon: Users },
  ];

  const doctorLinks = [
    { href: "/doctor", label: "Doctor dashboard", icon: Stethoscope },
    { href: "/doctor/appointments", label: "Today's clinic", icon: CalendarDays },
    { href: "/doctor/schedule", label: "Schedule", icon: CalendarDays },
  ];

  const adminLinks = [{ href: "/admin", label: "Admin console", icon: ShieldCheck }];

  const links =
    user.role === "DOCTOR" ? doctorLinks : user.role === "ADMIN" || user.role === "HOSPITAL_ADMIN" ? adminLinks : patientLinks;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <p className="truncate text-sm font-medium text-foreground">{user.name ?? "Account"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}>
              <l.icon />
              {l.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void signOut({ callbackUrl: "/" })}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
