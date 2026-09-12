import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { prisma } from "@/lib/prisma";

const NAV = [
  { href: "/doctors", label: "Find a doctor" },
  { href: "/hospitals", label: "Hospitals" },
  { href: "/specialties", label: "Specialties" },
  { href: "/apply", label: "For doctors" },
];

export async function SiteHeader() {
  const user = await getSessionUser();
  const unread = user
    ? await prisma.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="container flex h-16 items-center gap-3">
        <MobileNav links={NAV} />
        <Logo />
        <NavLinks links={NAV} />

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell count={unread} />
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="rounded-full px-5">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
