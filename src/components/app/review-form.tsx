"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { createReviewAction } from "@/server/actions/clinical";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SUB = [
  { key: "bedsideManner", label: "Bedside manner" },
  { key: "explanation", label: "Explained clearly" },
  { key: "waitTimeScore", label: "Wait time" },
  { key: "cleanliness", label: "Cleanliness" },
] as const;

function StarPicker({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          <Star
            width={size}
            height={size}
            className={cn(
              "transition-colors",
              shown >= i ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ appointmentId, doctorName }: { appointmentId: string; doctorName: string }) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [sub, setSub] = React.useState<Record<string, number>>({});
  const [anonymous, setAnonymous] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) {
      toast.error("Pick an overall rating first.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setPending(true);

    const res = await createReviewAction({
      appointmentId,
      rating,
      ...sub,
      title: String(form.get("title") ?? "") || undefined,
      comment: String(form.get("comment") ?? "") || undefined,
      isAnonymous: anonymous,
    });

    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Thanks — your review is live.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border p-5" id="review">
      <div>
        <h2 className="text-lg font-semibold">Rate your visit with {doctorName}</h2>
        <p className="text-sm text-muted-foreground">
          Only patients whose visit was completed can review — that&apos;s why these ratings are trustworthy.
        </p>
      </div>

      <div>
        <Label className="mb-2 block" required>
          Overall
        </Label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SUB.map((s) => (
          <div key={s.key}>
            <Label className="mb-1.5 block text-xs">{s.label}</Label>
            <StarPicker
              size={20}
              value={sub[s.key] ?? 0}
              onChange={(v) => setSub((prev) => ({ ...prev, [s.key]: v }))}
            />
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="title">Headline</Label>
        <Input id="title" name="title" maxLength={120} placeholder="Listened properly, no rush" />
      </div>

      <div>
        <Label htmlFor="comment">Your experience</Label>
        <Textarea
          id="comment"
          name="comment"
          rows={4}
          maxLength={2000}
          placeholder="What went well? How was the wait, the staff, the explanation?"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
        Post anonymously
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Submit review
      </Button>
    </form>
  );
}
