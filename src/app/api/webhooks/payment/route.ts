import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { settlePayment } from "@/lib/services/payments";

export const dynamic = "force-dynamic";

/**
 * Single webhook entry point for every gateway. Each provider signs differently,
 * so signature verification is per-provider; the settlement path is shared and
 * idempotent (replaying the same providerRef is a no-op).
 *
 * Point JazzCash / Easypaisa / Stripe at: POST /api/webhooks/payment?provider=<name>
 */
export async function POST(req: Request) {
  const provider = new URL(req.url).searchParams.get("provider") ?? process.env.PAYMENT_PROVIDER ?? "mock";
  const raw = await req.text();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifySignature(provider, req, raw)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { providerRef, success, failureReason } = normalize(provider, body);
  if (!providerRef) return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });

  try {
    await settlePayment({ providerRef, success, failureReason });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook] settlement failed", e);
    // 500 so the gateway retries rather than marking the callback delivered.
    return NextResponse.json({ error: "Settlement failed" }, { status: 500 });
  }
}

function verifySignature(provider: string, req: Request, raw: string): boolean {
  switch (provider) {
    case "stripe": {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      const header = req.headers.get("stripe-signature");
      if (!secret || !header) return false;
      // Stripe's scheme: t=<ts>,v1=<hmac of "<ts>.<body>">
      const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
      if (!parts.t || !parts.v1) return false;
      // Reject stale signatures so a captured webhook can't be replayed later.
      const ageSeconds = Math.abs(Date.now() / 1000 - Number(parts.t));
      if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;
      const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
      return timingSafeEqual(expected, parts.v1);
    }
    case "jazzcash": {
      const salt = process.env.JAZZCASH_INTEGRITY_SALT;
      const header = req.headers.get("x-signature");
      if (!salt || !header) return false;
      const expected = crypto.createHmac("sha256", salt).update(raw).digest("hex");
      return timingSafeEqual(expected, header);
    }
    case "easypaisa": {
      const key = process.env.EASYPAISA_HASH_KEY;
      const header = req.headers.get("x-signature");
      if (!key || !header) return false;
      const expected = crypto.createHmac("sha256", key).update(raw).digest("hex");
      return timingSafeEqual(expected, header);
    }
    default:
      // Mock provider: no gateway exists, so nothing to verify in development.
      return process.env.NODE_ENV !== "production";
  }
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function normalize(provider: string, body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  switch (provider) {
    case "jazzcash":
      return {
        providerRef: str(body.pp_TxnRefNo),
        success: str(body.pp_ResponseCode) === "000",
        failureReason: str(body.pp_ResponseMessage),
      };
    case "easypaisa":
      return {
        providerRef: str(body.orderId),
        success: str(body.responseCode) === "0000",
        failureReason: str(body.responseDesc),
      };
    case "stripe": {
      const data = (body.data as { object?: Record<string, unknown> } | undefined)?.object ?? {};
      return {
        providerRef: str(data.id) ?? str(data.payment_intent),
        success: str(body.type) === "checkout.session.completed" || str(body.type) === "payment_intent.succeeded",
        failureReason: str(body.type),
      };
    }
    default:
      return {
        providerRef: str(body.providerRef),
        success: body.success === true,
        failureReason: str(body.failureReason),
      };
  }
}
