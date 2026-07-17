"use client";

import { useRouter } from "next/navigation";
import { Download, Layers, PackageOpen, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CharacterCardsView } from "@/features/anime-collection/components/CharacterCardsView";
import { AnimeCollectionBreadcrumb } from "@/features/anime-collection/components/AnimeCollectionBreadcrumb";
import { CharacterWheel } from "@/features/anime-collection/components/CharacterWheel";
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
import { AnimeYugiohPasscodeSync } from "@/features/anime-collection/hooks/useAnimeYugiohPasscodeSync";
import { YugiohPasscodeProvider } from "@/features/collection/context/yugioh-passcode-context";
import { useAppData } from "@/hooks/useAppData";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/context";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface CharacterDetailPageProps {
  seriesSlug: string;
  characterId: string;
}

export function CharacterDetailPage({
  seriesSlug,
  characterId,
}: CharacterDetailPageProps) {
  const t = useT();
  const router = useRouter();
  const { profile } = useAppData();
  const {
    getSeriesBySlug,
    getCharacterById,
    getCharactersForSeries,
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
  const seriesCharacters = series ? getCharactersForSeries(series.id) : [];
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

  const ownedForPasscodes = useMemo(
    () => characterCards.map(animeCharacterCardToOwned),
    [characterCards]
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

  if (!series || !character || character.seriesId !== series.id) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={t("anime.characterNotFoundTitle")}
        description={t("anime.characterNotFoundDescription")}
        actionLabel={t("anime.backToSeries")}
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
    toast.success(t("anime.characterRenamed"));
  };

  const handleDelete = () => {
    if (character.isSeeded) {
      toast.error(t("anime.builtinNoDelete"));
      return;
    }
    if (!confirm(t("anime.deleteCharacterConfirm", { name: character.name }))) return;
    deleteAnimeCharacter(character.id);
    toast.success(t("anime.characterDeleted"));
    router.push(`/anime-collection/${seriesSlug}`);
  };

  const handleRemoveCard = (cardId: string) => {
    removeAnimeCharacterCard(cardId);
    toast.success(t("anime.cardRemoved"));
  };

  return (
    <YugiohPasscodeProvider cards={ownedForPasscodes}>
      <AnimeYugiohPasscodeSync cards={characterCards} onUpdate={updateAnimeCharacterCard}>
    <>
      <AnimeCollectionBreadcrumb
        items={[
          { label: t("anime.title"), href: "/anime-collection" },
          { label: series.name, href: `/anime-collection/${seriesSlug}` },
          { label: character.name },
        ]}
      />

      <CharacterWheel
        characters={seriesCharacters}
        activeCharacterId={character.id}
        seriesSlug={seriesSlug}
      />

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
              {t("common.delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("anime.cardsSection")}</h2>
            <p className="text-sm text-muted-foreground">
              {characterCards.length === 0
                ? t("anime.noCardsLinked")
                : characterCards.length === 1
                  ? `1 ${t("common.cards").replace(/s$/, "")}`
                  : `${characterCards.length} ${t("common.cards")}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setExportOpen(true)}
              disabled={characterCards.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {t("anime.exportCharacterDeck")}
            </Button>
            <Button onClick={() => setAddCardOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("anime.addCard")}
            </Button>
          </div>
        </div>

        {characterCards.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card/50">
            <EmptyState
              icon={Layers}
              title={t("anime.noCardsTitle")}
              description={t("anime.noCardsDescription")}
              actionLabel={t("anime.addCard")}
              onAction={() => setAddCardOpen(true)}
            />
          </div>
        ) : (
          <CharacterCardsView
            cards={characterCards}
            onRemove={handleRemoveCard}
            onQuantityChange={updateAnimeCharacterCardQuantity}
            onOpenCard={(item) => setInspectCardId(item.id)}
            onReorder={(draggedId, targetId) =>
              reorderAnimeCharacterCard(character.id, draggedId, targetId)
            }
            onReorderToIndex={(draggedId, targetIndex) =>
              reorderAnimeCharacterCardToIndex(character.id, draggedId, targetIndex)
            }
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
        title={t("anime.exportCharacterDeck")}
        description={t("anime.exportCharacterDeckDescription")}
      />

      <QuickAddModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        title={t("anime.addCard")}
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
        title={t("anime.editCharacter")}
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
          <Label htmlFor="rename-char">{t("common.name")}</Label>
          <Input
            id="rename-char"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </>
      </AnimeYugiohPasscodeSync>
    </YugiohPasscodeProvider>
  );
}
