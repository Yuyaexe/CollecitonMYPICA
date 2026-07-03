import type { SupabaseClient } from "@supabase/supabase-js";
import { toDemoCard, toDemoCollection, toDemoOwnedCard, toDemoProfile, marketPriceMetadata } from "@/lib/data/mappers";
import type { DemoCollection, DemoOwnedCard, DemoProfile } from "@/lib/demo/types";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage } from "@/types/tcg";

type CardJoin = {
  id: string;
  game_id: string;
  external_id: string | null;
  name: string;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  rarity: string | null;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  games: { id: string; slug: string; name: string };
};

type OwnedJoin = {
  id: string;
  collection_id: string;
  card_id: string;
  quantity: number;
  condition: string;
  language: string;
  is_foil: boolean;
  purchase_price: string | null;
  notes: string | null;
  cards: CardJoin;
};

function mapOwned(row: OwnedJoin): DemoOwnedCard {
  const card = row.cards;
  return toDemoOwnedCard(
    {
      id: row.id,
      collectionId: row.collection_id,
      cardId: row.card_id,
      quantity: row.quantity,
      condition: row.condition,
      language: row.language,
      isFoil: row.is_foil,
      purchasePrice: row.purchase_price,
      notes: row.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: card.id,
      gameId: card.game_id,
      externalId: card.external_id,
      name: card.name,
      setCode: card.set_code,
      setName: card.set_name,
      collectorNumber: card.collector_number,
      rarity: card.rarity,
      imageUrl: card.image_url,
      metadata: card.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { id: card.games.id, slug: card.games.slug, name: card.games.name, createdAt: new Date() }
  );
}

export async function getSupabaseAppState(supabase: SupabaseClient, userId: string) {
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: collectionRows, error: colErr } = await supabase
    .from("collections")
    .select("*")
    .order("name");
  if (colErr) throw colErr;

  const collectionIds = (collectionRows ?? []).map((c) => c.id);
  let ownedRows: DemoOwnedCard[] = [];

  if (collectionIds.length > 0) {
    const { data: owned, error: ownedErr } = await supabase
      .from("owned_cards")
      .select(
        "id, collection_id, card_id, quantity, condition, language, is_foil, purchase_price, notes, cards(id, game_id, external_id, name, set_code, set_name, collector_number, rarity, image_url, metadata, games(id, slug, name))"
      )
      .in("collection_id", collectionIds);
    if (ownedErr) throw ownedErr;
    ownedRows = ((owned ?? []) as unknown as OwnedJoin[]).map(mapOwned);
  }

  const profile: DemoProfile = profileRow
    ? toDemoProfile({
        userId: profileRow.user_id,
        displayName: profileRow.display_name,
        avatarUrl: profileRow.avatar_url,
        defaultGameId: profileRow.default_game_id,
        currency: profileRow.currency,
        theme: profileRow.theme,
        createdAt: new Date(profileRow.created_at),
        updatedAt: new Date(profileRow.updated_at),
      })
    : {
        displayName: "Collector",
        currency: "USD",
        theme: "dark",
        defaultGameId: null,
      };

  const collections: DemoCollection[] = (collectionRows ?? []).map((c) =>
    toDemoCollection({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      isDefault: c.is_default,
      isFavorite: c.is_favorite ?? false,
      coverImageUrl: c.cover_image_url ?? null,
      createdAt: new Date(c.created_at),
      updatedAt: new Date(c.updated_at),
    })
  );

  return {
    profile,
    collections,
    ownedCards: ownedRows,
    tags: [] as { id: string; name: string; color: string }[],
  };
}

