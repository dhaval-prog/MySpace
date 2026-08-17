import { redirect } from "next/navigation";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { getHouseholdSummary } from "@/lib/actions/household-dashboard";
import { listHouseholdMessages } from "@/lib/actions/household-chat";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { HouseholdSwitcher } from "@/components/household/household-switcher";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { CreateGoalDialog } from "@/components/household/create-goal-dialog";
import { GoalCard } from "@/components/household/goal-card";
import { MemberRow } from "@/components/household/member-row";
import { ChatPanel } from "@/components/household/chat-panel";

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
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
          description="Create a household to pool savings with the people you share a home with — everyone keeps a private vault, and you decide what to share."
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

  const [summary, messages] = await Promise.all([
    getHouseholdSummary(householdId),
    listHouseholdMessages(householdId),
  ]);

  if (!summary) redirect(`/goals?id=${memberships[0].household.id}`);

  const isOwner = context.myRole === "owner";
  const canInvite = context.myRole === "owner" || context.myRole === "co_owner";
  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";
  const activeGoals = summary.goals.filter((g) => g.goal.status === "active");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Shared &amp; Personal</p>
          <h1 className="font-heading text-4xl text-foreground md:text-5xl">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track progress toward what matters most</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HouseholdSwitcher households={memberships} currentId={householdId} />
          <InviteMemberDialog householdId={householdId} canInvite={canInvite} />
          <CreateGoalDialog householdId={householdId} />
        </div>
      </div>

      <Card className="p-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Household Savings</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">{inr(summary.totalSharedSavings)}</p>
      </Card>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
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

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <CardHeader className="flex-row items-baseline p-0">
                <h3 className="text-[17px] font-semibold tracking-tight">Members</h3>
              </CardHeader>
              <CardContent className="mt-3 p-0">
                <ul className="space-y-3">
                  {summary.memberContributions.map((m) => {
                    const role = context.members.find((cm) => cm.userId === m.userId)?.role ?? "member";
                    return (
                      <MemberRow
                        key={m.userId}
                        householdId={householdId}
                        userId={m.userId}
                        name={m.name}
                        role={role}
                        totalContributed={m.totalContributed}
                        canRemove={isOwner && m.userId !== myUserId}
                        canPromote={isOwner && role === "member" && m.userId !== myUserId}
                      />
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card className="p-5">
              <CardHeader className="p-0">
                <h3 className="text-[17px] font-semibold tracking-tight">Recent Activity</h3>
              </CardHeader>
              <CardContent className="mt-3 p-0">
                {summary.activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing yet — activity will show up here as your household saves together.</p>
                ) : (
                  <ul className="space-y-3">
                    {summary.activity.map((a) => (
                      <li key={a.id} className="text-sm">
                        <p>{a.message}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("en-IN")}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <ChatPanel householdId={householdId} currentUserId={myUserId} initialMessages={messages} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
