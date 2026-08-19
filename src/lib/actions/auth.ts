"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { joinHousehold } from "@/lib/actions/household";

export interface AuthState {
  error?: string;
  success?: string;
}

/** Pulls the invite token out of a `redirectTo` like "/join?token=...", the
 * shape middleware hands back after bouncing an unauthenticated visitor off
 * a shared invite link. Anything else (no token, or not a /join path) is
 * not something a guest sign-in should try to redeem. */
function extractJoinToken(redirectTo: string): string | null {
  if (!redirectTo.startsWith("/join")) return null;
  const query = redirectTo.split("?")[1] ?? "";
  return new URLSearchParams(query).get("token");
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/home");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo || "/home");
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password) {
    return { error: "Please fill in every field." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      success: "Account created! Check your email to confirm your address before signing in.",
    };
  }

  redirect("/home");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Please enter your email." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirectTo=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your inbox for a password reset link." };
}

export async function updatePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/home");
}

/**
 * A guest reaching the app off a shared Let's Split invite link — no email
 * or password, just a name and phone number. Backed by Supabase's real
 * anonymous auth (a genuine auth.users row with is_anonymous=true), so
 * every existing RLS policy and user_id foreign key works unchanged; the
 * app's own middleware/nav are what confine this user to Split (see
 * updateSession and Sidebar/BottomNav's isGuest handling) — this action
 * doesn't grant any elevated access itself.
 */
export async function signInAsGuest(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!name) return { error: "Please enter your name." };
  if (!phone) return { error: "Please enter your phone number." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { name } } });
  if (error || !data.user) {
    return { error: error?.message ?? "Couldn't continue as a guest. Please try again." };
  }

  await supabase.from("profiles").update({ phone }).eq("id", data.user.id);

  const token = extractJoinToken(redirectTo);
  if (token) {
    const result = await joinHousehold(token);
    if (!("error" in result)) redirect(`/split?id=${result.householdId}`);
  }

  redirect("/split");
}

/**
 * Permanently deletes the signed-in user's auth account — RLS's `on delete
 * cascade` chains (auth.users -> profiles/homes/households/... and onward)
 * take care of erasing every row they own or belong to; this only needs to
 * delete the one auth.users row. Requires SUPABASE_SERVICE_ROLE_KEY (already
 * used by the recurring-deposit cron job) — surfaces a clear error instead
 * of crashing if that isn't configured on this deployment yet.
 */
export async function deleteMyAccount(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: "Account deletion isn't set up on this deployment yet — ask the site owner to add a SUPABASE_SERVICE_ROLE_KEY environment variable.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  // Best-effort — the account (and its refresh token) is already gone
  // server-side at this point, so this can only ever clear local cookies.
  await supabase.auth.signOut().catch(() => {});
  return { ok: true };
}
