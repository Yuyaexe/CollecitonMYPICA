"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Download, Loader2 } from "lucide-react";
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
import { useDemoStore } from "@/lib/demo/store";
import { DEMO_GAMES } from "@/lib/demo/types";
import { CURRENCIES } from "@/types/tcg";
import { checkTauriUpdate, installTauriUpdate } from "@/lib/updater";
import { toast } from "sonner";

const APP_VERSION = "0.2.0";

export default function SettingsPage() {
  const profile = useDemoStore((s) => s.profile);
  const updateProfile = useDemoStore((s) => s.updateProfile);
  const { theme, setTheme } = useTheme();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleSave = () => {
    toast.success("Settings saved");
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const info = await checkTauriUpdate();
      if (!info.available) {
        toast.success(`DeckVault v${APP_VERSION} is up to date`);
        return;
      }
      toast.info(`Update v${info.version} available`, {
        action: info.url
          ? { label: "Download", onClick: () => window.open(info.url, "_blank") }
          : undefined,
      });
      const installed = await installTauriUpdate();
      if (installed) toast.success("Update installed — restarting...");
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8">
      <PageHeader title="Settings" description="Manage your profile and preferences" />

      <div className="mt-8 max-w-lg space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={profile.displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Preferences</h2>

          <div className="space-y-2">
            <Label>Default Game</Label>
            <Select
              value={profile.defaultGameId ?? DEMO_GAMES[0].id}
              onValueChange={(v) => updateProfile({ defaultGameId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMO_GAMES.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={profile.currency}
              onValueChange={(v) => updateProfile({ currency: v as typeof profile.currency })}
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

        <Button onClick={handleSave}>Save Settings</Button>

        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-semibold">Updates</h2>
          <p className="text-sm text-muted-foreground">
            Version {APP_VERSION} — checks GitHub Releases for new builds
          </p>
          <Button variant="outline" onClick={handleCheckUpdate} disabled={checkingUpdate}>
            {checkingUpdate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Check for updates
          </Button>
        </section>
      </div>
    </div>
  );
}
