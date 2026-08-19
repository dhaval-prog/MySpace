"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signInAsGuest, type AuthState } from "@/lib/actions/auth";

function GuestForm({ redirectTo }: { redirectTo: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInAsGuest, {});

  return (
    <div className="mt-4 border-t pt-4">
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen((v) => !v)}>
        <UserRound className="size-4" />
        Continue as a guest
      </Button>

      {/* Inline expand instead of a popup — same grid-template-rows trick used
          throughout the app (Add Money, goal cards, etc). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <p className="text-xs text-muted-foreground">
              Guest access only unlocks Let&apos;s Split for the group you were invited to — everything else stays
              locked until you create a real account.
            </p>
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your name</Label>
              <Input id="guest-name" name="name" placeholder="e.g. Priya Sharma" autoComplete="name" tabIndex={open ? 0 : -1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone number</Label>
              <Input id="guest-phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" tabIndex={open ? 0 : -1} />
            </div>
            {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending} tabIndex={open ? 0 : -1}>
              {pending ? "Continuing…" : "Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/home";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to find anything in your home.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="remember" name="remember" defaultChecked />
            <Label htmlFor="remember" className="font-normal text-muted-foreground">
              Remember me
            </Label>
          </div>
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </p>

        <GuestForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
