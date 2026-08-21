import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runExpiryNotificationScan } from "@/lib/notifications/expiry";

/**
 * Triggered daily by Vercel Cron (see vercel.json) — same shape as
 * /api/vault/cron/recurring-run: no logged-in user, so this checks for
 * Vercel's `Authorization: Bearer <CRON_SECRET>` instead of a session.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await runExpiryNotificationScan(admin);
  return NextResponse.json(result);
}
