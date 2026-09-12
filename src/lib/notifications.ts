import "server-only";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/providers/sms";
import { sendEmail, emailLayout } from "@/lib/providers/email";

/** Notification bodies interpolate user-authored text (names, reasons); never trust them as HTML. */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
import type { NotificationType } from "@prisma/client";

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  alsoEmail?: boolean;
  alsoSms?: boolean;
};

/**
 * Writes an in-app notification and optionally fans out to email/SMS.
 * Delivery failures are logged, never thrown — a booking must not fail
 * because an SMS gateway is down.
 */
export async function notify(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      channel: "IN_APP",
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      data: (input.data ?? {}) as object,
      sentAt: new Date(),
    },
  });

  if (!input.alsoEmail && !input.alsoSms) return notification;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, phone: true },
  });
  if (!user) return notification;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await Promise.allSettled([
    input.alsoEmail && user.email
      ? sendEmail({
          to: user.email,
          subject: input.title,
          html: emailLayout(
            escapeHtml(input.title),
            `<p>${escapeHtml(input.body)}</p>`,
            input.actionUrl ? { label: "Open MediBook", url: `${base}${input.actionUrl}` } : undefined,
          ),
          text: input.body,
        })
      : null,
    input.alsoSms && user.phone
      ? sendSms({ to: user.phone, body: `${input.title}\n${input.body}` })
      : null,
  ]);

  return notification;
}

export async function notifyMany(inputs: NotifyInput[]) {
  return Promise.allSettled(inputs.map(notify));
}
