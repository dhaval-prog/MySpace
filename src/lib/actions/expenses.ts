"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export interface ExpenseCategoryOption {
  id: string;
  name: string;
  icon: string;
  isPreset: boolean;
}

/**
 * Every expense category for a household — seeded automatically for every
 * household by handle_new_household()/seed_default_expense_categories() (see
 * supabase/schema.sql), so this is always just a read, never a
 * create-if-missing dance on the client's critical path.
 */
export async function listExpenseCategories(householdId: string): Promise<ExpenseCategoryOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("household_id", householdId)
    .order("is_preset", { ascending: false })
    .order("name");
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, icon: c.icon, isPreset: c.is_preset }));
}

export async function createExpenseCategory(householdId: string, name: string, icon: string): Promise<{ categoryId: string } | { error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the category a name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ household_id: householdId, name: trimmed, icon: icon || "🧾", created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "A category with that name already exists." : "Failed to create category" };

  revalidatePath("/expenses");
  return { categoryId: data.id };
}

export interface ExpenseSummary {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  goalId: string | null;
  goalName: string | null;
  receiptUrl: string | null;
  createdBy: string;
  createdByName: string;
}

/** Reverse-chronological, optionally narrowed to one category or budget — the Spending Budgets board's "recent expenses" data source. */
export async function listExpenses(householdId: string, opts?: { categoryId?: string; goalId?: string }): Promise<ExpenseSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("*")
    .eq("household_id", householdId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts?.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts?.goalId) query = query.eq("goal_id", opts.goalId);
  const { data: expenses } = await query;
  if (!expenses || expenses.length === 0) return [];

  const categoryIds = Array.from(new Set(expenses.map((e) => e.category_id)));
  const goalIds = Array.from(new Set(expenses.map((e) => e.goal_id).filter((id): id is string => !!id)));
  const userIds = Array.from(new Set(expenses.map((e) => e.created_by)));

  const [{ data: categories }, { data: goals }, { data: profiles }] = await Promise.all([
    supabase.from("expense_categories").select("id, name, icon").in("id", categoryIds),
    goalIds.length > 0 ? supabase.from("household_goals").select("id, name").in("id", goalIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("profiles").select("*").in("id", userIds),
  ]);

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const goalById = new Map((goals ?? []).map((g) => [g.id, g]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    expenseDate: e.expense_date,
    categoryId: e.category_id,
    categoryName: categoryById.get(e.category_id)?.name ?? "Other",
    categoryIcon: categoryById.get(e.category_id)?.icon ?? "🧾",
    goalId: e.goal_id,
    goalName: e.goal_id ? (goalById.get(e.goal_id)?.name ?? null) : null,
    receiptUrl: e.receipt_url,
    createdBy: e.created_by,
    createdByName: displayName(profileById.get(e.created_by)),
  }));
}

async function uploadReceiptIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File | null | undefined
): Promise<{ url?: string; error?: string }> {
  if (!file || file.size === 0) return {};
  if (file.size > MAX_RECEIPT_BYTES) return { error: "This receipt is too large. Please upload an image smaller than 5MB." };

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("expense-receipts").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) return { error: "Something went wrong while uploading the receipt. Please try again." };

  const { data } = supabase.storage.from("expense-receipts").getPublicUrl(path);
  return { url: data.publicUrl };
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  categoryId: string;
  goalId?: string | null;
  expenseDate: string;
}

export async function createExpense(
  householdId: string,
  input: CreateExpenseInput,
  receiptFile?: File | null
): Promise<{ expenseId: string } | { error: string }> {
  const trimmed = input.description.trim();
  if (!trimmed) return { error: "Give the expense a name." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "Enter a valid amount." };
  if (!input.categoryId) return { error: "Choose a category." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { url: receiptUrl, error: uploadError } = await uploadReceiptIfPresent(supabase, user.id, receiptFile);
  if (uploadError) return { error: uploadError };

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      household_id: householdId,
      category_id: input.categoryId,
      goal_id: input.goalId ?? null,
      description: trimmed,
      amount: input.amount,
      expense_date: input.expenseDate,
      receipt_url: receiptUrl ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Failed to add expense" };

  revalidatePath("/expenses");
  revalidatePath("/goals");
  revalidatePath("/home");
  return { expenseId: data.id };
}

export interface ExpenseStats {
  totalThisMonth: number;
  transactionCount: number;
}

/** For the Home dashboard's "Your Space" / "Monthly Spending" tile. */
export async function getExpenseStats(householdId: string): Promise<ExpenseStats> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);

  const { data } = await supabase.from("expenses").select("amount").eq("household_id", householdId).gte("expense_date", monthStart);
  const rows = data ?? [];
  return {
    totalThisMonth: rows.reduce((sum, r) => sum + r.amount, 0),
    transactionCount: rows.length,
  };
}
