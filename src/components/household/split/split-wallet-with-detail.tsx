"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SplitWalletStack, type WalletCardData } from "@/components/household/split/split-wallet-stack";

/**
 * Pairs the wallet stack with its Split Detail panel so tapping the front
 * card expands/collapses the panel right there — no navigation to a
 * separate screen. `detail` is server-rendered content (the existing
 * SplitDetailCard, already wired to the active group); this client wrapper
 * only toggles whether it's shown, via the app's usual 0fr/1fr grid-rows
 * expand.
 */
export function SplitWalletWithDetail({
  householdId,
  cards,
  activeGroupId,
  detail,
}: {
  householdId: string;
  cards: WalletCardData[];
  activeGroupId: string;
  detail: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Switching to a different group (drag, peek tap, list row) shows that
    // group's own detail collapsed by default, same as landing on it fresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [activeGroupId]);

  return (
    <>
      <SplitWalletStack householdId={householdId} cards={cards} activeGroupId={activeGroupId} onToggleDetail={() => setOpen((v) => !v)} />
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden pt-4">{detail}</div>
      </div>
    </>
  );
}
