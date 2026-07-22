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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AnimeSeriesCard,
  AddAnimeSeriesCard,
} from "@/features/anime-collection/components/AnimeSeriesCard";
import { EditSeriesModal } from "@/features/anime-collection/components/EditSeriesModal";
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import { resolveSeriesCoverUrl } from "@/features/anime-collection/utils/resolve-series-cover";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { AnimeSeries } from "@/features/anime-collection/types";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";

export function AnimeSeriesPage() {
  const t = useT();
  const router = useRouter();
  const isTouchDevice = useMediaQuery("(hover: none) and (pointer: coarse)");
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
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnimeSeries | null>(null);
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

  const openEdit = (series: AnimeSeries) => {
    setEditTarget(series);
    setEditOpen(true);
  };

  const handleEditSave = (input: { name: string; coverImageUrl: string | null }) => {
    if (!editTarget) return;
    if (input.name !== editTarget.name) {
      renameAnimeSeries(editTarget.id, input.name);
    }
    if (input.coverImageUrl !== editTarget.coverImageUrl) {
      updateAnimeSeriesCover(editTarget.id, input.coverImageUrl);
    }
    setEditTarget(null);
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

  const renderSeriesCard = (series: AnimeSeries, index: number) => (
    <AnimeSeriesCard
      name={series.name}
      coverImageUrl={resolveSeriesCoverUrl(series.slug, series.name, series.coverImageUrl)}
      coverColor={series.coverColor}
      characterCount={characterCountBySeries.get(series.id) ?? 0}
      index={index}
      onSelect={() => router.push(`/anime-collection/${series.slug}`)}
      onEditCover={() => openEdit(series)}
    />
  );

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
          {animeSeries.map((series, index) =>
            isTouchDevice ? (
              <div key={series.id} className="group relative">
                {renderSeriesCard(series, index)}
              </div>
            ) : (
              <ContextMenu key={series.id}>
                <ContextMenuTrigger asChild>
                  <div className="group relative">{renderSeriesCard(series, index)}</div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => router.push(`/anime-collection/${series.slug}`)}>
                    {t("common.open")}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => openEdit(series)}>
                    {t("anime.editSeries")}
                  </ContextMenuItem>
                  {!series.isSeeded && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => openDelete(series)}
                      >
                        {t("common.delete")}
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )
          )}
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

      <EditSeriesModal
        open={editOpen}
        onOpenChange={setEditOpen}
        seriesName={editTarget?.name ?? ""}
        seriesSlug={editTarget?.slug ?? ""}
        currentCoverUrl={editTarget?.coverImageUrl ?? null}
        coverColor={editTarget?.coverColor ?? null}
        onSave={handleEditSave}
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
