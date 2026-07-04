"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageOpen, Pencil } from "lucide-react";
import { CardImage } from "@/components/shared/CardImage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import {
  getCharacterInitials,
} from "@/features/anime-collection/types";
import { useState } from "react";
import { toast } from "sonner";

export interface CharacterDetailPageProps {
  seriesSlug: string;
  characterId: string;
}

export function CharacterDetailPage({
  seriesSlug,
  characterId,
}: CharacterDetailPageProps) {
  const router = useRouter();
  const {
    getSeriesBySlug,
    getCharacterById,
    renameAnimeCharacter,
    deleteAnimeCharacter,
  } = useAnimeCollection();

  const series = getSeriesBySlug(seriesSlug);
  const character = getCharacterById(characterId);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");

  if (!series || !character || character.seriesId !== series.id) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Character not found"
        description="This character may have been removed."
        actionLabel="Back to series"
        onAction={() => router.push(`/anime-collection/${seriesSlug}`)}
        className="mt-12"
      />
    );
  }

  const initials = getCharacterInitials(character.name);

  const handleRename = () => {
    const trimmed = renameName.trim();
    if (!trimmed) return;
    renameAnimeCharacter(character.id, trimmed);
    setRenameOpen(false);
    toast.success("Character renamed");
  };

  const handleDelete = () => {
    if (character.isSeeded) {
      toast.error("Built-in characters cannot be deleted.");
      return;
    }
    if (!confirm(`Delete "${character.name}"?`)) return;
    deleteAnimeCharacter(character.id);
    toast.success("Character deleted");
    router.push(`/anime-collection/${seriesSlug}`);
  };

  return (
    <>
      <Link
        href={`/anime-collection/${seriesSlug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {series.name}
      </Link>

      <div className="mx-auto flex max-w-md flex-col items-center pt-4">
        <div
          className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-border/80 shadow-lg"
          style={
            !character.imageUrl && character.accentColor
              ? {
                  background: `linear-gradient(135deg, ${character.accentColor}, hsl(0 0% 16%))`,
                }
              : undefined
          }
        >
          {character.imageUrl ? (
            <CardImage
              src={character.imageUrl}
              alt={character.name}
              fill
              sizes="160px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white/90">
              {initials}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {character.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{series.name}</p>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRenameName(character.name);
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit name
          </Button>
          {!character.isSeeded && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>

        <div className="mt-10 w-full rounded-xl border border-border/70 bg-card/50">
          <EmptyState
            icon={PackageOpen}
            title="Items coming soon"
            description="Figures, merch, links to TCG cards, and more will appear here in a future update."
          />
        </div>
      </div>

      <Modal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Edit character"
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
          <Label htmlFor="rename-char">Name</Label>
          <Input
            id="rename-char"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
