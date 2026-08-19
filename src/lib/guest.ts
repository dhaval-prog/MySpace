/** How long a guest's access lasts from their phone's first-ever guest sign-in (guest_phone_registry.first_seen_at) — shared by signInAsGuest (the login gate), the (app) layout (catches an already-signed-in guest who never logs out), and split.ts (flags an expired guest's still-outstanding expenses). */
export const GUEST_ACCESS_MS = 7 * 24 * 60 * 60 * 1000;

export function isPastGuestAccessWindow(firstSeenAt: string): boolean {
  return Date.now() - new Date(firstSeenAt).getTime() > GUEST_ACCESS_MS;
}
