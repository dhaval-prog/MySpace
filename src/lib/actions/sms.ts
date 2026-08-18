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
