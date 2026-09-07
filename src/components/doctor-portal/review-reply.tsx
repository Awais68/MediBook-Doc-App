"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToReviewAction } from "@/server/actions/clinical";

export function ReviewReply({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reply publicly
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Textarea
        rows={3}
        value={reply}
        placeholder="Thank you for the feedback…"
        onChange={(e) => setReply(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={pending}
          disabled={reply.trim().length < 2}
          onClick={() =>
            start(async () => {
              const res = await replyToReviewAction(reviewId, reply.trim());
              if (!res.ok) { toast.error(res.error); return; }
              toast.success(res.message ?? "Reply posted.");
              setOpen(false);
              router.refresh();
            })
          }
        >
          Post reply
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Your reply is public. Never include clinical details — the review page is indexed.
      </p>
    </div>
  );
}
