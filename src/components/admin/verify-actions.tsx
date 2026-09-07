"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { reviewDoctorApplicationAction } from "@/server/actions/admin";

type Decision = "APPROVED" | "REJECTED" | "UNDER_REVIEW" | "SUSPENDED";

export function VerifyButton({
  doctorId,
  decision,
  label,
  variant = "default",
}: {
  doctorId: string;
  decision: Decision;
  label: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={variant}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await reviewDoctorApplicationAction(doctorId, decision);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? "Done.");
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}

/** Rejection and suspension both require a written reason — the applicant sees it. */
export function ReasonDialog({
  doctorId,
  decision,
  label,
  title,
}: {
  doctorId: string;
  decision: "REJECTED" | "SUSPENDED";
  label: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            This message is emailed to the applicant, so be specific about what to fix.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={reason}
          placeholder="PMDC number could not be verified on the council register."
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant="destructive"
            loading={pending}
            disabled={reason.trim().length < 5}
            onClick={() =>
              start(async () => {
                const res = await reviewDoctorApplicationAction(doctorId, decision, reason.trim());
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(res.message ?? "Done.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
