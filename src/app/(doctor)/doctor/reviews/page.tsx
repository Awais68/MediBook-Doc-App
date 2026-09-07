import type { Metadata } from "next";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { formatDayDate, initials, relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { RatingStars } from "@/components/shared/rating-stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReviewReply } from "@/components/doctor-portal/review-reply";

export const metadata: Metadata = { title: "Reviews · Doctor" };

const PAGE_SIZE = 15;

export default async function DoctorReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { doctor } = await requireDoctor();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const where = { doctorId: doctor.id, status: "PUBLISHED" as const };
  const [reviews, total, buckets, profile] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        isAnonymous: true,
        createdAt: true,
        doctorReply: true,
        doctorRepliedAt: true,
        bedsideManner: true,
        waitTimeScore: true,
        explanation: true,
        cleanliness: true,
        patient: { select: { name: true, image: true } },
        appointment: { select: { scheduledAt: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    prisma.doctor.findUnique({
      where: { id: doctor.id },
      select: { avgRating: true, reviewCount: true, satisfactionScore: true },
    }),
  ]);

  const countFor = (r: number) => buckets.find((b) => b.rating === r)?._count._all ?? 0;
  const unanswered = reviews.filter((r) => !r.doctorReply).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Only patients with a completed visit can review you — no anonymous drive-bys."
      />

      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-semibold">{(profile?.avgRating ?? 0).toFixed(1)}</p>
            <div className="mt-2 flex justify-center">
              <RatingStars value={profile?.avgRating ?? 0} size={18} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {profile?.reviewCount ?? 0} reviews · {profile?.satisfactionScore ?? 0}% satisfaction
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-6">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-3 text-sm">
                <span className="w-3 tabular-nums">{r}</span>
                <Progress value={total ? (countFor(r) / total) * 100 : 0} className="h-2 flex-1" />
                <span className="w-8 text-right tabular-nums text-muted-foreground">{countFor(r)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {unanswered > 0 ? (
        <p className="text-sm text-muted-foreground">
          {unanswered} review{unanswered > 1 ? "s" : ""} on this page have no reply yet. Replying
          lifts conversion more than the rating itself.
        </p>
      ) : null}

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="They start arriving once you complete visits." />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const name = r.isAnonymous ? "Anonymous patient" : (r.patient.name ?? "Patient");
            return (
              <Card key={r.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {!r.isAnonymous ? <AvatarImage src={r.patient.image ?? undefined} alt="" /> : null}
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        Visited {formatDayDate(r.appointment.scheduledAt)} · {relativeTime(r.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary">Verified visit</Badge>
                    <RatingStars value={r.rating} size={16} />
                  </div>

                  {r.title ? <p className="font-medium">{r.title}</p> : null}
                  {r.comment ? <p className="text-sm">{r.comment}</p> : null}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {r.bedsideManner ? <span>Bedside manner {r.bedsideManner}/5</span> : null}
                    {r.explanation ? <span>Explanation {r.explanation}/5</span> : null}
                    {r.waitTimeScore ? <span>Wait time {r.waitTimeScore}/5</span> : null}
                    {r.cleanliness ? <span>Cleanliness {r.cleanliness}/5</span> : null}
                  </div>

                  {r.doctorReply ? (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Your reply · {r.doctorRepliedAt ? relativeTime(r.doctorRepliedAt) : ""}
                      </p>
                      {r.doctorReply}
                    </div>
                  ) : (
                    <ReviewReply reviewId={r.id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{}}
        basePath="/doctor/reviews"
      />
    </div>
  );
}
