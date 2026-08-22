"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SplitGroupSummary } from "@/lib/actions/split";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const PEEK_TINTS = ["bg-[#F3C5C8]", "bg-[#CCD9AA]", "bg-[#D5E7E2]"];
// Each group keeps the same theme every time it's the front card (picked by
// its stable position in `cards`, not by drag direction) — mirrors the
// Expenses budget cards' per-card CARD_THEMES rotation, just in the lighter
// pastel palette this card's dark-on-light text needs.
const CARD_THEMES = [
  "bg-[linear-gradient(135deg,#B7E4DC_0%,#E1EFEA_100%)]",
  "bg-[linear-gradient(135deg,#F3C5C8_0%,#FBEAE9_100%)]",
  "bg-[linear-gradient(135deg,#CCD9AA_0%,#EDF3E1_100%)]",
  "bg-[linear-gradient(135deg,#C9D8EE_0%,#EFF3FA_100%)]",
];
const SPRING_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const FLING_DISTANCE = 110;
const FLING_VELOCITY = 0.5; // px/ms

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

type DragState = { x: number; y: number; dragging: boolean; exitDir: "left" | "right" | null };
const IDLE_DRAG: DragState = { x: 0, y: 0, dragging: false, exitDir: null };

/**
 * The "every active split is a card in a stack" pattern the Let's Split
 * mockup introduced — one fully-detailed front card (the active group,
 * also driving the Split Detail pane beside/below it) with the next couple
 * of groups peeking out from behind as thin colored slivers. Tapping a
 * sliver (or a row in the flat list underneath, for groups too far back to
 * peek) switches the active group via the same ?group= param the rest of
 * the page already reads — and so does dragging/flicking the front card
 * itself, which is the primary gesture: drag past a distance or velocity
 * threshold and it flings off-screen (spring-eased) while the next card
 * scales/fades up to take its place; drag short of that and it snaps back.
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
  const router = useRouter();
  const activeIndex = Math.max(0, cards.findIndex((c) => c.group.id === activeGroupId));
  const front = cards[activeIndex];

  const [drag, setDrag] = useState<DragState>(IDLE_DRAG);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Guards against a fast repeat drag firing a second router.push before the
  // first fling's navigation has actually landed — cards/activeGroupId (and
  // so nextGroupId) don't update until that round trip resolves, so a second
  // drag in the meantime would just queue a redundant push at the same
  // target; letting the queue grow is what turned "drag repeatedly" into a
  // crash instead of a loop.
  const flingPendingRef = useRef(false);

  useEffect(() => {
    // A completed fling navigates to the next group, which re-renders this
    // component with fresh props — reset so the new front card doesn't
    // inherit the old one's leftover fling-out transform.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrag(IDLE_DRAG);
    flingPendingRef.current = false;
  }, [activeGroupId]);

  if (!front) return null;

  // Computed only once `front` is known safe to read — cards[(activeIndex +
  // n) % cards.length] can otherwise dereference `front.group.id` on an
  // undefined `front` before the guard above runs, since array literals
  // evaluate eagerly.
  const peeked = [cards[(activeIndex + 1) % cards.length], cards[(activeIndex + 2) % cards.length]].filter(
    (c, i, arr) => c && c.group.id !== front.group.id && arr.findIndex((x) => x.group.id === c.group.id) === i
  );

  const settledPct = settledPctOf(front);
  const nextGroupId = peeked[0]?.group.id;

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    if (!nextGroupId || flingPendingRef.current) return;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setDrag({ x: 0, y: 0, dragging: true, exitDir: null });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A stale/already-released pointer id on some mobile browsers — the
      // drag still works via the move/up handlers below without capture.
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!startRef.current) return;
    setDrag((d) => (d.dragging ? { ...d, x: e.clientX - startRef.current!.x, y: e.clientY - startRef.current!.y } : d));
  }

  function handlePointerUp() {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;

    setDrag((d) => {
      if (!d.dragging) return d;
      const elapsed = Math.max(1, Date.now() - start.t);
      const velocity = Math.abs(d.x) / elapsed;
      const pastThreshold = nextGroupId && (Math.abs(d.x) > FLING_DISTANCE || velocity > FLING_VELOCITY);
      if (!pastThreshold) return IDLE_DRAG;

      const exitDir = d.x >= 0 ? "right" : "left";
      if (nextGroupId) {
        flingPendingRef.current = true;
        setTimeout(() => router.push(`/split?id=${householdId}&group=${nextGroupId}`), 260);
      }
      return { x: exitDir === "right" ? 640 : -640, y: d.y, dragging: false, exitDir };
    });
  }

  const rotation = Math.max(-5, Math.min(5, drag.x / 20));

  return (
    <div className="relative">
      {/* Peek cards — just enough of a sliver (bottom edge + its own progress bar) to say "there's more here". Rendered first so they sit behind the front card in paint order. When the front card is flinging off, the next-up sliver scales/fades up toward the front position to take its place. */}
      {peeked.map((card, i) => {
        const becomingFront = drag.exitDir !== null && i === 0;
        return (
          <Link
            key={card.group.id}
            href={`/split?id=${householdId}&group=${card.group.id}`}
            aria-label={`Switch to ${card.group.name}`}
            className={cn("absolute inset-x-3 bottom-0 flex h-10 flex-col justify-end rounded-b-[26px] px-5 pb-2.5", PEEK_TINTS[i % PEEK_TINTS.length])}
            style={{
              transform: becomingFront ? "translateY(0px) scale(1)" : `translateY(${(i + 1) * 14}px) scale(${1 - (i + 1) * 0.04})`,
              opacity: becomingFront ? 1 : i === 0 ? 0.8 : undefined,
              transition: `transform 260ms ${SPRING_EASING}, opacity 260ms ${SPRING_EASING}`,
              zIndex: 10 - i,
            }}
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/50">
              <div className="h-full rounded-full bg-foreground/25" style={{ width: `${settledPctOf(card)}%` }} />
            </div>
          </Link>
        );
      })}

      <Card
        className={cn("relative z-20 touch-none p-5 select-none", CARD_THEMES[activeIndex % CARD_THEMES.length])}
        style={{
          transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`,
          transition: drag.dragging ? "none" : `transform 260ms ${SPRING_EASING}`,
          opacity: drag.exitDir ? 0.4 : 1,
          cursor: nextGroupId ? "grab" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#DAEBE2] text-lg">{front.group.icon}</span>
          <Badge
            variant={front.pendingAmount > 0.5 ? "outline" : "secondary"}
            className={front.pendingAmount > 0.5 ? "bg-white font-mono text-[10px] font-bold tracking-wide text-[#111A14] uppercase" : undefined}
          >
            {front.pendingAmount > 0.5 ? "Pending" : "Settled"}
          </Badge>
        </div>
        <p className="mt-3 text-lg font-bold leading-tight text-[#13241B]">{front.group.name}</p>
        <p className="mt-1 font-mono text-2xl font-bold text-[#111A14]">{inr(front.group.totalSpent)}</p>
        <p className="mt-1 text-[13px] text-[#4E6155]">
          {front.group.createdByName} paid · {inr(front.pendingAmount)} pending
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {front.group.memberPreview.slice(0, 4).map((m) => (
                <span
                  key={m.userId}
                  className="flex size-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#111A14] ring-2 ring-card"
                >
                  {initials(m.name)}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#45574D] uppercase">{front.group.memberCount} people</span>
          </div>
          <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#45574D] uppercase">{settledPct}% settled</span>
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
