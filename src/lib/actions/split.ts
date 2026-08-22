"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClientSafe } from "@/lib/supabase/admin";
import { isPastGuestAccessWindow } from "@/lib/guest";
import { displayName } from "@/lib/utils";
import { getHouseholdContext } from "@/lib/actions/household";
import { computeSplit, simplifyDebts, type SplitParticipantInput, type SimplifiedTransfer } from "@/lib/split/split-math";
import type { SplitExpense, SplitExpenseParticipant, SplitSettlement, SplitShareType, SplitSettlementMethod } from "@/lib/supabase/types";

/** Which of the given user ids belong to a guest whose 7-day access window has passed — profiles.phone is only ever set by the guest sign-in flow, so "has a phone" already means "was a guest"; cross-referencing guest_phone_registry (service-role only) finds which of those are now expired. Returns an empty set (nothing flagged) when the service role key isn't configured, same graceful-degradation as everywhere else guest expiry is checked. */
async function findExpiredGuestUserIds(userIds: string[]): Promise<Set<string>> {
  const admin = createAdminClientSafe();
  if (!admin || userIds.length === 0) return new Set();

  const { data: profiles } = await admin.from("profiles").select("id, phone").in("id", userIds);
  const phoneById = new Map((profiles ?? []).filter((p) => p.phone).map((p) => [p.id, p.phone as string]));
  const phones = Array.from(new Set(phoneById.values()));
  if (phones.length === 0) return new Set();

  const { data: registryRows } = await admin.from("guest_phone_registry").select("phone, first_seen_at").in("phone", phones);
  const expiredPhones = new Set((registryRows ?? []).filter((r) => isPastGuestAccessWindow(r.first_seen_at)).map((r) => r.phone));

  const expiredUserIds = new Set<string>();
  for (const [userId, phone] of phoneById) {
    if (expiredPhones.has(phone)) expiredUserIds.add(userId);
  }
  return expiredUserIds;
}

/**
 * Let's Split — shared-expense splitting. Deliberately separate from the
 * household vault/goals ledger (see supabase/schema.sql's "Let's Split"
 * section): balances here are never stored, always derived live from
 * split_expense_participants + split_settlements, mirroring how
 * household-goals.ts/getVaultSummary already derive savings balances.
 *
 * For now every household has exactly one implicit split group
 * ("Household Expenses", auto-created/backfilled — see getDefaultGroupId).
 * Named sub-groups (e.g. "Goa Trip") are supported by the schema but not
 * yet surfaced in the UI.
 */

export interface SplitMemberBalance {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** From the CURRENT viewer's perspective: positive = this member owes the viewer; negative = the viewer owes this member; ~0 = settled up. */
  netAmount: number;
}

export interface SplitExpenseSummary {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  payerId: string;
  payerName: string;
  /** Who added this expense — always the payer at creation time, but stays fixed even if the payer is later changed via an edit, so this (not payerId) is the real "can delete/edit" gate. */
  createdBy: string;
  participantCount: number;
  expenseDate: string;
  createdAt: string;
  /** True once none of this expense's participants still net-owe the payer (considering all expenses/settlements between them, not just this one — settling up is always against the overall balance, the same way Splitwise itself works, never earmarked to one expense). */
  settled: boolean;
  /** True when the payer's guest access has passed its 7-day window — the UI dims this row (while still unsettled) so other members know that account can no longer be reached to manage it. Always false when the service role key isn't configured. */
  payerIsExpiredGuest: boolean;
  /** Per-participant split, payer first — lets the expense row's hover reveal show who owes what without a second round trip to getExpenseDetail. */
  participants: SplitExpenseParticipantPreview[];
}

export interface SplitExpenseParticipantPreview {
  userId: string;
  name: string;
  owedAmount: number;
  isPayer: boolean;
}

export interface SplitSummary {
  groupId: string;
  youOwe: number;
  youAreOwed: number;
  net: number;
  /** Sum of every confirmed settlement ever recorded in this group, in either direction — the wallet card's "Settled" figure. */
  settledAmount: number;
  memberBalances: SplitMemberBalance[];
  recentExpenses: SplitExpenseSummary[];
}

