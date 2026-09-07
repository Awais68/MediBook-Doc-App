import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
      <p className="mt-6 text-muted-foreground">{intro}</p>
      <div className="mt-8 space-y-8 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {children}
    </section>
  );
}
