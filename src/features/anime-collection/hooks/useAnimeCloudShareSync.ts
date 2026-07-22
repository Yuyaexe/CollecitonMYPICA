"use client";

import { useEffect, useRef } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDemoStore } from "@/lib/demo/store";
import {
  emptyAnimeSnapshot,
  normalizeAnimeSnapshot,
  threeWayMergeAnimeState,
  type AnimeWorkspaceSnapshotState,
} from "@/lib/data/anime-share-merge";
import { useAnimeShareSyncStore } from "@/features/anime-collection/stores/anime-share-sync.store";

function readLocalAnimeState(): AnimeWorkspaceSnapshotState {
  const local = useDemoStore.getState();
  return normalizeAnimeSnapshot({
    animeSeries: local.animeSeries ?? [],
    animeCharacters: local.animeCharacters ?? [],
    animeCharacterCards: local.animeCharacterCards ?? [],
    animeBinderLayoutByCharacter: local.animeBinderLayoutByCharacter ?? {},
    animeCardTombstones: local.animeCardTombstones ?? [],
  });
}

/** Drop bulky fields that are not required for shared anime display. */
function slimAnimeState(state: AnimeWorkspaceSnapshotState): AnimeWorkspaceSnapshotState {
  const normalized = normalizeAnimeSnapshot(state);
  return {
    animeSeries: normalized.animeSeries,
    animeCharacters: normalized.animeCharacters,
    animeBinderLayoutByCharacter: normalized.animeBinderLayoutByCharacter,
    animeCardTombstones: normalized.animeCardTombstones,
    animeCharacterCards: normalized.animeCharacterCards.map((entry) => ({
      id: entry.id,
      characterId: entry.characterId,
      quantity: entry.quantity,
      condition: entry.condition,
      language: entry.language,
      isFoil: entry.isFoil,
      sortOrder: entry.sortOrder,
      lastTouchedAt: entry.lastTouchedAt,
      card: {
        id: entry.card.id,
        gameId: entry.card.gameId,
        gameSlug: entry.card.gameSlug,
        gameName: entry.card.gameName,
        externalId: entry.card.externalId,
        name: entry.card.name,
        setCode: entry.card.setCode,
        setName: entry.card.setName,
        collectorNumber: entry.card.collectorNumber,
        rarity: entry.card.rarity,
        imageUrl: entry.card.imageUrl,
        marketPrice: null,
        type: entry.card.type ?? null,
        cardTraderBlueprintId: entry.card.cardTraderBlueprintId ?? null,
      },
    })),
  };
}

