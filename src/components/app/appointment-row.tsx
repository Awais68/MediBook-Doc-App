import Link from "next/link";
import { Building2, CalendarClock, Video } from "lucide-react";
import type { AppointmentStatus, ConsultationType, PaymentStatus } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatPKR, initials } from "@/lib/utils";

export type AppointmentRowData = {
  id: string;
  code: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  consultationType: ConsultationType;
  fee: number;
  isFollowUp: boolean;
  tokenNumber: number | null;
  doctor: { slug: string; user: { name: string | null; image: string | null } };
  hospital: { name: string; city: string };
  familyMember: { name: string } | null;
  payment: { status: PaymentStatus } | null;
};

export function AppointmentRow({ appointment: a }: { appointment: AppointmentRowData }) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <Link href={`/appointments/${a.id}`} className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={a.doctor.user.image ?? undefined} alt={a.doctor.user.name ?? ""} />
          <AvatarFallback>{initials(a.doctor.user.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{a.doctor.user.name}</p>
            {a.isFollowUp ? <Badge variant="secondary">Follow-up</Badge> : null}
            {a.consultationType === "VIDEO" ? (
              <Badge variant="outline" className="gap-1">
                <Video className="h-3 w-3" />
                Video
              </Badge>
            ) : null}
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {formatDateTime(a.scheduledAt)}
            {a.tokenNumber ? <span className="ml-1">· Token #{a.tokenNumber}</span> : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {a.hospital.name}, {a.hospital.city}
          </p>
          {a.familyMember ? (
            <p className="mt-0.5 text-xs text-muted-foreground">For {a.familyMember.name}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
          <AppointmentStatusBadge status={a.status} />
          {a.payment ? <PaymentStatusBadge status={a.payment.status} /> : null}
          <span className="text-sm font-semibold sm:mt-1">{formatPKR(a.fee, { free: "Free" })}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{a.code}</span>
        </div>
      </Link>
    </Card>
  );
}
