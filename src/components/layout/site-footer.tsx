import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { APP_NAME, PAKISTAN_CITIES } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Patients",
    links: [
      { href: "/doctors", label: "Find a doctor" },
      { href: "/hospitals", label: "Hospitals & clinics" },
      { href: "/specialties", label: "Browse specialties" },
      { href: "/appointments", label: "My appointments" },
    ],
  },
  {
    title: "Doctors",
    links: [
      { href: "/apply", label: "Join as a doctor" },
      { href: "/doctor", label: "Doctor portal" },
      { href: "/doctor/schedule", label: "Manage schedule" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Verified doctors, real fees per hospital, and every prescription in one place. Built for Pakistan.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Doctors by city</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PAKISTAN_CITIES.map((city) => (
              <Link
                key={city}
                href={`/doctors?city=${encodeURIComponent(city)}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Doctors in {city}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. For medical emergencies call 1122 — do not use this platform.
        </p>
      </div>
    </footer>
  );
}
