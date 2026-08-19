import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClientSafe } from "@/lib/supabase/admin";
import { isPastGuestAccessWindow } from "@/lib/guest";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Header } from "@/components/nav/header";
import { Toaster } from "@/components/ui/sonner";
import { listMyHouseholds, listHouseholdMembersLite } from "@/lib/actions/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Middleware already called auth.getUser() (a verified round trip to
  // Supabase's Auth server) for this exact request and redirected
  // unauthenticated visitors before this layout ever ran — every
  // authenticated page renders through here, so a second network round
  // trip on every single navigation is pure duplicated latency. Reading
  // the session from the request's cookies is a local, no-network check;
  // it isn't a security boundary (Postgres RLS enforces that independently
  // on every actual data query below), it's only used to pick a display
  // name and redirect-guard this shell.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) redirect("/login");

  // Independent reads — run together instead of one after another. Every
  // authenticated page renders through this layout, so trimming a
  // sequential chain to a single round trip here matters on every navigation.
  const [{ data: profile }, memberships] = await Promise.all([
    supabase.from("profiles").select("name, phone").eq("id", user.id).maybeSingle(),
    listMyHouseholds(),
  ]);

  const isGuest = Boolean(user.is_anonymous);

  // Covers the guest who just never logs out — signInAsGuest already refuses
  // a phone whose 7-day window has passed at the *login* step, but without
  // this, staying signed in past that point would just work forever.
  if (isGuest && profile?.phone) {
    const admin = createAdminClientSafe();
    if (admin) {
      const { data: registry } = await admin
        .from("guest_phone_registry")
        .select("first_seen_at")
        .eq("phone", profile.phone)
        .maybeSingle();
      if (registry && isPastGuestAccessWindow(registry.first_seen_at)) {
        await supabase.auth.signOut();
        redirect("/login?guestExpired=1");
      }
    }
  }

  const primaryHousehold = memberships[0];
  const sidebarMembers = primaryHousehold ? await listHouseholdMembersLite(primaryHousehold.household.id) : [];

  const name = profile?.name || user.email?.split("@")[0] || "there";

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <Sidebar members={sidebarMembers} isGuest={isGuest} />
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <Header name={name} email={user.email ?? ""} isGuest={isGuest} />
        <main className="flex-1 pb-28 md:pb-8">{children}</main>
      </div>
      <BottomNav isGuest={isGuest} />
      <Toaster />
    </div>
  );
}
