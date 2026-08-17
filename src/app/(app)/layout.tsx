import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Header } from "@/components/nav/header";
import { Toaster } from "@/components/ui/sonner";
import { listMyHouseholds, listHouseholdMembersLite } from "@/lib/actions/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Independent reads — run together instead of one after another. Every
  // authenticated page renders through this layout, so trimming a
  // sequential chain to a single round trip here matters on every navigation.
  const [{ data: profile }, { data: homes }, memberships] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase.from("homes").select("id, name").order("created_at", { ascending: true }).limit(1),
    listMyHouseholds(),
  ]);

  const primaryHousehold = memberships[0];
  const sidebarMembers = primaryHousehold ? await listHouseholdMembersLite(primaryHousehold.household.id) : [];

  const name = profile?.name || user.email?.split("@")[0] || "there";

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar homeName={homes?.[0]?.name} members={sidebarMembers} />
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <Header name={name} email={user.email ?? ""} />
        <main className="flex-1 pb-28 md:pb-8">{children}</main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
