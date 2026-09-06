import type { AppointmentStatus, PaymentStatus, VerificationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { APPOINTMENT_STATUS, PAYMENT_STATUS, VERIFICATION_STATUS } from "@/lib/labels";

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const s = APPOINTMENT_STATUS[status];
  return <Badge variant={s.tone}>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status];
  return <Badge variant={s.tone}>{s.label}</Badge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const s = VERIFICATION_STATUS[status];
  return <Badge variant={s.tone}>{s.label}</Badge>;
}
