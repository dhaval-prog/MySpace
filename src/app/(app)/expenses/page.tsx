import { redirect } from "next/navigation";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { listExpenses, listExpenseCategories, getExpenseStats } from "@/lib/actions/expenses";
import { listGoals } from "@/lib/actions/household-goals";
import { EmptyState } from "@/components/shared/empty-state";
import { HouseholdCardRow } from "@/components/household/household-card-row";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { AddExpenseDialog } from "@/components/household/expenses/add-expense-dialog";
import { CategoryFilterChips } from "@/components/household/expenses/category-filter-chips";
import { TransactionsList } from "@/components/household/expenses/transactions-list";
import { HeaderActionsPortal } from "@/components/nav/header-actions-portal";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ id?: string; category?: string }> }) {
  const { id, category } = await searchParams;
  const memberships = await listMyHouseholds();

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Wallet"
          title="Track where your money goes"
          description="Create a household to start logging expenses, organize them by category, and count them against a budget."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <CreateHouseholdCta redirectTo="/expenses" />
              <JoinHouseholdCta redirectTo="/expenses" />
            </div>
          }
        />
      </div>
    );
  }

  const householdId = id && memberships.some((m) => m.household.id === id) ? id : memberships[0].household.id;
  const context = await getHouseholdContext(householdId);
  if (!context) redirect(`/expenses?id=${memberships[0].household.id}`);

  if (context.myRole === "split_only") {
    redirect(`/split?id=${householdId}`);
  }

  const [expenses, categories, stats, goals] = await Promise.all([
    listExpenses(householdId, category ? { categoryId: category } : undefined),
    listExpenseCategories(householdId),
    getExpenseStats(householdId),
    listGoals(householdId, { status: "active" }),
  ]);
  const spendingGoals = goals.filter((g) => g.goal.goal_type === "spending");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <HeaderActionsPortal>
        <AddExpenseDialog householdId={householdId} categories={categories} spendingGoals={spendingGoals} iconOnly />
      </HeaderActionsPortal>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="hidden md:block">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Where your money goes</p>
          <div className="flex items-end gap-2.5">
            <h1 className="font-heading text-4xl text-foreground md:text-5xl">Expenses</h1>
            <AddExpenseDialog householdId={householdId} categories={categories} spendingGoals={spendingGoals} iconOnly />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Every expense, organized and easy to find</p>
        </div>
        <div className="rounded-2xl border bg-card px-5 py-3.5 text-right">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">This Month</p>
          <p className="mt-0.5 text-2xl font-semibold">{inr(stats.totalThisMonth)}</p>
        </div>
      </div>

      <HouseholdCardRow households={memberships} currentId={householdId} basePath="/expenses" />

      <CategoryFilterChips householdId={householdId} categories={categories} activeCategoryId={category} />

      {expenses.length === 0 ? (
        <EmptyState
          icon="Wallet"
          title="No expenses yet"
          description="Start tracking where your money goes."
          action={<AddExpenseDialog householdId={householdId} categories={categories} spendingGoals={spendingGoals} />}
        />
      ) : (
        <TransactionsList expenses={expenses} />
      )}
    </div>
  );
}
