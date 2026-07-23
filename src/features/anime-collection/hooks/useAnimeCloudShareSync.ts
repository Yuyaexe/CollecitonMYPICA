"use client";

import { useEffect, useRef } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useDemoStore } from "@/lib/demo/store";
import {
  animeCardSyncKey,
  emptyAnimeSnapshot,
  normalizeAnimeSnapshot,
  threeWayMergeAnimeState,
  wouldWipeRemoteCards,
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

const QTY_UNDOUBLE_FLAG = "deckvault:anime-qty-undouble-v1";

/**
 * One-shot repair for the empty-base merge bug that summed qty (1+1→2) on every card.
 * Only runs when every card is exactly 2 (the classic artifact) and the flag is unset.
 */
function repairDoubledQuantities(state: AnimeWorkspaceSnapshotState): {
  state: AnimeWorkspaceSnapshotState;
  repaired: boolean;
} {
  if (typeof window !== "undefined") {
    try {
      if (localStorage.getItem(QTY_UNDOUBLE_FLAG) === "1") {
        return { state, repaired: false };
      }
    } catch {
      // continue
    }
  }
  const cards = state.animeCharacterCards ?? [];
  if (cards.length < 3 || !cards.every((c) => c.quantity === 2)) {
    return { state, repaired: false };
  }
  return {
    state: {
      ...state,
      animeCharacterCards: cards.map((c) => ({ ...c, quantity: 1 })),
    },
    repaired: true,
  };
}

function markQtyUndoubleDone() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QTY_UNDOUBLE_FLAG, "1");
  } catch {
    // ignore
  }
}

function stateHasData(state: AnimeWorkspaceSnapshotState | undefined | null): boolean {
  if (!state) return false;
  return (
    (state.animeSeries?.length ?? 0) > 0 ||
    (state.animeCharacters?.length ?? 0) > 0 ||
    (state.animeCharacterCards?.length ?? 0) > 0
  );
}

/** Content fingerprint — sync keys, not row UUIDs (those differ across devices). */
function fingerprint(state: AnimeWorkspaceSnapshotState): string {
  const slim = slimAnimeState(state);
  const seriesSig = [...slim.animeSeries]
    .map((s) => `${s.slug}:${s.name}`)
    .sort()
    .join(",");
  const charSig = [...slim.animeCharacters]
    .map((c) => {
      const series = slim.animeSeries.find((s) => s.id === c.seriesId);
      return `${series?.slug ?? c.seriesId}:${c.name}`;
    })
    .sort()
    .join(",");
  const cardSig = [...slim.animeCharacterCards]
    .map((c) => `${animeCardSyncKey(c)}:${c.quantity}`)
    .sort()
    .join("|");
  const tombSig = [...(slim.animeCardTombstones ?? [])]
    .map((t) => `${t.key}@${t.deletedAt}`)
    .sort()
    .join("|");
  return [seriesSig, charSig, cardSig, tombSig].join("::");
}

function hasLocalOnlyCardKeys(
  local: AnimeWorkspaceSnapshotState,
  remote: AnimeWorkspaceSnapshotState
): boolean {
  const remoteKeys = new Set(remote.animeCharacterCards.map((c) => animeCardSyncKey(c)));
  return local.animeCharacterCards.some((c) => !remoteKeys.has(animeCardSyncKey(c)));
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

const MERGE_BASE_STORAGE_KEY = "deckvault:anime-share-merge-base";

type PersistedMergeBase = {
  updatedAt: string | null;
  pushedFp: string | null;
  state: AnimeWorkspaceSnapshotState;
};

function loadPersistedMergeBase(): PersistedMergeBase | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MERGE_BASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedMergeBase>;
    if (!parsed.state) return null;
    return {
      updatedAt: parsed.updatedAt ?? null,
      pushedFp: parsed.pushedFp ?? null,
      state: normalizeAnimeSnapshot(parsed.state),
    };
  } catch {
    return null;
  }
}

function persistMergeBase(entry: PersistedMergeBase) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MERGE_BASE_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

type SnapshotResponse = {
  role?: string;
  isOwner?: boolean;
  state?: AnimeWorkspaceSnapshotState;
  updatedAt?: string | null;
  updatedByUserId?: string | null;
  updatedByDisplayName?: string | null;
  currentUserId?: string | null;
  accepted?: number;
  error?: string;
  conflict?: boolean;
};

