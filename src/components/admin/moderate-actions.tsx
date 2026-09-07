"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { moderateReviewAction } from "@/server/actions/clinical";
import { setUserActiveAction, setUserRoleAction } from "@/server/actions/admin";

export function ModerateReviewButton({
  reviewId,
  status,
  label,
  variant = "default",
}: {
  reviewId: string;
  status: "PUBLISHED" | "REJECTED";
  label: string;
  variant?: "default" | "outline" | "ghost";
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
          const res = await moderateReviewAction(reviewId, status);
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

export function ToggleUserButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await setUserActiveAction(userId, !isActive);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? "Updated.");
          router.refresh();
        })
      }
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

const ROLES: Role[] = ["PATIENT", "DOCTOR", "HOSPITAL_ADMIN", "ADMIN"];

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      value={role}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          const res = await setUserRoleAction(userId, v as (typeof ROLES)[number]);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? "Role updated.");
          router.refresh();
        })
      }
    >
      <SelectTrigger className="h-8 w-40 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r.replace(/_/g, " ").toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
