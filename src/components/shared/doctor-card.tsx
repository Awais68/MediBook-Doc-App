import Link from "next/link";
import { Building2, CheckCircle2, Clock, ThumbsUp, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/shared/rating-stars";
import { formatPKR, initials, pluralize } from "@/lib/utils";

export type DoctorCardData = {
  slug: string;
  yearsOfExperience: number;
  avgRating: number;
  reviewCount: number;
  satisfactionScore?: number;
  avgWaitMinutes?: number;
  videoConsultEnabled?: boolean;
  videoConsultFee?: number | null;
  user: { name: string | null; image: string | null };
  specialties: { specialty: { name: string } }[];
  hospitals: {
    id?: string;
    consultationFee: number;
    hospital: { name: string; city: string; area?: string | null };
  }[];
};

export function DoctorCard({ doctor }: { doctor: DoctorCardData }) {
  const primary = doctor.specialties[0]?.specialty.name;
  const cheapest = doctor.hospitals[0];
  const locations = doctor.hospitals.length;

  return (
    <Card className="group flex flex-col gap-4 p-5 transition-shadow hover:shadow-md sm:flex-row">
      <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
        <AvatarImage src={doctor.user.image ?? undefined} alt={doctor.user.name ?? "Doctor"} />
        <AvatarFallback className="text-base">{initials(doctor.user.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/doctors/${doctor.slug}`} className="truncate text-base font-semibold hover:text-primary">
            {doctor.user.name}
          </Link>
          <Badge variant="success" className="gap-1">
            <CheckCircle2 />
            Verified
          </Badge>
          {doctor.videoConsultEnabled ? (
            <Badge variant="default" className="gap-1">
              <Video />
              Video
            </Badge>
          ) : null}
        </div>

        {primary ? <p className="mt-0.5 text-sm text-primary">{primary}</p> : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {doctor.yearsOfExperience} {pluralize(doctor.yearsOfExperience, "year")} experience
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <RatingStars value={doctor.avgRating} showValue count={doctor.reviewCount} />
          {typeof doctor.satisfactionScore === "number" && doctor.satisfactionScore > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ThumbsUp className="h-3.5 w-3.5 text-success" />
              {doctor.satisfactionScore}% satisfied
            </span>
          ) : null}
          {typeof doctor.avgWaitMinutes === "number" ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />~{doctor.avgWaitMinutes} min wait
            </span>
          ) : null}
        </div>

        {cheapest ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {cheapest.hospital.name}, {cheapest.hospital.city}
              {locations > 1 ? ` +${locations - 1} more` : ""}
            </span>
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t pt-4 sm:w-44 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <div className="sm:text-right">
          <p className="text-xs text-muted-foreground">{locations > 1 ? "Fee from" : "Fee"}</p>
          <p className="text-lg font-semibold">{formatPKR(cheapest?.consultationFee ?? 0)}</p>
        </div>
        <Button asChild className="sm:w-full">
          <Link href={`/doctors/${doctor.slug}`}>Book now</Link>
        </Button>
      </div>
    </Card>
  );
}
