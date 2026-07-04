"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Layers, PackageOpen, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CharacterCardsView } from "@/features/anime-collection/components/CharacterCardsView";
import {
  CharacterAvatar,
  EditCharacterPhotoModal,
} from "@/features/anime-collection/components/EditCharacterPhotoModal";
import { QuickAddModal } from "@/features/collection/components/QuickAddModal";
import { ExportDeckModal } from "@/features/import/components/ExportDeckModal";
import { CardInspectDialog } from "@/components/shared/CardInspectDialog";
import { useAnimeCollection } from "@/features/anime-collection/hooks/useAnimeCollection";
import {
  animeCharacterCardToOwned,
  ownedUpdatesToAnimeCharacter,
} from "@/features/anime-collection/utils/character-card-inspect";
import { useCharacterCardTraderSync } from "@/features/anime-collection/hooks/useCharacterCardTraderSync";
import {
  useCardTraderPrices,
  resolveDisplayPrice,
  resolveCardTraderImage,
} from "@/features/market/hooks/useCardTraderPrices";
import { useAppData } from "@/hooks/useAppData";
import { useDemoStore } from "@/lib/demo/store";
import { useMemo, useState, useCallback } from "react";
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
  const { profile } = useAppData();
  const {
    getSeriesBySlug,
    getCharacterById,
    renameAnimeCharacter,
    updateAnimeCharacterImage,
    deleteAnimeCharacter,
    addAnimeCharacterCardFromSearch,
    removeAnimeCharacterCard,
    updateAnimeCharacterCardQuantity,
    updateAnimeCharacterCard,
    reorderAnimeCharacterCard,
    reorderAnimeCharacterCardToIndex,
  } = useAnimeCollection();

  const series = getSeriesBySlug(seriesSlug);
  const character = getCharacterById(characterId);
  const animeCharacterCards = useDemoStore((s) => s.animeCharacterCards);
  const characterCards = useMemo(
    () =>
      character
        ? animeCharacterCards
            .filter((c) => c.characterId === character.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [character, animeCharacterCards]
  );

  const ownedForPrices = useMemo(
    () => characterCards.map(animeCharacterCardToOwned),
    [characterCards]
  );

  const { data: cardTraderPrices } = useCardTraderPrices(
    ownedForPrices,
    profile.currency,
    characterCards.length > 0
  );

  const resolvePrice = useCallback(
    (item: (typeof characterCards)[number]) =>
      resolveDisplayPrice(animeCharacterCardToOwned(item), cardTraderPrices, profile.currency),
    [cardTraderPrices, profile.currency]
  );

  const resolveImage = useCallback(
    (item: (typeof characterCards)[number]) =>
      resolveCardTraderImage(animeCharacterCardToOwned(item), cardTraderPrices),
    [cardTraderPrices]
  );

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [inspectCardId, setInspectCardId] = useState<string | null>(null);

  const exportCards = useMemo(
    () => characterCards.map(animeCharacterCardToOwned),
    [characterCards]
  );

  const inspectEntry = useMemo(
    () => characterCards.find((c) => c.id === inspectCardId) ?? null,
    [characterCards, inspectCardId]
  );

  useCharacterCardTraderSync(characterCards, profile.currency, updateAnimeCharacterCard);

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

  const handleRemoveCard = (cardId: string) => {
    removeAnimeCharacterCard(cardId);
    toast.success("Card removed");
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

      <div className="mx-auto flex max-w-lg flex-col items-center pt-4">
        <CharacterAvatar
          name={character.name}
          imageUrl={character.imageUrl}
          accentColor={character.accentColor}
          editable
          onEdit={() => setPhotoOpen(true)}
        />

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {character.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{series.name}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPhotoOpen(true)}>
            Change photo
          </Button>
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
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Cards</h2>
            <p className="text-sm text-muted-foreground">
              {characterCards.length === 0
                ? "No cards linked to this character yet"
                : characterCards.length === 1
                  ? "1 card"
                  : `${characterCards.length} cards`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setExportOpen(true)}
              disabled={characterCards.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Exportar deck
            </Button>
            <Button onClick={() => setAddCardOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add card
            </Button>
          </div>
        </div>

        {characterCards.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card/50">
            <EmptyState
              icon={Layers}
              title="No cards yet"
              description="Search the catalog and add TCG cards associated with this character."
              actionLabel="Add card"
              onAction={() => setAddCardOpen(true)}
            />
          </div>
        ) : (
          <CharacterCardsView
            cards={characterCards}
            currency={profile.currency}
            onRemove={handleRemoveCard}
            onQuantityChange={updateAnimeCharacterCardQuantity}
            onOpenCard={(item) => setInspectCardId(item.id)}
            onReorder={(draggedId, targetId) =>
              reorderAnimeCharacterCard(character.id, draggedId, targetId)
            }
            onReorderToIndex={(draggedId, targetIndex) =>
              reorderAnimeCharacterCardToIndex(character.id, draggedId, targetIndex)
            }
            resolvePrice={resolvePrice}
            resolveImage={resolveImage}
          />
        )}
      </div>

      <CardInspectDialog
        card={inspectEntry ? animeCharacterCardToOwned(inspectEntry) : null}
        open={!!inspectCardId && !!inspectEntry}
        onOpenChange={(open) => {
          if (!open) setInspectCardId(null);
        }}
        currency={profile.currency}
        onUpdate={(id, updates) => updateAnimeCharacterCard(id, ownedUpdatesToAnimeCharacter(updates))}
        onDelete={(ids) => {
          ids.forEach((id) => removeAnimeCharacterCard(id));
          setInspectCardId(null);
        }}
      />

      <ExportDeckModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        cards={exportCards}
        collectionName={`${character.name}_deck`}
        title="Exportar deck do personagem"
        description="TXT, YDK ou YDKE para EDOPro e CardTrader"
      />

      <QuickAddModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        title="Add card"
        defaultGameSlug="yugioh"
        closeOnAdd={false}
        onAdd={(result, game) => {
          addAnimeCharacterCardFromSearch(
            character.id,
            result,
            game.id,
            game.slug,
            game.name
          );
        }}
      />

      <EditCharacterPhotoModal
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        characterName={character.name}
        currentImageUrl={character.imageUrl}
        accentColor={character.accentColor}
        onSave={(url) => updateAnimeCharacterImage(character.id, url)}
      />

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
