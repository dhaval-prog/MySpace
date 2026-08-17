import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Header } from "@/components/nav/header";
import { Toaster } from "@/components/ui/sonner";
import { listMyHouseholds, getHouseholdContext } from "@/lib/actions/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: homes } = await supabase
    .from("homes")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);

  const memberships = await listMyHouseholds();
  const primaryHousehold = memberships[0];
  const householdContext = primaryHousehold ? await getHouseholdContext(primaryHousehold.household.id) : null;
  const sidebarMembers = householdContext?.members.map((m) => ({ userId: m.userId, name: m.name, role: m.role })) ?? [];

  const name = profile?.name || user.email?.split("@")[0] || "there";

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar homeName={homes?.[0]?.name} members={sidebarMembers} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header name={name} email={user.email ?? ""} />
        <main className="flex-1 pb-28 md:pb-8">{children}</main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
