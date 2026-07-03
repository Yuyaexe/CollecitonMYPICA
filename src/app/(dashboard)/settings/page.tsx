"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { HardDriveDownload, HardDriveUpload, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData } from "@/hooks/useAppData";
import type { DemoProfile } from "@/lib/demo/types";
import { CURRENCIES } from "@/types/tcg";
import {
  buildBackupPayload,
  downloadBackup,
  fetchBackupFromServer,
} from "@/features/import/services/backup-export";
import {
  readBackupFile,
  restoreBackupOnServer,
} from "@/features/import/services/backup-import";
import { useDemoStore } from "@/lib/demo/store";
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
    await updateProfile(draft);
    toast.success("Settings saved");
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const backup = isSupabaseMode
        ? await fetchBackupFromServer()
        : buildBackupPayload({
            profile,
            collections,
            ownedCards,
            tags,
          });
      downloadBackup(backup);
      toast.success(
        `Backup salvo (${backup.ownedCards.length} cartas, ${backup.collections.length} coleções)`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar backup");
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFile = async (file: File) => {
    const confirmed = window.confirm(
      "Restaurar backup? As cartas serão mescladas nas coleções (duplicatas somam quantidade). Coleções com o mesmo nome serão reutilizadas."
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      const backup = await readBackupFile(file);
      if (isSupabaseMode) {
        const result = await restoreBackupOnServer(backup);
        await queryClient.invalidateQueries({ queryKey: ["app-state"] });
        toast.success(
          `Restaurado: ${result.importedCards} cartas em ${result.collections} coleções`
        );
      } else {
        useDemoStore.getState().restoreFromBackup(backup);
        toast.success(`Restaurado: ${backup.ownedCards.length} cartas`);
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
            <Label>Currency</Label>
            <Select
              value={draft.currency}
              onValueChange={(v) =>
                setDraft({ ...draft, currency: v as typeof draft.currency })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme ?? "dark"} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark (Obsidian)</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
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
            Baixa um arquivo JSON com perfil, coleções e cartas. Guarde em nuvem
            (Google Drive, OneDrive) ou pendrive.
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
