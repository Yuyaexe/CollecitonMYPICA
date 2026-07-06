"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AnimeSeriesCard,
  AddAnimeSeriesCard,
} from "@/features/anime-collection/components/AnimeSeriesCard";
import { EditSeriesCoverModal } from "@/features/anime-collection/components/EditSeriesCoverModal";
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import type { AnimeSeries } from "@/features/anime-collection/types";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";

export function AnimeSeriesPage() {
  const t = useT();
  const router = useRouter();
  const {
    animeSeries,
    characterCountBySeries,
    addAnimeSeries,
    renameAnimeSeries,
    updateAnimeSeriesCover,
    deleteAnimeSeries,
  } = useAnimeCollection();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameTarget, setRenameTarget] = useState<AnimeSeries | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverTarget, setCoverTarget] = useState<AnimeSeries | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnimeSeries | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addAnimeSeries({
      name: trimmed,
      coverImageUrl: newCoverUrl.trim() || null,
    });
    setNewName("");
    setNewCoverUrl("");
    setCreateOpen(false);
    toast.success(t("anime.seriesAdded", { name: trimmed }));
  };

  const openRename = (series: AnimeSeries) => {
    setRenameTarget(series);
    setRenameName(series.name);
    setRenameOpen(true);
  };

  const handleRename = () => {
    if (!renameTarget) return;
    const trimmed = renameName.trim();
    if (!trimmed) return;
    renameAnimeSeries(renameTarget.id, trimmed);
    setRenameOpen(false);
    setRenameTarget(null);
    toast.success(t("anime.seriesRenamed"));
  };

  const openCoverEdit = (series: AnimeSeries) => {
    setCoverTarget(series);
    setCoverOpen(true);
  };

  const openDelete = (series: AnimeSeries) => {
    setDeleteTarget(series);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAnimeSeries(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
    toast.success(t("anime.seriesDeleted"));
  };

  return (
    <>
      <PageHeader
        title={t("anime.title")}
        description={t("anime.description")}
      />

      {animeSeries.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("anime.noSeriesTitle")}
          description={t("anime.noSeriesDescription")}
          actionLabel={t("anime.addSeries")}
          onAction={() => setCreateOpen(true)}
          className="mt-12"
        />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {animeSeries.map((series, index) => (
            <div
              key={series.id}
              className="group relative"
              onContextMenu={(e) => {
                e.preventDefault();
                openRename(series);
              }}
            >
              <AnimeSeriesCard
                name={series.name}
                coverImageUrl={series.coverImageUrl}
                coverColor={series.coverColor}
                characterCount={characterCountBySeries.get(series.id) ?? 0}
                index={index}
                onSelect={() => router.push(`/anime-collection/${series.slug}`)}
                onEditCover={() => openCoverEdit(series)}
              />
              {!series.isSeeded && (
                <button
                  type="button"
                  aria-label={`Manage ${series.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDelete(series);
                  }}
                  className="absolute right-2 top-2 z-10 rounded-md bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                >
                  {t("common.delete")}
                </button>
              )}
            </div>
          ))}
          <AddAnimeSeriesCard
            index={animeSeries.length}
            onClick={() => setCreateOpen(true)}
          />
        </div>
      )}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("anime.addSeriesTitle")}
        description={t("anime.addSeriesDescription")}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              {t("anime.addSeries")}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="series-name">{t("anime.seriesName")}</Label>
            <Input
              id="series-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("anime.seriesNamePlaceholder")}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="series-cover">{t("anime.coverUrl")}</Label>
            <Input
              id="series-cover"
              value={newCoverUrl}
              onChange={(e) => setNewCoverUrl(e.target.value)}
              placeholder={t("common.urlPlaceholder")}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={t("anime.renameSeriesTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="rename-series">{t("anime.seriesName")}</Label>
          <Input
            id="rename-series"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      <EditSeriesCoverModal
        open={coverOpen}
        onOpenChange={setCoverOpen}
        seriesName={coverTarget?.name ?? ""}
        currentCoverUrl={coverTarget?.coverImageUrl ?? null}
        coverColor={coverTarget?.coverColor ?? null}
        onSave={(url) => {
          if (coverTarget) updateAnimeSeriesCover(coverTarget.id, url);
        }}
      />

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("anime.deleteSeriesTitle")}
        description={
          deleteTarget?.isSeeded
            ? t("anime.deleteSeriesBuiltin")
            : t("anime.deleteSeriesConfirm", { name: deleteTarget?.name ?? "" })
        }
        footer={
          deleteTarget?.isSeeded ? (
            <Button onClick={() => setDeleteOpen(false)}>{t("common.close")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t("common.delete")}
              </Button>
            </>
          )
        }
      >
        <span className="sr-only">{t("anime.confirmDeleteSeries")}</span>
      </Modal>
    </>
  );
}
