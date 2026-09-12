"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Desktop nav with the current section highlighted. */
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {l.label}
            {active ? (
              <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary" aria-hidden />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
