import { createClient } from "@/lib/supabase/server";
import { getVaultSummary } from "@/lib/vault/ledger";
import { getRecurringPlan } from "@/lib/vault/recurring";
import { displayName } from "@/lib/utils";
import { PersonalPiggyPage } from "@/components/vault/personal-piggy-page";

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, summary, plan] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getVaultSummary(supabase, user.id),
    getRecurringPlan(supabase, user.id),
  ]);

  return (
    <PersonalPiggyPage
      memberName={displayName(profile)}
      initialBalance={summary.balance}
      initialTransactions={summary.transactions}
      initialPlan={plan}
    />
  );
}
