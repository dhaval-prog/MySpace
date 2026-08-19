"use client";

import { useState } from "react";
import { ExpenseDetailDialog } from "@/components/household/expenses/expense-detail-dialog";
import type { ExpenseSummary } from "@/lib/actions/expenses";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function dateHeader(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit", month: "short" }).toUpperCase();
}

/** Reverse-chronological, grouped into one card per calendar day — expenses arrive already sorted by expense_date desc (see listExpenses), so grouping is a single linear pass, not a sort. */
export function TransactionsList({ expenses }: { expenses: ExpenseSummary[] }) {
  const [detailId, setDetailId] = useState<string | null>(null);

  const groups: { header: string; items: ExpenseSummary[] }[] = [];
  for (const e of expenses) {
    const header = dateHeader(e.expenseDate);
    const last = groups[groups.length - 1];
    if (last && last.header === header) last.items.push(e);
    else groups.push({ header, items: [e] });
  }

  return (
    <>
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.header}>
            <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{g.header}</p>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {g.items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setDetailId(e.id)}
                    className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-muted/50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">{e.categoryIcon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.description}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {e.categoryName}
                        {e.goalName ? ` · ${e.goalName}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-base font-medium">{inr(e.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {detailId && (
        <ExpenseDetailDialog
          expenseId={detailId}
          open={!!detailId}
          onOpenChange={(v) => {
            if (!v) setDetailId(null);
          }}
        />
      )}
    </>
  );
}
