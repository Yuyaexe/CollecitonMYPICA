import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cards,
  collections,
  games,
  ownedCards,
  profiles,
  wishlists,
} from "@/lib/db/schema";
import {
  toDemoCollection,
  toDemoOwnedCard,
  toDemoProfile,
  marketPriceMetadata,
} from "@/lib/data/mappers";
import type { DemoCollection, DemoOwnedCard, DemoProfile } from "@/lib/demo/types";
import type { CardCondition, CardLanguage } from "@/types/tcg";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";

function requireDb() {
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db;
}

export async function getAppState(userId: string) {
  const database = requireDb();

  const [profileRow] = await database
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const collectionRows = await database
    .select()
    .from(collections)
    .where(eq(collections.userId, userId));

  const collectionIds = collectionRows.map((c) => c.id);

  let ownedRows: DemoOwnedCard[] = [];
  if (collectionIds.length > 0) {
    const rows = await database
      .select({ owned: ownedCards, card: cards, game: games })
      .from(ownedCards)
      .innerJoin(cards, eq(ownedCards.cardId, cards.id))
      .innerJoin(games, eq(cards.gameId, games.id))
      .where(inArray(ownedCards.collectionId, collectionIds));

    ownedRows = rows.map((r) => toDemoOwnedCard(r.owned, r.card, r.game));
  }

  const wishlistRows = await database
    .select({ cardId: wishlists.cardId })
    .from(wishlists)
    .where(eq(wishlists.userId, userId));

  const profile: DemoProfile = profileRow
    ? toDemoProfile(profileRow)
    : {
        displayName: "Collector",
        currency: "USD",
        theme: "dark",
        defaultGameId: null,
      };

  const demoCollections: DemoCollection[] = collectionRows.map(toDemoCollection);

  return {
    profile,
    collections: demoCollections,
    ownedCards: ownedRows,
    wishlistCardIds: wishlistRows.map((w) => w.cardId),
    tags: [] as { id: string; name: string; color: string }[],
  };
}

export async function updateProfile(userId: string, updates: Partial<DemoProfile>) {
  const database = requireDb();
  await database
    .insert(profiles)
    .values({
      userId,
      displayName: updates.displayName ?? "Collector",
      currency: updates.currency ?? "USD",
      theme: updates.theme ?? "dark",
      defaultGameId: updates.defaultGameId ?? null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        ...(updates.displayName !== undefined && { displayName: updates.displayName }),
        ...(updates.currency !== undefined && { currency: updates.currency }),
        ...(updates.theme !== undefined && { theme: updates.theme }),
        ...(updates.defaultGameId !== undefined && { defaultGameId: updates.defaultGameId }),
        updatedAt: new Date(),
      },
    });
}

export async function createCollection(userId: string, name: string) {
  const database = requireDb();
  const [row] = await database
    .insert(collections)
    .values({ userId, name, isDefault: false, isFavorite: false })
    .returning();
  return toDemoCollection(row);
}

export async function updateCollection(
  id: string,
  userId: string,
  updates: { isFavorite?: boolean; name?: string }
) {
  const database = requireDb();
  const [row] = await database
    .update(collections)
    .set({
      ...(updates.isFavorite !== undefined && { isFavorite: updates.isFavorite }),
      ...(updates.name !== undefined && { name: updates.name }),
      updatedAt: new Date(),
    })
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning();
  return row ? toDemoCollection(row) : null;
}

export async function toggleCollectionFavorite(id: string, userId: string) {
  const database = requireDb();
  const [existing] = await database
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1);
  if (!existing) return null;
  return updateCollection(id, userId, { isFavorite: !existing.isFavorite });
}

async function findOrCreateCard(
  gameId: string,
  result: CardSearchResult,
  gameSlug: string
) {
  const database = requireDb();
  if (result.externalId) {
    const [existing] = await database
      .select()
      .from(cards)
      .where(and(eq(cards.gameId, gameId), eq(cards.externalId, result.externalId)))
      .limit(1);
    if (existing) {
      await database
        .update(cards)
        .set({
          name: result.name,
          setCode: result.setCode,
          setName: result.setName,
          collectorNumber: result.collectorNumber,
          rarity: result.rarity,
          imageUrl: result.imageUrl,
          metadata: marketPriceMetadata(result.price),
          updatedAt: new Date(),
        })
        .where(eq(cards.id, existing.id));
      return existing.id;
    }
  }

  const [inserted] = await database
    .insert(cards)
    .values({
      gameId,
      externalId: result.externalId,
      name: result.name,
      setCode: result.setCode,
      setName: result.setName,
      collectorNumber: result.collectorNumber,
      rarity: result.rarity,
      imageUrl: result.imageUrl,
      metadata: marketPriceMetadata(result.price),
    })
    .returning({ id: cards.id });
  return inserted.id;
}

