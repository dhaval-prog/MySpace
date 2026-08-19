import { redirect } from "next/navigation";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { getSplitSummary, getSplitGroupMembers, getSimplifiedBalances, getSplitActivity, listSplitGroups, getDefaultGroupId } from "@/lib/actions/split";
import { EmptyState } from "@/components/shared/empty-state";
import { JoinWithCodeDialog } from "@/components/household/join-with-code-dialog";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { AddExpenseDialog } from "@/components/household/split/add-expense-dialog";
import { SplitGroupSwitcher, CreateSplitGroupButton } from "@/components/household/split/split-group-switcher";
import { SplitGroupWorkspace } from "@/components/household/split/split-group-workspace";
import { SplitOnlyWorkspace } from "@/components/household/split/split-only-workspace";

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

  if (context.myRole === "split_only") {
    const groupId = await getDefaultGroupId(householdId);
    const [splitSummary, splitMembers, activity] = await Promise.all([
      getSplitSummary(householdId),
      groupId ? getSplitGroupMembers(groupId) : Promise.resolve([]),
      getSplitActivity(householdId),
    ]);
    return (
      <SplitOnlyWorkspace
        householdId={householdId}
        householdName={context.household.name}
        currentUserId={myUserId}
        splitSummary={splitSummary}
        members={splitMembers}
        activity={activity}
        households={memberships}
      />
    );
  }

  const groups = await listSplitGroups(householdId);
  const groupId = group && groups.some((g) => g.id === group) ? group : (groups.find((g) => g.isDefault)?.id ?? groups[0]?.id);

  const activeGroup = groups.find((g) => g.id === groupId);

  const [splitSummary, splitMembers, simplifiedBalances] = groupId
    ? await Promise.all([getSplitSummary(householdId, groupId), getSplitGroupMembers(groupId), getSimplifiedBalances(householdId, groupId)])
    : [null, [], []];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Shared Costs</p>
          <div className="flex items-center gap-1.5">
            <h1 className="font-heading text-4xl text-foreground md:text-5xl">Let&apos;s Split</h1>
            {groups.length > 0 && <CreateSplitGroupButton householdId={householdId} currentUserId={myUserId} iconOnly />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Fair and simple expense splitting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JoinWithCodeDialog />
          {splitSummary && groupId && <AddExpenseDialog householdId={householdId} groupId={groupId} members={splitMembers} currentUserId={myUserId} />}
        </div>
      </div>

      {groups.length > 0 && (
        <SplitGroupSwitcher
          householdId={householdId}
          groups={groups}
          currentGroupId={groupId ?? ""}
          currentUserId={myUserId}
          myRole={context.myRole}
        />
      )}

      {splitSummary && activeGroup ? (
        <SplitGroupWorkspace
          householdId={householdId}
          group={activeGroup}
          summary={splitSummary}
          simplifiedBalances={simplifiedBalances}
          members={splitMembers}
          currentUserId={myUserId}
        />
      ) : (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t been added to this split group yet — ask its owner or creator to invite you.
          </p>
        </div>
      )}
    </div>
  );
}