function applyRemoteAnimeState(remote: AnimeWorkspaceSnapshotState) {
  const normalized = normalizeAnimeSnapshot(remote);
  useDemoStore.setState({
    animeSeries: normalized.animeSeries,
    animeCharacters: normalized.animeCharacters,
    animeCharacterCards: normalized.animeCharacterCards,
    animeBinderLayoutByCharacter: normalized.animeBinderLayoutByCharacter,
    animeCardTombstones: normalized.animeCardTombstones,
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

function fingerprint(state: AnimeWorkspaceSnapshotState): string {
  const slim = slimAnimeState(state);
  return [
    slim.animeSeries.length,
    slim.animeCharacters.length,
    slim.animeCharacterCards.length,
    slim.animeCharacterCards.reduce((n, c) => n + c.quantity, 0),
    slim.animeCardTombstones?.length ?? 0,
    // Cheap stable-ish signature without stringifying the full 3MB payload.
    slim.animeSeries.map((s) => s.id).join(","),
    slim.animeCharacters.map((c) => `${c.id}:${c.seriesId}`).join(","),
    slim.animeCharacterCards
      .map((c) => `${c.id}:${c.characterId}:${c.quantity}:${c.card.externalId ?? c.card.name}`)
      .join("|"),
    (slim.animeCardTombstones ?? []).map((t) => `${t.key}@${t.deletedAt}`).join("|"),
  ].join("::");
}

async function waitForDemoHydration() {
  const persistApi = useDemoStore.persist;
  if (persistApi.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = persistApi.onFinishHydration(() => {
      unsub();
      resolve();
    });
    setTimeout(() => {
      unsub();
      resolve();
    }, 2500);
  });
}

type SnapshotResponse = {
  role?: string;
  isOwner?: boolean;
  state?: AnimeWorkspaceSnapshotState;
  updatedAt?: string | null;
  accepted?: number;
  error?: string;
  conflict?: boolean;
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

async function pushAnimeState(
  state: AnimeWorkspaceSnapshotState,
  basedOnUpdatedAt: string | null
): Promise<{ updatedAt: string | null; conflict?: SnapshotResponse }> {
  const res = await fetch("/api/app/anime/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "push",
      state: slimAnimeState(state),
      basedOnUpdatedAt,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as SnapshotResponse & {
    updatedAt?: string | null;
    ok?: boolean;
  };
  if (res.status === 409 && json.conflict) {
    return { updatedAt: null, conflict: json };
  }
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to push anime share");
  }
  return { updatedAt: json.updatedAt ?? null };
}

/**
 * Cloud anime share sync (bandwidth-aware + 3-way merge):
 * - Pull on boot / manual refresh
 * - Members poll infrequently for owner updates
 * - Editors push only when local fingerprint changes
 * - Push uses pull → threeWay(base, cloud, local) → optimistic basedOnUpdatedAt
 */
export function useAnimeCloudShareSync() {
  const { isSupabaseMode, configLoading } = useAppConfig();
  const animeSeries = useDemoStore((s) => s.animeSeries);
  const animeCharacters = useDemoStore((s) => s.animeCharacters);
  const animeCharacterCards = useDemoStore((s) => s.animeCharacterCards);
  const animeBinderLayoutByCharacter = useDemoStore((s) => s.animeBinderLayoutByCharacter);
  const animeCardTombstones = useDemoStore((s) => s.animeCardTombstones);
  const requestSync = useAnimeShareSyncStore((s) => s.requestSync);
  const setStatus = useAnimeShareSyncStore((s) => s.setStatus);

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipNextPush = useRef(false);
  const canEdit = useRef(true);
  const isSharedMember = useRef(false);
  const readyToPush = useRef(false);
  const syncing = useRef(false);
  const lastPushedFp = useRef<string | null>(null);
  const lastRemoteUpdatedAt = useRef<string | null>(null);
  /** Last successfully synced snapshot — the 3-way merge base. */
  const baseState = useRef<AnimeWorkspaceSnapshotState>(emptyAnimeSnapshot());
  const baseUpdatedAt = useRef<string | null>(null);

  const rememberBase = (state: AnimeWorkspaceSnapshotState, updatedAt: string | null) => {
    baseState.current = slimAnimeState(state);
    baseUpdatedAt.current = updatedAt;
    lastRemoteUpdatedAt.current = updatedAt;
    lastPushedFp.current = fingerprint(baseState.current);
  };

  const pushMerged = async (local: AnimeWorkspaceSnapshotState) => {
    // Pull-before-push so removals/adds from peers are merged, not overwritten.
    const pulled = await pullSnapshot();
    const cloud = normalizeAnimeSnapshot(pulled.state);
    const cloudUpdatedAt = pulled.updatedAt ?? null;

    // After reload the in-memory base is empty — use cloud as ancestor so
    // 3-way presence works; tombstones + lastTouchedAt still block stale cards.
    const base =
      baseUpdatedAt.current != null ? baseState.current : cloud;

    const merged = threeWayMergeAnimeState(base, cloud, local);
    const mergedFp = fingerprint(merged);

    skipNextPush.current = true;
    applyRemoteAnimeState(merged);

    if (mergedFp === fingerprint(cloud) && cloudUpdatedAt === baseUpdatedAt.current) {
      rememberBase(merged, cloudUpdatedAt);
      return merged;
    }

    let result = await pushAnimeState(merged, cloudUpdatedAt);
    if (result.conflict?.state) {
      const retryCloud = normalizeAnimeSnapshot(result.conflict.state);
      const retryMerged = threeWayMergeAnimeState(cloud, retryCloud, merged);
      skipNextPush.current = true;
      applyRemoteAnimeState(retryMerged);
      result = await pushAnimeState(retryMerged, result.conflict.updatedAt ?? null);
      if (result.conflict) {
        throw new Error("Anime snapshot conflict — refresh and try again");
      }
      rememberBase(retryMerged, result.updatedAt);
      return retryMerged;
    }

    rememberBase(merged, result.updatedAt ?? cloudUpdatedAt);
    return merged;
  };

  const runSync = async (reason: "boot" | "poll" | "manual") => {
    if (syncing.current) return;
    // Owners don't need a full pull+push loop on poll — that times out on large snapshots.
    if (reason === "poll" && !isSharedMember.current && readyToPush.current) {
      return;
    }

    syncing.current = true;
    if (reason !== "poll") {
      setStatus("syncing", { error: null });
    }

    try {
      await waitForDemoHydration();
      const json = await pullSnapshot();
      canEdit.current = json.role !== "viewer";
      isSharedMember.current = json.isOwner === false;

      const remote = normalizeAnimeSnapshot(json.state);
      const remoteUpdatedAt = json.updatedAt ?? null;

      // Member poll: skip apply when remote unchanged.
      if (
        reason === "poll" &&
        isSharedMember.current &&
        remoteUpdatedAt &&
        remoteUpdatedAt === lastRemoteUpdatedAt.current
      ) {
        setStatus(stateHasData(remote) ? "shared" : "empty", {
          error: null,
          isOwner: false,
          role: json.role ?? null,
          lastSyncedAt: Date.now(),
        });
        return;
      }

      const local = readLocalAnimeState();
      const localFp = fingerprint(local);
      const remoteFp = fingerprint(remote);

      if (isSharedMember.current) {
        // Members: merge local edits with cloud, then adopt result.
        const base =
          baseUpdatedAt.current != null ? baseState.current : remote;
        const merged =
          canEdit.current && stateHasData(local) && localFp !== remoteFp
            ? threeWayMergeAnimeState(base, remote, local)
            : remote;

        skipNextPush.current = true;
        applyRemoteAnimeState(merged);
        rememberBase(merged, remoteUpdatedAt);

        if (
          canEdit.current &&
          fingerprint(merged) !== remoteFp &&
          stateHasData(merged)
        ) {
          const pushed = await pushAnimeState(merged, remoteUpdatedAt);
          if (pushed.conflict?.state) {
            const retry = threeWayMergeAnimeState(
              remote,
              normalizeAnimeSnapshot(pushed.conflict.state),
              merged
            );
            skipNextPush.current = true;
            applyRemoteAnimeState(retry);
            const again = await pushAnimeState(retry, pushed.conflict.updatedAt ?? null);
            if (again.conflict) {
              throw new Error("Anime snapshot conflict — refresh and try again");
            }
            rememberBase(retry, again.updatedAt);
          } else {
            rememberBase(merged, pushed.updatedAt ?? remoteUpdatedAt);
          }
        }

        readyToPush.current = canEdit.current && stateHasData(readLocalAnimeState());
        setStatus(stateHasData(readLocalAnimeState()) ? "shared" : "empty", {
          error: null,
          isOwner: false,
          role: json.role ?? null,
          lastSyncedAt: Date.now(),
        });
      } else {
        if (stateHasData(local)) {
          if (localFp !== lastPushedFp.current && localFp !== remoteFp) {
            await pushMerged(local);
          } else if (localFp === remoteFp) {
            rememberBase(remote, remoteUpdatedAt);
          } else if (!stateHasData(remote)) {
            await pushMerged(local);
          } else {
            rememberBase(remote, remoteUpdatedAt);
          }
          setStatus("owner", {
            error: null,
            isOwner: true,
            role: json.role ?? "owner",
            lastSyncedAt: Date.now(),
          });
        } else if (stateHasData(remote)) {
          skipNextPush.current = true;
          applyRemoteAnimeState(remote);
          rememberBase(remote, remoteUpdatedAt);
          setStatus("owner", {
            error: null,
            isOwner: true,
            role: json.role ?? "owner",
            lastSyncedAt: Date.now(),
          });
        } else {
          rememberBase(emptyAnimeSnapshot(), remoteUpdatedAt);
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

    // Members need polling; owners rely on local-change push.
    pollTimer.current = setInterval(() => {
      void runSync("poll");
    }, 20_000);

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

    const next = readLocalAnimeState();
    if (isSharedMember.current && !stateHasData(next)) return;

    const fp = fingerprint(next);
    if (fp === lastPushedFp.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void pushMerged(next)
        .then(() => {
          /* base/fp updated inside pushMerged */
        })
        .catch((err) => {
          setStatus("error", {
            error: err instanceof Error ? err.message : "Failed to push anime share",
            lastSyncedAt: Date.now(),
          });
        });
    }, 2500);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [
    isSupabaseMode,
    animeSeries,
    animeCharacters,
    animeCharacterCards,
    animeBinderLayoutByCharacter,
    animeCardTombstones,
    setStatus,
  ]);
}
