import { createClient } from "@/lib/supabase/server";
import { getVaultSummary } from "@/lib/vault/ledger";
import { getRecurringPlan } from "@/lib/vault/recurring";
import { listMyHouseholds } from "@/lib/actions/household";
import { getHouseholdSummary } from "@/lib/actions/household-dashboard";
import { displayName } from "@/lib/utils";
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

  const primary = memberships[0];
  const householdSummary = primary ? await getHouseholdSummary(primary.household.id) : null;

  return (
    <PersonalPiggyPage
      memberName={displayName(profile)}
      initialBalance={summary.balance}
      initialTransactions={summary.transactions}
      initialPlan={plan}
      householdTieIn={
        primary && householdSummary
          ? { householdId: primary.household.id, householdName: primary.household.name, totalSharedSavings: householdSummary.totalSharedSavings }
          : null
      }
    />
  );
}
