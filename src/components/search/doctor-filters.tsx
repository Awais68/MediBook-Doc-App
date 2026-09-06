"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LANGUAGES, PAKISTAN_CITIES } from "@/lib/constants";
import { formatPKR } from "@/lib/utils";

export type Facets = {
  specialties: { name: string; slug: string; _count: { doctors: number } }[];
  hospitals: { name: string; slug: string; city: string }[];
  minFee: number;
  maxFee: number;
};

const FEE_BANDS = [
  { label: "Under 1,500", min: undefined, max: 1500 },
  { label: "1,500 – 3,000", min: 1500, max: 3000 },
  { label: "3,000 – 5,000", min: 3000, max: 5000 },
  { label: "Above 5,000", min: 5000, max: undefined },
];

function FilterBody({ facets, onNavigate }: { facets: Facets; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page"); // any filter change resets pagination
      const qs = next.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
      onNavigate?.();
    },
    [params, pathname, router, onNavigate]
  );

  const activeFee = FEE_BANDS.findIndex(
    (b) => String(b.min ?? "") === (params.get("minFee") ?? "") && String(b.max ?? "") === (params.get("maxFee") ?? "")
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-sm font-semibold">City</p>
        <RadioGroup value={params.get("city") ?? "all"} onValueChange={(v) => setParam({ city: v })}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id="city-all" />
            <Label htmlFor="city-all" className="font-normal">All cities</Label>
          </div>
          {PAKISTAN_CITIES.slice(0, 8).map((c) => (
            <div key={c} className="flex items-center gap-2">
              <RadioGroupItem value={c} id={`city-${c}`} />
              <Label htmlFor={`city-${c}`} className="font-normal">{c}</Label>
            </div>
          ))}
        </RadioGroup>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-sm font-semibold">Specialty</p>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          <RadioGroup value={params.get("specialty") ?? "all"} onValueChange={(v) => setParam({ specialty: v })}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="sp-all" />
              <Label htmlFor="sp-all" className="font-normal">All specialties</Label>
            </div>
            {facets.specialties.map((s) => (
              <div key={s.slug} className="flex items-center gap-2">
                <RadioGroupItem value={s.slug} id={`sp-${s.slug}`} />
                <Label htmlFor={`sp-${s.slug}`} className="font-normal">
                  {s.name} <span className="text-muted-foreground">({s._count.doctors})</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-sm font-semibold">Consultation fee</p>
        <div className="space-y-1.5">
          {FEE_BANDS.map((b, i) => (
            <button
              key={b.label}
              type="button"
              onClick={() =>
                setParam(
                  activeFee === i
                    ? { minFee: undefined, maxFee: undefined }
                    : { minFee: b.min ? String(b.min) : undefined, maxFee: b.max ? String(b.max) : undefined }
                )
              }
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeFee === i ? "border-primary bg-primary/5 font-medium text-primary" : "hover:bg-accent"
              }`}
            >
              PKR {b.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Platform range: {formatPKR(facets.minFee)} – {formatPKR(facets.maxFee)}
        </p>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-sm font-semibold">Rating</p>
        <RadioGroup value={params.get("minRating") ?? "all"} onValueChange={(v) => setParam({ minRating: v })}>
          {[
            { v: "all", l: "Any rating" },
            { v: "4.5", l: "4.5 and above" },
            { v: "4", l: "4.0 and above" },
            { v: "3", l: "3.0 and above" },
          ].map((o) => (
            <div key={o.v} className="flex items-center gap-2">
              <RadioGroupItem value={o.v} id={`r-${o.v}`} />
              <Label htmlFor={`r-${o.v}`} className="font-normal">{o.l}</Label>
            </div>
          ))}
        </RadioGroup>
      </section>

      <Separator />

      <section className="space-y-3">
        <p className="text-sm font-semibold">More</p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="video"
            checked={params.get("videoOnly") === "1"}
            onCheckedChange={(c) => setParam({ videoOnly: c ? "1" : undefined })}
          />
          <Label htmlFor="video" className="font-normal">Video consultation available</Label>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Gender</p>
          <RadioGroup value={params.get("gender") ?? "all"} onValueChange={(v) => setParam({ gender: v })}>
            {[
              { v: "all", l: "Any" },
              { v: "MALE", l: "Male" },
              { v: "FEMALE", l: "Female" },
            ].map((o) => (
              <div key={o.v} className="flex items-center gap-2">
                <RadioGroupItem value={o.v} id={`g-${o.v}`} />
                <Label htmlFor={`g-${o.v}`} className="font-normal">{o.l}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Speaks</p>
          <RadioGroup value={params.get("language") ?? "all"} onValueChange={(v) => setParam({ language: v })}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="lang-all" />
              <Label htmlFor="lang-all" className="font-normal">Any language</Label>
            </div>
            {LANGUAGES.map((l) => (
              <div key={l} className="flex items-center gap-2">
                <RadioGroupItem value={l} id={`lang-${l}`} />
                <Label htmlFor={`lang-${l}`} className="font-normal">{l}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </section>

      <Button variant="outline" className="w-full" onClick={() => { router.push(pathname); onNavigate?.(); }}>
        <X /> Clear all filters
      </Button>
    </div>
  );
}

export function DoctorFilters({ facets }: { facets: Facets }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Desktop rail */}
      <aside className="sticky top-20 hidden h-fit w-64 shrink-0 lg:block">
        <div className="rounded-xl border bg-card p-5">
          <FilterBody facets={facets} />
        </div>
      </aside>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden">
            <SlidersHorizontal /> Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(22rem,90vw)]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterBody facets={facets} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
