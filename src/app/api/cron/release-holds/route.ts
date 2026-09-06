import { NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/services/availability";
import { assertCron } from "../_guard";

export const dynamic = "force-dynamic";

/** Frees slots whose checkout hold expired. Run every few minutes. */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const released = await releaseExpiredHolds();
  return NextResponse.json({ ok: true, released });
}