export interface SplitExpenseParticipantDetail {
  userId: string;
  name: string;
  shareType: SplitShareType;
  shareValue: number | null;
  owedAmount: number;
  isPayer: boolean;
}

export interface SplitExpenseDetail {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: string | null;
  paidBy: string;
  paidByName: string;
  expenseDate: string;
  comment: string | null;
  receiptUrl: string | null;
  splitMethod: SplitShareType;
  createdBy: string;
  canEdit: boolean;
  participants: SplitExpenseParticipantDetail[];
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: string | null;
  paidBy: string;
  expenseDate?: string | null;
  comment?: string | null;
  splitMethod: SplitShareType;
  participants: SplitParticipantInput[];
}

export interface RequestSettlementInput {
  /** The person being paid — only the payer (the caller, who owes) can request a settlement now; see requestSettlement. */
  toUserId: string;
  amount: number;
  method: SplitSettlementMethod;
  comment?: string | null;
}

export interface SimplifiedTransferWithNames extends SimplifiedTransfer {
  fromName: string;
  toName: string;
}

/** The household's one default split group — auto-created by handle_new_household()/backfilled for existing households, so this should never return null in practice. */
export async function getDefaultGroupId(householdId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("split_groups").select("id").eq("household_id", householdId).eq("is_default", true).maybeSingle();
  return data?.id ?? null;
}

export interface SplitGroupSummary {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
  createdBy: string;
  createdByName: string;
  createdByAvatarUrl: string | null;
  createdAt: string;
  memberCount: number;
  memberPreview: { userId: string; name: string; avatarUrl: string | null }[];
  totalSpent: number;
}

/**
 * Every split group the caller belongs to within this household — RLS
 * (split_groups_select_member) already scopes this to groups the caller is
 * actually a member of, same as everywhere else in Let's Split. Powers the
 * group switcher; a household can have any number of groups now (the
 * default "Household Expenses" one, plus whatever named groups members
 * create), not just the single implicit group most of this file still
 * defaults to when no groupId is given.
 */
export async function listSplitGroups(householdId: string): Promise<SplitGroupSummary[]> {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("split_groups")
    .select("*")
    .eq("household_id", householdId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const [{ data: members }, { data: expenses }] = await Promise.all([
    supabase.from("split_members").select("group_id, user_id").in("group_id", groupIds),
    supabase.from("split_expenses").select("group_id, amount").in("group_id", groupIds),
  ]);

  const memberIdsByGroup = new Map<string, string[]>();
  for (const m of members ?? []) {
    const arr = memberIdsByGroup.get(m.group_id) ?? [];
    arr.push(m.user_id);
    memberIdsByGroup.set(m.group_id, arr);
  }
  const totalByGroup = new Map<string, number>();
  for (const e of expenses ?? []) {
    totalByGroup.set(e.group_id, (totalByGroup.get(e.group_id) ?? 0) + e.amount);
  }

  const allMemberIds = new Set<string>();
  for (const ids of memberIdsByGroup.values()) for (const id of ids) allMemberIds.add(id);
  const { data: profiles } = allMemberIds.size ? await supabase.from("profiles").select("*").in("id", Array.from(allMemberIds)) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return groups.map((g) => {
    const memberIds = memberIdsByGroup.get(g.id) ?? [];
    return {
      id: g.id,
      name: g.name,
      icon: g.icon ?? (g.is_default ? "🏠" : "🤝"),
      isDefault: g.is_default,
      createdBy: g.created_by,
      createdByName: displayName(profileById.get(g.created_by)),
      createdByAvatarUrl: profileById.get(g.created_by)?.avatar_url ?? null,
      createdAt: g.created_at,
      memberCount: memberIds.length,
      memberPreview: memberIds.slice(0, 4).map((id) => ({ userId: id, name: displayName(profileById.get(id)), avatarUrl: profileById.get(id)?.avatar_url ?? null })),
      totalSpent: Math.round((totalByGroup.get(g.id) ?? 0) * 100) / 100,
    };
  });
}

/** Creates a new named split group (e.g. "Weekend in Austin") beyond the household's one default group, and adds the caller as its first member. */
export async function createSplitGroup(householdId: string, name: string, icon?: string | null): Promise<{ groupId: string } | { error: string }> {
  if (!name.trim()) return { error: "Give the group a name." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_split_group", { p_household_id: householdId, p_name: name.trim(), p_icon: icon ?? null });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to create group" };

  revalidatePath("/split");
  return { groupId: data.group_id };
}

export interface SplitGroupMemberInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isCreator: boolean;
}

