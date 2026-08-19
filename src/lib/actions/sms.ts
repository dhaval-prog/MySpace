"use server";

/**
 * Sends an invite link by SMS via MSG91 — the phone-number half of the
 * "Split Only Invite (share through phone number or email)" flow. Optional:
 * without MSG91_AUTH_KEY configured, callers should keep offering the sms:
 * deep-link fallback (opens the visitor's own Messages app) instead of this.
 *
 * Needs, as environment variables (never exposed to the browser — this file
 * only ever runs server-side):
 *   MSG91_AUTH_KEY    — from the MSG91 dashboard's API keys section.
 *   MSG91_SENDER_ID   — a 6-character DLT-registered sender ID (India
 *                        requires this + a DLT-approved template for
 *                        transactional SMS; an unregistered arbitrary
 *                        message may be silently dropped by the carrier
 *                        even if this call itself returns success).
 */
export async function sendInviteSms(phone: string, message: string): Promise<{ ok: true } | { error: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID;
  if (!authKey || !senderId) {
    return { error: "SMS sending isn't configured yet — add MSG91_AUTH_KEY and MSG91_SENDER_ID to the environment." };
  }

  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10) return { error: "Enter a valid phone number." };
  // Assume a 10-digit number is Indian and needs the country code prefixed;
  // anything already longer is left as-is (already has a country code).
  const to = digits.length === 10 ? `91${digits}` : digits;

  try {
    const res = await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: senderId,
        route: "4",
        country: "91",
        sms: [{ message, to: [to] }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("sms: MSG91 request failed —", res.status, body);
      return { error: "Failed to send the text message. Please try the link instead." };
    }

    return { ok: true };
  } catch (err) {
    console.error("sms: MSG91 request threw —", err instanceof Error ? err.message : err);
    return { error: "Failed to send the text message. Please try the link instead." };
  }
}

/** 10-digit Indian numbers get "91" prefixed; anything already longer is assumed to already carry a country code. Returns null for anything too short to be real. */
function normalizePhoneForMsg91(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * Sends a one-time code to a phone number via MSG91's dedicated OTP API
 * (distinct from sendInviteSms's plain-message API above) — backs the guest
 * sign-in flow's phone verification step.
 *
 * Needs, on top of MSG91_AUTH_KEY:
 *   MSG91_OTP_TEMPLATE_ID — an OTP template created (and DLT-registered, for
 *   Indian numbers) in the MSG91 dashboard under OTP → Templates. This is
 *   separate from the sender-id/template used by sendInviteSms.
 */
export async function sendPhoneOtp(phone: string): Promise<{ ok: true } | { error: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  if (!authKey || !templateId) {
    return { error: "Phone verification isn't set up on this deployment yet — add MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID." };
  }

  const mobile = normalizePhoneForMsg91(phone);
  if (!mobile) return { error: "Enter a valid phone number." };

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", templateId);
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("otp_length", "6");

    const res = await fetch(url.toString(), { method: "POST", headers: { authkey: authKey, Accept: "application/json" } });
    const body: { type?: string; message?: string } | null = await res.json().catch(() => null);
    if (!res.ok || body?.type === "error") {
      console.error("otp: MSG91 send failed —", res.status, body);
      return { error: body?.message ?? "Couldn't send the verification code. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("otp: MSG91 send threw —", err instanceof Error ? err.message : err);
    return { error: "Couldn't send the verification code. Please try again." };
  }
}

/** Verifies a code sent by sendPhoneOtp — MSG91 tracks the OTP itself (expiry, attempt limits), so there's nothing for this app to store between send and verify. */
export async function verifyPhoneOtp(phone: string, otp: string): Promise<{ ok: true } | { error: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { error: "Phone verification isn't set up on this deployment yet." };

  const mobile = normalizePhoneForMsg91(phone);
  if (!mobile) return { error: "Enter a valid phone number." };
  const code = otp.trim();
  if (!/^\d{4,8}$/.test(code)) return { error: "Enter the code you received." };

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp/verify");
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("otp", code);

    const res = await fetch(url.toString(), { method: "POST", headers: { authkey: authKey, Accept: "application/json" } });
    const body: { type?: string; message?: string } | null = await res.json().catch(() => null);
    if (!res.ok || body?.type !== "success") {
      return { error: body?.message ?? "That code didn't match — check it and try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("otp: MSG91 verify threw —", err instanceof Error ? err.message : err);
    return { error: "Couldn't verify the code. Please try again." };
  }
}
