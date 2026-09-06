import "server-only";
import { prisma } from "@/lib/prisma";
import { invalid, notFound } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { formatPKR } from "@/lib/utils";

/**
 * Payment gateway seam.
 *
 * `mock` renders an in-app sandbox checkout so the whole online-payment flow is
 * testable end-to-end without a merchant account. Swapping in JazzCash/Easypaisa/
 * Stripe means implementing `createCheckout` + verifying the callback signature —
 * nothing above this file changes.
 */
export type CheckoutSession = { url: string; providerRef: string; provider: string };

export async function createCheckout(appointmentId: string): Promise<CheckoutSession> {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    include: { appointment: { select: { code: true, patientId: true } } },
  });
  if (!payment) throw notFound("No payment is attached to this appointment.");
  if (payment.status === "PAID") throw invalid("This appointment is already paid.");
  if (payment.method === "CASH_AT_CLINIC") throw invalid("This booking is set to pay at the clinic.");

  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  const providerRef = `${provider}_${payment.id}_${Date.now().toString(36)}`;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PENDING", provider, providerRef },
  });

  switch (provider) {
    case "mock":
      return { url: `/checkout/${appointmentId}?ref=${providerRef}`, providerRef, provider };
    // case "jazzcash": return jazzCashCheckout(payment, providerRef);
    // case "easypaisa": return easypaisaCheckout(payment, providerRef);
    // case "stripe": return stripeCheckout(payment, providerRef);
    default:
      throw invalid(
        `Payment provider "${provider}" is not wired up yet. Set PAYMENT_PROVIDER=mock for sandbox checkout.`,
      );
  }
}

/**
 * Marks a payment settled. In production this is only ever called from a
 * signature-verified gateway webhook — never from the browser.
 */
export async function settlePayment(opts: {
  providerRef: string;
  success: boolean;
  failureReason?: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { providerRef: opts.providerRef },
    include: {
      appointment: {
        select: {
          id: true,
          code: true,
          patientId: true,
          status: true,
          doctor: { select: { userId: true } },
        },
      },
    },
  });
  if (!payment) throw notFound("Unknown payment reference.");
  if (payment.status === "PAID") return payment; // webhook replay — idempotent

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id: payment.id },
      data: opts.success
        ? { status: "PAID", paidAt: new Date(), failureReason: null }
        : { status: "FAILED", failureReason: opts.failureReason ?? "Payment declined" },
    });

    // Paying up front auto-confirms the booking — no manual step for the clinic.
    if (opts.success && payment.appointment.status === "PENDING") {
      await tx.appointment.update({
        where: { id: payment.appointment.id },
        data: { status: "CONFIRMED" },
      });
    }
    return p;
  });

  await Promise.allSettled([
    notify({
      userId: payment.appointment.patientId,
      type: opts.success ? "PAYMENT_RECEIVED" : "SYSTEM",
      title: opts.success
        ? `Payment received — ${formatPKR(payment.amount)}`
        : "Payment failed",
      body: opts.success
        ? `Appointment ${payment.appointment.code} is confirmed.`
        : `We couldn't process your payment for ${payment.appointment.code}. Your slot is held — please retry.`,
      actionUrl: `/appointments/${payment.appointment.id}`,
      alsoEmail: true,
    }),
    audit({
      action: opts.success ? "payment.paid" : "payment.failed",
      entity: "Payment",
      entityId: payment.id,
      meta: { amount: payment.amount, provider: payment.provider },
    }),
  ]);

  return updated;
}

export async function markCashCollected(opts: { appointmentId: string; actorId: string }) {
  const payment = await prisma.payment.findUnique({ where: { appointmentId: opts.appointmentId } });
  if (!payment) throw notFound("No payment found.");
  if (payment.method !== "CASH_AT_CLINIC") throw invalid("This booking was not set to pay at the clinic.");

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", paidAt: new Date() },
  });
  await audit({
    actorId: opts.actorId,
    action: "payment.cash_collected",
    entity: "Payment",
    entityId: payment.id,
  });
  return updated;
}

export async function processRefund(opts: { paymentId: string; actorId: string; amount?: number }) {
  const payment = await prisma.payment.findUnique({ where: { id: opts.paymentId } });
  if (!payment) throw notFound("Payment not found.");
  if (!["PAID", "REFUND_PENDING"].includes(payment.status)) {
    throw invalid("Only a settled payment can be refunded.");
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      refundAmount: opts.amount ?? payment.amount,
    },
  });
  await audit({
    actorId: opts.actorId,
    action: "payment.refund",
    entity: "Payment",
    entityId: payment.id,
    meta: { amount: updated.refundAmount },
  });
  return updated;
}
