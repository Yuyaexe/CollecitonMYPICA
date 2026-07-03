"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useCollectionPresence,
  type PresencePeer,
} from "@/hooks/useCollectionPresence";

interface PresenceContextValue {
  peers: PresencePeer[];
  peerByCardId: Map<string, PresencePeer>;
}

const PresenceContext = createContext<PresenceContextValue>({
  peers: [],
  peerByCardId: new Map(),
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
  const { peers, peerByCardId } = useCollectionPresence(
    collectionId,
    displayName,
    selectedOwnedCardId,
    enabled
  );

  return (
    <PresenceContext.Provider value={{ peers, peerByCardId }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}
