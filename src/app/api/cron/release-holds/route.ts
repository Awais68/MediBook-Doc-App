import { NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/services/availability";
import { expireUnpaidBookings } from "@/lib/services/booking";
import { assertCron } from "../_guard";

export const dynamic = "force-dynamic";

/** Frees slots whose checkout hold expired or whose payment was never completed. Run every few minutes. */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const [released, expired] = await Promise.all([releaseExpiredHolds(), expireUnpaidBookings()]);
  return NextResponse.json({ ok: true, released, expired });
}
