"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalancesSheet } from "@/components/household/split/balances-sheet";
import { ExpenseDetailDialog } from "@/components/household/split/expense-detail-dialog";
import { SplitChatButton } from "@/components/household/split/split-chat-button";
import { MemberManagerDialog } from "@/components/household/member-manager-dialog";
import { listEligibleSplitGroupMembers, addSplitGroupMember, removeSplitGroupMember } from "@/lib/actions/split";
import type { SplitSummary } from "@/lib/actions/split";
import type { HouseholdMemberLite } from "@/components/household/finance-toggle";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** "You owe / You are owed / Net", recent expenses, and entry points into Balances (+ Simplify), Split Chat, Invite Members, and each expense's detail — deliberately plain language throughout, no ledger/accounting terms, per spec §3/§19. */
export function SplitDashboard({
  householdId,
  summary,
  members,
  currentUserId,
  isOwner,
}: {
  householdId: string;
  summary: SplitSummary;
  members: HouseholdMemberLite[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Let's Split's own member list is who may manage it — the group's
  // creator or the household owner (mirrors can_manage_split_group() in
  // supabase/schema.sql), computed from the group-scoped `members` list
  // itself rather than a second server round-trip.
  const canManageMembers = isOwner || members.some((m) => m.userId === currentUserId && m.isCreator);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-destructive/10 p-3.5">
          <p className="text-xs text-muted-foreground">You owe</p>
          <p className="mt-0.5 font-mono text-lg text-destructive">{inr(summary.youOwe)}</p>
        </div>
        <div className="rounded-2xl bg-accent p-3.5">
          <p className="text-xs text-muted-foreground">You are owed</p>
          <p className="mt-0.5 font-mono text-lg text-primary">{inr(summary.youAreOwed)}</p>
        </div>
        <div className="rounded-2xl bg-muted p-3.5">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className={`mt-0.5 font-mono text-lg ${summary.net >= 0 ? "text-primary" : "text-destructive"}`}>
            {summary.net >= 0 ? "+" : "-"}
            {inr(Math.abs(summary.net))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-accent p-1">
        <Button size="sm" variant="ghost" className="rounded-xl bg-card shadow-sm" onClick={() => setBalancesOpen(true)}>
          Balances
        </Button>
        <SplitChatButton householdId={householdId} groupId={summary.groupId} currentUserId={currentUserId} members={members} />
      </div>

      {canManageMembers && (
        <MemberManagerDialog
          title="Let's Split members"
          members={members.map((m) => ({ userId: m.userId, name: m.name, avatarUrl: m.avatarUrl, isCreator: m.isCreator ?? false }))}
          fetchEligible={() => listEligibleSplitGroupMembers(summary.groupId, householdId)}
          onAdd={(userId) => addSplitGroupMember(summary.groupId, userId)}
          onRemove={(userId) => removeSplitGroupMember(summary.groupId, userId)}
          householdId={householdId}
          currentUserId={currentUserId}
        />
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Recent Expenses</p>
        {summary.recentExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet — add one to start splitting.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {summary.recentExpenses.map((e) => (
              <li key={e.id}>
                <button onClick={() => setDetailId(e.id)} className="flex w-full items-center gap-3.5 p-3.5 text-left transition hover:bg-muted/50">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                    <Receipt className="size-4.5 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.description}</span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      {e.payerName} paid · {e.participantCount} {e.participantCount === 1 ? "person" : "people"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-base">{inr(e.amount)}</span>
                    <span className={`block text-[11px] ${e.settled ? "text-primary" : "text-muted-foreground"}`}>
                      {e.settled ? "Settled" : "Pending"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {summary.net !== 0 && (
        <Button className="w-full rounded-2xl" onClick={() => setBalancesOpen(true)}>
          Settle up · {inr(Math.abs(summary.net))}
        </Button>
      )}

      <BalancesSheet householdId={householdId} open={balancesOpen} onOpenChange={setBalancesOpen} memberBalances={summary.memberBalances} />

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
