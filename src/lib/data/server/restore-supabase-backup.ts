import type { SupabaseClient } from "@supabase/supabase-js";
import { marketPriceMetadata } from "@/lib/data/mappers";
import type { DeckVaultBackup } from "@/features/import/services/backup-export";
import type { DemoCard } from "@/lib/demo/types";
import { updateSupabaseProfile } from "@/lib/data/server/supabase-service";

async function findOrCreateSupabaseCardFromDemo(
  supabase: SupabaseClient,
  card: DemoCard
): Promise<string> {
  if (card.externalId) {
    const { data: existing } = await supabase
      .from("cards")
      .select("id")
      .eq("game_id", card.gameId)
      .eq("external_id", card.externalId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("cards")
        .update({
          name: card.name,
          set_code: card.setCode,
          set_name: card.setName,
          collector_number: card.collectorNumber,
          rarity: card.rarity,
          image_url: card.imageUrl,
          metadata: marketPriceMetadata(card.marketPrice),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return existing.id;
    }
  }

  const { data: inserted, error } = await supabase
    .from("cards")
    .insert({
      game_id: card.gameId,
      external_id: card.externalId,
      name: card.name,
      set_code: card.setCode,
      set_name: card.setName,
      collector_number: card.collectorNumber,
      rarity: card.rarity,
      image_url: card.imageUrl,
      metadata: marketPriceMetadata(card.marketPrice),
    })
    .select("id")
    .single();
  if (error) throw error;
  return inserted.id;
}

function catalogKey(card: DemoCard): string {
  return `${card.gameId}:${card.externalId ?? card.name}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

export async function restoreSupabaseBackup(
  supabase: SupabaseClient,
  userId: string,
  backup: DeckVaultBackup
) {
  await updateSupabaseProfile(supabase, userId, {
    displayName: backup.profile.displayName,
    currency: backup.profile.currency,
    defaultGameId: backup.profile.defaultGameId,
  });

  const { data: userCollections, error: colErr } = await supabase
    .from("collections")
    .select("id, name")
    .eq("user_id", userId);
  if (colErr) throw colErr;

  const collectionMap = new Map<string, string>();
  for (const bc of backup.collections) {
    const match = (userCollections ?? []).find((c) => c.name === bc.name);
    if (match) {
      collectionMap.set(bc.id, match.id);
    } else {
      const { data: created, error } = await supabase
        .from("collections")
        .insert({
          user_id: userId,
          name: bc.name,
          is_default: bc.isDefault,
          is_favorite: bc.isFavorite,
        })
        .select("id")
        .single();
      if (error) throw error;
      collectionMap.set(bc.id, created.id);
    }
  }

  const uniqueCards = new Map<string, DemoCard>();
  for (const oc of backup.ownedCards) {
    const key = catalogKey(oc.card);
    if (!uniqueCards.has(key)) uniqueCards.set(key, oc.card);
  }

  const catalogEntries = [...uniqueCards.entries()];
  const resolvedIds = await mapWithConcurrency(catalogEntries, 12, async ([, card]) =>
    findOrCreateSupabaseCardFromDemo(supabase, card)
  );

  const catalogIdByKey = new Map<string, string>();
  catalogEntries.forEach(([key], i) => {
    catalogIdByKey.set(key, resolvedIds[i]!);
  });

  type AggregatedOwned = {
    collectionId: string;
    cardId: string;
    quantity: number;
    condition: string;
    language: string;
    isFoil: boolean;
    purchasePrice: number | null;
    notes: string | null;
  };

  const aggregated = new Map<string, AggregatedOwned>();

  for (const oc of backup.ownedCards) {
    const collectionId = collectionMap.get(oc.collectionId);
    const cardId = catalogIdByKey.get(catalogKey(oc.card));
    if (!collectionId || !cardId) continue;

    const aggKey = `${collectionId}:${cardId}`;
    const existing = aggregated.get(aggKey);
    if (existing) {
      existing.quantity += oc.quantity;
      continue;
    }

    aggregated.set(aggKey, {
      collectionId,
      cardId,
      quantity: oc.quantity,
      condition: oc.condition,
      language: oc.language,
      isFoil: oc.isFoil,
      purchasePrice: oc.purchasePrice,
      notes: oc.notes,
    });
  }

  const rows = [...aggregated.values()];
  let importedCards = 0;

  await mapWithConcurrency(rows, 8, async (row) => {
    const { data: existingOwned } = await supabase
      .from("owned_cards")
      .select("id, quantity")
      .eq("collection_id", row.collectionId)
      .eq("card_id", row.cardId)
      .maybeSingle();

    if (existingOwned) {
      const { error } = await supabase
        .from("owned_cards")
        .update({
          quantity: existingOwned.quantity + row.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOwned.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("owned_cards").insert({
        collection_id: row.collectionId,
        card_id: row.cardId,
        quantity: row.quantity,
        condition: row.condition,
        language: row.language,
        is_foil: row.isFoil,
        purchase_price: row.purchasePrice,
        notes: row.notes,
      });
      if (error) throw error;
    }
    importedCards++;
  });

  return { importedCards, collections: backup.collections.length };
}
