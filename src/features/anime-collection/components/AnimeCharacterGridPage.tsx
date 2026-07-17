"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimeCollectionBreadcrumb } from "@/features/anime-collection/components/AnimeCollectionBreadcrumb";
import { CharacterBubbleGrid } from "@/features/anime-collection/components/CharacterBubbleGrid";
import { EditCharacterModal } from "@/features/anime-collection/components/EditCharacterModal";
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { AnimeCharacter } from "@/features/anime-collection/types";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";

export interface AnimeCharacterGridPageProps {
  seriesSlug: string;
}

export function AnimeCharacterGridPage({ seriesSlug }: AnimeCharacterGridPageProps) {
  const t = useT();
  const router = useRouter();
  const isTouchDevice = useMediaQuery("(hover: none) and (pointer: coarse)");
  const {
    getSeriesBySlug,
    getCharactersForSeries,
    addAnimeCharacter,
    renameAnimeCharacter,
    updateAnimeCharacterImage,
    deleteAnimeCharacter,
  } = useAnimeCollection();

  const series = getSeriesBySlug(seriesSlug);
  const characters = series ? getCharactersForSeries(series.id) : [];

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnimeCharacter | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnimeCharacter | null>(null);

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

  const openEdit = (character: AnimeCharacter) => {
    setEditTarget(character);
    setEditOpen(true);
  };

  const handleEditSave = (input: { name: string; imageUrl: string | null }) => {
    if (!editTarget) return;
    if (input.name !== editTarget.name) {
      renameAnimeCharacter(editTarget.id, input.name);
    }
    if (input.imageUrl !== editTarget.imageUrl) {
      updateAnimeCharacterImage(editTarget.id, input.imageUrl);
    }
    setEditTarget(null);
  };

  const openDelete = (character: AnimeCharacter) => {
    setDeleteTarget(character);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAnimeCharacter(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
    toast.success(t("anime.characterDeleted"));
  };

  return (
    <>
      <AnimeCollectionBreadcrumb
        items={[
          { label: t("anime.title"), href: "/anime-collection" },
          { label: series.name },
        ]}
      />

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
            isTouchDevice={isTouchDevice}
            onSelect={(character) =>
              router.push(`/anime-collection/${seriesSlug}/${character.id}`)
            }
            onEdit={openEdit}
            onDelete={openDelete}
            onAdd={() => setCreateOpen(true)}
          />
        )}
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("anime.addCharacterTitle")}
        description={t("anime.addCharacterDescription", { series: series.name })}
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

      <EditCharacterModal
        open={editOpen}
        onOpenChange={setEditOpen}
        characterName={editTarget?.name ?? ""}
        currentImageUrl={editTarget?.imageUrl ?? null}
        accentColor={editTarget?.accentColor ?? null}
        onSave={handleEditSave}
      />

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("anime.deleteCharacterTitle")}
        description={t("anime.deleteCharacterConfirm", { name: deleteTarget?.name ?? "" })}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <span className="sr-only">{t("anime.confirmDeleteCharacter")}</span>
      </Modal>
    </>
  );
}
