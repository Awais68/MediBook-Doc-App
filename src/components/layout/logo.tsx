import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5 font-bold tracking-tight", className)}
      aria-label={`${APP_NAME} home`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-soft transition-transform duration-300 group-hover:-rotate-6">
        <HeartPulse className="h-[19px] w-[19px]" strokeWidth={2.4} />
      </span>
      <span className="text-lg">
        Medi<span className="text-primary">Book</span>
      </span>
    </Link>
  );
}
