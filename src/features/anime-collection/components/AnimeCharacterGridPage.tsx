"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CharacterBubbleGrid } from "@/features/anime-collection/components/CharacterBubbleGrid";
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";

export interface AnimeCharacterGridPageProps {
  seriesSlug: string;
}

export function AnimeCharacterGridPage({ seriesSlug }: AnimeCharacterGridPageProps) {
  const t = useT();
  const router = useRouter();
  const {
    getSeriesBySlug,
    getCharactersForSeries,
    addAnimeCharacter,
  } = useAnimeCollection();

  const series = getSeriesBySlug(seriesSlug);
  const characters = series ? getCharactersForSeries(series.id) : [];

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  if (!series) {
    return (
      <EmptyState
        icon={Users}
        title={t("anime.seriesNotFoundTitle")}
        description={t("anime.seriesNotFoundDescription")}
        actionLabel={t("anime.title")}
        onAction={() => router.push("/anime-collection")}
        className="mt-12"
      />
    );
  }

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addAnimeCharacter({
      seriesId: series.id,
      name: trimmed,
      imageUrl: newImageUrl.trim() || null,
    });
    setNewName("");
    setNewImageUrl("");
    setCreateOpen(false);
    toast.success(t("anime.characterAdded", { name: trimmed }));
  };

  return (
    <>
      <Link
        href="/anime-collection"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("anime.title")}
      </Link>

      <PageHeader
        title={series.name}
        description={
          characters.length === 1
            ? "1 character"
            : `${characters.length} characters`
        }
      />

      <div className="mt-8">
        {characters.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("anime.noCharactersTitle")}
            description={t("anime.noCharactersDescription")}
            actionLabel={t("anime.addCharacter")}
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <CharacterBubbleGrid
            characters={characters}
            onSelect={(character) =>
              router.push(`/anime-collection/${seriesSlug}/${character.id}`)
            }
            onAdd={() => setCreateOpen(true)}
          />
        )}
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("anime.addCharacterTitle")}
        description={`Add a character to ${series.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              {t("anime.addCharacter")}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="char-name">{t("common.name")}</Label>
            <Input
              id="char-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("anime.characterNamePlaceholder")}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-photo">{t("anime.photoUrl")}</Label>
            <Input
              id="char-photo"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder={t("common.urlPlaceholder")}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
