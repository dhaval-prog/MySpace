"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Check, Clock, Trash2, UserRoundX } from "lucide-react";
import { cn, initials, memberAccentClass } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseDetailDialog } from "@/components/household/split/expense-detail-dialog";
import { SettleUpDialog } from "@/components/household/split/settle-up-dialog";
import { SplitChatPanel } from "@/components/household/split/split-chat-panel";
import { listSplitMessages, type SplitChatMessageWithSender } from "@/lib/actions/split-chat";
import { confirmSettlement, deleteExpense } from "@/lib/actions/split";
import type { SplitGroupSummary, SplitSummary, SplitExpenseSummary, SimplifiedTransferWithNames, PendingSettlement } from "@/lib/actions/split";
import type { HouseholdMemberLite } from "@/components/household/finance-toggle";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Tab = "expenses" | "balances" | "chat";

/** The Expenses/Balances/Chat toggle + content — the group's own summary
 * card now lives in SplitGroupSwitcher's swipeable carousel instead, since
 * swiping between groups needs the card to exist per-group, not just for
 * whichever one is currently active here. */
export function SplitGroupWorkspace({
  householdId,
  group,
  summary,
  simplifiedBalances,
  pendingSettlements,
  members,
  currentUserId,
  isOwner,
}: {
  householdId: string;
  group: SplitGroupSummary;
  summary: SplitSummary;
  simplifiedBalances: SimplifiedTransferWithNames[];
  pendingSettlements: PendingSettlement[];
  members: HouseholdMemberLite[];
  currentUserId: string;
  isOwner: boolean;
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
        <ExpensesTab summary={summary} onSelect={setDetailId} currentUserId={currentUserId} isOwner={isOwner} />
      )}
      {tab === "balances" && (
        <BalancesTab
          householdId={householdId}
          groupId={group.id}
          transfers={simplifiedBalances}
          pendingSettlements={pendingSettlements}
          currentUserId={currentUserId}
        />
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

function ExpensesTab({
  summary,
  onSelect,
  currentUserId,
  isOwner,
}: {
  summary: SplitSummary;
  onSelect: (id: string) => void;
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<SplitExpenseSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  if (summary.recentExpenses.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No expenses yet — add one to start splitting.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {summary.recentExpenses.map((e) => {
          // Same gate delete_split_expense() enforces server-side (owner or
          // whoever created it) — this button is a shortcut into that, not
          // a looser rule of its own.
          const canDelete = isOwner || e.createdBy === currentUserId;
          // Dimmed once the payer's guest access has lapsed and the expense
          // is still outstanding — settled ones don't need the flag, nobody
          // still needs to reach that account for anything.
          const dimmed = e.payerIsExpiredGuest && !e.settled;
          return (
            <li key={e.id} className={cn("flex items-center transition-opacity duration-300", dimmed && "opacity-45")}>
              <button
                type="button"
                onClick={() => onSelect(e.id)}
                className="flex min-w-0 flex-1 items-center gap-3.5 p-4 text-left transition hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Receipt className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.description}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">
                      Paid by {e.payerName} · {formatDate(e.expenseDate)}
                    </span>
                    {dimmed && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        <UserRoundX className="size-3" />
                        Guest expired
                      </span>
                    )}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1.5 pr-4">
                {canDelete && (
                  <button
                    type="button"
                    title={`Delete "${e.description}"`}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(e);
                    }}
                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete &ldquo;{e.description}&rdquo;</span>
                  </button>
                )}
                <span className="font-mono text-base font-medium">{inr(e.amount)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.description}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This removes it and its split for everyone. This can&apos;t be undone.</p>
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
                  const result = await deleteExpense(deleteTarget.id);
                  if ("error" in result) {
                    setDeleteError(result.error);
                    return;
                  }
                  setDeleteTarget(null);
                  router.refresh();
                })
              }
            >
              <Trash2 className="size-4" />
              Delete Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BalancesTab({
  householdId,
  groupId,
  transfers,
  pendingSettlements,
  currentUserId,
}: {
  householdId: string;
  groupId: string;
  transfers: SimplifiedTransferWithNames[];
  pendingSettlements: PendingSettlement[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [settleTarget, setSettleTarget] = useState<SimplifiedTransferWithNames | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const key = (t: SimplifiedTransferWithNames) => `${t.fromUserId}:${t.toUserId}`;
  const pendingByPair = new Map(pendingSettlements.map((p) => [`${p.fromUserId}:${p.toUserId}`, p]));

  function handleConfirm(settlementId: string, pairKey: string) {
    setConfirmingId(settlementId);
    startTransition(async () => {
      const result = await confirmSettlement(settlementId);
      setConfirmingId(null);
      if (!("error" in result)) {
        setJustConfirmed((prev) => new Set(prev).add(pairKey));
        router.refresh();
      }
    });
  }

  // Server-confirmed empty state, not client-tracked — confirming a
  // settlement removes it from getSimplifiedBalances() entirely (net debt
  // hits zero) once router.refresh() brings back a shorter `transfers`
  // list. `justConfirmed` only smooths over the moment right after clicking.
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
          const pairKey = key(t);
          const isDebtor = t.fromUserId === currentUserId;
          const isCreditor = t.toUserId === currentUserId;
          const request = pendingByPair.get(pairKey);
          const justSettled = justConfirmed.has(pairKey);
          return (
            <li
              key={pairKey}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 transition-all duration-500 ease-out",
                justSettled && "translate-x-1 opacity-40"
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
                {request && isCreditor ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    disabled={pending && confirmingId === request.id}
                    onClick={() => handleConfirm(request.id, pairKey)}
                    title={`Confirm you received ${inr(request.amount)} from ${t.fromName}`}
                  >
                    <Check className={cn("size-3.5", pending && confirmingId === request.id && "animate-pulse")} />
                    {pending && confirmingId === request.id ? "Confirming…" : "Confirm"}
                  </Button>
                ) : request && isDebtor ? (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5" />
                    Waiting for {t.toName}
                  </span>
                ) : (
                  isDebtor && (
                    <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setSettleTarget(t)}>
                      <Check className="size-3.5" />
                      Settle
                    </Button>
                  )
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
          otherUserId={settleTarget.toUserId}
          otherName={settleTarget.toName}
          suggestedAmount={settleTarget.amount}
          onSettled={() => {
            setSettleTarget(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
