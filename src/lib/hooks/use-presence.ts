"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceEntry {
  channel: RealtimeChannel;
  refCount: number;
  online: Set<string>;
  listeners: Set<(online: Set<string>) => void>;
}

// Module-level, keyed by householdId — shared across every component that
// mounts this hook for the same household, not one channel per caller.
const registry = new Map<string, PresenceEntry>();

function notify(entry: PresenceEntry) {
  for (const listener of entry.listeners) listener(entry.online);
}

/**
 * Which of a household's members currently have a live connection open —
 * backed by a Supabase Realtime Presence channel scoped to this household
 * (`presence:household:{householdId}`), joined for as long as at least one
 * caller stays mounted. "Online" means "has this channel open right now" —
 * Supabase clears a client's presence within seconds of the tab closing or
 * losing connectivity, no polling or last-seen timestamps involved.
 *
 * Reference-counted and shared per household: multiple components can call
 * this for the same household at once now (e.g. every goal card's member
 * manager on the Goals page keeps its own instance mounted even while
 * collapsed) — Supabase's realtime client throws ("cannot add `presence`
 * callbacks ... after `subscribe()`") if a second `.channel()` call for an
 * already-subscribed topic tries to add its own listeners, since
 * `createClient()` is a singleton and channels are deduplicated by topic.
 * One real subscription per household is created lazily on first mount and
 * torn down once the last caller unmounts.
 */
export function useHouseholdPresence(householdId: string, currentUserId: string): Set<string> {
  const [online, setOnline] = useState<Set<string>>(() => registry.get(householdId)?.online ?? new Set());

  useEffect(() => {
    if (!householdId || !currentUserId) return;

    let entry = registry.get(householdId);
    if (!entry) {
      const supabase = createClient();
      const channel = supabase.channel(`presence:household:${householdId}`, {
        config: { presence: { key: currentUserId } },
      });
      const newEntry: PresenceEntry = { channel, refCount: 0, online: new Set(), listeners: new Set() };
      registry.set(householdId, newEntry);
      entry = newEntry;

      channel
        .on("presence", { event: "sync" }, () => {
          newEntry.online = new Set(Object.keys(channel.presenceState()));
          notify(newEntry);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel.track({ online_at: new Date().toISOString() });
          }
        });
    }

    entry.refCount += 1;
    entry.listeners.add(setOnline);
    // Syncing from the shared registry (an external store other mounted
    // callers may have already updated before this instance joined), not
    // state this component owns — the usual reason to avoid this is moot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(entry.online);

    return () => {
      const current = registry.get(householdId);
      if (!current) return;
      current.listeners.delete(setOnline);
      current.refCount -= 1;
      if (current.refCount <= 0) {
        registry.delete(householdId);
        createClient().removeChannel(current.channel);
      }
    };
  }, [householdId, currentUserId]);

  return online;
}
