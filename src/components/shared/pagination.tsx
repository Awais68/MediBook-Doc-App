import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Server-rendered pagination — keeps the current query string intact. */
export function Pagination({
  page,
  totalPages,
  baseParams,
  basePath,
}: {
  page: number;
  totalPages: number;
  baseParams: Record<string, string | undefined>;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) if (v) params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <Button variant="outline" size="icon" asChild disabled={page <= 1}>
        <Link href={href(Math.max(1, page - 1))} aria-label="Previous page">
          <ChevronLeft />
        </Link>
      </Button>

      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1]! > 1 ? <span className="px-2 text-muted-foreground">…</span> : null}
          <Button variant={p === page ? "default" : "outline"} size="icon" asChild>
            <Link href={href(p)} aria-current={p === page ? "page" : undefined}>
              {p}
            </Link>
          </Button>
        </span>
      ))}

      <Button variant="outline" size="icon" asChild disabled={page >= totalPages}>
        <Link href={href(Math.min(totalPages, page + 1))} aria-label="Next page">
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}
