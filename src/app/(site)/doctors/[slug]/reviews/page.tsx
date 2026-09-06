import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDoctorBySlug, getDoctorReviews } from "@/lib/services/doctors";
import { ReviewList, ReviewSummary } from "@/components/doctor/review-list";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";

const PER_PAGE = 20;

export const revalidate = 300;

export default async function DoctorReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);

  const doctor = await getDoctorBySlug(slug);
  if (!doctor) notFound();

  const { reviews, total, distribution } = await getDoctorReviews(doctor.id, PER_PAGE, (current - 1) * PER_PAGE);

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href={`/doctors/${doctor.slug}`}>
          <ChevronLeft />
          Back to profile
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">Reviews for {doctor.user.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every review here comes from a patient whose visit was actually completed on MediBook.
      </p>

      <div className="mt-6 space-y-6">
        {total > 0 ? (
          <ReviewSummary avgRating={doctor.avgRating} reviewCount={total} distribution={distribution} />
        ) : null}
        <ReviewList reviews={reviews} />
        <Pagination
          page={current}
          totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
          baseParams={{}}
          basePath={`/doctors/${doctor.slug}/reviews`}
        />
      </div>
    </div>
  );
}
