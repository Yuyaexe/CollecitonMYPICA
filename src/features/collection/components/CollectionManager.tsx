"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CollectionGridCard } from "@/components/shared/CollectionGridCard";
import { CreateCollectionCard } from "@/components/shared/CreateCollectionCard";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/lib/demo/store";
import type { DemoCollection, DemoOwnedCard } from "@/lib/demo/types";

function getCollectionCover(
  collection: DemoCollection,
  ownedCards: DemoOwnedCard[]
): string | null {
  if (collection.coverImageUrl) return collection.coverImageUrl;
  const first = ownedCards.find(
    (oc) => oc.collectionId === collection.id && oc.card.imageUrl
  );
  return first?.card.imageUrl ?? null;
}

export function CollectionManager() {
  const router = useRouter();
  const collections = useDemoStore((s) => s.collections);
  const ownedCards = useDemoStore((s) => s.ownedCards);
  const activeCollectionId = useDemoStore((s) => s.activeCollectionId);
  const setActiveCollection = useDemoStore((s) => s.setActiveCollection);
  const addCollection = useDemoStore((s) => s.addCollection);
  const toggleCollectionFavorite = useDemoStore((s) => s.toggleCollectionFavorite);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      const aFav = a.isFavorite ?? false;
      const bFav = b.isFavorite ?? false;
      if (aFav !== bFav) return aFav ? -1 : 1;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [collections]);

  const cardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const oc of ownedCards) {
      counts.set(oc.collectionId, (counts.get(oc.collectionId) ?? 0) + oc.quantity);
    }
    return counts;
  }, [ownedCards]);

  const handleSelect = (id: string) => {
    setActiveCollection(id);
    router.push("/collection");
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCollection(trimmed);
    setNewName("");
    setCreateOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {sortedCollections.map((collection, index) => (
          <CollectionGridCard
            key={collection.id}
            name={collection.name}
            coverImageUrl={getCollectionCover(collection, ownedCards)}
            cardCount={cardCounts.get(collection.id) ?? 0}
            isFavorite={collection.isFavorite ?? collection.isDefault}
            isActive={collection.id === activeCollectionId}
            index={index}
            onSelect={() => handleSelect(collection.id)}
            onToggleFavorite={() => toggleCollectionFavorite(collection.id)}
          />
        ))}
        <CreateCollectionCard
          index={sortedCollections.length}
          onClick={() => setCreateOpen(true)}
        />
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Collection"
        description="Give your collection a name. You can add cards after opening it."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="collection-name">Collection name</Label>
          <Input
            id="collection-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Yu-Gi-Oh! Main Deck"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
