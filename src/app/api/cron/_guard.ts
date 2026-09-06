import { NextResponse } from "next/server";

/**
 * Cron endpoints are called by Vercel Cron / an external scheduler.
 * They authenticate with a bearer secret, never with a user session.
 */
export function assertCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });

  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
