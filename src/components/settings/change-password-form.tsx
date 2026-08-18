"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type AuthState } from "@/lib/actions/auth";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-password">New password</Label>
        <Input id="settings-password" name="password" type="password" required autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="settings-confirm-password">Confirm new password</Label>
        <Input id="settings-confirm-password" name="confirmPassword" type="password" required autoComplete="new-password" />
      </div>
      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