export async function addCardFromSearch(
  userId: string,
  collectionId: string,
  result: CardSearchResult,
  gameId: string,
  _gameSlug: string,
  _gameName: string
) {
  const database = requireDb();

  const [collection] = await database
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1);
  if (!collection) throw new Error("Collection not found");

  const cardId = await findOrCreateCard(gameId, result, _gameSlug);

  if (result.externalId) {
    const existingOwned = await database
      .select({ owned: ownedCards })
      .from(ownedCards)
      .innerJoin(cards, eq(ownedCards.cardId, cards.id))
      .where(
        and(
          eq(ownedCards.collectionId, collectionId),
          eq(cards.externalId, result.externalId),
          eq(cards.gameId, gameId)
        )
      )
      .limit(1);

    if (existingOwned.length > 0) {
      await database
        .update(ownedCards)
        .set({ quantity: existingOwned[0].owned.quantity + 1, updatedAt: new Date() })
        .where(eq(ownedCards.id, existingOwned[0].owned.id));
      return;
    }
  }

  await database.insert(ownedCards).values({
    collectionId,
    cardId,
    quantity: 1,
    condition: "NM",
    language: "EN",
    isFoil: false,
  });
}

export async function updateOwnedCard(
  userId: string,
  id: string,
  updates: {
    quantity?: number;
    condition?: CardCondition;
    language?: CardLanguage;
    isFoil?: boolean;
    purchasePrice?: number | null;
    notes?: string | null;
    card?: { marketPrice?: number | null };
  }
) {
  const database = requireDb();

  const [row] = await database
    .select({ owned: ownedCards, collection: collections })
    .from(ownedCards)
    .innerJoin(collections, eq(ownedCards.collectionId, collections.id))
    .where(and(eq(ownedCards.id, id), eq(collections.userId, userId)))
    .limit(1);

  if (!row) throw new Error("Owned card not found");

  await database
    .update(ownedCards)
    .set({
      ...(updates.quantity !== undefined && { quantity: updates.quantity }),
      ...(updates.condition !== undefined && { condition: updates.condition }),
      ...(updates.language !== undefined && { language: updates.language }),
      ...(updates.isFoil !== undefined && { isFoil: updates.isFoil }),
      ...(updates.purchasePrice !== undefined && {
        purchasePrice: updates.purchasePrice?.toString() ?? null,
      }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      updatedAt: new Date(),
    })
    .where(eq(ownedCards.id, id));

  if (updates.card?.marketPrice !== undefined) {
    await database
      .update(cards)
      .set({
        metadata: marketPriceMetadata(updates.card.marketPrice),
        updatedAt: new Date(),
      })
      .where(eq(cards.id, row.owned.cardId));
  }
}

export async function deleteOwnedCards(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const database = requireDb();

  const owned = await database
    .select({ id: ownedCards.id })
    .from(ownedCards)
    .innerJoin(collections, eq(ownedCards.collectionId, collections.id))
    .where(and(eq(collections.userId, userId), inArray(ownedCards.id, ids)));

  const allowedIds = owned.map((o) => o.id);
  if (allowedIds.length === 0) return;

  await database.delete(ownedCards).where(inArray(ownedCards.id, allowedIds));
}

export async function importRows(
  userId: string,
  collectionId: string,
  rows: Array<{
    name: string;
    set?: string;
    quantity: number;
    condition: CardCondition;
    language: CardLanguage;
    gameId: string;
    gameSlug: string;
    gameName: string;
    isFoil?: boolean;
    purchasePrice?: number;
  }>,
  mergeDuplicates: boolean
) {
  const database = requireDb();

  const [collection] = await database
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1);
  if (!collection) throw new Error("Collection not found");

  let imported = 0;

  for (const row of rows) {
    if (mergeDuplicates) {
      const existingRows = await database
        .select({ owned: ownedCards, card: cards })
        .from(ownedCards)
        .innerJoin(cards, eq(ownedCards.cardId, cards.id))
        .where(
          and(eq(ownedCards.collectionId, collectionId), eq(cards.gameId, row.gameId))
        );

      const duplicate = existingRows.find(
        (e) =>
          e.card.name.toLowerCase() === row.name.toLowerCase() &&
          (e.card.setName ?? "").toLowerCase() === (row.set ?? "").toLowerCase()
      );

      if (duplicate) {
        await database
          .update(ownedCards)
          .set({
            quantity: duplicate.owned.quantity + row.quantity,
            updatedAt: new Date(),
          })
          .where(eq(ownedCards.id, duplicate.owned.id));
        imported++;
        continue;
      }
    }

    const [cardRow] = await database
      .insert(cards)
      .values({
        gameId: row.gameId,
        name: row.name,
        setName: row.set ?? null,
      })
      .returning({ id: cards.id });

    await database.insert(ownedCards).values({
      collectionId,
      cardId: cardRow.id,
      quantity: row.quantity,
      condition: row.condition,
      language: row.language,
      isFoil: row.isFoil ?? false,
      purchasePrice: row.purchasePrice?.toString(),
    });
    imported++;
  }

  return imported;
}

export async function toggleWishlist(userId: string, cardId: string) {
  const database = requireDb();
  const [existing] = await database
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.cardId, cardId)))
    .limit(1);

  if (existing) {
    await database
      .delete(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.cardId, cardId)));
    return false;
  }

  await database.insert(wishlists).values({ userId, cardId });
  return true;
}
