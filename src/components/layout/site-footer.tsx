import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { APP_NAME, PAKISTAN_CITIES } from "@/lib/constants";

const GROUPS = [
  {
    title: "Patients",
    links: [
      { href: "/doctors", label: "Find a doctor" },
      { href: "/hospitals", label: "Hospitals & clinics" },
      { href: "/specialties", label: "Specialties" },
      { href: "/appointments", label: "My appointments" },
    ],
  },
  {
    title: "Doctors",
    links: [
      { href: "/apply", label: "Join as a doctor" },
      { href: "/doctor", label: "Doctor portal" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t bg-muted/40">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-glow opacity-70" aria-hidden />
      <div className="container relative py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Verified doctors, the real fee at each hospital, and every prescription in one place. Built for Pakistan.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              <PhoneCall className="h-3.5 w-3.5" />
              Medical emergency? Call 1122. Do not book here.
            </p>
          </div>
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="mb-3 text-sm font-semibold">{g.title}</p>
              <ul className="space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PAKISTAN_CITIES.slice(0, 8).map((city) => (
              <Link
                key={city}
                href={`/doctors?city=${encodeURIComponent(city)}`}
                className="transition-colors hover:text-foreground"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
