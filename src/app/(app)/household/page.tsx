import { redirect } from "next/navigation";

/**
 * Goals and Let's Split are now separate top-level pages (see /goals and
 * /split) instead of tabs on one combined household dashboard. This route
 * stays only to keep old links/bookmarks working.
 */
export default async function HouseholdRedirectPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  redirect(id ? `/goals?id=${id}` : "/goals");
}
