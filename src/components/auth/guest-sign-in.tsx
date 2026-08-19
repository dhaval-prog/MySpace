"use client";

import { useEffect, useRef, useState, useTransition, type ClipboardEvent, type KeyboardEvent } from "react";
import { UserRound, ShieldCheck, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPhoneOtp } from "@/lib/actions/sms";
import { completeGuestSignIn, type AuthState } from "@/lib/actions/auth";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_S = 30;

type Step = "form" | "otp";

function OtpDigitInputs({
  digits,
  onChange,
  onComplete,
  disabled,
  shakeToken,
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  disabled: boolean;
  /** Bumping this replays the shake animation — a boolean wouldn't retrigger on repeated failures. */
  shakeToken: number;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = value;
    onChange(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (value && next.every((d) => d)) onComplete(next.join(""));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    const lastIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[lastIndex]?.focus();
    if (pasted.length === OTP_LENGTH) onComplete(pasted);
  }

  return (
    <div key={shakeToken} className={cn("flex justify-center gap-2 sm:gap-2.5", shakeToken > 0 && "otp-shake")}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-10 rounded-xl border bg-card text-center text-lg font-semibold text-foreground outline-none transition-all duration-150 sm:h-14 sm:w-12",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            d ? "border-primary/60 bg-primary/5" : "border-input"
          )}
        />
      ))}
    </div>
  );
}

/**
 * "Continue as a guest" on the login page — a 2-step wizard (name+phone,
 * then a 6-digit code sent to that phone via MSG91) instead of a single
 * form, so a guest's phone number is actually verified before
 * completeGuestSignIn creates the account. Steps slide/fade past each other
 * horizontally (the outer open/close still uses the app's usual
 * grid-template-rows expand), matching the inline-panel motion language
 * used elsewhere (Personal Piggy's Add Money panel, goal cards, etc).
 */
export function GuestSignIn({ redirectTo }: { redirectTo: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const [shakeToken, setShakeToken] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function toggleOpen() {
    setOpen((v) => !v);
  }

  function requestCode() {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!phone.trim()) return setError("Please enter your phone number.");

    startTransition(async () => {
      const result = await sendPhoneOtp(phone);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setJustSent(true);
      setTimeout(() => setJustSent(false), 1600);
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_S);
    });
  }

  function verifyAndContinue(code: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("phone", phone);
      fd.set("otp", code);
      fd.set("redirectTo", redirectTo);
      const result: AuthState = await completeGuestSignIn({}, fd);
      if (result.error) {
        setError(result.error);
        setShakeToken((k) => k + 1);
      }
    });
  }

  function handleOtpComplete(code: string) {
    verifyAndContinue(code);
  }

  return (
    <div className="mt-4 border-t pt-4">
      <Button type="button" variant="outline" className="w-full" onClick={toggleOpen}>
        <UserRound className="size-4" />
        Continue as a guest
      </Button>

      {/* Outer open/close — same grid-template-rows trick used throughout
          the app (Add Money, goal cards, etc). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-4 grid overflow-hidden">
            {/* Step 1 — name + phone */}
            <div
              className={cn(
                "col-start-1 row-start-1 space-y-4 transition-all duration-300 ease-out motion-reduce:transition-none",
                step === "form" ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"
              )}
              aria-hidden={step !== "form"}
            >
              <p className="text-xs text-muted-foreground">
                Guest access only unlocks Let&apos;s Split for the group you were invited to — everything else stays
                locked until you create a real account.
              </p>
              <div className="space-y-2">
                <Label htmlFor="guest-name">Your name</Label>
                <Input
                  id="guest-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  autoComplete="name"
                  tabIndex={open && step === "form" ? 0 : -1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone number</Label>
                <Input
                  id="guest-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  tabIndex={open && step === "form" ? 0 : -1}
                />
              </div>
              {step === "form" && error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
              <Button type="button" className="w-full" disabled={pending} onClick={requestCode} tabIndex={open && step === "form" ? 0 : -1}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send verification code"
                )}
              </Button>
            </div>

            {/* Step 2 — OTP entry */}
            <div
              className={cn(
                "col-start-1 row-start-1 space-y-4 transition-all duration-300 ease-out motion-reduce:transition-none",
                step === "otp" ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
              )}
              aria-hidden={step !== "otp"}
            >
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                tabIndex={open && step === "otp" ? 0 : -1}
              >
                <ArrowLeft className="size-3.5" />
                Change phone number
              </button>

              <div className="text-center">
                <div
                  className={cn(
                    "mx-auto flex size-9 items-center justify-center rounded-full transition-colors duration-500",
                    justSent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {justSent ? <CheckCircle2 className="size-4.5" /> : <ShieldCheck className="size-4.5" />}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the {OTP_LENGTH}-digit code sent to <span className="font-medium text-foreground">{phone}</span>
                </p>
              </div>

              <OtpDigitInputs
                digits={otpDigits}
                onChange={setOtpDigits}
                onComplete={handleOtpComplete}
                disabled={pending || step !== "otp"}
                shakeToken={shakeToken}
              />

              {step === "otp" && error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{error}</p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={pending || otpDigits.some((d) => !d)}
                onClick={() => verifyAndContinue(otpDigits.join(""))}
                tabIndex={open && step === "otp" ? 0 : -1}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify & continue"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {resendCooldown > 0 ? (
                  <>Resend code in {resendCooldown}s</>
                ) : (
                  <button type="button" className="font-medium text-foreground hover:underline" onClick={requestCode} disabled={pending}>
                    Resend code
                  </button>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