/**
 * The split group's own membership + display names — deliberately NOT
 * sourced from getHouseholdContext()/household_members, which a split_only
 * member (SPLIT_ACCESS but not HOME_ACCESS — see has_home_access() in
 * supabase/schema.sql) can no longer see the full roster of. split_members
 * is scoped to is_split_group_member() instead, so this works the same for
 * every group member regardless of their household-wide role. Membership
 * here is explicit-only now (see supabase/schema.sql — the old
 * household-wide auto-sync trigger was removed): only the group's creator
 * plus whoever's been added via addSplitGroupMember() below.
 */
export async function getSplitGroupMembers(groupId: string): Promise<SplitGroupMemberInfo[]> {
  const supabase = await createClient();
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("split_groups").select("created_by").eq("id", groupId).maybeSingle(),
    supabase.from("split_members").select("user_id").eq("group_id", groupId),
  ]);
  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return userIds.map((id) => ({
    userId: id,
    name: displayName(profileById.get(id)),
    avatarUrl: profileById.get(id)?.avatar_url ?? null,
    isCreator: id === group?.created_by,
  }));
}

/**
 * Household members not yet in this split group — the candidate list for
 * Let's Split's own "Invite Members" action. Only meaningful for someone who
 * can already see the full household roster (the group's manager, who by
 * definition has HOME_ACCESS); a non-manager gets an empty list.
 */
export async function listEligibleSplitGroupMembers(groupId: string, householdId: string): Promise<SplitGroupMemberInfo[]> {
  const context = await getHouseholdContext(householdId);
  if (!context) return [];

  const supabase = await createClient();
  const { data: members } = await supabase.from("split_members").select("user_id").eq("group_id", groupId);
  const existingIds = new Set((members ?? []).map((m) => m.user_id));

  return context.members
    .filter((m) => !existingIds.has(m.userId))
    .map((m) => ({ userId: m.userId, name: m.name, avatarUrl: m.avatarUrl, isCreator: false }));
}

export async function addSplitGroupMember(groupId: string, userId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_split_group_member", { p_group_id: groupId, p_user_id: userId });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to add member" };

  revalidatePath("/split");
  return { ok: true };
}

export async function removeSplitGroupMember(groupId: string, userId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_split_group_member", { p_group_id: groupId, p_user_id: userId });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to remove member" };

  revalidatePath("/split");
  return { ok: true };
}

/** Deletes a split group, including the default "Household Expenses" one — RLS (split_groups_delete_owner_or_creator) restricts this to the group's creator or the household owner, and blocks deleting a household's last remaining group. Cascades to its members, expenses, and settlements. */
export async function deleteSplitGroup(groupId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("split_groups").delete().eq("id", groupId);
  if (error) return { error: "Something went wrong. Only the group's creator or the household owner can delete it." };

  revalidatePath("/split");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Balance derivation — pure functions over raw rows, no DB access, so the
// same math backs getSplitSummary, getSimplifiedBalances, and (in tests)
// can be exercised without a database at all.
// ─────────────────────────────────────────────────────────────

type OwesMap = Map<string, Map<string, number>>;

function addOwed(owes: OwesMap, debtor: string, creditor: string, amount: number) {
  if (debtor === creditor || amount <= 0) return;
  if (!owes.has(debtor)) owes.set(debtor, new Map());
  const m = owes.get(debtor)!;
  m.set(creditor, (m.get(creditor) ?? 0) + amount);
}

function buildOwesMap(
  expenses: SplitExpense[],
  participantsByExpense: Map<string, SplitExpenseParticipant[]>,
  settlements: SplitSettlement[]
): OwesMap {
  const owes: OwesMap = new Map();
  for (const e of expenses) {
    for (const p of participantsByExpense.get(e.id) ?? []) {
      if (p.user_id === e.paid_by) continue;
      addOwed(owes, p.user_id, e.paid_by, p.owed_amount);
    }
  }
  for (const s of settlements) {
    // from_user paid to_user -> from_user's debt to to_user shrinks, which
    // is the same ledger effect as to_user owing from_user that amount.
    addOwed(owes, s.to_user, s.from_user, s.amount);
  }
  return owes;
}

/** Positive = `a` owes `b`; negative = `b` owes `a`; ~0 = settled between this pair. */
function netBetween(owes: OwesMap, a: string, b: string): number {
  const aOwesB = owes.get(a)?.get(b) ?? 0;
  const bOwesA = owes.get(b)?.get(a) ?? 0;
  return Math.round((aOwesB - bOwesA) * 100) / 100;
}

function overallNetByUser(owes: OwesMap, memberIds: string[]): Map<string, number> {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const a = memberIds[i];
      const b = memberIds[j];
      const n = netBetween(owes, a, b); // positive => a owes b
      net.set(a, Math.round(((net.get(a) ?? 0) - n) * 100) / 100);
      net.set(b, Math.round(((net.get(b) ?? 0) + n) * 100) / 100);
    }
  }
  return net;
}

