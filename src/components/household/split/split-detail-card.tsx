"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn, initials, memberAccentClass } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatChip } from "@/components/layout/stat-chip";
import { markShareReceived } from "@/lib/actions/split";
import type { SplitGroupSummary, SplitSummary } from "@/lib/actions/split";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

/**
 * The "SPLIT DETAIL" card — Goa Trip's name and total, the four TOTAL/
 * SETTLED/PENDING/YOU OWE chips, and a SHARES row per member who currently
 * owes the viewer, each with a one-click "Mark paid" (markShareReceived,
 * pre-confirmed since the viewer here is always the payee — see that
 * action and record_split_settlement_received() for why that's safe).
 */
export function SplitDetailCard({
  group,
  summary,
  pendingAmount,
  actions,
}: {
  group: SplitGroupSummary;
  summary: SplitSummary;
  pendingAmount: number;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shares = summary.memberBalances.filter((m) => m.netAmount > 0.5);
  const latestExpense = summary.recentExpenses[0] ?? null;
  const settledPct = pct(summary.settledAmount, summary.settledAmount + pendingAmount);

  function handleMarkPaid(memberId: string, amount: number) {
    setError(null);
    setMarkingId(memberId);
    startTransition(async () => {
      const result = await markShareReceived(group.id, memberId, amount);
      setMarkingId(null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Split detail
          {latestExpense && <span className="ml-1.5 text-muted-foreground/70">· {summary.recentExpenses.length} expense{summary.recentExpenses.length === 1 ? "" : "s"}</span>}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant={pendingAmount > 0.5 ? "outline" : "secondary"}>{pendingAmount > 0.5 ? "Pending" : "Settled"}</Badge>
          {actions}
        </div>
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="font-heading text-2xl leading-tight text-foreground">{group.name}</p>
        <p className="shrink-0 font-heading text-2xl text-foreground">{inr(group.totalSpent)}</p>
      </div>
      {latestExpense && (
        <p className="mt-1 text-sm text-muted-foreground">
          Paid by {latestExpense.payerName} · {inr(latestExpense.amount)}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip label="Total" value={inr(group.totalSpent)} />
        <StatChip label="Settled" value={inr(summary.settledAmount)} tone="positive" />
        <StatChip label="Pending" value={inr(pendingAmount)} tone="destructive" />
        <StatChip label="You owe" value={inr(summary.youOwe)} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Shares</p>
          <p className="text-xs text-muted-foreground">{inr(pendingAmount)} pending</p>
        </div>

        {shares.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Everyone&apos;s square on this split.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {shares.map((m, i) => (
              <div key={m.userId} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
                <Avatar size="sm">
                  <AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {inr(m.netAmount)} · share of {inr(group.totalSpent)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending && markingId === m.userId}
                  onClick={() => handleMarkPaid(m.userId, m.netAmount)}
                  className="shrink-0 rounded-full"
                >
                  <Check className={cn("size-3.5", pending && markingId === m.userId && "animate-pulse")} />
                  {pending && markingId === m.userId ? "Marking…" : "Mark paid"}
                </Button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p className="font-mono font-medium tracking-[0.14em] uppercase">Settlement</p>
          <p>{settledPct}% of shares in</p>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${settledPct}%` }} />
        </div>
      </div>
    </div>
  );
}
