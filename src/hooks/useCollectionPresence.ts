"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { colorFromUserId } from "@/lib/data/presence-colors";

export interface PresencePeer {
  userId: string;
  displayName: string;
  selectedOwnedCardId: string | null;
  color: string;
}

interface PresencePayload {
  displayName: string;
  selectedOwnedCardId: string | null;
  color: string;
}

export function useCollectionPresence(
  collectionId: string | null,
  displayName: string,
  selectedOwnedCardId: string | null,
  enabled: boolean
) {
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, [enabled]);

  const myColor = useMemo(
    () => (userId ? colorFromUserId(userId) : "#3b82f6"),
    [userId]
  );

  useEffect(() => {
    if (!enabled || !collectionId || !userId || !isSupabaseConfigured()) {
      setPeers([]);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`presence:collection:${collectionId}`, {
      config: { presence: { key: userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresencePayload>();
      const list: PresencePeer[] = [];
      for (const [key, presences] of Object.entries(state)) {
        if (key === userId) continue;
        const p = presences[0];
        if (p) {
          list.push({
            userId: key,
            displayName: p.displayName,
            selectedOwnedCardId: p.selectedOwnedCardId,
            color: p.color,
          });
        }
      }
      setPeers(list);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          displayName,
          selectedOwnedCardId,
          color: myColor,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, collectionId, userId, displayName, myColor, selectedOwnedCardId]);

  const peerByCardId = useMemo(() => {
    const map = new Map<string, PresencePeer>();
    for (const peer of peers) {
      if (peer.selectedOwnedCardId) {
        map.set(peer.selectedOwnedCardId, peer);
      }
    }
    return map;
  }, [peers]);

  return { peers, peerByCardId, myColor, userId };
}
