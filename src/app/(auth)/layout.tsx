import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-grid">
      <header className="container flex h-16 items-center">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="container flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="container py-6 text-center text-xs text-muted-foreground">
        By continuing you agree to MediBook&apos;s{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
