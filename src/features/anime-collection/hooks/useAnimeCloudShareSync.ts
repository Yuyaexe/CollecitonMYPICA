"use client";

import { useEffect, useRef } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDemoStore } from "@/lib/demo/store";
import type { AnimeWorkspaceSnapshotState } from "@/lib/data/server/anime-share-service";

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

async function pushAnimeState(state: AnimeWorkspaceSnapshotState) {
  await fetch("/api/app/anime/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "push", state }),
  });
}

/**
 * Cloud anime share sync:
 * - Owner: push local anime so invitees always get the latest snapshot
 * - Member: always pull shared snapshot; never overwrite remote with empty local
 */
export function useAnimeCloudShareSync() {
  const { isSupabaseMode, configLoading } = useAppConfig();
  const animeSeries = useDemoStore((s) => s.animeSeries);
  const animeCharacters = useDemoStore((s) => s.animeCharacters);
  const animeCharacterCards = useDemoStore((s) => s.animeCharacterCards);
  const animeBinderLayoutByCharacter = useDemoStore((s) => s.animeBinderLayoutByCharacter);

  const bootstrapped = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipNextPush = useRef(false);
  const canEdit = useRef(true);
  const isSharedMember = useRef(false);
  const readyToPush = useRef(false);

  useEffect(() => {
    if (configLoading || !isSupabaseMode || bootstrapped.current) return;
    bootstrapped.current = true;

    void (async () => {
      try {
        await fetch("/api/app/anime/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        });

        const res = await fetch("/api/app/anime/share?view=snapshot");
        if (!res.ok) return;
        const json = (await res.json()) as {
          role?: string;
          isOwner?: boolean;
          state?: AnimeWorkspaceSnapshotState;
        };

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
          // Shared member: cloud is source of truth.
          skipNextPush.current = true;
          applyRemoteAnimeState(remote);
          readyToPush.current = canEdit.current && stateHasData(remote);
        } else {
          // Owner: prefer local if it has data, then push so friends can pull.
          if (stateHasData(local)) {
            await pushAnimeState(local);
          } else if (stateHasData(remote)) {
            skipNextPush.current = true;
            applyRemoteAnimeState(remote);
          } else {
            await pushAnimeState(local);
          }
          readyToPush.current = canEdit.current;
        }
      } catch {
        // best-effort — tables may not exist until migration 0013
      }
    })();
  }, [isSupabaseMode, configLoading]);

  // Members: poll for owner updates so anime appears without refresh forever
  useEffect(() => {
    if (!isSupabaseMode) return;

    pollTimer.current = setInterval(() => {
      if (!isSharedMember.current) return;
      void (async () => {
        try {
          const res = await fetch("/api/app/anime/share?view=snapshot");
          if (!res.ok) return;
          const json = (await res.json()) as {
            state?: AnimeWorkspaceSnapshotState;
            role?: string;
          };
          const remote = json.state;
          if (!remote || !stateHasData(remote)) return;

          const local = readLocalAnimeState();
          const remoteJson = JSON.stringify(remote);
          const localJson = JSON.stringify({
            animeSeries: local.animeSeries,
            animeCharacters: local.animeCharacters,
            animeCharacterCards: local.animeCharacterCards,
            animeBinderLayoutByCharacter: local.animeBinderLayoutByCharacter,
          });
          if (remoteJson === localJson) return;

          skipNextPush.current = true;
          applyRemoteAnimeState(remote);
          readyToPush.current = json.role !== "viewer";
        } catch {
          // ignore
        }
      })();
    }, 8000);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode || !bootstrapped.current) return;
    if (!canEdit.current || !readyToPush.current) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    // Shared members must not push empty state over the owner's data.
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
