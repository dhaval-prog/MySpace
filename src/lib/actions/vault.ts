"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVaultSummary, recordVaultTransaction, findVaultTransactions, type VaultSummary } from "@/lib/vault/ledger";
import { getRecurringPlan, upsertRecurringPlan } from "@/lib/vault/recurring";
import type { VaultRecurringPlan, VaultRecurringScheduleMode, VaultTransaction, VaultTransactionType } from "@/lib/supabase/types";

/**
 * Personal Piggy's server actions — the React replacement for the old
 * public/vault/vault.html 3D scene's plain-fetch REST routes (now removed).
 * All of these call straight into src/lib/vault/{ledger,recurring}.ts, the
 * same balance-validating ledger the old 3D experience used, so every
 * financial record from before this redesign is preserved exactly.
 */

export type PiggySummary = VaultSummary;

export async function getPiggySummary(): Promise<PiggySummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return getVaultSummary(supabase, user.id);
}

export type PiggyTransactionResult = { ok: true; balance: number } | { ok: false; error: string };

export async function addMoneyToPiggy(amount: number, comment?: string | null): Promise<PiggyTransactionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const result = await recordVaultTransaction(supabase, user.id, { type: "add", amount, comment, source: "manual" });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/vault");
  return { ok: true, balance: result.balance };
}

export async function takeMoneyOutOfPiggy(
  amount: number,
  category?: string | null,
  comment?: string | null
): Promise<PiggyTransactionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const result = await recordVaultTransaction(supabase, user.id, { type: "deduct", amount, category, comment, source: "manual" });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/vault");
  return { ok: true, balance: result.balance };
}

export interface PiggyHistoryFilters {
  type?: VaultTransactionType;
  limit?: number;
}

export async function getPiggyHistory(filters: PiggyHistoryFilters = {}): Promise<VaultTransaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return findVaultTransactions(supabase, user.id, { type: filters.type, limit: filters.limit ?? 100 });
}

export async function getPiggyRecurringPlan(): Promise<VaultRecurringPlan | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return getRecurringPlan(supabase, user.id);
}

export interface SetPiggyRecurringInput {
  amount: number;
  scheduleMode: VaultRecurringScheduleMode;
  dayOfMonth: number;
  enabled: boolean;
}

export type SetPiggyRecurringResult = { ok: true; plan: VaultRecurringPlan } | { ok: false; error: string };

export async function setPiggyRecurringPlan(input: SetPiggyRecurringInput): Promise<SetPiggyRecurringResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const result = await upsertRecurringPlan(supabase, user.id, input);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/vault");
  return { ok: true, plan: result.plan };
}
