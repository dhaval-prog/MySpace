import { redirect } from "next/navigation";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { listGoals } from "@/lib/actions/household-goals";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { CreateGoalDialog } from "@/components/household/create-goal-dialog";
import { GoalCard } from "@/components/household/goal-card";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

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

  const activeGoals = (await listGoals(householdId, { status: "active" })).filter((g) => g.goal.goal_type === "saving");
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  const isOwner = context.myRole === "owner";
  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";

  return (
    <div>
      <MobileBand
        title="Goals"
        backHref="/home"
        right={<CreateGoalDialog householdId={householdId} iconOnly />}
        stats={[
          { label: "Saved together", value: inr(totalSaved) },
          { label: "Goals", value: activeGoals.length },
        ]}
      />
      <DesktopBand
        breadcrumb={`Goals · ${context.household.name}`}
        title={`${inr(totalSaved)} saved together`}
        subtitle={activeGoals.length > 0 ? `${activeGoals.length} goal${activeGoals.length === 1 ? "" : "s"}` : "No goals yet"}
        action={<CreateGoalDialog householdId={householdId} triggerLabel="New goal" />}
      />

      <MobileHeroOverlap className="pb-6">
        {activeGoals.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-sm text-muted-foreground">No goals yet — create one to start saving toward something together.</p>
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {activeGoals.map((g) => (
              <GoalCard key={g.goal.id} summary={g} canDelete={isOwner || g.goal.created_by === myUserId} currentUserId={myUserId} />
            ))}
          </div>
        )}
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        {activeGoals.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-sm text-muted-foreground">No goals yet — create one to start saving toward something together.</p>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-3">
            {activeGoals.map((g) => (
              <GoalCard key={g.goal.id} summary={g} canDelete={isOwner || g.goal.created_by === myUserId} currentUserId={myUserId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
