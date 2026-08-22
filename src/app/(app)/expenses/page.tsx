import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";
import { listExpenseCategories, getExpenseStats } from "@/lib/actions/expenses";
import { listGoals } from "@/lib/actions/household-goals";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateHouseholdCta } from "@/components/household/create-household-cta";
import { JoinHouseholdCta } from "@/components/household/join-household-cta";
import { SpendingBudgetsBoard } from "@/components/household/expenses/spending-budgets-board";
import { CreateGoalDialog } from "@/components/household/create-goal-dialog";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const memberships = await listMyHouseholds();

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Wallet"
          title="Track where your money goes"
          description="Create a household to start logging expenses, organize them by category, and count them against a budget."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <CreateHouseholdCta redirectTo="/expenses" />
              <JoinHouseholdCta redirectTo="/expenses" />
            </div>
          }
        />
      </div>
    );
  }

  const householdId = id && memberships.some((m) => m.household.id === id) ? id : memberships[0].household.id;
  const context = await getHouseholdContext(householdId);
  if (!context) redirect(`/expenses?id=${memberships[0].household.id}`);

  if (context.myRole === "split_only") {
    redirect(`/split?id=${householdId}`);
  }

  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";
  const isOwner = context.myRole === "owner";

  const [categories, stats, goals] = await Promise.all([
    listExpenseCategories(householdId),
    getExpenseStats(householdId),
    listGoals(householdId, { status: "active" }),
  ]);
  const spendingGoals = goals.filter((g) => g.goal.goal_type === "spending");
  const totalBudgeted = spendingGoals.reduce((sum, g) => sum + g.goal.target_amount, 0);

  return (
    <div>
      <MobileBand
        title="Expenses"
        backHref="/home"
        right={
          <RoundIconButton ariaLabel="Settings">
            <Settings2 className="size-4.5" />
          </RoundIconButton>
        }
        stats={[
          { label: "Budgeted", value: inr(totalBudgeted) },
          { label: "Spent", value: inr(stats.totalThisMonth) },
        ]}
      />
      <DesktopBand
        breadcrumb="Expenses · Andheri Flat"
        title="Spending budgets"
        subtitle="Create and track budgets for different parts of your spending."
        action={
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.14em] text-foreground/70 uppercase">Budgeted · Spent</p>
              <p className="mt-0.5 font-heading text-lg text-foreground">
                {inr(totalBudgeted)} · {inr(stats.totalThisMonth)}
              </p>
            </div>
            <CreateGoalDialog householdId={householdId} defaultGoalType="spending" triggerLabel="Create spending budget" categories={categories} />
          </div>
        }
      />

      <MobileHeroOverlap className="space-y-4 pb-6">
        <Card className="p-5">
          <p className="font-heading text-xl leading-tight text-foreground">Spending budgets</p>
          <p className="mt-1 text-sm text-muted-foreground">Create and track budgets for different parts of your spending.</p>
        </Card>

        <SpendingBudgetsBoard householdId={householdId} spendingGoals={spendingGoals} categories={categories} isOwner={isOwner} currentUserId={myUserId} />
      </MobileHeroOverlap>

      <div className="hidden space-y-6 px-8 pb-8 md:block">
        <SpendingBudgetsBoard householdId={householdId} spendingGoals={spendingGoals} categories={categories} isOwner={isOwner} currentUserId={myUserId} />
      </div>
    </div>
  );
}