export async function updateSupabaseProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<DemoProfile>
) {
  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    display_name: updates.displayName,
    currency: updates.currency,
    theme: updates.theme,
    default_game_id: updates.defaultGameId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function createSupabaseCollection(
  supabase: SupabaseClient,
  _userId: string,
  name: string
) {
  type CollectionRow = {
    id: string;
    user_id: string;
    name: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
  };

  const trimmed = name.trim();

  const { data: rpcRow, error: rpcError } = await supabase
    .rpc("create_collection", { p_name: trimmed })
    .maybeSingle<CollectionRow>();

  if (!rpcError && rpcRow) {
    return toDemoCollection({
      id: rpcRow.id,
      userId: rpcRow.user_id,
      name: rpcRow.name,
      isDefault: rpcRow.is_default,
      isFavorite: false,
      coverImageUrl: null,
      createdAt: new Date(rpcRow.created_at),
      updatedAt: new Date(rpcRow.updated_at),
    });
  }

  const rpcMissing =
    rpcError?.code === "42883" ||
    rpcError?.code === "PGRST202" ||
    rpcError?.message?.includes("create_collection");

  if (!rpcMissing) {
    throw rpcError ?? new Error("Failed to create collection");
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: _userId, name: trimmed, is_default: false })
    .select("id, user_id, name, is_default, created_at, updated_at")
    .single();
  if (error) throw error;

  return toDemoCollection({
    id: data.id,
    userId: data.user_id,
    name: data.name,
    isDefault: data.is_default,
    isFavorite: false,
    coverImageUrl: null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  });
}

