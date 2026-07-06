"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { HardDriveDownload, HardDriveUpload, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { useAppData } from "@/hooks/useAppData";
import type { DemoProfile } from "@/lib/demo/types";
import {
  buildBackupPayload,
  downloadBackup,
  fetchBackupFromServer,
} from "@/features/import/services/backup-export";
import {
  defaultCollectionAfterRestore,
  readBackupFile,
  restoreBackupOnServer,
} from "@/features/import/services/backup-import";
import { useDemoStore } from "@/lib/demo/store";
import { useDataUiStore } from "@/lib/data/ui-store";
import { toast } from "sonner";

export default function SettingsPage() {
  const {
    profile,
    collections,
    ownedCards,
    tags,
    updateProfile,
    isSupabaseMode,
  } = useAppData();
  const queryClient = useQueryClient();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [draft, setDraft] = useState<DemoProfile>(profile);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile(draft);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const anime = useDemoStore.getState();
      const animeFields = {
        animeSeries: anime.animeSeries,
        animeCharacters: anime.animeCharacters,
        animeCharacterCards: anime.animeCharacterCards,
      };

      const backup = isSupabaseMode
        ? {
            ...(await fetchBackupFromServer()),
            ...animeFields,
          }
        : buildBackupPayload({
            profile,
            collections,
            ownedCards,
            tags,
            ...animeFields,
          });
      downloadBackup(backup);
      toast.success(
        `Backup salvo (${backup.ownedCards.length} cartas, ${backup.collections.length} coleções, ${backup.animeCharacterCards.length} cartas anime)`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar backup");
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFile = async (file: File) => {
    const confirmed = window.confirm(
      "Restaurar backup? A coleção e a Anime Collection serão substituídas pelos dados do arquivo."
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      const backup = await readBackupFile(file);
      const activeId = defaultCollectionAfterRestore(backup);
      if (activeId) {
        useDataUiStore.getState().setActiveCollectionId(activeId);
      }
      if (isSupabaseMode) {
        const result = await restoreBackupOnServer(backup);
        useDemoStore.getState().restoreAnimeCollectionFromBackup(backup);
        await queryClient.invalidateQueries({ queryKey: ["app-state"] });
        toast.success(
          `Restaurado: ${result.importedCards} cartas em ${result.collections} coleções, ${backup.animeCharacterCards.length} cartas anime`
        );
      } else {
        useDemoStore.getState().restoreFromBackup(backup);
        toast.success(
          `Restaurado: ${backup.ownedCards.length} cartas em ${backup.collections.length} coleções, ${backup.animeCharacterCards.length} cartas anime`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao restaurar backup");
    } finally {
      setRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Settings" description="Manage your profile and preferences" />

      <div className="mx-auto mt-6 max-w-lg space-y-8 sm:mt-8">
        <section className="space-y-4">
          <h2 className="text-base font-semibold sm:text-lg">Profile</h2>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold sm:text-lg">Preferences</h2>

          <div className="space-y-2">
            <Label>Theme</Label>
            <ResponsiveSelect
              value={theme ?? "dark"}
              onValueChange={setTheme}
              options={[
                { value: "dark", label: "Dark (Obsidian)" },
                { value: "light", label: "Light" },
              ]}
            />
          </div>
        </section>

        <Button className="w-full sm:w-auto" onClick={handleSave}>
          Save Settings
        </Button>

        {isSupabaseMode && (
          <p className="text-sm text-muted-foreground">
            Data syncs via Supabase cloud. Invite friends from the Share button on Collection.
          </p>
        )}
        {!isSupabaseMode && (
          <p className="text-sm text-muted-foreground">
            Offline mode — data is stored in this browser. Use Backup to save a copy.
          </p>
        )}

        <section className="space-y-4 border-t border-border pt-6 sm:pt-8">
          <h2 className="text-base font-semibold sm:text-lg">Backup</h2>
          <p className="text-sm text-muted-foreground">
            Importa backups do app CT (Yu-Gi-Oh em{" "}
            <code className="text-xs">Tools/CT</code>): arquivo{" "}
            <code className="text-xs">yugioh-backup-….json</code> da pasta{" "}
            <code className="text-xs">CT/backup</code>, ou export de aba{" "}
            <code className="text-xs">yugioh-collection-….json</code>. Converte
            automaticamente para coleções do DeckVault.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleBackup}
              disabled={backingUp}
            >
              {backingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HardDriveDownload className="h-4 w-4" />
              )}
              Baixar backup
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleRestoreFile(file);
              }}
            />
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => restoreInputRef.current?.click()}
              disabled={restoring}
            >
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HardDriveUpload className="h-4 w-4" />
              )}
              Restaurar backup
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
