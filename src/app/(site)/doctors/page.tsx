import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import type { Gender } from "@prisma/client";
import { searchDoctors, getSearchFacets, type DoctorSort } from "@/lib/services/doctors";
import { DoctorCard } from "@/components/shared/doctor-card";
import { DoctorFilters } from "@/components/search/doctor-filters";
import { SortSelect } from "@/components/search/sort-select";
import { DoctorSearchBar } from "@/components/search/doctor-search-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Find a doctor",
  description: "Search verified doctors across Pakistan by specialty, symptom, city, fee and rating.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => {
  const s = one(v);
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const query = {
    q: one(sp.q),
    city: one(sp.city),
    specialty: one(sp.specialty),
    hospital: one(sp.hospital),
    gender: one(sp.gender) as Gender | undefined,
    minFee: num(sp.minFee),
    maxFee: num(sp.maxFee),
    minRating: num(sp.minRating),
    language: one(sp.language),
    videoOnly: one(sp.videoOnly) === "1",
    sort: (one(sp.sort) as DoctorSort) ?? "relevance",
    page: num(sp.page) ?? 1,
  };

  const [result, facets] = await Promise.all([searchDoctors(query), getSearchFacets(query.city)]);

  const heading = query.q
    ? `Results for “${query.q}”`
    : query.specialty
      ? facets.specialties.find((s) => s.slug === query.specialty)?.name ?? "Doctors"
      : "All doctors";

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Suspense fallback={<Skeleton className="h-[68px] w-full rounded-2xl" />}>
          <DoctorSearchBar defaultQuery={query.q ?? ""} defaultCity={query.city ?? ""} size="sm" />
        </Suspense>
      </div>

      <div className="flex gap-8">
        <Suspense fallback={<div className="hidden w-64 shrink-0 lg:block"><Skeleton className="h-[600px] w-full rounded-xl" /></div>}>
          <DoctorFilters facets={facets} />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {heading}
                {query.city ? <span className="text-muted-foreground"> in {query.city}</span> : null}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {result.total} {result.total === 1 ? "doctor" : "doctors"} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Suspense fallback={<Skeleton className="h-10 w-[190px]" />}>
                <SortSelect />
              </Suspense>
            </div>
          </div>

          {result.doctors.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No doctors match these filters"
              description="Try a broader search — remove the fee band, widen the city, or search the symptom instead of the specialty."
            />
          ) : (
            <div className="space-y-4">
              {result.doctors.map((d) => (
                <DoctorCard key={d.slug} doctor={d} />
              ))}
            </div>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/doctors"
            baseParams={{
              q: query.q,
              city: query.city,
              specialty: query.specialty,
              hospital: query.hospital,
              gender: query.gender,
              minFee: query.minFee?.toString(),
              maxFee: query.maxFee?.toString(),
              minRating: query.minRating?.toString(),
              language: query.language,
              videoOnly: query.videoOnly ? "1" : undefined,
              sort: query.sort === "relevance" ? undefined : query.sort,
            }}
          />
        </div>
      </div>
    </div>
  );
}
