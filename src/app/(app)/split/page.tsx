import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { getSplitSummary, getSplitGroupMembers, getSimplifiedBalances, getPendingSettlements, listSplitGroups } from "@/lib/actions/split";
import { EmptyState } from "@/components/shared/empty-state";
import { JoinWithCodeDialog } from "@/components/household/join-with-code-dialog";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { AddExpenseDialog } from "@/components/household/split/add-expense-dialog";
import { SplitGroupSwitcher, CreateSplitGroupButton } from "@/components/household/split/split-group-switcher";
import { SplitGroupWorkspace } from "@/components/household/split/split-group-workspace";
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

  const [[splitSummary, splitMembers, simplifiedBalances, pendingSettlements], otherGroupSummaries] = await Promise.all([
    groupId
      ? Promise.all([
          getSplitSummary(householdId, groupId),
          getSplitGroupMembers(groupId),
          getSimplifiedBalances(householdId, groupId),
          getPendingSettlements(groupId),
        ])
      : Promise.resolve([null, [], [], []] as const),
    Promise.all(groups.filter((g) => g.id !== groupId).map((g) => getSplitSummary(householdId, g.id))),
  ]);

  // Totals for the band span every group, not just the one currently open —
  // "You are owed"/"You owe" describes the whole household, matching the
  // group switcher's own per-card totals below it.
  const allSummaries = [splitSummary, ...otherGroupSummaries].filter((s): s is NonNullable<typeof s> => s !== null);
  const totalYouAreOwed = allSummaries.reduce((sum, s) => sum + s.youAreOwed, 0);
  const totalYouOwe = allSummaries.reduce((sum, s) => sum + s.youOwe, 0);
  const openGroupCount = allSummaries.filter((s) => s.youOwe > 0 || s.youAreOwed > 0).length;

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
      />
      <DesktopBand
        breadcrumb="Let's Split · Shared costs"
        title={`You are owed ${inr(totalYouAreOwed)}`}
        subtitle={`${openGroupCount} split${openGroupCount === 1 ? "" : "s"} still open · you owe ${inr(totalYouOwe)}`}
        action={canCreateGroup && groups.length > 0 ? <CreateSplitGroupButton householdId={householdId} currentUserId={myUserId} householdMembers={householdMemberOptions} /> : undefined}
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        <div className="flex items-center justify-between px-1">
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Active splits <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-accent-foreground">{groups.length}</span>
          </p>
          <JoinWithCodeDialog />
        </div>

        {groups.length > 0 && (
          <SplitGroupSwitcher householdId={householdId} groups={groups} currentGroupId={groupId ?? ""} currentUserId={myUserId} myRole={context.myRole} />
        )}

        {canCreateGroup && groups.length > 0 && (
          <div className="flex justify-center">
            <CreateSplitGroupButton householdId={householdId} currentUserId={myUserId} householdMembers={householdMemberOptions} />
          </div>
        )}

        {splitSummary && groupId && (
          <div className="flex justify-end">
            <AddExpenseDialog householdId={householdId} groupId={groupId} members={splitMembers} currentUserId={myUserId} />
          </div>
        )}

        {splitSummary && activeGroup ? (
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
            <JoinWithCodeDialog />
          </div>
          {groups.length > 0 && (
            <SplitGroupSwitcher householdId={householdId} groups={groups} currentGroupId={groupId ?? ""} currentUserId={myUserId} myRole={context.myRole} />
          )}
        </div>

        {splitSummary && activeGroup ? (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Split detail</p>
              {splitSummary && groupId && <AddExpenseDialog householdId={householdId} groupId={groupId} members={splitMembers} currentUserId={myUserId} />}
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