const EPSILON = 0.01;

export async function getSplitSummary(householdId: string, groupId?: string): Promise<SplitSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getHouseholdContext(householdId);
  if (!context) return null;
  const resolvedGroupId = groupId ?? (await getDefaultGroupId(householdId));
  if (!resolvedGroupId) return null;
  groupId = resolvedGroupId;

  // Split group membership is no longer implied by household membership (see
  // supabase/schema.sql's "Let's Split membership is deliberately NOT
  // auto-synced" note) — a household member who hasn't been explicitly added
  // to this group gets null here, same as "not set up", rather than a
  // misleadingly empty-but-present dashboard.
  const { data: membership } = await supabase.from("split_members").select("user_id").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
  if (!membership) return null;

  const [{ data: expenses }, { data: settlements }, splitMembers] = await Promise.all([
    supabase.from("split_expenses").select("*").eq("group_id", groupId).order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("split_settlements").select("*").eq("group_id", groupId),
    getSplitGroupMembers(groupId),
  ]);

  const expenseRows = expenses ?? [];
  // Only confirmed settlements affect the ledger — a request the payee
  // hasn't confirmed yet must not silently reduce what they're shown as owed.
  const settlementRows = (settlements ?? []).filter((s) => s.confirmed_at);

  const { data: participants } = expenseRows.length
    ? await supabase
        .from("split_expense_participants")
        .select("*")
        .in(
          "expense_id",
          expenseRows.map((e) => e.id)
        )
    : { data: [] };

  const participantsByExpense = new Map<string, SplitExpenseParticipant[]>();
  for (const p of participants ?? []) {
    const list = participantsByExpense.get(p.expense_id) ?? [];
    list.push(p);
    participantsByExpense.set(p.expense_id, list);
  }

  const owes = buildOwesMap(expenseRows, participantsByExpense, settlementRows);
  const memberIds = splitMembers.map((m) => m.userId);
  const nameById = new Map(splitMembers.map((m) => [m.userId, m.name]));
  const avatarById = new Map(splitMembers.map((m) => [m.userId, m.avatarUrl]));

  const memberBalances: SplitMemberBalance[] = memberIds
    .filter((id) => id !== user.id)
    .map((id) => ({
      userId: id,
      name: nameById.get(id) ?? "Member",
      avatarUrl: avatarById.get(id) ?? null,
      netAmount: netBetween(owes, id, user.id), // positive => they owe the viewer
    }));

  const youAreOwed = memberBalances.reduce((sum, m) => sum + Math.max(0, m.netAmount), 0);
  const youOwe = memberBalances.reduce((sum, m) => sum + Math.max(0, -m.netAmount), 0);

  const shownExpenses = expenseRows.slice(0, 20);
  const expiredGuestPayerIds = await findExpiredGuestUserIds(Array.from(new Set(shownExpenses.map((e) => e.paid_by))));

  const recentExpenses: SplitExpenseSummary[] = shownExpenses.map((e) => {
    const parts = participantsByExpense.get(e.id) ?? [];
    const settled = parts.every((p) => p.user_id === e.paid_by || netBetween(owes, p.user_id, e.paid_by) <= EPSILON);
    return {
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      payerId: e.paid_by,
      payerName: nameById.get(e.paid_by) ?? "Member",
      createdBy: e.created_by,
      participantCount: parts.length,
      expenseDate: e.expense_date,
      createdAt: e.created_at,
      settled,
      payerIsExpiredGuest: expiredGuestPayerIds.has(e.paid_by),
      participants: parts
        .map((p) => ({
          userId: p.user_id,
          name: nameById.get(p.user_id) ?? "Member",
          owedAmount: p.owed_amount,
          isPayer: p.user_id === e.paid_by,
        }))
        .sort((a, b) => (a.isPayer === b.isPayer ? 0 : a.isPayer ? -1 : 1)),
    };
  });

  const settledAmount = settlementRows.reduce((sum, s) => sum + s.amount, 0);

  return {
    groupId,
    youOwe: Math.round(youOwe * 100) / 100,
    youAreOwed: Math.round(youAreOwed * 100) / 100,
    net: Math.round((youAreOwed - youOwe) * 100) / 100,
    settledAmount: Math.round(settledAmount * 100) / 100,
    memberBalances,
    recentExpenses,
  };
}

