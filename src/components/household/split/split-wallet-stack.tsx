"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SplitGroupSummary } from "@/lib/actions/split";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

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
/** Below this much total pointer movement, a completed press reads as a tap (open Split Detail) rather than an aborted drag. */
const TAP_SLOP = 8;

/** Rounded, clamped 0-100 — every %-of-total figure on the wallet card goes through this so a group with no spend yet reads as fully settled rather than NaN%. */
function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export interface WalletCardData {
  group: SplitGroupSummary;
  /** Money still owed by anyone to anyone in this group — viewer-independent, from getSimplifiedBalances() for the active group and getGroupTotals() for every other one. */
  pendingAmount: number;
  /** Every confirmed settlement ever recorded in this group (SplitSummary.settledAmount) — paired with pendingAmount for a "% settled" that's about the settlement ledger, not just what's left of totalSpent. */
  settledAmount: number;
  /** This group's Invite/Delete menu (SplitGroupActionsMenu), pre-rendered server-side since it needs per-group role/ownership checks — null when the viewer has neither permission for this group. */
  actions?: ReactNode;
}

function settledPctOf(card: WalletCardData): number {
  return pct(card.settledAmount, card.settledAmount + card.pendingAmount);
}

/** The front card's full content — shared by the live front card and the outgoing one still animating away mid-fling, so the fly-off keeps showing the group it actually belonged to instead of jumping to the next group's numbers. */
function WalletCardBody({ card, showActions }: { card: WalletCardData; showActions: boolean }) {
  const settledPct = settledPctOf(card);
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#DAEBE2] text-lg">{card.group.icon}</span>
        <div className="flex items-center gap-1">
          <Badge
            variant={card.pendingAmount > 0.5 ? "outline" : "secondary"}
            className={card.pendingAmount > 0.5 ? "bg-white font-mono text-[10px] font-bold tracking-wide text-[#111A14] uppercase" : undefined}
          >
            {card.pendingAmount > 0.5 ? "Pending" : "Settled"}
          </Badge>
          {showActions && card.actions && (
            // Stops the pointerdown here from also bubbling into the card's
            // own drag/tap handling — without this, opening the menu (or
            // tapping an item in it) also started a drag or toggled the
            // Split Detail panel open, since the card's handlers listen for
            // pointerdown anywhere within it.
            <div onPointerDown={(e) => e.stopPropagation()}>{card.actions}</div>
          )}
        </div>
      </div>
      <p className="mt-3 text-lg font-bold leading-tight text-[#13241B]">{card.group.name}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-[#111A14]">{inr(card.group.totalSpent)}</p>
      <p className="mt-1 text-[13px] text-[#4E6155]">
        {card.group.createdByName} paid · {inr(card.pendingAmount)} pending
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {card.group.memberPreview.slice(0, 4).map((m) => (
              <span key={m.userId} className="flex size-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#111A14] ring-2 ring-card">
                {initials(m.name)}
              </span>
            ))}
          </div>
          <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#45574D] uppercase">{card.group.memberCount} people</span>
        </div>
        <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#45574D] uppercase">{settledPct}% settled</span>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${settledPct}%` }} />
      </div>
    </>
  );
}

type DragState = { x: number; y: number; dragging: boolean; exitDir: "left" | "right" | null };
const IDLE_DRAG: DragState = { x: 0, y: 0, dragging: false, exitDir: null };
/** How long the outgoing card's fly-off / the tap "tip forward" acknowledgment plays before it's removed/reset — matches the transition durations below. */
const EXIT_MS = 260;

/**
 * The "every active split is a card in a stack" pattern the Let's Split
 * mockup introduced — one fully-detailed front card (the active group, also
 * driving the Split Detail panel below it) with the next couple of groups
 * stacked behind it, each its own full (if mostly-covered) card so the
 * bottom edge that peeks out actually reads as "there's a real card back
 * there" rather than a decorative sliver. Tapping a peeked card (or a row
 * in the flat list underneath, for groups too far back to peek) switches
 * the active group via the same ?group= param the rest of the page already
 * reads — and so does dragging/flicking the front card itself, which is
 * the primary gesture: drag left past a distance or velocity threshold and
 * it flings off to advance to the next group; drag right and it flings the
 * other way to go back to the previous one; drag short of that and it
 * snaps back. A press that barely moves at all is a tap rather than an
 * aborted drag — see onToggleDetail.
 */
