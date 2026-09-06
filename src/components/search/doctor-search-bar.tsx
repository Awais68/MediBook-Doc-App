"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAKISTAN_CITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The single search entry point: one free-text box that accepts a doctor name,
 * a specialty, a symptom or a hospital — plus a city.
 */
export function DoctorSearchBar({
  defaultQuery = "",
  defaultCity = "",
  className,
  size = "lg",
}: {
  defaultQuery?: string;
  defaultCity?: string;
  className?: string;
  size?: "lg" | "sm";
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(defaultQuery);
  const [city, setCity] = React.useState(defaultCity || "all");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city && city !== "all") params.set("city", city);
    const qs = params.toString();
    router.push(`/doctors${qs ? `?${qs}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Doctor, specialty, symptom or hospital"
          className={cn("border-0 pl-9 shadow-none focus-visible:ring-0", size === "lg" && "h-12 text-base")}
          aria-label="Search doctors"
        />
      </div>

      <div className="hidden h-8 w-px bg-border sm:block" />

      <Select value={city} onValueChange={setCity}>
        <SelectTrigger
          className={cn("border-0 shadow-none focus:ring-0 sm:w-44", size === "lg" && "h-12")}
          aria-label="City"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="All cities" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cities</SelectItem>
          {PAKISTAN_CITIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" size={size === "lg" ? "lg" : "default"} className="sm:px-8">
        Search
      </Button>
    </form>
  );
}