/**
 * The same balance totals as getSplitSummary/getSimplifiedBalances combined
 * (per-viewer youOwe/youAreOwed, group-wide pendingAmount, settledAmount),
 * computed with the minimum needed for that — no profile joins (only ids,
 * for the math, not display names), no guest-expiry check, no
 * recentExpenses detail. Powers the wallet card's peek/list rows and the
 * page-level "you are owed / you owe" banner total for every group OTHER
 * than the active one, where none of that extra detail is ever shown —
 * those used to each cost a full getSplitSummary() call.
 */
export async function getGroupTotals(
  groupId: string,
  viewerId: string
): Promise<{ youOwe: number; youAreOwed: number; pendingAmount: number; settledAmount: number }> {
  const supabase = await createClient();
  const [{ data: expenses }, { data: settlements }, { data: members }] = await Promise.all([
    supabase.from("split_expenses").select("id, paid_by, amount").eq("group_id", groupId),
    supabase.from("split_settlements").select("from_user, to_user, amount, confirmed_at").eq("group_id", groupId),
    supabase.from("split_members").select("user_id").eq("group_id", groupId),
  ]);
  const expenseRows = expenses ?? [];
  const { data: participants } = expenseRows.length
    ? await supabase
        .from("split_expense_participants")
        .select("expense_id, user_id, owed_amount")
        .in(
          "expense_id",
          expenseRows.map((e) => e.id)
        )
    : { data: [] };

  const participantsByExpense = new Map<string, SplitExpenseParticipant[]>();
  for (const p of participants ?? []) {
    const list = participantsByExpense.get(p.expense_id) ?? [];
    list.push(p as SplitExpenseParticipant);
    participantsByExpense.set(p.expense_id, list);
  }

  const confirmedSettlements = (settlements ?? []).filter((s) => s.confirmed_at) as SplitSettlement[];
  const owes = buildOwesMap(expenseRows as SplitExpense[], participantsByExpense, confirmedSettlements);
  const memberIds = (members ?? []).map((m) => m.user_id);

  const viewerBalances = memberIds.filter((id) => id !== viewerId).map((id) => netBetween(owes, id, viewerId));
  const youAreOwed = viewerBalances.reduce((sum, n) => sum + Math.max(0, n), 0);
  const youOwe = viewerBalances.reduce((sum, n) => sum + Math.max(0, -n), 0);

  const net = overallNetByUser(owes, memberIds);
  const pendingAmount = simplifyDebts(net).reduce((sum, t) => sum + t.amount, 0);
  const settledAmount = confirmedSettlements.reduce((sum, s) => sum + s.amount, 0);

  return {
    youOwe: Math.round(youOwe * 100) / 100,
    youAreOwed: Math.round(youAreOwed * 100) / 100,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    settledAmount: Math.round(settledAmount * 100) / 100,
  };
}

