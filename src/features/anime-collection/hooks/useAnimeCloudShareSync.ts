"use client";

import { useEffect, useRef } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDemoStore } from "@/lib/demo/store";
import type { AnimeWorkspaceSnapshotState } from "@/lib/data/server/anime-share-service";
import { useAnimeShareSyncStore } from "@/features/anime-collection/stores/anime-share-sync.store";

function readLocalAnimeState(): AnimeWorkspaceSnapshotState {
  const local = useDemoStore.getState();
  return {
    animeSeries: local.animeSeries ?? [],
    animeCharacters: local.animeCharacters ?? [],
    animeCharacterCards: local.animeCharacterCards ?? [],
    animeBinderLayoutByCharacter: local.animeBinderLayoutByCharacter ?? {},
  };
}

function applyRemoteAnimeState(remote: AnimeWorkspaceSnapshotState) {
  useDemoStore.setState({
    animeSeries: remote.animeSeries ?? [],
    animeCharacters: remote.animeCharacters ?? [],
    animeCharacterCards: remote.animeCharacterCards ?? [],
    animeBinderLayoutByCharacter: remote.animeBinderLayoutByCharacter ?? {},
  });
}

function stateHasData(state: AnimeWorkspaceSnapshotState | undefined | null): boolean {
  if (!state) return false;
  return (
    (state.animeSeries?.length ?? 0) > 0 ||
    (state.animeCharacters?.length ?? 0) > 0 ||
    (state.animeCharacterCards?.length ?? 0) > 0
  );
}

async function waitForDemoHydration() {
  const persistApi = useDemoStore.persist;
  if (persistApi.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = persistApi.onFinishHydration(() => {
      unsub();
      resolve();
    });
    // Safety: don't hang forever if hydration already raced.
    setTimeout(() => {
      unsub();
      resolve();
    }, 2500);
  });
}

async function pushAnimeState(state: AnimeWorkspaceSnapshotState) {
  const res = await fetch("/api/app/anime/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "push", state }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to push anime share");
  }
}

type SnapshotResponse = {
  role?: string;
  isOwner?: boolean;
  state?: AnimeWorkspaceSnapshotState;
  accepted?: number;
  error?: string;
};

async function pullSnapshot(): Promise<SnapshotResponse> {
  const res = await fetch("/api/app/anime/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "pull" }),
  });
  const json = (await res.json().catch(() => ({}))) as SnapshotResponse;
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to pull anime share");
  }
  return json;
}

/**
 * Cloud anime share sync:
 * - Wait for localStorage hydration before applying remote (avoids empty overwrite races)
 * - Always accept invites + pull on boot and on demand
 * - Owner: push local data so invitees receive it
 * - Member: cloud is source of truth; never push empty over shared data
 */
export function useAnimeCloudShareSync() {
  const { isSupabaseMode, configLoading } = useAppConfig();
  const animeSeries = useDemoStore((s) => s.animeSeries);
  const animeCharacters = useDemoStore((s) => s.animeCharacters);
  const animeCharacterCards = useDemoStore((s) => s.animeCharacterCards);
  const animeBinderLayoutByCharacter = useDemoStore((s) => s.animeBinderLayoutByCharacter);
  const requestSync = useAnimeShareSyncStore((s) => s.requestSync);
  const setStatus = useAnimeShareSyncStore((s) => s.setStatus);

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipNextPush = useRef(false);
  const canEdit = useRef(true);
  const isSharedMember = useRef(false);
  const readyToPush = useRef(false);
  const syncing = useRef(false);

  const runSync = async (reason: "boot" | "poll" | "manual") => {
    if (syncing.current) return;
    syncing.current = true;
    if (reason !== "poll") {
      setStatus("syncing", { error: null });
    }

    try {
      await waitForDemoHydration();
      const json = await pullSnapshot();
      canEdit.current = json.role !== "viewer";
      isSharedMember.current = json.isOwner === false;

      const remote = json.state ?? {
        animeSeries: [],
        animeCharacters: [],
        animeCharacterCards: [],
        animeBinderLayoutByCharacter: {},
      };
      const local = readLocalAnimeState();

      if (isSharedMember.current) {
        skipNextPush.current = true;
        applyRemoteAnimeState(remote);
        readyToPush.current = canEdit.current && stateHasData(remote);
        setStatus(stateHasData(remote) ? "shared" : "empty", {
          error: null,
          isOwner: false,
          role: json.role ?? null,
          lastSyncedAt: Date.now(),
        });
      } else {
        if (stateHasData(local)) {
          await pushAnimeState(local);
          setStatus("owner", {
            error: null,
            isOwner: true,
            role: json.role ?? "owner",
            lastSyncedAt: Date.now(),
          });
        } else if (stateHasData(remote)) {
          skipNextPush.current = true;
          applyRemoteAnimeState(remote);
          setStatus("owner", {
            error: null,
            isOwner: true,
            role: json.role ?? "owner",
            lastSyncedAt: Date.now(),
          });
        } else {
          setStatus("empty", {
            error: null,
            isOwner: true,
            role: json.role ?? "owner",
            lastSyncedAt: Date.now(),
          });
        }
        readyToPush.current = canEdit.current;
      }
    } catch (err) {
      setStatus("error", {
        error: err instanceof Error ? err.message : "Anime sync failed",
        lastSyncedAt: Date.now(),
      });
    } finally {
      syncing.current = false;
    }
  };

  useEffect(() => {
    if (configLoading || !isSupabaseMode) return;
    void runSync("boot");

    pollTimer.current = setInterval(() => {
      void runSync("poll");
    }, 5000);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per mode
  }, [isSupabaseMode, configLoading]);

  useEffect(() => {
    if (!isSupabaseMode || requestSync === 0) return;
    void runSync("manual");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSync, isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode || !readyToPush.current) return;
    if (!canEdit.current) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    if (
      isSharedMember.current &&
      !stateHasData({
        animeSeries,
        animeCharacters,
        animeCharacterCards,
        animeBinderLayoutByCharacter: animeBinderLayoutByCharacter ?? {},
      })
    ) {
      return;
    }

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void pushAnimeState({
        animeSeries,
        animeCharacters,
        animeCharacterCards,
        animeBinderLayoutByCharacter: animeBinderLayoutByCharacter ?? {},
      }).catch(() => {
        // push errors surface on next pull/status
      });
    }, 800);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [
    isSupabaseMode,
    animeSeries,
    animeCharacters,
    animeCharacterCards,
    animeBinderLayoutByCharacter,
  ]);
}
