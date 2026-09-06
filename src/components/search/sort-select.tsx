"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "rating", label: "Highest rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "experience", label: "Most experienced" },
  { value: "fee_low", label: "Fee: low to high" },
  { value: "fee_high", label: "Fee: high to low" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <Select
      value={params.get("sort") ?? "relevance"}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        if (v === "relevance") next.delete("sort");
        else next.set("sort", v);
        next.delete("page");
        const qs = next.toString();
        router.push(`${pathname}${qs ? `?${qs}` : ""}`);
      }}
    >
      <SelectTrigger className="w-[190px]" aria-label="Sort results">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