export async function getSimplifiedBalances(householdId: string, groupId?: string): Promise<SimplifiedTransferWithNames[]> {
  const supabase = await createClient();
  const resolvedGroupId = groupId ?? (await getDefaultGroupId(householdId));
  if (!resolvedGroupId) return [];
  groupId = resolvedGroupId;

  const [{ data: expenses }, { data: settlements }, splitMembers] = await Promise.all([
    supabase.from("split_expenses").select("*").eq("group_id", groupId),
    supabase.from("split_settlements").select("*").eq("group_id", groupId),
    getSplitGroupMembers(groupId),
  ]);
  const expenseRows = expenses ?? [];
  const { data: participants } = expenseRows.length
    ? await supabase
        .from("split_expense_participants")
        .select("*")
        .in(
          "expense_id",
          expenseRows.map((e) => e.id)
        )
    : { data: [] };

  const participantsByExpense = new Map<string, SplitExpenseParticipant[]>();
  for (const p of participants ?? []) {
    const list = participantsByExpense.get(p.expense_id) ?? [];
    list.push(p);
    participantsByExpense.set(p.expense_id, list);
  }

  const owes = buildOwesMap(expenseRows, participantsByExpense, (settlements ?? []).filter((s) => s.confirmed_at));
  const memberIds = splitMembers.map((m) => m.userId);
  const nameById = new Map(splitMembers.map((m) => [m.userId, m.name]));

  const net = overallNetByUser(owes, memberIds);
  const transfers = simplifyDebts(net);
  return transfers.map((t) => ({ ...t, fromName: nameById.get(t.fromUserId) ?? "Member", toName: nameById.get(t.toUserId) ?? "Member" }));
}

export async function getExpenseDetail(expenseId: string): Promise<SplitExpenseDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: expense } = await supabase.from("split_expenses").select("*").eq("id", expenseId).maybeSingle();
  if (!expense) return null;

  const [context, splitMembers, { data: participants }] = await Promise.all([
    getHouseholdContext(expense.household_id),
    getSplitGroupMembers(expense.group_id),
    supabase.from("split_expense_participants").select("*").eq("expense_id", expenseId),
  ]);
  if (!context) return null;

  const nameById = new Map(splitMembers.map((m) => [m.userId, m.name]));
  const isOwner = context.myRole === "owner";

  return {
    id: expense.id,
    groupId: expense.group_id,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    paidBy: expense.paid_by,
    paidByName: nameById.get(expense.paid_by) ?? "Member",
    expenseDate: expense.expense_date,
    comment: expense.comment,
    receiptUrl: expense.receipt_url,
    splitMethod: expense.split_method,
    createdBy: expense.created_by,
    canEdit: isOwner || expense.created_by === user.id,
    participants: (participants ?? [])
      .map((p) => ({
        userId: p.user_id,
        name: nameById.get(p.user_id) ?? "Member",
        shareType: p.share_type,
        shareValue: p.share_value,
        owedAmount: p.owed_amount,
        isPayer: p.user_id === expense.paid_by,
      }))
      .sort((a, b) => (a.isPayer === b.isPayer ? 0 : a.isPayer ? -1 : 1)),
  };
}

function toRpcParticipants(split: ReturnType<typeof computeSplit>) {
  if ("error" in split) return split;
  return split.map((s) => ({ user_id: s.userId, share_type: s.shareType, share_value: s.shareValue, owed_amount: s.owedAmount }));
}

/**
 * input.paidBy is intentionally ignored here — the payer is always whoever
 * is authenticated and calling this action (see record_split_expense() in
 * supabase/schema.sql, which doesn't even accept a payer parameter anymore).
 * A manipulated client request has no field left to override this through.
 */
