import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-glow px-4 text-center grain">
      <Logo className="mb-10" />
      <p className="eyebrow">
        <Compass className="h-3.5 w-3.5" />
        Error 404
      </p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">This page isn&apos;t on the chart.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you&apos;re looking for has moved or never existed. The doctors, however, are still here.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg">
          <Link href="/doctors">Find a doctor</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