export function SplitWalletStack({
  householdId,
  cards,
  activeGroupId,
  onToggleDetail,
  showCardActions = false,
}: {
  householdId: string;
  cards: WalletCardData[];
  activeGroupId: string;
  /** Tapping (not dragging) the front card calls this — left off on desktop, where the group's full detail already sits inline beside the stack. */
  onToggleDetail?: () => void;
  /** Show each card's own Invite/Delete menu (WalletCardData.actions) in its top-right corner — on for the mobile stack, off for desktop, which already carries that menu on the SplitDetailCard beside it. */
  showCardActions?: boolean;
}) {
  const router = useRouter();
  // Which group is shown as front — advanced the instant a fling is
  // confirmed, independent of `activeGroupId` (which only updates once that
  // navigation's round trip actually resolves). Without this split, the
  // card sat empty for however long the server took to respond; now the
  // next card's data (already in `cards`) appears immediately and the
  // navigation just catches the URL/rest-of-page up in the background.
  const [localFrontId, setLocalFrontId] = useState(activeGroupId);
  const [drag, setDrag] = useState<DragState>(IDLE_DRAG);
  // The card that was front when a fling was confirmed — kept around, frozen
  // to its own data, purely to animate away on top while the (already
  // updated) live front sits underneath at rest.
  const [outgoingCard, setOutgoingCard] = useState<WalletCardData | null>(null);
  // True while a tapped card is playing its brief "tip forward" acknowledgment
  // as the Split Detail panel opens/closes below it.
  const [opening, setOpening] = useState(false);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Mirrors the latest in-flight drag delta outside React state so
  // handlePointerUp can read it synchronously (tap-vs-drag needs the exact
  // released position, not whatever setDrag's updater queue settles to).
  const lastDeltaRef = useRef({ x: 0, y: 0 });
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only fires for a group change we didn't drive ourselves (a peek/list
    // click, browser back/forward) — our own fling already advanced
    // localFrontId instantly, so this just keeps everything in sync rather
    // than double-applying the change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalFrontId(activeGroupId);
    setDrag(IDLE_DRAG);
    setOutgoingCard(null);
    setOpening(false);
  }, [activeGroupId]);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  const activeIndex = Math.max(0, cards.findIndex((c) => c.group.id === localFrontId));
  const front = cards[activeIndex];

  if (!front) return null;

  // Computed only once `front` is known safe to read — cards[(activeIndex +
  // n) % cards.length] can otherwise dereference `front.group.id` on an
  // undefined `front` before the guard above runs, since array literals
  // evaluate eagerly.
  const peeked = [cards[(activeIndex + 1) % cards.length], cards[(activeIndex + 2) % cards.length]].filter(
    (c, i, arr) => c && c.group.id !== front.group.id && arr.findIndex((x) => x.group.id === c.group.id) === i
  );

  const nextGroupId = peeked[0]?.group.id;
  // Dragging right goes the other way around the stack — the previous
  // group, not shown as a peeked card (which only stack forward) but still
  // a valid fling target.
  const prevGroupId = cards.length > 1 ? cards[(activeIndex - 1 + cards.length) % cards.length].group.id : undefined;
  const canDrag = Boolean(nextGroupId || prevGroupId);

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    if (outgoingCard || opening) return;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    lastDeltaRef.current = { x: 0, y: 0 };
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
    const delta = { x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y };
    lastDeltaRef.current = delta;
    setDrag((d) => (d.dragging ? { ...d, ...delta } : d));
  }

  function handlePointerUp() {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;

    const { x, y } = lastDeltaRef.current;
    const elapsed = Math.max(1, Date.now() - start.t);
    const velocity = Math.abs(x) / elapsed;
    const pastThreshold = Math.abs(x) > FLING_DISTANCE || velocity > FLING_VELOCITY;

    if (!pastThreshold) {
      if (Math.hypot(x, y) < TAP_SLOP && onToggleDetail) {
        setOpening(true);
        exitTimeoutRef.current = setTimeout(() => setOpening(false), EXIT_MS);
        onToggleDetail();
      } else {
        setDrag((d) => (d.dragging ? IDLE_DRAG : d));
      }
      return;
    }

    // Dragging left advances to the next group; dragging right goes back to
    // the previous one. With only two groups this just alternates between
    // them either way.
    const exitDir = x >= 0 ? "right" : "left";
    const targetGroupId = exitDir === "left" ? nextGroupId : prevGroupId;
    if (!targetGroupId) {
      setDrag((d) => (d.dragging ? IDLE_DRAG : d));
      return;
    }

    // Fling confirmed. The logical front swaps immediately — the live card
    // underneath already shows the target group's real data — while this
    // outgoing card keeps animating away on top, still showing what it
    // actually was. It mounts at the in-progress drag position (unchanged
    // this tick) and only gets nudged to its off-screen target a couple of
    // frames later, once that mount has actually painted — updating the
    // target in the same tick it mounts would give the transition nothing
    // to animate from and it'd just snap off-screen instantly.
    setOutgoingCard(front);
    setLocalFrontId(targetGroupId);
    router.push(`/split?id=${householdId}&group=${targetGroupId}`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDrag({ x: exitDir === "right" ? 640 : -640, y, dragging: false, exitDir });
      });
    });
    exitTimeoutRef.current = setTimeout(() => setOutgoingCard(null), EXIT_MS + 60);
  }

  const rotation = Math.max(-5, Math.min(5, drag.x / 20));

  return (
    <div className="relative" style={{ perspective: "800px" }}>
      {/* Peek cards — each the group's own real card, the exact same size as the front one (no shrinking-perspective scale), just offset further down behind it. The front card covers all but the bottom edge, which is exactly what reads as "there's a real card stacked back there" rather than a decorative sliver. Rendered first so they sit behind the front card in paint order. */}
      {peeked.map((card, i) => (
        <Link
          key={card.group.id}
          href={`/split?id=${householdId}&group=${card.group.id}`}
          aria-label={`Switch to ${card.group.name}`}
          className={cn(
            "absolute inset-x-0 bottom-0 touch-none overflow-hidden rounded-[26px] p-5 select-none",
            CARD_THEMES[Math.max(0, cards.findIndex((c) => c.group.id === card.group.id)) % CARD_THEMES.length]
          )}
          style={{
            transform: `translateY(${(i + 1) * 56}px)`,
            opacity: i === 0 ? 1 : 0.85,
            transition: `transform 260ms ${SPRING_EASING}, opacity 260ms ${SPRING_EASING}`,
            zIndex: 10 - i,
          }}
        >
          <WalletCardBody card={card} showActions={showCardActions} />
        </Link>
      ))}

      {/* The live front card — always fully rendered and at rest with the current group's real data, even while an outgoing card is still animating away on top of it. */}
      <Card
        className={cn("relative z-20 touch-none p-5 select-none", CARD_THEMES[activeIndex % CARD_THEMES.length])}
        style={
          outgoingCard
            ? undefined
            : opening
              ? {
                  transform: "scale(0.97) rotateX(8deg)",
                  transformOrigin: "top center",
                  transition: `transform ${EXIT_MS}ms ${SPRING_EASING}`,
                }
              : {
                  transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`,
                  transition: drag.dragging ? "none" : `transform 260ms ${SPRING_EASING}`,
                  cursor: canDrag ? "grab" : onToggleDetail ? "pointer" : undefined,
                }
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <WalletCardBody card={front} showActions={showCardActions} />
      </Card>

      {/* An in-flight fling's old front, still visible on top while it flies away — frozen to the group it actually belonged to so its numbers don't jump ahead of the navigation underneath. */}
      {outgoingCard && (
        <Card
          className={cn(
            "pointer-events-none absolute inset-0 z-30 p-5 select-none",
            CARD_THEMES[Math.max(0, cards.findIndex((c) => c.group.id === outgoingCard.group.id)) % CARD_THEMES.length]
          )}
          style={{
            transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`,
            transition: `transform ${EXIT_MS}ms ${SPRING_EASING}`,
          }}
        >
          <WalletCardBody card={outgoingCard} showActions={showCardActions} />
        </Card>
      )}
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