export async function toggleSupabaseCollectionFavorite(
  supabase: SupabaseClient,
  id: string
) {
  const { data: existing } = await supabase
    .from("collections")
    .select("is_favorite")
    .eq("id", id)
    .single();
  if (!existing) throw new Error("Collection not found");

  const { error } = await supabase
    .from("collections")
    .update({ is_favorite: !existing.is_favorite, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function inviteToCollection(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  email: string
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email required");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownEmail = user?.email?.trim().toLowerCase();
  if (ownEmail && ownEmail === normalized) {
    throw new Error("Use o email de um amigo — você já é o dono desta coleção");
  }

  const { data: owned } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!owned) throw new Error("Only the collection owner can invite");

  const { error } = await supabase.from("collection_invites").upsert(
    {
      collection_id: collectionId,
      email: normalized,
      role: "editor",
      invited_by: userId,
    },
    { onConflict: "collection_id,email" }
  );
  if (error) throw error;
}

async function findOrCreateSupabaseCard(
  supabase: SupabaseClient,
  gameId: string,
  result: CardSearchResult
): Promise<string> {
  if (result.externalId) {
    const { data: existing } = await supabase
      .from("cards")
      .select("id")
      .eq("game_id", gameId)
      .eq("external_id", result.externalId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("cards")
        .update({
          name: result.name,
          set_code: result.setCode,
          set_name: result.setName,
          collector_number: result.collectorNumber,
          rarity: result.rarity,
          image_url: result.imageUrl,
          metadata: marketPriceMetadata(result.price),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return existing.id;
    }
  }

  const { data: inserted, error } = await supabase
    .from("cards")
    .insert({
      game_id: gameId,
      external_id: result.externalId,
      name: result.name,
      set_code: result.setCode,
      set_name: result.setName,
      collector_number: result.collectorNumber,
      rarity: result.rarity,
      image_url: result.imageUrl,
      metadata: marketPriceMetadata(result.price),
    })
    .select("id")
    .single();
  if (error) throw error;
  return inserted.id;
}

export async function addSupabaseCardFromSearch(
  supabase: SupabaseClient,
  collectionId: string,
  result: CardSearchResult,
  gameId: string
) {
  const cardId = await findOrCreateSupabaseCard(supabase, gameId, result);

  if (result.externalId) {
    const { data: existingOwned } = await supabase
      .from("owned_cards")
      .select("id, quantity, cards!inner(external_id, game_id)")
      .eq("collection_id", collectionId);

    const match = (existingOwned ?? []).find((row) => {
      const card = row.cards as unknown as { external_id: string | null; game_id: string };
      return card.external_id === result.externalId && card.game_id === gameId;
    });

    if (match) {
      await supabase
        .from("owned_cards")
        .update({
          quantity: match.quantity + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      return;
    }
  }

  const { error } = await supabase.from("owned_cards").insert({
    collection_id: collectionId,
    card_id: cardId,
    quantity: 1,
    condition: "NM",
    language: "EN",
    is_foil: false,
  });
  if (error) throw error;
}

export async function updateSupabaseOwnedCard(
  supabase: SupabaseClient,
  id: string,
  updates: {
    quantity?: number;
    condition?: CardCondition;
    language?: CardLanguage;
    isFoil?: boolean;
    purchasePrice?: number | null;
    notes?: string | null;
    card?: {
      marketPrice?: number | null;
      rarity?: string | null;
      setName?: string | null;
      setCode?: string | null;
      collectorNumber?: string | null;
    };
  }
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.condition !== undefined) payload.condition = updates.condition;
  if (updates.language !== undefined) payload.language = updates.language;
  if (updates.isFoil !== undefined) payload.is_foil = updates.isFoil;
  if (updates.purchasePrice !== undefined) payload.purchase_price = updates.purchasePrice;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { data: row, error } = await supabase
    .from("owned_cards")
    .update(payload)
    .eq("id", id)
    .select("card_id")
    .single();
  if (error) throw error;

  if (updates.card?.marketPrice !== undefined && row?.card_id) {
    await supabase
      .from("cards")
      .update({
        metadata: marketPriceMetadata(updates.card.marketPrice),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.card_id);
  }

  const cardPayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.card?.rarity !== undefined) cardPayload.rarity = updates.card.rarity;
  if (updates.card?.setName !== undefined) cardPayload.set_name = updates.card.setName;
  if (updates.card?.setCode !== undefined) cardPayload.set_code = updates.card.setCode;
  if (updates.card?.collectorNumber !== undefined) {
    cardPayload.collector_number = updates.card.collectorNumber;
  }
  if (Object.keys(cardPayload).length > 1 && row?.card_id) {
    await supabase.from("cards").update(cardPayload).eq("id", row.card_id);
  }
}

export async function deleteSupabaseOwnedCards(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("owned_cards").delete().in("id", ids);
  if (error) throw error;
}

export async function importSupabaseRows(
  supabase: SupabaseClient,
  collectionId: string,
  rows: Array<{
    name: string;
    set?: string;
    quantity: number;
    condition: CardCondition;
    language: CardLanguage;
    gameId: string;
    isFoil?: boolean;
    purchasePrice?: number;
  }>,
  mergeDuplicates: boolean
) {
  let imported = 0;
  for (const row of rows) {
    if (mergeDuplicates) {
      const { data: existing } = await supabase
        .from("owned_cards")
        .select("id, quantity, cards!inner(name, set_name, game_id)")
        .eq("collection_id", collectionId)
        .eq("cards.game_id", row.gameId);

      const dup = (existing ?? []).find((e) => {
          const card = e.cards as unknown as { name: string; set_name: string | null };
          return (
            card.name.toLowerCase() === row.name.toLowerCase() &&
            (card.set_name ?? "").toLowerCase() === (row.set ?? "").toLowerCase()
          );
        });

      if (dup) {
        await supabase
          .from("owned_cards")
          .update({ quantity: dup.quantity + row.quantity })
          .eq("id", dup.id);
        imported++;
        continue;
      }
    }

    const { data: cardRow, error: cardErr } = await supabase
      .from("cards")
      .insert({ game_id: row.gameId, name: row.name, set_name: row.set ?? null })
      .select("id")
      .single();
    if (cardErr) throw cardErr;

    const { error } = await supabase.from("owned_cards").insert({
      collection_id: collectionId,
      card_id: cardRow.id,
      quantity: row.quantity,
      condition: row.condition,
      language: row.language,
      is_foil: row.isFoil ?? false,
      purchase_price: row.purchasePrice,
    });
    if (error) throw error;
    imported++;
  }
  return imported;
}
