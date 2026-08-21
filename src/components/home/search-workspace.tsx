"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search as SearchIcon, Navigation, Mic, ChevronLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/layout/list-row";
import { RoundIconButton } from "@/components/layout/page-band";
import { getIcon } from "@/lib/icon-map";
import { categoryIcon } from "@/lib/constants";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { searchItems, type SearchResult } from "@/lib/actions/search";

const RECENT_KEY = "myspace.recent-searches";

function loadRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const existing = loadRecent().filter((q) => q.toLowerCase() !== query.toLowerCase());
    sessionStorage.setItem(RECENT_KEY, JSON.stringify([query, ...existing].slice(0, 5)));
  } catch {
    // sessionStorage unavailable — recent list just won't persist.
  }
}

/** A count badge in a light-green pill, e.g. "Results <3>" / "Also matched <2>" — the same accent pair used for pale-green badges everywhere else in the app. */
function CountPill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{children}</span>;
}

/**
 * The Search page's workspace — one component, two renderings. `variant="mobile"`
 * embeds the search input directly into the gradient band (back/title/profile
 * row + input, replacing the standalone MobileBand for this page) so the input
 * reads as part of the header, per the mockup. `variant="desktop"` (the
 * default) keeps the input in its own white card, as the desktop layout
 * already had it. Each breakpoint gets its own instance (see search/page.tsx),
 * matching how the rest of the app splits mobile/desktop rendering via CSS
 * rather than JS.
 */
export function SearchWorkspace({
  homeId,
  totalItems,
  variant = "desktop",
}: {
  homeId: string;
  totalItems: number;
  variant?: "mobile" | "desktop";
}) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadRecent()));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();
  const debouncedQuery = useDebouncedValue(query, 250);
  const requestIdRef = useRef(0);
  const voice = useSpeechRecognition();

  const q = debouncedQuery.trim();

  useEffect(() => {
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const found = await searchItems(homeId, q);
      // Drop stale responses — a slower earlier request resolving after a
      // faster later one would otherwise flash outdated results back in.
      if (requestId === requestIdRef.current) setResults(found);
    });
  }, [q, homeId]);

  const best = results[0] ?? null;
  const also = results.slice(1);

  function commitSearch(value: string) {
    if (!value.trim()) return;
    saveRecent(value.trim());
    setRecent(loadRecent());
  }

  const canVoiceSearch = useMemo(() => voice.isSupported, [voice.isSupported]);

  const inputBar = (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => commitSearch(query)}
        onKeyDown={(e) => e.key === "Enter" && commitSearch(query)}
        placeholder="Search your items…"
        className={cn(
          "w-full rounded-2xl py-3.5 pr-11 pl-11 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
          variant === "mobile" ? "bg-white/80 backdrop-blur-sm" : "bg-muted"
        )}
        autoFocus
      />
      {canVoiceSearch && (
        <button
          type="button"
          aria-label={voice.isListening ? "Stop voice search" : "Search by voice"}
          onClick={() =>
            voice.isListening
              ? voice.stop()
              : voice.start((transcript) => {
                  setQuery(transcript);
                  commitSearch(transcript);
                })
          }
          className={cn(
            "absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
            voice.isListening ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
          )}
        >
          <Mic className={cn("size-4", voice.isListening && "animate-pulse")} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {variant === "mobile" ? (
        <div
          className="rounded-b-[30px] px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-5"
          style={{ backgroundImage: "var(--band-gradient)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <RoundIconButton href="/home" ariaLabel="Back">
              <ChevronLeft className="size-5" />
            </RoundIconButton>
            <p className="font-mono text-xs font-medium tracking-[0.18em] text-foreground uppercase">Search</p>
            <RoundIconButton href="/settings" ariaLabel="Profile">
              <User className="size-4.5" />
            </RoundIconButton>
          </div>
          <div className="mt-5">{inputBar}</div>
          {voice.error && <p className="mt-2 text-xs text-foreground/80">Couldn&apos;t hear that — try typing instead.</p>}
        </div>
      ) : (
        <Card className="p-5">
          {inputBar}
          {voice.error && <p className="mt-2 text-xs text-destructive">Couldn&apos;t hear that — try typing instead.</p>}
        </Card>
      )}

      <div className={cn("space-y-4", variant === "mobile" && "px-4")}>
        {!q ? (
          <Card className="p-5">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Recent</p>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Say it or type it — search {totalItems} items across your home.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {recent.map((r) => (
                  <button key={r} type="button" onClick={() => setQuery(r)} className="flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-left text-sm font-medium hover:bg-muted/70">
                    <SearchIcon className="size-4 text-muted-foreground" />
                    {r}
                  </button>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="flex items-center gap-1.5 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Results
                <CountPill>{pending ? "…" : results.length}</CountPill>
              </p>
              <p className="text-xs text-muted-foreground">{totalItems} items searched</p>
            </div>

            {best ? (
              <Card className="p-5">
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Best match</p>
                <p className="mt-1 font-heading text-xl">{best.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{best.roomName}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{best.furnitureName}</span>
                  {best.container && (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{best.container}</span>
                  )}
                  {best.expiryLabel && <Badge variant={best.expiryLevel === "expired" ? "destructive" : "outline"}>{best.expiryLabel}</Badge>}
                </div>
                <Button className="mt-4 w-full rounded-2xl" render={<Link href={`/items/${best.id}`} />}>
                  <Navigation className="size-4" />
                  Take me there
                </Button>
              </Card>
            ) : !pending ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No items match &ldquo;{q}&rdquo;.</p>
              </Card>
            ) : null}

            {also.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 px-1 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Also matched
                  <CountPill>{also.length}</CountPill>
                </p>
                <div className="mt-2 space-y-2">
                  {also.map((item) => {
                    const ItemIcon = getIcon(categoryIcon(item.category));
                    return (
                      <ListRow
                        key={item.id}
                        href={`/items/${item.id}`}
                        icon={<ItemIcon className="size-4.5" />}
                        title={item.name}
                        subtitle={`${item.roomName} → ${item.furnitureName}`}
                        trailing={item.expiryLabel ? <Badge variant={item.expiryLevel === "expired" ? "destructive" : "outline"}>{item.expiryLabel}</Badge> : undefined}
                        chevron={!item.expiryLabel}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
