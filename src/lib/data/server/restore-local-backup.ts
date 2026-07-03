import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, collections, ownedCards } from "@/lib/db/schema";
import { marketPriceMetadata } from "@/lib/data/mappers";
import type { DeckVaultBackup } from "@/features/import/services/backup-export";
import type { DemoCard } from "@/lib/demo/types";
import {
  createCollection,
  updateProfile,
} from "@/lib/data/server/collection-service";

function requireDb() {
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db;
}

async function findOrCreateCard(database: NonNullable<typeof db>, card: DemoCard): Promise<string> {
  if (card.externalId) {
    const [existing] = await database
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.externalId, card.externalId), eq(cards.gameId, card.gameId)))
      .limit(1);
    if (existing) {
      await database
        .update(cards)
        .set({
          name: card.name,
          setCode: card.setCode,
          setName: card.setName,
          collectorNumber: card.collectorNumber,
          rarity: card.rarity,
          imageUrl: card.imageUrl,
          metadata: marketPriceMetadata(card.marketPrice),
          updatedAt: new Date(),
        })
        .where(eq(cards.id, existing.id));
      return existing.id;
    }
  }

  const [inserted] = await database
    .insert(cards)
    .values({
      gameId: card.gameId,
      externalId: card.externalId,
      name: card.name,
      setCode: card.setCode,
      setName: card.setName,
      collectorNumber: card.collectorNumber,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
      metadata: marketPriceMetadata(card.marketPrice),
    })
    .returning({ id: cards.id });
  return inserted.id;
}

export async function restoreLocalBackup(userId: string, backup: DeckVaultBackup) {
  const database = requireDb();

  await updateProfile(userId, {
    displayName: backup.profile.displayName,
    currency: backup.profile.currency,
    defaultGameId: backup.profile.defaultGameId,
  });

  const userCollections = await database
    .select()
    .from(collections)
    .where(eq(collections.userId, userId));

  const collectionMap = new Map<string, string>();
  for (const bc of backup.collections) {
    const match = userCollections.find((c) => c.name === bc.name);
    if (match) {
      collectionMap.set(bc.id, match.id);
    } else {
      const created = await createCollection(userId, bc.name);
      collectionMap.set(bc.id, created.id);
    }
  }

  const cardIdMap = new Map<string, string>();
  let importedCards = 0;

  for (const oc of backup.ownedCards) {
    const collectionId = collectionMap.get(oc.collectionId);
    if (!collectionId) continue;

    let cardId = cardIdMap.get(oc.cardId);
    if (!cardId) {
      cardId = await findOrCreateCard(database, oc.card);
      cardIdMap.set(oc.cardId, cardId);
    }

    const existingRows = await database
      .select({ owned: ownedCards })
      .from(ownedCards)
      .where(and(eq(ownedCards.collectionId, collectionId), eq(ownedCards.cardId, cardId)))
      .limit(1);

    if (existingRows[0]) {
      await database
        .update(ownedCards)
        .set({
          quantity: existingRows[0].owned.quantity + oc.quantity,
          updatedAt: new Date(),
        })
        .where(eq(ownedCards.id, existingRows[0].owned.id));
    } else {
      await database.insert(ownedCards).values({
        collectionId,
        cardId,
        quantity: oc.quantity,
        condition: oc.condition,
        language: oc.language,
        isFoil: oc.isFoil,
        purchasePrice: oc.purchasePrice?.toString() ?? null,
        notes: oc.notes,
      });
    }
    importedCards++;
  }

  return { importedCards, collections: backup.collections.length };
}
