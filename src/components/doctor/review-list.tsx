import { Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RatingStars } from "@/components/shared/rating-stars";
import { EmptyState } from "@/components/shared/empty-state";
import { initials, relativeTime } from "@/lib/utils";

type ReviewItem = {
  id: string;
  rating: number;
  bedsideManner: number | null;
  waitTimeScore: number | null;
  explanation: number | null;
  cleanliness: number | null;
  title: string | null;
  comment: string | null;
  isAnonymous: boolean;
  doctorReply: string | null;
  doctorRepliedAt: Date | null;
  createdAt: Date;
  patient: { name: string | null; image: string | null };
  appointment: { scheduledAt: Date; consultationType: string } | null;
};

const SUB_SCORES = [
  ["bedsideManner", "Bedside manner"],
  ["explanation", "Explanation"],
  ["waitTimeScore", "Wait time"],
  ["cleanliness", "Cleanliness"],
] as const;

export function ReviewSummary({
  avgRating,
  reviewCount,
  distribution,
}: {
  avgRating: number;
  reviewCount: number;
  distribution: { star: number; count: number }[];
}) {
  return (
    <div className="grid gap-6 rounded-xl border p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
      <div className="flex flex-col items-center justify-center sm:w-40">
        <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
        <RatingStars value={avgRating} size={18} className="mt-1" />
        <p className="mt-1 text-xs text-muted-foreground">{reviewCount} verified reviews</p>
      </div>
      <div className="space-y-1.5">
        {distribution.map((d) => (
          <div key={d.star} className="flex items-center gap-3 text-xs">
            <span className="w-8 shrink-0 text-muted-foreground">{d.star} star</span>
            <Progress value={reviewCount ? (d.count / reviewCount) * 100 : 0} className="h-2" />
            <span className="w-8 shrink-0 text-right text-muted-foreground">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  if (!reviews.length) {
    return (
      <EmptyState
        icon={Quote}
        title="No reviews yet"
        description="Only patients who actually completed a visit can review — so this doctor's first review is still on the way."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => {
        const name = r.isAnonymous ? "Verified patient" : r.patient.name ?? "Patient";
        return (
          <article key={r.id} className="rounded-xl border p-5">
            <header className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  {!r.isAnonymous && r.patient.image ? <AvatarImage src={r.patient.image} alt={name} /> : null}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(r.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <RatingStars value={r.rating} />
                <Badge variant="success" className="text-[10px]">
                  Verified visit
                </Badge>
              </div>
            </header>

            {r.title ? <p className="mt-3 text-sm font-semibold">{r.title}</p> : null}
            {r.comment ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.comment}</p> : null}

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {SUB_SCORES.map(([key, label]) =>
                r[key] ? (
                  <span key={key}>
                    {label}: <span className="font-medium text-foreground">{r[key]}/5</span>
                  </span>
                ) : null
              )}
            </div>

            {r.doctorReply ? (
              <div className="mt-4 rounded-lg border-l-2 border-primary bg-muted/40 p-3">
                <p className="text-xs font-semibold text-primary">Doctor&apos;s reply</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.doctorReply}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
