import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ItemExpiryNotificationKind } from "@/lib/supabase/types";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export interface ExpiryScanSummary {
  created: number;
  errors: string[];
}

/**
 * The cron entry point (src/app/api/notifications/cron/expiry-scan) — scans
 * every item with an expiry_date and, for each of the three milestones (7
 * days out, 1 day out, on/after the expiry date itself), inserts one
 * item_expiry_notifications row per (item, kind) that doesn't already have
 * one. The table's `unique (item_id, kind)` constraint is the actual
 * duplicate guard (an `insert ... on conflict do nothing`, mirroring how
 * runDueRecurringDeposits treats vault_recurring_plans as the source of
 * truth for "was this already done") — this function just decides which
 * rows are candidates each run.
 *
 * "expired" uses <= today (not ===) so an item whose expiry passed on a day
 * the scan didn't run still gets exactly one expired notification once it
 * does, instead of silently never getting one.
 */
export async function runExpiryNotificationScan(
  supabase: SupabaseClient<Database>,
  today: Date = new Date()
): Promise<ExpiryScanSummary> {
  const todayStr = toDateStr(today);
  const in1DayStr = toDateStr(addDays(today, 1));
  const in7DaysStr = toDateStr(addDays(today, 7));

  const { data: items, error } = await supabase
    .from("items")
    .select("id, user_id, expiry_date")
    .not("expiry_date", "is", null)
    .lte("expiry_date", in7DaysStr);

  if (error) {
    console.error("notifications: failed to load items for expiry scan —", error.message);
    return { created: 0, errors: [error.message] };
  }

  const candidates: { item_id: string; user_id: string; kind: ItemExpiryNotificationKind; expiry_date: string }[] = [];
  for (const item of items ?? []) {
    if (!item.expiry_date) continue;
    if (item.expiry_date <= todayStr) {
      candidates.push({ item_id: item.id, user_id: item.user_id, kind: "expired", expiry_date: item.expiry_date });
    } else if (item.expiry_date === in1DayStr) {
      candidates.push({ item_id: item.id, user_id: item.user_id, kind: "1day", expiry_date: item.expiry_date });
    } else if (item.expiry_date === in7DaysStr) {
      candidates.push({ item_id: item.id, user_id: item.user_id, kind: "7day", expiry_date: item.expiry_date });
    }
  }

  if (candidates.length === 0) return { created: 0, errors: [] };

  const { data: inserted, error: insertError } = await supabase
    .from("item_expiry_notifications")
    .upsert(candidates, { onConflict: "item_id,kind", ignoreDuplicates: true })
    .select("id");

  if (insertError) {
    console.error("notifications: failed to insert item_expiry_notifications —", insertError.message);
    return { created: 0, errors: [insertError.message] };
  }

  return { created: inserted?.length ?? 0, errors: [] };
}
