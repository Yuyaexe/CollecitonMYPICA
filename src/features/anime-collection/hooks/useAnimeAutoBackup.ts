"use client";

import { useEffect, useRef, useState } from "react";
import {
  animeBackupSnapshot,
  buildAnimeBackupPayload,
  downloadAnimeBackup,
} from "@/features/import/services/backup-export";
import { isSilentAnimeMutation } from "@/features/anime-collection/utils/silent-anime-mutation";
import { useDataUiStore } from "@/lib/data/ui-store";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";

/** Wait after the last user edit before downloading (avoids download spam). */
const AUTO_BACKUP_DEBOUNCE_MS = 20_000;

function animeStateChanged(
  state: ReturnType<typeof useDemoStore.getState>,
  prev: ReturnType<typeof useDemoStore.getState>
): boolean {
  return (
    state.animeSeries !== prev.animeSeries ||
    state.animeCharacters !== prev.animeCharacters ||
    state.animeCharacterCards !== prev.animeCharacterCards
  );
}

function isDemoStoreHydrated(): boolean {
  return useDemoStore.persist?.hasHydrated?.() ?? false;
}

export function useAnimeAutoBackup() {
  const t = useT();
  const enabled = useDataUiStore((s) => s.animeAutoBackupEnabled);
  // persist API is client-only; guard for SSR/prerender (DashboardShell mounts this globally)
  const [hydrated, setHydrated] = useState(isDemoStoreHydrated);
  const lastDownloadedRef = useRef<string | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hydrated) return;
    const persistApi = useDemoStore.persist;
    if (!persistApi?.onFinishHydration) {
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingSnapshotRef.current = null;
      return;
    }

    lastDownloadedRef.current = animeBackupSnapshot(useDemoStore.getState());

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const flushDownload = (showToast: boolean) => {
      clearTimer();
      const pending = pendingSnapshotRef.current;
      if (!pending || pending === lastDownloadedRef.current) return;

      const current = useDemoStore.getState();
      const snapshot = animeBackupSnapshot(current);
      if (snapshot !== pending && snapshot === lastDownloadedRef.current) {
        pendingSnapshotRef.current = null;
        return;
      }

      lastDownloadedRef.current = snapshot;
      pendingSnapshotRef.current = null;
      downloadAnimeBackup(buildAnimeBackupPayload(current));

      if (showToast) {
        toast.success(
          t("anime.autoBackupSaved", {
            series: current.animeSeries.length,
            characters: current.animeCharacters.length,
            cards: current.animeCharacterCards.length,
          })
        );
      }
    };

    const scheduleDownload = (snapshot: string) => {
      pendingSnapshotRef.current = snapshot;
      clearTimer();
      timerRef.current = setTimeout(() => flushDownload(true), AUTO_BACKUP_DEBOUNCE_MS);
    };

    const unsubscribe = useDemoStore.subscribe((state, prevState) => {
      if (!animeStateChanged(state, prevState)) return;
      if (isSilentAnimeMutation()) return;

      const snapshot = animeBackupSnapshot(state);
      if (snapshot === lastDownloadedRef.current) {
        pendingSnapshotRef.current = null;
        clearTimer();
        return;
      }

      scheduleDownload(snapshot);
    });

    const onLeave = () => {
      if (pendingSnapshotRef.current) {
        flushDownload(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };

    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsubscribe();
      clearTimer();
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hydrated, enabled, t]);
}
