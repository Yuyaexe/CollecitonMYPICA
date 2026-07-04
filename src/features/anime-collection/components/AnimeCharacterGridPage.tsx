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
import { toast } from "sonner";

export interface AnimeCharacterGridPageProps {
  seriesSlug: string;
}

export function AnimeCharacterGridPage({ seriesSlug }: AnimeCharacterGridPageProps) {
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
        title="Series not found"
        description="This series may have been removed."
        actionLabel="Back to Anime Collection"
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
    toast.success(`Added "${trimmed}"`);
  };

  return (
    <>
      <Link
        href="/anime-collection"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Anime Collection
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
            title="No characters yet"
            description="Add characters to this series to organize figures and merch."
            actionLabel="Add character"
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
        title="Add character"
        description={`Add a character to ${series.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Add character
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="char-name">Name</Label>
            <Input
              id="char-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Yugi Muto"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-photo">Photo URL (optional)</Label>
            <Input
              id="char-photo"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
