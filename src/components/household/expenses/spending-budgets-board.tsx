"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowUpRight, Receipt, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatChip } from "@/components/layout/stat-chip";
import { AddExpenseDialog } from "@/components/household/expenses/add-expense-dialog";
import { CreateGoalDialog } from "@/components/household/create-goal-dialog";
import { deleteGoal, type HouseholdGoalSummary } from "@/lib/actions/household-goals";
import { listExpenses, type ExpenseSummary, type ExpenseCategoryOption } from "@/lib/actions/expenses";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function resetLabel(deadline: string | null): string {
  if (!deadline) return "No reset date";
  return `Resets on ${new Date(deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`;
}

/** One row in a budget's recent-expenses list — a plain "money went out" arrow rather than the expense's own category emoji, since every row here already sits under one focused budget. */
function RecentExpenseRow({ expense }: { expense: ExpenseSummary }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <ArrowUpRight className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{expense.description}</span>
        <span className="block text-xs text-muted-foreground">
          {new Date(expense.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </span>
      <span className="shrink-0 text-sm font-medium text-destructive">-{inr(expense.amount)}</span>
    </div>
  );
}

const CARD_THEMES = [
  "bg-[linear-gradient(140deg,#1F7A5A_0%,#2C6E68_48%,#14483C_100%)]",
  "bg-[linear-gradient(140deg,#E4736A_0%,#D33243_55%,#96182B_100%)]",
  "bg-[linear-gradient(140deg,#7A5FC8_0%,#5B3FA8_52%,#33246B_100%)]",
  "bg-[linear-gradient(140deg,#3B6FD4_0%,#26417F_52%,#141F3E_100%)]",
];

export function SpendingBudgetsBoard({
  householdId,
  spendingGoals,
  categories,
  isOwner,
  currentUserId,
}: {
  householdId: string;
  spendingGoals: HouseholdGoalSummary[];
  categories: ExpenseCategoryOption[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(spendingGoals[0]?.goal.id ?? null);
  const [expenses, setExpenses] = useState<ExpenseSummary[] | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HouseholdGoalSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowAllRecent(false);
    if (!selectedId) {
      setExpenses([]);
      return;
    }
    setExpenses(null);
    listExpenses(householdId, { goalId: selectedId }).then(setExpenses);
  }, [selectedId, householdId]);

  const selected = spendingGoals.find((g) => g.goal.id === selectedId) ?? null;

  if (spendingGoals.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="text-sm text-muted-foreground">No spending budgets yet — create one to start tracking a category.</p>
        <div className="mt-4 flex justify-center">
          <CreateGoalDialog householdId={householdId} defaultGoalType="spending" triggerLabel="Create Budget" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px]">
      <div>
        <div className="flex items-center justify-between px-1">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Your cards{" "}
            <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-accent-foreground">
              {spendingGoals.length} budget{spendingGoals.length === 1 ? "" : "s"}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground md:block">Click a card to focus it</p>
            <CreateGoalDialog
              householdId={householdId}
              defaultGoalType="spending"
              trigger={
                <button
                  type="button"
                  aria-label="Create spending budget"
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:size-8 md:justify-center md:px-0 md:py-0"
                >
                  <Plus className="size-4" />
                  <span className="md:hidden">Create</span>
                </button>
              }
            />
          </div>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {spendingGoals.map((g, i) => {
            const remaining = Math.max(g.goal.target_amount - g.currentAmount, 0);
            const isActive = g.goal.id === selectedId;
            return (
              <button
                key={g.goal.id}
                type="button"
                onClick={() => setSelectedId(g.goal.id)}
                className={cn(
                  "flex w-[78%] shrink-0 flex-col gap-3 rounded-3xl p-5 text-left text-white shadow-sm transition-transform sm:w-[46%] md:w-auto md:shrink",
                  CARD_THEMES[i % CARD_THEMES.length],
                  isActive ? "ring-2 ring-foreground/40" : "opacity-90 hover:opacity-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-white/20 text-base">{g.goal.icon}</span>
                  {g.goal.deadline && (
                    <span className="font-mono text-[10px] tracking-wide text-white/80 uppercase">
                      {Math.max(0, Math.round((new Date(g.goal.deadline).getTime() - now) / 86400000))} days
                    </span>
                  )}
                </div>
                <p className="font-medium">{g.goal.name}</p>
                <p className="font-heading text-3xl">{inr(remaining)}</p>
                <p className="text-xs text-white/75">left of {inr(g.goal.target_amount)}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, g.progressPct)}%` }} />
                </div>
                <p className="text-xs text-white/75">
                  {inr(g.currentAmount)} of {inr(g.goal.target_amount)} spent
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-xs text-muted-foreground">Budgets reset on their own dates — the spend clears, the card stays.</p>
      </div>

      <div className="rounded-3xl bg-white p-5">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-accent text-base">{selected.goal.icon}</span>
                <div>
                  <p className="font-heading text-lg leading-tight">{selected.goal.name}</p>
                  <p className="text-xs text-muted-foreground">{resetLabel(selected.goal.deadline)}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-medium">{selected.progressPct}% used</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatChip label="Budget" value={inr(selected.goal.target_amount)} />
              <StatChip label="Spent" value={inr(selected.currentAmount)} />
              <StatChip label="Left" value={inr(Math.max(selected.goal.target_amount - selected.currentAmount, 0))} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <AddExpenseDialog
                householdId={householdId}
                categories={categories}
                spendingGoals={spendingGoals}
                defaultGoalId={selected.goal.id}
                trigger={
                  <Button className="flex-1 rounded-2xl">
                    <Receipt className="size-4" />
                    Add expense
                  </Button>
                }
              />
              {(isOwner || selected.goal.created_by === currentUserId) && (
                <Button size="icon" variant="ghost" className="rounded-2xl bg-accent text-accent-foreground" title="Edit budget">
                  <Pencil className="size-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="rounded-2xl bg-blush-tint text-destructive"
                title="Delete budget"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(selected);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Recent expenses</p>
                <div className="flex items-center gap-2">
                  {expenses && expenses.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
                    </p>
                  )}
                  {expenses && expenses.length > 3 && (
                    <button type="button" onClick={() => setShowAllRecent((v) => !v)} className="text-sm font-medium text-primary md:hidden">
                      {showAllRecent ? "Show less" : "See all"}
                    </button>
                  )}
                </div>
              </div>
              {expenses === null ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
              ) : expenses.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No expenses logged against this budget yet.</p>
              ) : (
                <>
                  <div className="mt-2 space-y-1.5 md:hidden">
                    {expenses.slice(0, showAllRecent ? undefined : 3).map((e) => (
                      <RecentExpenseRow key={e.id} expense={e} />
                    ))}
                  </div>
                  <div className="mt-2 hidden space-y-1.5 md:block">
                    {expenses.slice(0, 6).map((e) => (
                      <RecentExpenseRow key={e.id} expense={e} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Select a budget to see its detail.</p>
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.goal.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the budget. Its logged expenses stay, just unlinked. This can&apos;t be undone.</p>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                startDeleteTransition(async () => {
                  if (!deleteTarget) return;
                  const result = await deleteGoal(deleteTarget.goal.id);
                  if ("error" in result) {
                    setDeleteError(result.error);
                    return;
                  }
                  setDeleteTarget(null);
                  if (selectedId === deleteTarget.goal.id) setSelectedId(null);
                  router.refresh();
                })
              }
            >
              <Trash2 className="size-4" />
              Delete Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