export async function createExpense(
  householdId: string,
  input: CreateExpenseInput,
  groupId?: string
): Promise<{ expenseId: string } | { error: string }> {
  if (!input.description.trim()) return { error: "Give the expense a description." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "Amount must be greater than zero." };

  const split = computeSplit(input.amount, input.splitMethod, input.participants);
  const rpcParticipants = toRpcParticipants(split);
  if ("error" in rpcParticipants) return rpcParticipants;

  const resolvedGroupId = groupId ?? (await getDefaultGroupId(householdId));
  if (!resolvedGroupId) return { error: "This household doesn't have a split group yet." };
  groupId = resolvedGroupId;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_split_expense", {
    p_group_id: groupId,
    p_description: input.description.trim(),
    p_amount: input.amount,
    p_category: input.category,
    p_expense_date: input.expenseDate ?? null,
    p_comment: input.comment?.trim() || null,
    p_split_method: input.splitMethod,
    p_participants: rpcParticipants,
  });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to record expense" };

  revalidatePath("/split");
  return { expenseId: data.expense_id };
}

export async function updateExpense(expenseId: string, input: CreateExpenseInput): Promise<{ ok: true } | { error: string }> {
  if (!input.description.trim()) return { error: "Give the expense a description." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "Amount must be greater than zero." };

  const split = computeSplit(input.amount, input.splitMethod, input.participants);
  const rpcParticipants = toRpcParticipants(split);
  if ("error" in rpcParticipants) return rpcParticipants;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_split_expense", {
    p_expense_id: expenseId,
    p_description: input.description.trim(),
    p_amount: input.amount,
    p_category: input.category,
    p_paid_by: input.paidBy,
    p_expense_date: input.expenseDate ?? null,
    p_comment: input.comment?.trim() || null,
    p_split_method: input.splitMethod,
    p_participants: rpcParticipants,
  });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to update expense" };

  revalidatePath("/split");
  return { ok: true };
}

export async function deleteExpense(expenseId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_split_expense", { p_expense_id: expenseId });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to delete expense" };

  revalidatePath("/split");
  return { ok: true };
}

/** The person who owes claims they paid — this doesn't touch balances yet; the payee has to confirmSettlement() before it counts. */
export async function requestSettlement(
  householdId: string,
  input: RequestSettlementInput,
  groupId?: string
): Promise<{ ok: true } | { error: string }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "Amount must be greater than zero." };

  const resolvedGroupId = groupId ?? (await getDefaultGroupId(householdId));
  if (!resolvedGroupId) return { error: "This household doesn't have a split group yet." };
  groupId = resolvedGroupId;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_split_settlement", {
    p_group_id: groupId,
    p_to_user: input.toUserId,
    p_amount: input.amount,
    p_method: input.method,
    p_comment: input.comment?.trim() || null,
  });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to request settlement" };

  revalidatePath("/split");
  return { ok: true };
}

/** The payee confirms a requested settlement actually arrived — only then does it reduce what's owed. */
export async function confirmSettlement(settlementId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_split_settlement", { p_settlement_id: settlementId });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to confirm settlement" };

  revalidatePath("/split");
  return { ok: true };
}

/**
 * The wallet card's one-click "Mark paid" on a share you're owed — the
 * caller is always the payee here (unlike requestSettlement, where the
 * caller is the payer), so it's recorded already-confirmed. See
 * record_split_settlement_received() for why that's still safe.
 */
export async function markShareReceived(groupId: string, fromUserId: string, amount: number): Promise<{ ok: true } | { error: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than zero." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_split_settlement_received", {
    p_group_id: groupId,
    p_from_user: fromUserId,
    p_amount: amount,
    p_comment: null,
  });
  if (error || !data?.ok) return { error: error?.message ?? "Failed to mark this share paid" };

  revalidatePath("/split");
  return { ok: true };
}

export interface PendingSettlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/** Settlements requested but not yet confirmed by the payee, in this group — used to swap a transfer's "Settle" button for a confirm tick (for the payee) or a "waiting" note (for the requester). */
export async function getPendingSettlements(groupId: string): Promise<PendingSettlement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("split_settlements")
    .select("id, from_user, to_user, amount")
    .eq("group_id", groupId)
    .is("confirmed_at", null);
  return (data ?? []).map((s) => ({ id: s.id, fromUserId: s.from_user, toUserId: s.to_user, amount: s.amount }));
}
