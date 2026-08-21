import Link from "next/link";
import { cn, initials, memberAccentClass } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SplitGroupSummary } from "@/lib/actions/split";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const PEEK_TINTS = ["bg-blush-tint", "bg-sky/40", "bg-accent"];

/** Rounded, clamped 0-100 — every %-of-total figure on the wallet card goes through this so a group with no spend yet reads as fully settled rather than NaN%. */
function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export interface WalletCardData {
  group: SplitGroupSummary;
  /** Money still owed by anyone to anyone in this group — viewer-independent for the active group (from getSimplifiedBalances), a viewer-scoped stand-in for peeked ones. */
  pendingAmount: number;
  /** Every confirmed settlement ever recorded in this group (SplitSummary.settledAmount) — paired with pendingAmount for a "% settled" that's about the settlement ledger, not just what's left of totalSpent. */
  settledAmount: number;
}

function settledPctOf(card: WalletCardData): number {
  return pct(card.settledAmount, card.settledAmount + card.pendingAmount);
}

/**
 * The "every active split is a card in a stack" pattern the Let's Split
 * mockup introduced — one fully-detailed front card (the active group,
 * also driving the Split Detail pane beside/below it) with the next couple
 * of groups peeking out from behind as thin colored slivers. Tapping a
 * sliver (or a row in the flat list underneath, for groups too far back to
 * peek) switches the active group via the same ?group= param the rest of
 * the page already reads.
 */
export function SplitWalletStack({
  householdId,
  cards,
  activeGroupId,
}: {
  householdId: string;
  cards: WalletCardData[];
  activeGroupId: string;
}) {
  const activeIndex = Math.max(0, cards.findIndex((c) => c.group.id === activeGroupId));
  const front = cards[activeIndex];
  const peeked = [cards[(activeIndex + 1) % cards.length], cards[(activeIndex + 2) % cards.length]].filter(
    (c, i, arr) => c && c.group.id !== front.group.id && arr.findIndex((x) => x.group.id === c.group.id) === i
  );

  if (!front) return null;

  const settledPct = settledPctOf(front);

  return (
    <div className="relative">
      {/* Peek cards — just enough of a sliver (bottom edge + its own progress bar) to say "there's more here". Rendered first so they sit behind the front card in paint order. */}
      {peeked.map((card, i) => (
        <Link
          key={card.group.id}
          href={`/split?id=${householdId}&group=${card.group.id}`}
          aria-label={`Switch to ${card.group.name}`}
          className={cn(
            "absolute inset-x-3 bottom-0 flex h-10 flex-col justify-end rounded-b-[26px] px-5 pb-2.5",
            PEEK_TINTS[i % PEEK_TINTS.length]
          )}
          style={{ transform: `translateY(${(i + 1) * 14}px) scale(${1 - (i + 1) * 0.04})`, zIndex: 10 - i }}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/50">
            <div className="h-full rounded-full bg-foreground/25" style={{ width: `${settledPctOf(card)}%` }} />
          </div>
        </Link>
      ))}

      <Card className="relative z-20 p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg">{front.group.icon}</span>
          <Badge variant={front.pendingAmount > 0.5 ? "outline" : "secondary"}>{front.pendingAmount > 0.5 ? "Pending" : "Settled"}</Badge>
        </div>
        <p className="mt-3 font-heading text-lg leading-tight text-foreground">{front.group.name}</p>
        <p className="mt-1 font-heading text-3xl text-foreground">{inr(front.group.totalSpent)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {front.group.createdByName} paid · {inr(front.pendingAmount)} pending
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {front.group.memberPreview.slice(0, 4).map((m, i) => (
                <span
                  key={m.userId}
                  className={cn("flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-card", memberAccentClass(i))}
                >
                  {initials(m.name)}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">{front.group.memberCount} people</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">{settledPct}% settled</span>
        </div>

        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${settledPct}%` }} />
        </div>
      </Card>
    </div>
  );
}

/** The plain roster below the stack (desktop mockup) — every group, not just the ones near enough to peek, each a one-line row you can jump to. */
export function SplitWalletList({ householdId, cards, activeGroupId }: { householdId: string; cards: WalletCardData[]; activeGroupId: string }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border">
      {cards.map((card) => {
        const settledPct = settledPctOf(card);
        const active = card.group.id === activeGroupId;
        return (
          <Link
            key={card.group.id}
            href={`/split?id=${householdId}&group=${card.group.id}`}
            className={cn("flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50", active && "bg-muted/60")}
          >
            <span className="min-w-0 flex-1 truncate font-medium">{card.group.name}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{settledPct}%</span>
            <span className="shrink-0 font-medium">{inr(card.group.totalSpent)}</span>
          </Link>
        );
      })}
    </div>
  );
}
