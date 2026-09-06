import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="h-[18px] w-[18px]" />
      </span>
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}
