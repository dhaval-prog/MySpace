import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Utensils, Check } from "lucide-react";
import { getHouseholdContext } from "@/lib/actions/household";
import { getSplitGroupHouseholdId, listSplitGroups, getSplitSummary, getSimplifiedBalances } from "@/lib/actions/split";
import { SplitDetailShareButton } from "@/components/household/split/split-detail-share-button";
import { initials, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

/**
 * "SPLIT DETAIL" — the dedicated full-screen mockup for one split group,
 * reached by tapping (not dragging) the wallet stack's front card on
 * mobile. The inline SplitDetailCard on /split stays as the desktop/at-a-
 * glance view; this is its own screen with its own header and hero card,
 * matching the standalone spec rather than reusing the shared band styling.
 */
export default async function SplitDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;

  const householdId = await getSplitGroupHouseholdId(groupId);
  if (!householdId) notFound();

  const context = await getHouseholdContext(householdId);
  if (!context) notFound();
  const myUserId = context.members.find((m) => m.isMe)?.userId ?? "";

  const groups = await listSplitGroups(householdId);
  const group = groups.find((g) => g.id === groupId);
  if (!group) notFound();

  const [summary, simplifiedBalances] = await Promise.all([getSplitSummary(householdId, groupId), getSimplifiedBalances(householdId, groupId)]);

  const pendingAmount = simplifiedBalances.reduce((sum, t) => sum + t.amount, 0);
  const backHref = `/split?id=${householdId}&group=${groupId}`;

  if (!summary) {
    return (
      <div className="min-h-svh bg-[#F9FAF6]">
        <SplitDetailHeader backHref={backHref} groupName={group.name} sharePath={backHref} />
        <div className="p-4">
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">You haven&apos;t been added to this split group yet — ask its owner or creator to invite you.</p>
          </Card>
        </div>
      </div>
    );
  }

  const paidByYou = summary.recentExpenses.filter((e) => e.payerId === myUserId).reduce((sum, e) => sum + e.amount, 0);
  const settledPct = pct(summary.settledAmount, summary.settledAmount + pendingAmount);
  const otherMembers = summary.memberBalances;

  return (
    <div className="min-h-svh bg-[#F9FAF6] pb-8">
      <SplitDetailHeader backHref={backHref} groupName={group.name} sharePath={backHref} />

      <div className="mx-auto max-w-md space-y-5 px-4 pt-5">
        <div
          className="flex min-h-[240px] flex-col rounded-[24px] p-5"
          style={{ backgroundImage: "linear-gradient(180deg, #FFD6DD 0%, #FFF5F7 100%)" }}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/60">
            <Utensils className="size-5 text-[#1F2421]" />
          </div>
          <p className="mt-4 font-heading text-lg font-bold text-[#1F2421]">{group.name}</p>
          <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-[#767A78] uppercase">
            Created {formatDate(group.createdAt)} · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          </p>
          <p className="mt-auto pt-4 font-mono text-[34px] font-extrabold text-[#191C1A]">{inr(group.totalSpent)}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: inr(group.totalSpent), primary: true },
            { label: "Settled", value: inr(summary.settledAmount) },
            { label: "Pending", value: inr(pendingAmount) },
            { label: "You owe", value: inr(summary.youOwe) },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-2xl p-2.5 text-center", s.primary ? "bg-white" : "bg-[#E2EBD8]")}>
              <p className="font-mono text-[9.5px] font-bold tracking-wide text-[#2B312E] uppercase">{s.label}</p>
              <p className="mt-1 truncate font-mono text-sm font-bold text-[#191C1A]">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between px-1">
            <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#15281E] uppercase">Paid by you {inr(paidByYou)}</p>
            <p className="text-[11px] text-[#5C6B61]">{pendingAmount > 0.5 ? `${inr(pendingAmount)} pending` : "All settled"}</p>
          </div>

          {otherMembers.length === 0 ? (
            <p className="mt-3 px-1 text-sm text-muted-foreground">No one else has joined this split yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {otherMembers.map((m) => {
                const settled = Math.abs(m.netAmount) <= 0.5;
                return (
                  <div key={m.userId} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#1F2421] ring-1 ring-border">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[#1F2421]">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {settled ? "Settled up" : m.netAmount > 0 ? `Owes you ${inr(m.netAmount)}` : `You owe ${inr(-m.netAmount)}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
                        settled ? "bg-[#DCEDC8] text-[#304D22]" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {settled && <Check className="size-3" />}
                      {settled ? "Settled" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p className="font-mono font-medium tracking-[0.12em] uppercase">Settlement</p>
            <p>{settledPct}% of shares in</p>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E4E9DE]">
            <div className="h-full rounded-full bg-[#4C6A23]" style={{ width: `${settledPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitDetailHeader({ backHref, groupName, sharePath }: { backHref: string; groupName: string; sharePath: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-[#F9FAF6] px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
      <Link
        href={backHref}
        aria-label="Back"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EFF1EA] text-[#212529] transition-colors hover:bg-[#E4E7DD]"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <p className="font-sans text-[13px] font-semibold tracking-[0.12em] text-[#212529] uppercase">Split detail</p>
      <SplitDetailShareButton groupName={groupName} sharePath={sharePath} />
    </div>
  );
}
