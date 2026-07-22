"use client";

import { create } from "zustand";

export type AnimeShareSyncStatus =
  | "idle"
  | "syncing"
  | "shared"
  | "owner"
  | "empty"
  | "error";

interface AnimeShareSyncState {
  status: AnimeShareSyncStatus;
  error: string | null;
  isOwner: boolean | null;
  role: string | null;
  lastSyncedAt: number | null;
  setStatus: (
    status: AnimeShareSyncStatus,
    patch?: Partial<Pick<AnimeShareSyncState, "error" | "isOwner" | "role" | "lastSyncedAt">>
  ) => void;
  requestSync: number;
  triggerSync: () => void;
}

export const useAnimeShareSyncStore = create<AnimeShareSyncState>((set) => ({
  status: "idle",
  error: null,
  isOwner: null,
  role: null,
  lastSyncedAt: null,
  requestSync: 0,
  setStatus: (status, patch) => set({ status, ...patch }),
  triggerSync: () => set((s) => ({ requestSync: s.requestSync + 1 })),
}));
