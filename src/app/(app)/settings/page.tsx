import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteHomeDialog } from "@/components/home/delete-home-dialog";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: home } = await supabase.from("homes").select("id, name").order("created_at", { ascending: true }).limit(1).maybeSingle();
  const roomCount = home ? (await supabase.from("rooms").select("id", { count: "exact", head: true }).eq("home_id", home.id)).count ?? 0 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">Account</p>
        <h1 className="font-heading text-4xl text-foreground md:text-5xl">Settings</h1>
      </div>

      <Card className="p-5">
        <CardHeader className="p-0">
          <CardTitle className="text-base">Your account</CardTitle>
          <CardDescription>Basic details for your My Space account.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 space-y-3 p-0">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Name</p>
            <p className="mt-1 text-sm font-medium">{profile?.name?.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Email</p>
            <p className="mt-1 text-sm font-medium">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-5">
        <CardHeader className="p-0">
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>Change the password you use to log in.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 p-0">
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {home && (
        <Card className="border-destructive/30 p-5">
          <CardHeader className="p-0">
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Deleting your home removes every room, place, and item inside it. You&apos;ll be able to set up a new home
              from scratch afterward.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <DeleteHomeDialog homeId={home.id} homeName={home.name} roomCount={roomCount} />
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30 p-5">
        <CardHeader className="p-0">
          <CardTitle className="text-base text-destructive">Delete account</CardTitle>
          <CardDescription>Permanently erase your My Space account and everything in it.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 p-0">
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
