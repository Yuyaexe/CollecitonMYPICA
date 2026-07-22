"use client";

import { useEffect, useRef } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDemoStore } from "@/lib/demo/store";
import type { AnimeWorkspaceSnapshotState } from "@/lib/data/server/anime-share-service";

/**
 * Cloud anime share: accept invites, pull shared snapshot, push local edits (debounced).
 * Anime remains editable locally; cloud is the sync surface for shared workspaces.
 */
export function useAnimeCloudShareSync() {
  const { isSupabaseMode, configLoading } = useAppConfig();
  const animeSeries = useDemoStore((s) => s.animeSeries);
  const animeCharacters = useDemoStore((s) => s.animeCharacters);
  const animeCharacterCards = useDemoStore((s) => s.animeCharacterCards);
  const animeBinderLayoutByCharacter = useDemoStore((s) => s.animeBinderLayoutByCharacter);
  const bootstrapped = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPush = useRef(false);
  const canEdit = useRef(true);

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
          updatedAt?: string | null;
        };

        canEdit.current = json.role !== "viewer";

        const remote = json.state;
        if (!remote) return;

        const local = useDemoStore.getState();
        const localEmpty =
          (local.animeSeries?.length ?? 0) === 0 &&
          (local.animeCharacterCards?.length ?? 0) === 0;
        const remoteHasData =
          (remote.animeSeries?.length ?? 0) > 0 ||
          (remote.animeCharacterCards?.length ?? 0) > 0;

        // Member (not owner): always take remote shared anime.
        // Owner: pull remote only if local is empty and remote has data.
        if ((!json.isOwner && remoteHasData) || (json.isOwner && localEmpty && remoteHasData)) {
          skipNextPush.current = true;
          useDemoStore.setState({
            animeSeries: remote.animeSeries ?? [],
            animeCharacters: remote.animeCharacters ?? [],
            animeCharacterCards: remote.animeCharacterCards ?? [],
            animeBinderLayoutByCharacter: remote.animeBinderLayoutByCharacter ?? {},
          });
        } else if (json.isOwner && !localEmpty) {
          // Push owner's local anime up so invitees can see it.
          const state: AnimeWorkspaceSnapshotState = {
            animeSeries: local.animeSeries,
            animeCharacters: local.animeCharacters,
            animeCharacterCards: local.animeCharacterCards,
            animeBinderLayoutByCharacter: local.animeBinderLayoutByCharacter ?? {},
          };
          await fetch("/api/app/anime/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "push", state }),
          });
        }
      } catch {
        // best-effort
      }
    })();
  }, [isSupabaseMode, configLoading]);

  useEffect(() => {
    if (!isSupabaseMode || !bootstrapped.current) return;
    if (!canEdit.current) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const state: AnimeWorkspaceSnapshotState = {
        animeSeries,
        animeCharacters,
        animeCharacterCards,
        animeBinderLayoutByCharacter: animeBinderLayoutByCharacter ?? {},
      };
      void fetch("/api/app/anime/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push", state }),
      });
    }, 1200);

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
