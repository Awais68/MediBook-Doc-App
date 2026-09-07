import Link from "next/link";
import type { Metadata } from "next";
import type { ReviewStatus } from "@prisma/client";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatDayDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { RatingStars } from "@/components/shared/rating-stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModerateReviewButton } from "@/components/admin/moderate-actions";

export const metadata: Metadata = { title: "Reviews · Admin" };

const PAGE_SIZE = 20;
const TABS = ["PENDING", "PUBLISHED", "REJECTED"] as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requirePermission("review.moderate");
  const sp = await searchParams;
  const status = (TABS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as ReviewStatus)
    : "PENDING";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = { status };
  const [reviews, total, counts] = await Promise.all([
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
        moderationNote: true,
        doctorReply: true,
        patient: { select: { name: true, image: true } },
        doctor: { select: { slug: true, user: { select: { name: true } } } },
        appointment: { select: { code: true, scheduledAt: true } },
      },
    }),
    prisma.review.count({ where }),
    Promise.all(TABS.map((t) => prisma.review.count({ where: { status: t } }))),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review moderation"
        description="Every review is tied to a completed visit. Reject only for abuse, PII or spam — not for being negative."
      />

      <Tabs value={status}>
        <TabsList>
          {TABS.map((t, i) => (
            <TabsTrigger key={t} value={t} asChild>
              <Link href={`/admin/reviews?status=${t}`}>
                {t.toLowerCase()}
                <span className="ml-1.5 text-xs text-muted-foreground">{counts[i]}</span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="Nothing in this bucket" />
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
                        on{" "}
                        <Link href={`/doctors/${r.doctor.slug}`} className="hover:underline">
                          {r.doctor.user.name}
                        </Link>{" "}
                        · visit {r.appointment.code} ({formatDayDate(r.appointment.scheduledAt)})
                      </p>
                    </div>
                    {r.isAnonymous ? <Badge variant="outline">Anonymous</Badge> : null}
                    <RatingStars value={r.rating} size={16} />
                  </div>

                  {r.title ? <p className="font-medium">{r.title}</p> : null}
                  {r.comment ? <p className="text-sm">{r.comment}</p> : null}
                  {r.doctorReply ? (
                    <p className="rounded-md bg-muted p-3 text-sm">
                      <span className="text-xs text-muted-foreground">Doctor reply: </span>
                      {r.doctorReply}
                    </p>
                  ) : null}
                  {r.moderationNote ? (
                    <p className="text-xs text-muted-foreground">Note: {r.moderationNote}</p>
                  ) : null}

                  <div className="flex gap-2">
                    {status !== "PUBLISHED" ? (
                      <ModerateReviewButton reviewId={r.id} status="PUBLISHED" label="Publish" />
                    ) : null}
                    {status !== "REJECTED" ? (
                      <ModerateReviewButton reviewId={r.id} status="REJECTED" label="Reject" variant="outline" />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        baseParams={{ status }}
        basePath="/admin/reviews"
      />
    </div>
  );
}