async function pullMeta(): Promise<SnapshotResponse> {
  const res = await fetch("/api/app/anime/share?view=meta", { method: "GET" });
  const json = (await res.json().catch(() => ({}))) as SnapshotResponse;
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to read anime share meta");
  }
  return json;
}

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
 * - Full pull on boot / manual refresh / when meta.updatedAt changes
 * - Polls use cheap meta (updatedAt only)
 * - Push assumes cloud == last base; on 409 merges conflict.state and retries
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
  const setProgress = useAnimeShareSyncStore((s) => s.setProgress);

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipNextPush = useRef(false);
  const canEdit = useRef(true);
  const isSharedMember = useRef(false);
  const readyToPush = useRef(false);
  const syncing = useRef(false);
  const persistedBase = useRef<PersistedMergeBase | null>(null);
  if (persistedBase.current === null && typeof window !== "undefined") {
    persistedBase.current = loadPersistedMergeBase();
  }
  const lastPushedFp = useRef<string | null>(persistedBase.current?.pushedFp ?? null);
  const lastRemoteUpdatedAt = useRef<string | null>(persistedBase.current?.updatedAt ?? null);
  const baseState = useRef<AnimeWorkspaceSnapshotState>(
    persistedBase.current?.state ?? emptyAnimeSnapshot()
  );
  const baseUpdatedAt = useRef<string | null>(persistedBase.current?.updatedAt ?? null);
  const currentUserId = useRef<string | null>(null);

  const rememberBase = (state: AnimeWorkspaceSnapshotState, updatedAt: string | null) => {
    baseState.current = slimAnimeState(state);
    baseUpdatedAt.current = updatedAt;
    lastRemoteUpdatedAt.current = updatedAt;
    lastPushedFp.current = fingerprint(baseState.current);
    persistMergeBase({
      updatedAt,
      pushedFp: lastPushedFp.current,
      state: baseState.current,
    });
  };

  const maybeLogRemoteDiff = (
    before: AnimeWorkspaceSnapshotState,
    after: AnimeWorkspaceSnapshotState,
    meta: Pick<SnapshotResponse, "updatedByUserId" | "updatedByDisplayName" | "currentUserId">,
    opts?: { skip?: boolean }
  ) => {
    if (opts?.skip) return;
    const editorId = meta.updatedByUserId ?? null;
    const viewerId = meta.currentUserId ?? currentUserId.current;
    if (!editorId || !viewerId || editorId === viewerId) return;
    const name = meta.updatedByDisplayName?.trim() || "Collector";
    useDemoStore.getState().recordAnimeShareRemoteDiff(
      before.animeCharacterCards ?? [],
      after.animeCharacterCards ?? [],
      { displayName: name, userId: editorId },
      [
        ...(before.animeCharacters ?? []).map((c) => ({ id: c.id, name: c.name })),
        ...(after.animeCharacters ?? []).map((c) => ({ id: c.id, name: c.name })),
      ]
    );
  };

  const resolveConflictAndPush = async (
    base: AnimeWorkspaceSnapshotState,
    cloud: AnimeWorkspaceSnapshotState,
    local: AnimeWorkspaceSnapshotState,
    cloudUpdatedAt: string | null
  ) => {
    const mergedRaw = threeWayMergeAnimeState(base, cloud, local);
    const { state: merged, repaired } = repairDoubledQuantities(mergedRaw);
    if (wouldWipeRemoteCards(merged, cloud)) {
      // Safety: never upload a merge that drops cloud cards without tombstones.
      skipNextPush.current = true;
      applyRemoteAnimeState(cloud);
      rememberBase(cloud, cloudUpdatedAt);
      return cloud;
    }
    skipNextPush.current = true;
    applyRemoteAnimeState(merged);

    let result = await pushAnimeState(merged, cloudUpdatedAt);
    if (result.conflict?.state) {
      const retryCloud = normalizeAnimeSnapshot(result.conflict.state);
      const retryMergedRaw = threeWayMergeAnimeState(cloud, retryCloud, local);
      const { state: retryMerged, repaired: retryRepaired } =
        repairDoubledQuantities(retryMergedRaw);
      if (wouldWipeRemoteCards(retryMerged, retryCloud)) {
        skipNextPush.current = true;
        applyRemoteAnimeState(retryCloud);
        rememberBase(retryCloud, result.conflict.updatedAt ?? null);
        return retryCloud;
      }
      skipNextPush.current = true;
      applyRemoteAnimeState(retryMerged);
      result = await pushAnimeState(retryMerged, result.conflict.updatedAt ?? null);
      if (result.conflict) {
        throw new Error("Anime snapshot conflict — refresh and try again");
      }
      rememberBase(retryMerged, result.updatedAt);
      if (repaired || retryRepaired) markQtyUndoubleDone();
      return retryMerged;
    }

    rememberBase(merged, result.updatedAt ?? cloudUpdatedAt);
    if (repaired) markQtyUndoubleDone();
    return merged;
  };

  const pushMerged = async (local: AnimeWorkspaceSnapshotState) => {
    // Fast path: no full pull. Assume cloud still matches last synced base.
    if (baseUpdatedAt.current != null) {
      const base = baseState.current;
      const merged = threeWayMergeAnimeState(base, base, local);
      if (wouldWipeRemoteCards(merged, base) && stateHasData(base)) {
        // Local view is missing cloud cards without tombstones — re-pull instead of wiping.
        const pulled = await pullSnapshot();
        const cloud = normalizeAnimeSnapshot(pulled.state);
        return resolveConflictAndPush(
          base,
          cloud,
          local,
          pulled.updatedAt ?? baseUpdatedAt.current
        );
      }
      skipNextPush.current = true;
      applyRemoteAnimeState(merged);

      const result = await pushAnimeState(merged, baseUpdatedAt.current);
      if (!result.conflict) {
        rememberBase(merged, result.updatedAt ?? baseUpdatedAt.current);
        return merged;
      }
      const cloud = normalizeAnimeSnapshot(result.conflict.state);
      return resolveConflictAndPush(base, cloud, local, result.conflict.updatedAt ?? null);
    }

    // Cold start: empty ancestor so local-only AND cloud-only cards both survive.
    const pulled = await pullSnapshot();
    const cloud = normalizeAnimeSnapshot(pulled.state);
    const cloudUpdatedAt = pulled.updatedAt ?? null;
    return resolveConflictAndPush(emptyAnimeSnapshot(), cloud, local, cloudUpdatedAt);
  };

  const applyPulledSnapshot = async (
    json: SnapshotResponse,
    opts?: { skipRemoteActivity?: boolean }
  ) => {
    if (json.currentUserId) currentUserId.current = json.currentUserId;
    canEdit.current = json.role !== "viewer";
    isSharedMember.current = json.isOwner === false;

    const remote = normalizeAnimeSnapshot(json.state);
    const remoteUpdatedAt = json.updatedAt ?? null;
    const local = readLocalAnimeState();
    const localFp = fingerprint(local);
    const remoteFp = fingerprint(remote);
    // Real last-sync base, or empty (never use local/remote as fake base —
    // that turns missing cards into false deletions).
    const base =
      baseUpdatedAt.current != null ? baseState.current : emptyAnimeSnapshot();

    if (isSharedMember.current) {
      const merged =
        canEdit.current && stateHasData(local) && localFp !== remoteFp
          ? threeWayMergeAnimeState(base, remote, local)
          : remote;

      // If merge would drop remote cards, prefer remote (ID/base bugs).
      const safeMerged =
        wouldWipeRemoteCards(merged, remote) && stateHasData(remote) ? remote : merged;
      const { state: fixed, repaired } = repairDoubledQuantities(safeMerged);

      maybeLogRemoteDiff(local, fixed, json, { skip: opts?.skipRemoteActivity });
      skipNextPush.current = true;
      applyRemoteAnimeState(fixed);
      rememberBase(fixed, remoteUpdatedAt);

      // Only push on pull when this device has cards the cloud lacks,
      // or when repairing the qty-doubling artifact.
      const shouldUpload =
        canEdit.current &&
        stateHasData(fixed) &&
        fingerprint(fixed) !== remoteFp &&
        (repaired || hasLocalOnlyCardKeys(fixed, remote)) &&
        !wouldWipeRemoteCards(fixed, remote);

      if (shouldUpload) {
        setProgress(75);
        const pushed = await pushAnimeState(fixed, remoteUpdatedAt);
        if (pushed.conflict?.state) {
          await resolveConflictAndPush(
            base,
            normalizeAnimeSnapshot(pushed.conflict.state),
            local,
            pushed.conflict.updatedAt ?? null
          );
        } else {
          rememberBase(fixed, pushed.updatedAt ?? remoteUpdatedAt);
          if (repaired) markQtyUndoubleDone();
        }
      }

      readyToPush.current = canEdit.current && stateHasData(readLocalAnimeState());
      setStatus(stateHasData(readLocalAnimeState()) ? "shared" : "empty", {
        error: null,
        isOwner: false,
        role: json.role ?? null,
        lastSyncedAt: Date.now(),
      });
      return;
    }

    if (stateHasData(local)) {
      if (localFp !== lastPushedFp.current && localFp !== remoteFp) {
        setProgress(70);
        const { state: fixedLocal, repaired } = repairDoubledQuantities(local);
        if (repaired) {
          skipNextPush.current = true;
          applyRemoteAnimeState(fixedLocal);
        }
        await pushMerged(repaired ? fixedLocal : local);
        if (repaired) markQtyUndoubleDone();
      } else if (localFp === remoteFp) {
        const { state: fixed, repaired } = repairDoubledQuantities(remote);
        if (repaired) {
          skipNextPush.current = true;
          applyRemoteAnimeState(fixed);
          rememberBase(fixed, remoteUpdatedAt);
          if (canEdit.current) {
            setProgress(70);
            const pushed = await pushAnimeState(fixed, remoteUpdatedAt);
            if (!pushed.conflict) {
              rememberBase(fixed, pushed.updatedAt ?? remoteUpdatedAt);
              markQtyUndoubleDone();
            }
          }
        } else {
          rememberBase(remote, remoteUpdatedAt);
        }
      } else if (!stateHasData(remote)) {
        setProgress(70);
        await pushMerged(local);
      } else {
        const merged = threeWayMergeAnimeState(base, remote, local);
        const safeMerged =
          wouldWipeRemoteCards(merged, remote) && stateHasData(remote) ? remote : merged;
        const { state: fixed, repaired } = repairDoubledQuantities(safeMerged);
        maybeLogRemoteDiff(local, fixed, json, { skip: opts?.skipRemoteActivity });
        skipNextPush.current = true;
        applyRemoteAnimeState(fixed);
        rememberBase(fixed, remoteUpdatedAt);
        if (repaired && canEdit.current && fingerprint(fixed) !== remoteFp) {
          setProgress(75);
          const pushed = await pushAnimeState(fixed, remoteUpdatedAt);
          if (!pushed.conflict) {
            rememberBase(fixed, pushed.updatedAt ?? remoteUpdatedAt);
            markQtyUndoubleDone();
          }
        }
      }
      setStatus("owner", {
        error: null,
        isOwner: true,
        role: json.role ?? "owner",
        lastSyncedAt: Date.now(),
      });
    } else if (stateHasData(remote)) {
      const { state: fixed, repaired } = repairDoubledQuantities(remote);
      maybeLogRemoteDiff(local, fixed, json, { skip: opts?.skipRemoteActivity });
      skipNextPush.current = true;
      applyRemoteAnimeState(fixed);
      rememberBase(fixed, remoteUpdatedAt);
      if (repaired && canEdit.current) {
        const pushed = await pushAnimeState(fixed, remoteUpdatedAt);
        if (!pushed.conflict) {
          rememberBase(fixed, pushed.updatedAt ?? remoteUpdatedAt);
          markQtyUndoubleDone();
        }
      }
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
  };

  const runSync = async (reason: "boot" | "poll" | "manual") => {
    if (syncing.current) return;

    syncing.current = true;
    const showProgress = reason === "boot" || reason === "manual";
    if (showProgress) {
      setStatus("syncing", { error: null, progress: 8 });
    }

    try {
      await waitForDemoHydration();

      // Polls: cheap meta first — skip multi-MB download when unchanged.
      if (reason === "poll" && lastRemoteUpdatedAt.current != null) {
        setProgress(null);
        const meta = await pullMeta();
        if (meta.currentUserId) currentUserId.current = meta.currentUserId;
        canEdit.current = meta.role !== "viewer";
        isSharedMember.current = meta.isOwner === false;
        const remoteUpdatedAt = meta.updatedAt ?? null;

        if (remoteUpdatedAt && remoteUpdatedAt === lastRemoteUpdatedAt.current) {
          const local = readLocalAnimeState();
          setStatus(
            isSharedMember.current
              ? stateHasData(local)
                ? "shared"
                : "empty"
              : stateHasData(local)
                ? "owner"
                : "empty",
            {
              error: null,
              isOwner: meta.isOwner ?? !isSharedMember.current,
              role: meta.role ?? null,
              lastSyncedAt: Date.now(),
              progress: null,
            }
          );
          return;
        }
        // Remote changed — fall through to full pull with visible progress.
        setStatus("syncing", { error: null, progress: 25 });
      }

      if (showProgress || reason === "poll") setProgress(35);
      const json = await pullSnapshot();
      if (showProgress || reason === "poll") setProgress(60);
      await applyPulledSnapshot(json, {
        skipRemoteActivity: reason === "boot",
      });
      setProgress(100);
      if (reason === "manual") {
        // Toast is fired from the page when progress hits 100.
      }
      setTimeout(() => {
        setProgress(null);
      }, 800);
    } catch (err) {
      setStatus("error", {
        error: err instanceof Error ? err.message : "Anime sync failed",
        lastSyncedAt: Date.now(),
        progress: null,
      });
    } finally {
      syncing.current = false;
    }
  };

  useEffect(() => {
    if (configLoading || !isSupabaseMode) return;
    void runSync("boot");

    // Everyone polls meta; full pull only when updatedAt changes.
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
      void pushMerged(next).catch((err) => {
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
