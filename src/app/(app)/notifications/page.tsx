import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MarkAllReadButton } from "@/components/app/mark-read-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn, relativeTime } from "@/lib/utils";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        action={<MarkAllReadButton disabled={unread === 0} />}
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing here yet"
          description="Booking confirmations, reminders and follow-up nudges will show up here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const body = (
              <Card className={cn("transition-colors", !n.readAt && "border-primary/40 bg-primary/5")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                </CardContent>
              </Card>
            );

            return n.actionUrl ? (
              <Link key={n.id} href={n.actionUrl}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
