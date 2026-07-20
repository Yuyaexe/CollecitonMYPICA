"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export type PresenceConnectionStatus = "off" | "connecting" | "live" | "error";

export function useCollectionPresence(
  collectionId: string | null,
  displayName: string,
  selectedOwnedCardId: string | null,
  enabled: boolean
) {
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<PresenceConnectionStatus>("off");
  const trackRef = useRef({ displayName, selectedOwnedCardId, color: "#3b82f6" });
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
    null
  );

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) {
      setUserId(null);
      return;
    }
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, [enabled]);

  const myColor = useMemo(
    () => (userId ? colorFromUserId(userId) : "#3b82f6"),
    [userId]
  );

  trackRef.current = {
    displayName,
    selectedOwnedCardId,
    color: myColor,
  };

  // Subscribe once per collection; do not recreate on selection changes.
  useEffect(() => {
    if (!enabled || !collectionId || !userId || !isSupabaseConfigured()) {
      setPeers([]);
      setStatus("off");
      return;
    }

    const supabase = createClient();
    setStatus("connecting");
    const channel = supabase.channel(`presence:collection:${collectionId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

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

    channel.subscribe(async (subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        setStatus("live");
        await channel.track({ ...trackRef.current });
      } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
        setStatus("error");
      }
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setStatus("off");
      setPeers([]);
    };
  }, [enabled, collectionId, userId]);

  // Push selection / name updates without tearing down the channel.
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || status !== "live") return;
    void channel.track({
      displayName,
      selectedOwnedCardId,
      color: myColor,
    });
  }, [displayName, selectedOwnedCardId, myColor, status]);

  const peerByCardId = useMemo(() => {
    const map = new Map<string, PresencePeer>();
    for (const peer of peers) {
      if (peer.selectedOwnedCardId) {
        map.set(peer.selectedOwnedCardId, peer);
      }
    }
    return map;
  }, [peers]);

  return { peers, peerByCardId, myColor, userId, status };
}
