"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { markShareReceived } from "@/lib/actions/split";
import type { SplitGroupSummary, SplitSummary } from "@/lib/actions/split";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

/**
 * The full "SPLIT DETAIL" mockup — a hero card (same background theme and
 * icon as whichever wallet card it replaces, so the swap doesn't read as a
 * different group), four-up stat row, a "Paid by you" participant list, and
 * a settlement progress bar. Originally its own full-screen route; now
 * shown in place of the wallet stack once its front card is tapped open
 * (see SplitMobileWorkspace), with the hero card's chevron closing it back
 * to the stack. A still-pending participant's badge doubles as the
 * one-click "mark received" confirm the older inline detail card offered,
 * so that capability survives the redesign.
 */
export function SplitDetailPanel({
  group,
  summary,
  pendingAmount,
  currentUserId,
  onClose,
  themeClassName,
  addExpenseAction,
}: {
  group: SplitGroupSummary;
  summary: SplitSummary;
  pendingAmount: number;
  currentUserId: string;
  /** Closes the panel, returning to the wallet stack — omit to leave it permanently open (the desktop inline card has no such toggle). */
  onClose?: () => void;
  /** Same CARD_THEMES class the wallet stack picked for this group — keeps the hero the same color as the card it replaces instead of a fixed one. */
  themeClassName: string;
  /** The group's "+Add Expense" trigger, rendered beside the total on the hero's bottom row — pre-built by the caller so this component doesn't need to know AddExpenseDialog's own props. */
  addExpenseAction?: ReactNode;
}) {
  const router = useRouter();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paidByYou = summary.recentExpenses.filter((e) => e.payerId === currentUserId).reduce((sum, e) => sum + e.amount, 0);
  const settledPct = pct(summary.settledAmount, summary.settledAmount + pendingAmount);
  const otherMembers = summary.memberBalances;

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
    <div className="space-y-5">
      <div className={cn("flex min-h-[220px] flex-col rounded-[24px] p-5", themeClassName)}>
        <div className="flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/60 text-2xl">{group.icon}</div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to cards"
              className="flex size-9 items-center justify-center rounded-full bg-white/60 text-[#1F2421] transition-colors hover:bg-white/85"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
        </div>
        <p className="mt-4 font-heading text-lg font-bold text-[#1F2421]">{group.name}</p>
        <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-[#767A78] uppercase">
          Created {formatDate(group.createdAt)} · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="font-mono text-[34px] font-extrabold text-[#191C1A]">{inr(group.totalSpent)}</p>
          {addExpenseAction}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: inr(group.totalSpent), primary: true },
          { label: "Settled", value: inr(summary.settledAmount) },
          { label: "Pending", value: inr(pendingAmount) },
          { label: "You owe", value: inr(summary.youOwe) },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl p-2.5 text-center", s.primary ? "bg-white" : "bg-[#E2EBD8]")}>
            <p className="font-mono text-[9.5px] font-bold tracking-wide text-[#2B312E] uppercase">{s.label}</p>
            <p className="mt-1 truncate font-mono text-sm font-bold text-[#191C1A]">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between px-1">
          <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#15281E] uppercase">Paid by you {inr(paidByYou)}</p>
          <p className="text-[11px] text-[#5C6B61]">{pendingAmount > 0.5 ? `${inr(pendingAmount)} pending` : "All settled"}</p>
        </div>

        {otherMembers.length === 0 ? (
          <p className="mt-3 px-1 text-sm text-muted-foreground">No one else has joined this split yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {otherMembers.map((m) => {
              const settled = Math.abs(m.netAmount) <= 0.5;
              const owesViewer = m.netAmount > 0.5;
              const marking = pending && markingId === m.userId;
              return (
                <div key={m.userId} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#1F2421] ring-1 ring-border">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#1F2421]">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {settled ? "Settled up" : m.netAmount > 0 ? `Owes you ${inr(m.netAmount)}` : `You owe ${inr(-m.netAmount)}`}
                    </p>
                  </div>
                  {owesViewer ? (
                    <button
                      type="button"
                      disabled={marking}
                      onClick={() => handleMarkPaid(m.userId, m.netAmount)}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-[#DCEDC8] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#304D22] uppercase transition-colors hover:bg-[#CFE6B4] disabled:opacity-60"
                    >
                      <Check className={cn("size-3", marking && "animate-pulse")} />
                      {marking ? "Marking…" : "Mark paid"}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
                        settled ? "bg-[#DCEDC8] text-[#304D22]" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {settled && <Check className="size-3" />}
                      {settled ? "Settled" : "Pending"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="mt-2 px-1 text-sm text-destructive">{error}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p className="font-mono font-medium tracking-[0.12em] uppercase">Settlement</p>
          <p>{settledPct}% of shares in</p>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E4E9DE]">
          <div className="h-full rounded-full bg-[#4C6A23]" style={{ width: `${settledPct}%` }} />
        </div>
      </div>
    </div>
  );
}
