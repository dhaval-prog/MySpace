"use client";

import { useEffect, useState } from "react";
import { Receipt, Check } from "lucide-react";
import { cn, initials, memberAccentClass } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExpenseDetailDialog } from "@/components/household/split/expense-detail-dialog";
import { SettleUpDialog } from "@/components/household/split/settle-up-dialog";
import { SplitChatPanel } from "@/components/household/split/split-chat-panel";
import { listSplitMessages, type SplitChatMessageWithSender } from "@/lib/actions/split-chat";
import type { SplitGroupSummary, SplitSummary, SimplifiedTransferWithNames } from "@/lib/actions/split";
import type { HouseholdMemberLite } from "@/components/household/finance-toggle";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Tab = "expenses" | "balances" | "chat";

/** The group summary card + Expenses/Balances/Chat toggle — the whole body of the Let's Split page once a group is selected. */
export function SplitGroupWorkspace({
  householdId,
  group,
  summary,
  simplifiedBalances,
  members,
  currentUserId,
}: {
  householdId: string;
  group: SplitGroupSummary;
  summary: SplitSummary;
  simplifiedBalances: SimplifiedTransferWithNames[];
  members: HouseholdMemberLite[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("expenses");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<SplitChatMessageWithSender[] | null>(null);

  useEffect(() => {
    if (tab !== "chat") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatMessages(null);
    listSplitMessages(group.id).then(setChatMessages);
  }, [tab, group.id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-xl">{group.icon}</span>
          <div>
            <p className="font-semibold">{group.name}</p>
            <AvatarGroup className="mt-1.5">
              {group.memberPreview.map((m, i) => (
                <Avatar key={m.userId} size="sm">
                  <AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">Total Spent</p>
          <p className="mt-0.5 text-2xl font-semibold">{inr(group.totalSpent)}</p>
        </div>
      </div>

      <div className="relative flex items-center rounded-full bg-muted p-1">
        <div
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(33.333%-2.67px)] rounded-full bg-card shadow-sm ring-1 ring-foreground/10 transition-transform duration-300 ease-out"
          style={{ transform: tab === "balances" ? "translateX(100%)" : tab === "chat" ? "translateX(200%)" : "translateX(0)" }}
        />
        <button
          type="button"
          onClick={() => setTab("expenses")}
          className={cn(
            "relative z-10 flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            tab === "expenses" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => setTab("balances")}
          className={cn(
            "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            tab === "balances" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Balances
          {simplifiedBalances.length > 0 && (
            <span className="flex size-4.5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
              {simplifiedBalances.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={cn(
            "relative z-10 flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            tab === "chat" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Chat
        </button>
      </div>

      {tab === "expenses" && (
        <ExpensesTab summary={summary} onSelect={setDetailId} />
      )}
      {tab === "balances" && (
        <BalancesTab householdId={householdId} groupId={group.id} transfers={simplifiedBalances} currentUserId={currentUserId} />
      )}
      {tab === "chat" && (
        <div className="flex h-[420px] flex-col overflow-hidden rounded-2xl border">
          {chatMessages ? (
            <SplitChatPanel householdId={householdId} groupId={group.id} currentUserId={currentUserId} members={members} initialMessages={chatMessages} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          )}
        </div>
      )}

      {detailId && (
        <ExpenseDetailDialog
          expenseId={detailId}
          open={!!detailId}
          onOpenChange={(v) => {
            if (!v) setDetailId(null);
          }}
          members={members}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

function ExpensesTab({ summary, onSelect }: { summary: SplitSummary; onSelect: (id: string) => void }) {
  if (summary.recentExpenses.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No expenses yet — add one to start splitting.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {summary.recentExpenses.map((e) => (
        <li key={e.id}>
          <button onClick={() => onSelect(e.id)} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-muted/50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Receipt className="size-4 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.description}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Paid by {e.payerName} · {formatDate(e.expenseDate)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-base font-medium">{inr(e.amount)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BalancesTab({
  householdId,
  groupId,
  transfers,
  currentUserId,
}: {
  householdId: string;
  groupId: string;
  transfers: SimplifiedTransferWithNames[];
  currentUserId: string;
}) {
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [settleTarget, setSettleTarget] = useState<SimplifiedTransferWithNames | null>(null);

  const key = (t: SimplifiedTransferWithNames) => `${t.fromUserId}:${t.toUserId}`;

  // Server-confirmed empty state, not client-tracked — a just-settled row
  // stays in the DOM (collapsing via the transition below) until
  // router.refresh() brings back a shorter `transfers` list, so its
  // fade-out gets to actually play instead of being yanked away instantly.
  if (transfers.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Everyone&apos;s settled up. 🎉</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2.5">
        {transfers.map((t) => {
          const isSettled = settled.has(key(t));
          const iAmParty = t.fromUserId === currentUserId || t.toUserId === currentUserId;
          return (
            <li
              key={key(t)}
              className={cn(
                "flex items-center justify-between gap-3 overflow-hidden rounded-2xl border bg-card px-4 py-3 transition-all duration-500",
                isSettled ? "max-h-0 scale-95 border-transparent p-0 opacity-0" : "max-h-24 opacity-100"
              )}
            >
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Avatar size="sm">
                  <AvatarFallback className={memberAccentClass(0)}>{initials(t.fromName)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{t.fromName}</span>
                <span className="text-muted-foreground">›</span>
                <span className="truncate">{t.toName}</span>
                <Avatar size="sm">
                  <AvatarFallback className={memberAccentClass(1)}>{initials(t.toName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-sm font-semibold text-destructive">{inr(t.amount)}</span>
                {iAmParty && (
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setSettleTarget(t)}>
                    <Check className="size-3.5" />
                    Settle
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {settleTarget && (
        <SettleUpDialog
          householdId={householdId}
          groupId={groupId}
          open={!!settleTarget}
          onOpenChange={(v) => {
            if (!v) setSettleTarget(null);
          }}
          otherUserId={settleTarget.fromUserId === currentUserId ? settleTarget.toUserId : settleTarget.fromUserId}
          otherName={settleTarget.fromUserId === currentUserId ? settleTarget.toName : settleTarget.fromName}
          iPaid={settleTarget.fromUserId === currentUserId}
          suggestedAmount={settleTarget.amount}
          onSettled={() => {
            setSettled((prev) => new Set(prev).add(key(settleTarget)));
            setSettleTarget(null);
          }}
        />
      )}
    </>
  );
}
