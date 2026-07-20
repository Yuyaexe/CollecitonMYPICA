"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useCollectionPresence,
  type PresenceConnectionStatus,
  type PresencePeer,
} from "@/hooks/useCollectionPresence";

interface PresenceContextValue {
  peers: PresencePeer[];
  peerByCardId: Map<string, PresencePeer>;
  presenceStatus: PresenceConnectionStatus;
}

const PresenceContext = createContext<PresenceContextValue>({
  peers: [],
  peerByCardId: new Map(),
  presenceStatus: "off",
});

export function CollectionPresenceProvider({
  collectionId,
  displayName,
  selectedOwnedCardId,
  enabled,
  children,
}: {
  collectionId: string | null;
  displayName: string;
  selectedOwnedCardId: string | null;
  enabled: boolean;
  children: ReactNode;
}) {
  const { peers, peerByCardId, status } = useCollectionPresence(
    collectionId,
    displayName,
    selectedOwnedCardId,
    enabled
  );

  return (
    <PresenceContext.Provider
      value={{ peers, peerByCardId, presenceStatus: status }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}
