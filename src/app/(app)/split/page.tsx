import { redirect } from "next/navigation";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { getSplitSummary, getSplitGroupMembers, getSplitActivity, getDefaultGroupId } from "@/lib/actions/split";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { HouseholdSwitcher } from "@/components/household/household-switcher";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { AddExpenseDialog } from "@/components/household/split/add-expense-dialog";
import { SplitDashboard } from "@/components/household/split/split-dashboard";
import { SplitOnlyWorkspace } from "@/components/household/split/split-only-workspace";
import { initials } from "@/lib/utils";

export default async function SplitPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
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

  const groupId = await getDefaultGroupId(householdId);
  const [splitSummary, splitMembers, activity] = await Promise.all([
    getSplitSummary(householdId),
    groupId ? getSplitGroupMembers(groupId) : Promise.resolve([]),
    getSplitActivity(householdId),
  ]);
  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";

  if (context.myRole === "split_only") {
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

  const isOwner = context.myRole === "owner";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Shared Costs</p>
          <h1 className="font-heading text-4xl text-foreground md:text-5xl">Let&apos;s Split</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fair and simple expense splitting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HouseholdSwitcher households={memberships} currentId={householdId} basePath="/split" />
          {splitSummary && <AddExpenseDialog householdId={householdId} members={splitMembers} currentUserId={myUserId} />}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <Card className="p-5">
            <CardHeader className="p-0">
              <h3 className="text-[17px] font-semibold tracking-tight">My Balance</h3>
            </CardHeader>
            <CardContent className="mt-3 p-0">
              {splitSummary ? (
                <SplitDashboard householdId={householdId} summary={splitSummary} members={splitMembers} currentUserId={myUserId} isOwner={isOwner} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t been added to this household&apos;s split group yet — ask an owner to invite you.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <CardHeader className="flex-row items-baseline p-0">
              <h3 className="text-[17px] font-semibold tracking-tight">Split Group Members</h3>
            </CardHeader>
            <CardContent className="mt-3 p-0">
              <ul className="space-y-3">
                {splitMembers.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2.5 text-sm">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">{m.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="p-5">
            <CardHeader className="p-0">
              <h3 className="text-[17px] font-semibold tracking-tight">Activity</h3>
            </CardHeader>
            <CardContent className="mt-3 p-0">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing yet — activity will show up here as expenses are added and settled.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => (
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
      </div>
    </div>
  );
}
