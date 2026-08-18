"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Which of a household's members currently have a live connection open —
 * backed by a Supabase Realtime Presence channel scoped to this household
 * (`presence:household:{householdId}`), joined for as long as the calling
 * component stays mounted. "Online" means "has this channel open right
 * now" — Supabase clears a client's presence within seconds of the tab
 * closing or losing connectivity, no polling or last-seen timestamps
 * involved. Every component that mounts this hook for the same household
 * both broadcasts its own presence and observes everyone else's.
 */
export function useHouseholdPresence(householdId: string, currentUserId: string): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!householdId || !currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:household:${householdId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, currentUserId]);

  return online;
}
