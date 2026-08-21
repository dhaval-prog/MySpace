"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [deleteTarget, setDeleteTarget] = useState<HouseholdGoalSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
            Your cards <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-accent-foreground">{spendingGoals.length}</span>
          </p>
          <CreateGoalDialog householdId={householdId} defaultGoalType="spending" triggerLabel="Create" iconOnly />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {spendingGoals.map((g, i) => {
            const remaining = Math.max(g.goal.target_amount - g.currentAmount, 0);
            const isActive = g.goal.id === selectedId;
            return (
              <button
                key={g.goal.id}
                type="button"
                onClick={() => setSelectedId(g.goal.id)}
                className={cn(
                  "flex flex-col gap-3 rounded-3xl p-5 text-left text-white shadow-sm transition-transform",
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
              <StatBox label="Budget" value={inr(selected.goal.target_amount)} />
              <StatBox label="Spent" value={inr(selected.currentAmount)} />
              <StatBox label="Left" value={inr(Math.max(selected.goal.target_amount - selected.currentAmount, 0))} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <AddExpenseDialog
                householdId={householdId}
                categories={categories}
                spendingGoals={spendingGoals}
                defaultGoalId={selected.goal.id}
                trigger={
                  <Button className="flex-1 rounded-2xl">
                    <ArrowUpRight className="size-4" />
                    Add expense
                  </Button>
                }
              />
              {(isOwner || selected.goal.created_by === currentUserId) && (
                <>
                  <Button size="icon" variant="ghost" className="rounded-2xl bg-accent text-accent-foreground" title="Edit budget">
                    <Pencil className="size-4" />
                  </Button>
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
                </>
              )}
            </div>

            <div className="mt-5">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Recent expenses {expenses ? `· ${expenses.length}` : ""}
              </p>
              <div className="mt-2 space-y-1.5">
                {expenses === null ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
                ) : expenses.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No expenses logged against this budget yet.</p>
                ) : (
                  expenses.slice(0, 6).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm">{e.categoryIcon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.description}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(e.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-destructive">-{inr(e.amount)}</span>
                    </div>
                  ))
                )}
              </div>
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

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
