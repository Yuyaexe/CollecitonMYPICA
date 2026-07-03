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
          is_default: false,
          is_favorite: bc.isFavorite,
        })
        .select("id")
        .single();
      if (error) throw error;
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
      cardId = await findOrCreateSupabaseCardFromDemo(supabase, oc.card);
      cardIdMap.set(oc.cardId, cardId);
    }

    const { data: existingOwned } = await supabase
      .from("owned_cards")
      .select("id, quantity")
      .eq("collection_id", collectionId)
      .eq("card_id", cardId)
      .maybeSingle();

    if (existingOwned) {
      await supabase
        .from("owned_cards")
        .update({
          quantity: existingOwned.quantity + oc.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOwned.id);
    } else {
      const { error } = await supabase.from("owned_cards").insert({
        collection_id: collectionId,
        card_id: cardId,
        quantity: oc.quantity,
        condition: oc.condition,
        language: oc.language,
        is_foil: oc.isFoil,
        purchase_price: oc.purchasePrice,
        notes: oc.notes,
      });
      if (error) throw error;
    }
    importedCards++;
  }

  return { importedCards, collections: backup.collections.length };
}
