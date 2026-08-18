import Link from "next/link";
import { redirect } from "next/navigation";
import { joinHousehold } from "@/lib/actions/household";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

/** Landing page for a shared invite link (/join?token=...) — middleware already guarantees the visitor is signed in by the time they get here (see redirectTo handling), so this just redeems the token and sends them straight into Let's Split. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Key"
          title="No invite link here"
          description="This link is missing its invite code. Ask whoever shared it with you to send it again."
          action={
            <Button render={<Link href="/home">Go home</Link>} />
          }
        />
      </div>
    );
  }

  const result = await joinHousehold(token.trim());

  if ("error" in result) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <EmptyState
          icon="Key"
          title="Couldn't join"
          description={result.error}
          action={
            <Button render={<Link href="/home">Go home</Link>} />
          }
        />
      </div>
    );
  }

  redirect(`/split?id=${result.householdId}`);
}
