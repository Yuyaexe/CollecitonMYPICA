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
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import type { AnimeSeries } from "@/features/anime-collection/types";
import { toast } from "sonner";

export function AnimeSeriesPage() {
  const router = useRouter();
  const {
    animeSeries,
    characterCountBySeries,
    addAnimeSeries,
    renameAnimeSeries,
    deleteAnimeSeries,
  } = useAnimeCollection();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameTarget, setRenameTarget] = useState<AnimeSeries | null>(null);
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
    toast.success(`Added "${trimmed}"`);
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
    toast.success("Series renamed");
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
    toast.success("Series deleted");
  };

  return (
    <>
      <PageHeader
        title="Anime Collection"
        description="Organize by series and character"
      />

      {animeSeries.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No series yet"
          description="Add a series to start organizing characters, figures, and merch."
          actionLabel="Add series"
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
                  Delete
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
        title="Add series"
        description="Create a new anime series folder."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Add series
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="series-name">Name</Label>
            <Input
              id="series-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Yu-Gi-Oh! 5D's"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="series-cover">Cover image URL (optional)</Label>
            <Input
              id="series-cover"
              value={newCoverUrl}
              onChange={(e) => setNewCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename series"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="rename-series">Name</Label>
          <Input
            id="rename-series"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete series?"
        description={
          deleteTarget?.isSeeded
            ? "This is a built-in series and cannot be deleted."
            : `Delete "${deleteTarget?.name}" and all its characters? This cannot be undone.`
        }
        footer={
          deleteTarget?.isSeeded ? (
            <Button onClick={() => setDeleteOpen(false)}>OK</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )
        }
      >
        <span className="sr-only">Confirm delete series</span>
      </Modal>
    </>
  );
}
