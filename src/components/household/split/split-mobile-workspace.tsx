"use client";

import { useEffect, useState } from "react";
import { SplitWalletStack, CARD_THEMES, type WalletCardData } from "@/components/household/split/split-wallet-stack";
import { SplitDetailPanel } from "@/components/household/split/split-detail-panel";
import { SplitGroupWorkspace } from "@/components/household/split/split-group-workspace";
import { AddExpenseDialog } from "@/components/household/split/add-expense-dialog";
import { CreateSplitGroupButton, type HouseholdMemberOption } from "@/components/household/split/split-group-switcher";
import { Card } from "@/components/ui/card";
import type { SplitGroupSummary, SplitSummary, SimplifiedTransferWithNames, PendingSettlement } from "@/lib/actions/split";
import type { HouseholdMemberLite } from "@/components/household/finance-toggle";

export interface GroupDetailData {
  group: SplitGroupSummary;
  /** Null when the viewer hasn't been added to this specific group. */
  summary: SplitSummary | null;
  members: HouseholdMemberLite[];
  balances: SimplifiedTransferWithNames[];
  settlements: PendingSettlement[];
}

/**
 * Everything below the "Active splits" heading on mobile — the wallet
 * stack, its Split Detail panel, and the Expenses/Balances/Chat workspace
 * for whichever group is currently on top. Every group's full detail is
 * fetched once up front (see the /split page) and handed to this
 * component as `detailsByGroupId`, so flicking between cards never waits
 * on a network round trip anywhere on the page — not just the wallet
 * card's own numbers (SplitWalletStack already made those instant), but
 * the detail panel and workspace tabs underneath it too.
 */
export function SplitMobileWorkspace({
  householdId,
  cards,
  activeGroupId,
  detailsByGroupId,
  currentUserId,
  isOwner,
  canCreateGroup,
  householdMembers,
}: {
  householdId: string;
  cards: WalletCardData[];
  activeGroupId: string;
  detailsByGroupId: Map<string, GroupDetailData>;
  currentUserId: string;
  isOwner: boolean;
  canCreateGroup: boolean;
  householdMembers: HouseholdMemberOption[];
}) {
  // Mirrors the wallet stack's own front card (updated instantly on every
  // fling — see onFrontChange) so the detail panel and workspace below
  // switch in lockstep with it, both reading from the pre-fetched map
  // instead of the URL/server round trip that's still happening underneath.
  const [displayGroupId, setDisplayGroupId] = useState(activeGroupId);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    // A group change we didn't drive ourselves (peek/list click, browser
    // back) — land back on the wallet view for whichever group it is.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailOpen(false);
  }, [activeGroupId]);

  const detail = detailsByGroupId.get(displayGroupId);
  const pendingAmount = detail ? detail.balances.reduce((sum, t) => sum + t.amount, 0) : 0;
  // Same lookup SplitWalletStack itself uses for CARD_THEMES — keeps the
  // detail panel's hero the same color as the card it just replaced.
  const cardIndex = Math.max(0, cards.findIndex((c) => c.group.id === displayGroupId));
  const themeClassName = CARD_THEMES[cardIndex % CARD_THEMES.length];

  return (
    <>
      {detailOpen && detail ? (
        detail.summary ? (
          <SplitDetailPanel
            group={detail.group}
            summary={detail.summary}
            pendingAmount={pendingAmount}
            currentUserId={currentUserId}
            onClose={() => setDetailOpen(false)}
            themeClassName={themeClassName}
            addExpenseAction={
              <AddExpenseDialog householdId={householdId} groupId={displayGroupId} members={detail.members} currentUserId={currentUserId} />
            }
          />
        ) : (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t been added to this split group yet — ask its owner or creator to invite you.
            </p>
          </Card>
        )
      ) : (
        <SplitWalletStack
          householdId={householdId}
          cards={cards}
          activeGroupId={activeGroupId}
          onFrontChange={setDisplayGroupId}
          onToggleDetail={() => setDetailOpen(true)}
          showCardActions
        />
      )}

      {canCreateGroup && (
        <div className="pt-6">
          <CreateSplitGroupButton householdId={householdId} currentUserId={currentUserId} householdMembers={householdMembers} />
        </div>
      )}

      {detail?.summary ? (
        <Card className="p-5">
          <SplitGroupWorkspace
            householdId={householdId}
            group={detail.group}
            summary={detail.summary}
            simplifiedBalances={detail.balances}
            pendingSettlements={detail.settlements}
            members={detail.members}
            currentUserId={currentUserId}
            isOwner={isOwner}
          />
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t been added to this split group yet — ask its owner or creator to invite you.
          </p>
        </Card>
      )}
    </>
  );
}
