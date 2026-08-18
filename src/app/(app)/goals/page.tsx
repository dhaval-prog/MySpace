import { redirect } from "next/navigation";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { listGoals } from "@/lib/actions/household-goals";
import { EmptyState } from "@/components/shared/empty-state";
import { HouseholdSwitcher } from "@/components/household/household-switcher";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { CreateGoalDialog } from "@/components/household/create-goal-dialog";
import { GoalCard } from "@/components/household/goal-card";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const memberships = await listMyHouseholds();

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Home"
          title="My Money. Our Goals. Our Home."
          description="Create a household to pool savings with the people you share a home with — everyone keeps a private Personal Piggy, and you decide what to share."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <CreateHouseholdCta />
              <JoinHouseholdCta />
            </div>
          }
        />
      </div>
    );
  }

  const householdId = id && memberships.some((m) => m.household.id === id) ? id : memberships[0].household.id;
  const context = await getHouseholdContext(householdId);
  if (!context) redirect(`/goals?id=${memberships[0].household.id}`);

  if (context.myRole === "split_only") {
    redirect(`/split?id=${householdId}`);
  }

  const activeGoals = await listGoals(householdId, { status: "active" });

  const isOwner = context.myRole === "owner";
  const canInvite = context.myRole === "owner" || context.myRole === "co_owner";
  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Shared &amp; Personal</p>
          <h1 className="font-heading text-4xl text-foreground md:text-5xl">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track progress toward what matters most</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HouseholdSwitcher households={memberships} currentId={householdId} canInvite={canInvite} />
          <CreateGoalDialog householdId={householdId} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeGoals.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            No goals yet — create one to start saving toward something together.
          </p>
        ) : (
          activeGoals.map((g) => (
            <GoalCard key={g.goal.id} summary={g} canDelete={isOwner || g.goal.created_by === myUserId} currentUserId={myUserId} />
          ))
        )}
      </div>
    </div>
  );
}
