import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const POINTS = [
  "Verified doctors only — PMDC-checked before they go live",
  "The real fee at each hospital, shown before you book",
  "Prescriptions and reports kept in one private timeline",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)] xl:grid-cols-[1fr_640px]">
      {/* Form column */}
      <div className="relative flex flex-col bg-glow">
        <header className="container flex h-16 items-center lg:px-10">
          <Logo />
        </header>

        <main id="main" className="container flex flex-1 items-center justify-center py-8 lg:px-10">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </main>

        <footer className="container py-6 text-center text-xs text-muted-foreground lg:px-10">
          By continuing you agree to MediBook&apos;s{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </footer>
      </div>

      {/* Image column */}
      <aside className="relative hidden overflow-hidden lg:block" aria-label="Why MediBook">
        <Image
          src="/images/auth-side.jpg"
          alt="A smiling nurse in blue scrubs with a stethoscope around his neck"
          fill
          priority
          sizes="(min-width: 1280px) 640px, (min-width: 1024px) 45vw, 0px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(190,45%,8%)] via-[hsl(190,45%,8%)]/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <p className="text-2xl font-bold leading-snug tracking-tight xl:text-3xl">
            Booking a doctor should take less time than finding parking at the hospital.
          </p>
          <ul className="mt-6 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-white/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
