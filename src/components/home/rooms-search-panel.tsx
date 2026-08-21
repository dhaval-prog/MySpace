"use client";

import { useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListRow } from "@/components/layout/list-row";
import { EmptyState } from "@/components/shared/empty-state";
import { AddRoomDialog } from "@/components/home/add-room-dialog";
import { SearchResultsPanel } from "@/components/home/search-workspace";
import { useHomeSearch } from "@/lib/hooks/use-home-search";
import { getCompactIcon } from "@/lib/icon-map";
import type { RoomFilter } from "@/lib/home-data";

/**
 * The "Search your home…" shortcut and the Rooms list share one slot on My
 * Home — focusing the search bar swaps the Rooms list out for live results
 * in place, instead of navigating to the dedicated Search page. Reuses the
 * exact same search state/results rendering as that page (useHomeSearch +
 * SearchResultsPanel) so the two never behave differently.
 */
export function RoomsSearchPanel({
  homeId,
  totalItems,
  rooms,
  mostUsedRoomId,
  mostUsedPct,
  variant,
}: {
  homeId: string;
  totalItems: number;
  rooms: RoomFilter[];
  mostUsedRoomId: string | null;
  mostUsedPct: number;
  variant: "mobile" | "desktop";
}) {
  const { query, setQuery, q, results, pending, recent, commitSearch, voice, canVoiceSearch } = useHomeSearch(homeId);
  const [focused, setFocused] = useState(false);
  const active = focused || query.trim().length > 0;

  function exitSearch() {
    setQuery("");
    setFocused(false);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            commitSearch(query);
            if (!query.trim()) setFocused(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && commitSearch(query)}
          placeholder="Search your home…"
          className="w-full rounded-2xl bg-white py-3 pr-11 pl-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        {active ? (
          <button
            type="button"
            aria-label="Cancel search"
            onClick={exitSearch}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-primary"
          >
            Cancel
          </button>
        ) : (
          canVoiceSearch && (
            <button
              type="button"
              aria-label="Search by voice"
              onClick={() =>
                voice.start((transcript) => {
                  setQuery(transcript);
                  setFocused(true);
                  commitSearch(transcript);
                })
              }
              className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <Mic className="size-4" />
            </button>
          )
        )}
      </div>

      {active ? (
        <SearchResultsPanel q={q} pending={pending} results={results} recent={recent} totalItems={totalItems} onPickRecent={setQuery} />
      ) : (
        <div>
          <div className={cn("flex items-center justify-between", variant === "mobile" && "px-1")}>
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {variant === "mobile" ? `Rooms ${rooms.length}` : "Rooms"}
            </p>
            <Link href="/items" className="text-sm font-medium text-primary">
              {variant === "mobile" ? "See all" : "Manage places"}
            </Link>
          </div>

          {rooms.length === 0 ? (
            <EmptyState
              icon="DoorOpen"
              title="No rooms yet"
              description="Add your first room to start mapping out this home."
              action={<AddRoomDialog homeId={homeId} />}
            />
          ) : (
            <div className="mt-2 space-y-2">
              {rooms.map((r) => {
                const RoomIcon = getCompactIcon(r.icon);
                const isMostUsed = r.id === mostUsedRoomId;
                return (
                  <ListRow
                    key={r.id}
                    href={`/home/rooms/${r.id}`}
                    icon={<RoomIcon className="size-4.5" />}
                    iconClassName={isMostUsed ? "bg-chart-2 text-foreground" : undefined}
                    title={r.name}
                    subtitle={`${r.itemCount} items · ${r.placeCount} places`}
                    trailing={
                      isMostUsed ? (
                        <span className="shrink-0 rounded-full bg-positive/10 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-positive uppercase">
                          Most used
                        </span>
                      ) : undefined
                    }
                    barPct={isMostUsed ? mostUsedPct : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
