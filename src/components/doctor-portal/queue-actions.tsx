"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { transitionAppointmentAction, markCashCollectedAction } from "@/server/actions/appointments";

const NEXT_LABEL: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: "Confirm",
  CHECKED_IN: "Check in",
  IN_PROGRESS: "Start visit",
  NO_SHOW: "No show",
};

/** The queue only ever moves an appointment one step, so intent stays obvious. */
export function StatusButton({
  appointmentId,
  to,
  variant = "default",
  size = "sm",
  label,
}: {
  appointmentId: string;
  to: AppointmentStatus;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "default";
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await transitionAppointmentAction(appointmentId, to);
          if (!res.ok) { toast.error(res.error); return; }
          toast.success(res.message ?? "Updated.");
          router.refresh();
        })
      }
    >
      {label ?? NEXT_LABEL[to] ?? "Update"}
    </Button>
  );
}

export function CollectCashButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      disabled={done}
      onClick={() =>
        start(async () => {
          const res = await markCashCollectedAction(appointmentId);
          if (!res.ok) { toast.error(res.error); return; }
          setDone(true);
          toast.success(res.message ?? "Payment recorded.");
          router.refresh();
        })
      }
    >
      {done ? "Cash collected" : "Mark cash collected"}
    </Button>
  );
}
