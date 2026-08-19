"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClientSafe } from "@/lib/supabase/admin";
import { isPastGuestAccessWindow } from "@/lib/guest";
import type { HouseholdRole } from "@/lib/supabase/types";

export interface AuthState {
  error?: string;
  success?: string;
  /** Set when signInAsGuest rejects a phone whose 7-day guest window has passed — GuestSignIn shows a "sign up to continue" dialog instead of the plain inline error for this case. */
  guestExpired?: boolean;
}

function normalizeGuestPhone(phone: string): string {
  return phone.replace(/\D/g, "");
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
 * or password, just a name and phone number (no OTP verification for now).
 * Backed by Supabase's real anonymous auth (a genuine auth.users row with
 * is_anonymous=true), so every existing RLS policy and user_id foreign key
 * works unchanged; the app's own middleware/nav are what confine this user
 * to Split (see updateSession and Sidebar/BottomNav's isGuest handling) —
 * this action doesn't grant any elevated access itself.
 *
 * Anonymous auth gives a brand-new auth.users row every time someone signs
 * in this way — there's no Supabase-native way to resume a specific
 * anonymous identity once its session is gone (e.g. after signing out). So
 * "the same guest" is tracked by phone number instead, in
 * guest_phone_registry (independent of any one anonymous user row): a
 * returning phone's prior household/split-group membership is carried
 * forward onto the new anonymous account, and the old one is deleted (its
 * now-redundant rows go with it via cascade) — same phone, continuous
 * access, even though the underlying user id changes each time. That
 * registry row's first_seen_at is also the 7-day guest-access clock; past
 * that, sign-in is refused with guestExpired so the UI can prompt signup.
 *
 * All of this — continuity and the 7-day limit alike — needs
 * SUPABASE_SERVICE_ROLE_KEY; without it, guest sign-in still works, just as
 * a plain one-off anonymous account with no cross-session memory or expiry.
 */
export async function signInAsGuest(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!name) return { error: "Please enter your name." };
  if (!phoneRaw) return { error: "Please enter your phone number." };

  const phone = normalizeGuestPhone(phoneRaw);
  if (phone.length < 10) return { error: "Enter a valid phone number." };

  const admin = createAdminClientSafe();

  let carriedHouseholds: { household_id: string; role: HouseholdRole }[] = [];
  let carriedGroups: { group_id: string }[] = [];
  let oldUserIds: string[] = [];

  if (admin) {
    const { data: registry } = await admin.from("guest_phone_registry").select("first_seen_at").eq("phone", phone).maybeSingle();
    if (registry) {
      if (isPastGuestAccessWindow(registry.first_seen_at)) {
        return { error: "Your 7-day guest access has ended.", guestExpired: true };
      }
    } else {
      await admin.from("guest_phone_registry").insert({ phone });
    }

    const { data: oldProfiles } = await admin.from("profiles").select("id").eq("phone", phone);
    oldUserIds = (oldProfiles ?? []).map((p) => p.id);
    if (oldUserIds.length > 0) {
      const [{ data: hm }, { data: sm }] = await Promise.all([
        admin.from("household_members").select("household_id, role").in("user_id", oldUserIds),
        admin.from("split_members").select("group_id").in("user_id", oldUserIds),
      ]);
      carriedHouseholds = hm ?? [];
      carriedGroups = sm ?? [];
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { name } } });
  if (error || !data.user) {
    return { error: error?.message ?? "Couldn't continue as a guest. Please try again." };
  }
  const newUserId = data.user.id;

  await supabase.from("profiles").update({ name, phone }).eq("id", newUserId);

  if (admin) {
    if (carriedHouseholds.length > 0) {
      await admin
        .from("household_members")
        .upsert(
          carriedHouseholds.map((h) => ({ household_id: h.household_id, user_id: newUserId, role: h.role })),
          { onConflict: "household_id,user_id", ignoreDuplicates: true }
        );
    }
    if (carriedGroups.length > 0) {
      await admin
        .from("split_members")
        .upsert(
          carriedGroups.map((g) => ({ group_id: g.group_id, user_id: newUserId })),
          { onConflict: "group_id,user_id", ignoreDuplicates: true }
        );
    }
    // Membership is now duplicated onto newUserId — deleting the old
    // identities (cascades to their now-redundant rows) keeps exactly one
    // live account per guest phone at a time.
    for (const oldId of oldUserIds) {
      await admin.auth.admin.deleteUser(oldId).catch(() => {});
    }
  }

  const token = extractJoinToken(redirectTo);
  if (token) {
    // Redeem on this same client instance rather than calling joinHousehold()
    // (which creates its own fresh server client) — a second client built
    // from next/headers cookies() isn't reliably seeing the anonymous
    // session signInAnonymously() just established a moment earlier in this
    // same action, so the RPC ran with no auth.uid() and silently failed.
    const { data: joinData, error: joinError } = await supabase.rpc("redeem_household_invite", { p_token: token.trim() });
    if (!joinError && joinData?.ok) redirect(`/split?id=${joinData.household_id}`);
  }

  if (carriedHouseholds.length > 0) {
    redirect(`/split?id=${carriedHouseholds[0].household_id}`);
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

  const admin = createAdminClientSafe();
  if (!admin) {
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
