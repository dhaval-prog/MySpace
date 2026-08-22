import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { getSplitSummary, getSplitGroupMembers, getSimplifiedBalances, getPendingSettlements, getGroupTotals, listSplitGroups } from "@/lib/actions/split";
import { EmptyState } from "@/components/shared/empty-state";
import { JoinWithCodeDialog } from "@/components/household/join-with-code-dialog";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { AddExpenseDialog } from "@/components/household/split/add-expense-dialog";
import { CreateSplitGroupButton } from "@/components/household/split/split-group-switcher";
import { SplitGroupWorkspace } from "@/components/household/split/split-group-workspace";
import { SplitWalletStack, SplitWalletList, type WalletCardData } from "@/components/household/split/split-wallet-stack";
import { SplitWalletWithDetail } from "@/components/household/split/split-wallet-with-detail";
import { SplitDetailCard } from "@/components/household/split/split-detail-card";
import { SplitGroupActionsMenu } from "@/components/household/split/split-group-actions-menu";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function SplitPage({ searchParams }: { searchParams: Promise<{ id?: string; group?: string }> }) {
  const { id, group } = await searchParams;
  const memberships = await listMyHouseholds();

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Users"
          title="Fair and simple expense splitting"
          description="Create or join a household to start splitting shared costs with the people around you."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <CreateHouseholdCta redirectTo="/split" />
              <JoinHouseholdCta redirectTo="/split" />
            </div>
          }
        />
      </div>
    );
  }

  const householdId = id && memberships.some((m) => m.household.id === id) ? id : memberships[0].household.id;
  const context = await getHouseholdContext(householdId);
  if (!context) redirect(`/split?id=${memberships[0].household.id}`);

  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";
  // A split_only member (including a guest) sees this exact same workspace —
  // listSplitGroups/getSplitGroupMembers/getSplitSummary are already scoped
  // by RLS to only the group(s) they're actually in (split_groups_select_member,
  // split_members_select_group_member), so there's nothing extra to hide by
  // routing them through a different page. Only creating a new group is
  // actually off-limits for them (can_contribute_to_household() excludes
  // split_only), so that's the one thing gated below.
  const canCreateGroup = context.myRole !== "split_only";
  const isOwner = context.myRole === "owner";
  const householdMemberOptions = context.members.map((m) => ({ userId: m.userId, name: m.name, avatarUrl: m.avatarUrl }));

  const groups = await listSplitGroups(householdId);
  const groupId = group && groups.some((g) => g.id === group) ? group : (groups.find((g) => g.isDefault)?.id ?? groups[0]?.id);

  const activeGroup = groups.find((g) => g.id === groupId);
  const otherGroups = groups.filter((g) => g.id !== groupId);

  const [[splitSummary, splitMembers, simplifiedBalances, pendingSettlements], otherTotals] = await Promise.all([
    groupId
      ? Promise.all([
          getSplitSummary(householdId, groupId),
          getSplitGroupMembers(groupId),
          getSimplifiedBalances(householdId, groupId),
          getPendingSettlements(groupId),
        ])
      : Promise.resolve([null, [], [], []] as const),
    // Every other group's wallet-card numbers, without paying for a full
    // getSplitSummary() (profile joins, guest-expiry check, recentExpenses)
    // per group — none of that extra detail is ever shown for them.
    Promise.all(otherGroups.map((g) => getGroupTotals(g.id, myUserId))),
  ]);

  // Totals for the band span every group, not just the one currently open —
  // "You are owed"/"You owe" describes the whole household, matching the
  // wallet stack's own per-card totals below it.
  const activeGroupPending = simplifiedBalances.reduce((sum, t) => sum + t.amount, 0);
  const totalsByGroupId = new Map(otherGroups.map((g, i) => [g.id, otherTotals[i]]));
  if (splitSummary && groupId) {
    totalsByGroupId.set(groupId, {
      youOwe: splitSummary.youOwe,
      youAreOwed: splitSummary.youAreOwed,
      pendingAmount: activeGroupPending,
      settledAmount: splitSummary.settledAmount,
    });
  }
  const allTotals = Array.from(totalsByGroupId.values());
  const totalYouAreOwed = allTotals.reduce((sum, t) => sum + t.youAreOwed, 0);
  const totalYouOwe = allTotals.reduce((sum, t) => sum + t.youOwe, 0);
  const openGroupCount = allTotals.filter((t) => t.youOwe > 0 || t.youAreOwed > 0).length;

  const canInviteActive = Boolean(activeGroup && (context.myRole === "owner" || context.myRole === "co_owner" || activeGroup.createdBy === myUserId));
  const canDeleteActive = Boolean(activeGroup && groups.length > 1 && (context.myRole === "owner" || activeGroup.createdBy === myUserId));
  const groupActions = activeGroup && groupId ? (
    <SplitGroupActionsMenu
      householdId={householdId}
      groupId={groupId}
      groupName={activeGroup.name}
      canInvite={canInviteActive}
      canDelete={canDeleteActive}
    />
  ) : undefined;
  const walletCards: WalletCardData[] = groups.map((g) => {
    const t = totalsByGroupId.get(g.id);
    return { group: g, pendingAmount: t?.pendingAmount ?? 0, settledAmount: t?.settledAmount ?? 0 };
  });

  return (
    <div>
      <MobileBand
        title="Let's Split"
        backHref="/home"
        right={
          <RoundIconButton ariaLabel="Members">
            <Users className="size-4.5" />
          </RoundIconButton>
        }
        stats={[
          { label: "You are owed", value: inr(totalYouAreOwed) },
          { label: "You owe", value: inr(totalYouOwe), tone: "destructive" },
        ]}
        titleClassName="font-sans text-[13px] font-bold tracking-[0.12em] text-[#15281E]"
        statsLabelClassName="font-bold text-[#304237]"
        statsValueClassName="font-mono text-2xl font-extrabold text-[#111A14]"
      />
      <DesktopBand
        breadcrumb="Let's Split · Shared costs"
        title={`You are owed ${inr(totalYouAreOwed)}`}
        subtitle={`${openGroupCount} split${openGroupCount === 1 ? "" : "s"} still open · you owe ${inr(totalYouOwe)}`}
        action={canCreateGroup && groups.length > 0 ? <CreateSplitGroupButton householdId={householdId} currentUserId={myUserId} householdMembers={householdMemberOptions} /> : undefined}
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        <div className="flex items-center justify-between px-1">
          <p className="font-sans text-[11px] font-bold tracking-[0.12em] text-[#111A14] uppercase">
            Active splits <span className="ml-1 rounded-full bg-[#E3EBC7] px-1.5 py-0.5 text-[#3A4E1B]">{groups.length}</span>
          </p>
          <JoinWithCodeDialog />
        </div>

        {walletCards.length > 0 && (
          <p className="text-center text-[11px] text-[#5C6B61]">{walletCards.length > 1 ? "Tap to open · drag to flick" : "Tap to open"}</p>
        )}

        {walletCards.length > 0 && groupId && (
          <SplitWalletWithDetail
            householdId={householdId}
            cards={walletCards}
            activeGroupId={groupId}
            detail={
              splitSummary && activeGroup ? (
                <Card className="p-5">
                  <SplitDetailCard group={activeGroup} summary={splitSummary} pendingAmount={activeGroupPending} actions={groupActions} />
                </Card>
              ) : null
            }
          />
        )}

        {canCreateGroup && (
          <div className="flex justify-center pt-6">
            <CreateSplitGroupButton householdId={householdId} currentUserId={myUserId} householdMembers={householdMemberOptions} />
          </div>
        )}

        {splitSummary && activeGroup ? (
          <>
            <div className="flex justify-end">
              <AddExpenseDialog householdId={householdId} groupId={groupId!} members={splitMembers} currentUserId={myUserId} />
            </div>

            <Card className="p-5">
              <SplitGroupWorkspace
                householdId={householdId}
                group={activeGroup}
                summary={splitSummary}
                simplifiedBalances={simplifiedBalances}
                pendingSettlements={pendingSettlements}
                members={splitMembers}
                currentUserId={myUserId}
                isOwner={isOwner}
              />
            </Card>
          </>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t been added to this split group yet — ask its owner or creator to invite you.
            </p>
          </Card>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">The wallet</p>
            <div className="flex items-center gap-3">
              {walletCards.length > 1 && <p className="text-xs text-muted-foreground">Click to switch</p>}
              <JoinWithCodeDialog />
            </div>
          </div>
          {walletCards.length > 0 && groupId && <SplitWalletStack householdId={householdId} cards={walletCards} activeGroupId={groupId} />}
          {walletCards.length > 1 && groupId && <SplitWalletList householdId={householdId} cards={walletCards} activeGroupId={groupId} />}
        </div>

        {splitSummary && activeGroup ? (
          <div className="space-y-4">
            <Card className="p-6">
              <SplitDetailCard group={activeGroup} summary={splitSummary} pendingAmount={activeGroupPending} actions={groupActions} />
            </Card>
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Expenses &amp; chat</p>
                <AddExpenseDialog householdId={householdId} groupId={groupId!} members={splitMembers} currentUserId={myUserId} />
              </div>
              <SplitGroupWorkspace
                householdId={householdId}
                group={activeGroup}
                summary={splitSummary}
                simplifiedBalances={simplifiedBalances}
                pendingSettlements={pendingSettlements}
                members={splitMembers}
                currentUserId={myUserId}
                isOwner={isOwner}
              />
            </Card>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t been added to this split group yet — ask its owner or creator to invite you.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
