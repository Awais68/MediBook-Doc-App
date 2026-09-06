import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = 14,
  className,
  showValue = false,
  count,
}: {
  value: number;
  size?: number;
  className?: string;
  showValue?: boolean;
  count?: number;
}) {
  const rounded = Math.round(value * 2) / 2;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = rounded >= i;
          const half = !filled && rounded >= i - 0.5;
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                "shrink-0",
                filled ? "fill-warning text-warning" : half ? "fill-warning/50 text-warning" : "fill-transparent text-muted-foreground/40"
              )}
            />
          );
        })}
      </span>
      {showValue ? (
        <span className="text-sm font-medium">
          {value > 0 ? value.toFixed(1) : "New"}
          {typeof count === "number" && count > 0 ? (
            <span className="ml-1 font-normal text-muted-foreground">({count})</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
