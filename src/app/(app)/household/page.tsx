import { redirect } from "next/navigation";
import { Crown, ShieldCheck, User, Receipt } from "lucide-react";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { getHouseholdSummary } from "@/lib/actions/household-dashboard";
import { getExpenseStats } from "@/lib/actions/expenses";
import { listSplitGroups, getSplitSummary } from "@/lib/actions/split";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";
import { ListRow } from "@/components/layout/list-row";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, memberAccentClass } from "@/lib/utils";
import type { HouseholdRole } from "@/lib/supabase/types";

const ROLE_ICON: Record<HouseholdRole, typeof Crown> = {
  owner: Crown,
  co_owner: ShieldCheck,
  member: User,
  viewer: User,
  limited_member: User,
  split_only: Receipt,
};

const ROLE_LABEL: Record<HouseholdRole, string> = {
  owner: "Admin",
  co_owner: "Admin",
  member: "Member",
  viewer: "Viewer",
  limited_member: "Member",
  split_only: "Split only",
};

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function HouseholdPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const memberships = await listMyHouseholds();

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Home"
          title="Everything at home, in one place."
          description="Create a household to share items, expenses and goals with the people you live with."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <CreateHouseholdCta redirectTo="/household" />
              <JoinHouseholdCta redirectTo="/household" />
            </div>
          }
        />
      </div>
    );
  }

  const householdId = id && memberships.some((m) => m.household.id === id) ? id : memberships[0].household.id;
  const context = await getHouseholdContext(householdId);
  if (!context) redirect(`/household?id=${memberships[0].household.id}`);

  const canInvite = context.myRole === "owner" || context.myRole === "co_owner";

  const [summary, stats, splitGroups] = await Promise.all([getHouseholdSummary(householdId), getExpenseStats(householdId), listSplitGroups(householdId)]);
  const splitSummaries = await Promise.all(splitGroups.map((g) => getSplitSummary(householdId, g.id)));
  const openSplits = splitSummaries.filter((s) => s && (s.youOwe > 0 || s.youAreOwed > 0)).length;
  const activeGoals = summary?.goals.filter((g) => g.goal.goal_type === "saving").length ?? 0;

  return (
    <div>
      <MobileBand
        title="Household"
        backHref="/home"
        stats={[
          { label: "People", value: context.members.length },
          { label: "Spent · this month", value: inr(stats.totalThisMonth) },
        ]}
      />
      <DesktopBand
        breadcrumb={`Household · ${context.household.name}`}
        title={context.household.name}
        subtitle={`${context.members.length} people · ${inr(stats.totalThisMonth)} spent this month`}
        action={canInvite ? <InviteMemberDialog householdId={householdId} canInvite={canInvite} /> : undefined}
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        <Card className="p-5">
          <p className="font-heading text-xl leading-tight text-foreground">
            {context.members.length} people keep this {context.household.name.toLowerCase()} running.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Spent</p>
              <p className="mt-0.5 text-sm font-semibold">{inr(stats.totalThisMonth)}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Open splits</p>
              <p className="mt-0.5 text-sm font-semibold">{openSplits}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Goals</p>
              <p className="mt-0.5 text-sm font-semibold">{activeGoals}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-80">Invite code</p>
            <p className="mt-1 font-heading text-2xl tracking-wide">{context.household.code}</p>
            {canInvite && (
              <div className="mt-2">
                <InviteMemberDialog householdId={householdId} canInvite={canInvite} />
              </div>
            )}
          </div>
        </Card>

        <div>
          <p className="px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Members {context.members.length}</p>
          <div className="mt-2 space-y-2">
            {context.members.map((m, i) => {
              const RoleIcon = ROLE_ICON[m.role];
              return (
                <ListRow
                  key={m.userId}
                  icon={<Avatar size="sm"><AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback></Avatar>}
                  title={m.isMe ? `${m.name} · you` : m.name}
                  subtitle={`${ROLE_LABEL[m.role]} · joined ${new Date(m.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
                  trailing={<RoleIcon className="size-4 text-muted-foreground" />}
                />
              );
            })}
          </div>
        </div>

        {summary && summary.activity.length > 0 && (
          <div>
            <p className="px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Activity</p>
            <div className="mt-2 space-y-2">
              {summary.activity.slice(0, 8).map((a) => (
                <ListRow key={a.id} title={a.message} subtitle={new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
              ))}
            </div>
          </div>
        )}
      </MobileHeroOverlap>

      <div className="hidden gap-6 px-8 pb-8 md:grid md:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Members {context.members.length}</p>
          </div>
          <div className="space-y-2">
            {context.members.map((m, i) => {
              const RoleIcon = ROLE_ICON[m.role];
              return (
                <ListRow
                  key={m.userId}
                  icon={<Avatar size="sm"><AvatarFallback className={memberAccentClass(i)}>{initials(m.name)}</AvatarFallback></Avatar>}
                  title={m.isMe ? `${m.name} · you` : m.name}
                  subtitle={`${ROLE_LABEL[m.role]} · joined ${new Date(m.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
                  trailing={<RoleIcon className="size-4 text-muted-foreground" />}
                />
              );
            })}
          </div>

          <Card className="bg-secondary p-5 text-secondary-foreground">
            <p className="font-mono text-xs font-medium tracking-[0.14em] uppercase opacity-80">Invite code</p>
            <p className="mt-1 font-heading text-3xl tracking-wide">{context.household.code}</p>
            <p className="mt-2 text-sm opacity-80">Anyone with this code joins as a member. Admins can change roles later.</p>
            {canInvite && (
              <div className="mt-3">
                <InviteMemberDialog
                  householdId={householdId}
                  canInvite={canInvite}
                  hideTrigger={false}
                />
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="font-heading text-2xl">{context.household.name}</p>
            <p className="font-heading text-2xl">{inr(stats.totalThisMonth)}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {context.members.length} people · {inr(stats.totalThisMonth)} spent this month
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Open splits</p>
              <p className="mt-0.5 text-sm font-semibold">{openSplits}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Goals</p>
              <p className="mt-0.5 text-sm font-semibold">{activeGoals}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Spent</p>
              <p className="mt-0.5 text-sm font-semibold">{inr(stats.totalThisMonth)}</p>
            </div>
          </div>

          {summary && summary.activity.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Recent activity</p>
              <div className="mt-2 space-y-2">
                {summary.activity.slice(0, 6).map((a) => (
                  <ListRow key={a.id} title={a.message} subtitle={new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
