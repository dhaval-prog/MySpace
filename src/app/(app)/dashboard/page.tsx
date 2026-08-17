import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Compass, Wallet, Target, Receipt, ArrowUp, ArrowDown, Package, Activity as ActivityIcon, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard-data";
import { getVaultSummary } from "@/lib/vault/ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { relativeDay } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { SeedDemoButton } from "@/components/shared/seed-demo-button";
import { listMyHouseholds } from "@/lib/actions/household";
import { getHouseholdSummary } from "@/lib/actions/household-dashboard";
import { getSplitSummary, getDefaultGroupId } from "@/lib/actions/split";

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const STAT_CARDS = [
  { key: "items", label: "Items Tracked", icon: Compass },
  { key: "vault", label: "Vault Balance", icon: Wallet },
  { key: "goals", label: "Active Goals", icon: Target },
  { key: "owed", label: "You Are Owed", icon: Receipt },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const memberships = await listMyHouseholds();
  const primaryHousehold = memberships[0];

  const [data, vault, householdSummary, splitSummary] = await Promise.all([
    getDashboardData(supabase),
    getVaultSummary(supabase, user.id),
    primaryHousehold ? getHouseholdSummary(primaryHousehold.household.id) : Promise.resolve(null),
    primaryHousehold
      ? getDefaultGroupId(primaryHousehold.household.id).then((groupId) =>
          groupId ? getSplitSummary(primaryHousehold.household.id) : null
        )
      : Promise.resolve(null),
  ]);

  const name = profile?.name || user.email?.split("@")[0] || "there";
  const activeGoalCount = householdSummary?.goals.filter((g) => g.goal.status === "active").length ?? 0;
  const statValues: Record<(typeof STAT_CARDS)[number]["key"], string> = {
    items: String(data.totals.items),
    vault: inr(vault.balance),
    goals: String(activeGoalCount),
    owed: inr(splitSummary?.youAreOwed ?? 0),
  };

  const activeGoals = householdSummary?.goals.filter((g) => g.goal.status === "active").slice(0, 3) ?? [];

  type ActivityEntry = { id: string; message: string; createdAt: string; icon: "item" | "household" };
  const activity: ActivityEntry[] = [
    ...data.recentItems.slice(0, 4).map(({ item }) => ({
      id: `item-${item.id}`,
      message: `Added "${item.name}"`,
      createdAt: item.created_at,
      icon: "item" as const,
    })),
    ...(householdSummary?.activity
      .slice(0, 4)
      .map((a) => ({ id: a.id, message: a.message, createdAt: a.createdAt, icon: "household" as const })) ?? []),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  if (data.homes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Home"
          title="Let's set up your home"
          description="Create your first home to start mapping out rooms, furniture, and everything stored inside them."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                render={
                  <Link href="/home/new">
                    <Plus className="size-4" />
                    Create your home
                  </Link>
                }
              />
              <SeedDemoButton />
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <h1 className="font-heading text-4xl text-foreground md:text-5xl">
          {greeting()}, {name}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Here is what is happening in your space.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="p-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent">
              <Icon className="size-4.5 text-accent-foreground" />
            </div>
            <p className="mt-3 font-mono text-2xl text-foreground">{statValues[key]}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <CardHeader className="p-0">
            <h3 className="text-[17px] font-semibold tracking-tight">Recent Activity</h3>
          </CardHeader>
          <CardContent className="mt-3 p-0">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet — activity will show up here as you go.</p>
            ) : (
              <ul className="divide-y">
                {activity.map((a) => {
                  const EntryIcon = a.icon === "item" ? Package : ActivityIcon;
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-sm">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                        <EntryIcon className="size-4 text-accent-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">{a.message}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{relativeDay(a.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <CardHeader className="p-0">
              <h3 className="text-[17px] font-semibold tracking-tight">Quick Actions</h3>
            </CardHeader>
            <CardContent className="mt-3 grid grid-cols-1 gap-2 p-0">
              <Button
                variant="secondary"
                className="justify-start bg-accent text-accent-foreground hover:bg-accent/70"
                render={
                  <Link href="/vault">
                    <ArrowUp className="size-4" />
                    Add to Vault
                  </Link>
                }
              />
              <Button
                variant="secondary"
                className="justify-start bg-accent text-accent-foreground hover:bg-accent/70"
                render={
                  <Link href="/goals">
                    <Target className="size-4" />
                    New Goal
                  </Link>
                }
              />
              <Button
                variant="secondary"
                className="justify-start bg-accent text-accent-foreground hover:bg-accent/70"
                render={
                  <Link href="/split">
                    <ArrowDown className="size-4" />
                    Split an Expense
                  </Link>
                }
              />
              <Button
                variant="secondary"
                className="justify-start bg-accent text-accent-foreground hover:bg-accent/70"
                render={
                  <Link href={`/quick-add?type=item`}>
                    <Package className="size-4" />
                    Add Item
                  </Link>
                }
              />
            </CardContent>
          </Card>

          {data.recentItems.length === 0 && (
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Nothing added yet.</p>
              <Link href="/recent" className="mt-2 inline-block text-xs font-medium">
                View all activity
              </Link>
            </Card>
          )}
        </div>
      </div>

      {activeGoals.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[17px] font-semibold tracking-tight">Goals</h3>
            <Link href="/goals" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((g) => (
              <Card key={g.goal.id} className="bg-muted/40 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg">{g.goal.icon}</span>
                  <p className="min-w-0 truncate font-semibold">{g.goal.name}</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-card">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.progressPct}%` }} />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-lg">{inr(g.currentAmount)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {g.progressPct}% · {inr(g.goal.target_amount)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data.totals.rooms} room{data.totals.rooms === 1 ? "" : "s"}, {data.totals.items} item{data.totals.items === 1 ? "" : "s"} catalogued.
            {data.totals.noPhoto > 0 &&
              ` ${data.totals.noPhoto} thing${data.totals.noPhoto === 1 ? "" : "s"} need${data.totals.noPhoto === 1 ? "s" : ""} a photo.`}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs text-muted-foreground md:inline-flex">
          <span className="size-1.5 rounded-full bg-foreground" />
          Synced just now
        </span>
      </div>
    </div>
  );
}
