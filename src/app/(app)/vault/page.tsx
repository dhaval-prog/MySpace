import { createClient } from "@/lib/supabase/server";
import { getVaultSummary } from "@/lib/vault/ledger";
import { getRecurringPlan } from "@/lib/vault/recurring";
import { displayName } from "@/lib/utils";
import { listMyHouseholds } from "@/lib/actions/household";
import { listGoals } from "@/lib/actions/household-goals";
import { PersonalPiggyPage } from "@/components/vault/personal-piggy-page";

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, summary, plan, memberships] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getVaultSummary(supabase, user.id),
    getRecurringPlan(supabase, user.id),
    listMyHouseholds(),
  ]);

  const primaryHousehold = memberships[0];
  const goals = primaryHousehold ? await listGoals(primaryHousehold.household.id, { status: "active" }) : [];

  return (
    <PersonalPiggyPage
      memberName={displayName(profile)}
      initialBalance={summary.balance}
      initialTransactions={summary.transactions}
      initialPlan={plan}
      goals={goals}
    />
  );
}
