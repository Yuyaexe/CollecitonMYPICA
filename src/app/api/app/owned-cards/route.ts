import { NextRequest, NextResponse } from "next/server";
import {
  getDataContext,
  requireSupabase,
  requireUserId,
} from "@/lib/data/server/data-context";
import {
  addSupabaseCardFromSearch,
  deleteSupabaseOwnedCards,
  importSupabaseFromSearchResults,
  importSupabaseRows,
  updateSupabaseOwnedCard,
} from "@/lib/data/server/supabase-service";
import {
  CollectionRequiredError,
  requireCollectionId,
} from "@/lib/data/collection-requirements";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage, Currency } from "@/types/tcg";

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Operation failed";
  if (message === "Authentication required") return { status: 401, message };
  if (error instanceof CollectionRequiredError || message === "Collection required") {
    return { status: 400, message: "Collection required" };
  }
  return { status: 500, message };
}

export async function POST(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;
    const supabase = requireSupabase(ctx);
    requireUserId(ctx);

    if (action === "add-from-search") {
      const collectionId = requireCollectionId(body.collectionId);
      const { result, gameId, gameSlug } = body as {
        result: CardSearchResult;
        gameId: string;
        gameSlug: string;
      };

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("currency")
        .eq("user_id", requireUserId(ctx))
        .maybeSingle();

      const currency = (profileRow?.currency as Currency | undefined) ?? "USD";

      const owned = await addSupabaseCardFromSearch(
        supabase,
        collectionId,
        result,
        gameId,
        gameSlug,
        currency
      );
      return NextResponse.json({ ok: true, ownedCard: owned });
    }

    if (action === "import-deck") {
      const collectionId = requireCollectionId(body.collectionId);
      const { items, mergeDuplicates } = body as {
        items: Array<{
          result: CardSearchResult;
          quantity: number;
          gameId: string;
          gameSlug: string;
        }>;
        mergeDuplicates: boolean;
      };

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("currency")
        .eq("user_id", requireUserId(ctx))
        .maybeSingle();

      const currency = (profileRow?.currency as Currency | undefined) ?? "USD";

      const count = await importSupabaseFromSearchResults(
        supabase,
        collectionId,
        items,
        mergeDuplicates,
        currency
      );
      return NextResponse.json({ imported: count });
    }

    if (action === "import") {
      const collectionId = requireCollectionId(body.collectionId);
      const { rows, mergeDuplicates } = body as {
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
        }>;
        mergeDuplicates: boolean;
      };
      const count = await importSupabaseRows(
        supabase,
        collectionId,
        rows,
        mergeDuplicates
      );
      return NextResponse.json({ imported: count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/app/owned-cards", error);
    const { status, message } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const { id, updates } = (await request.json()) as {
      id: string;
      updates: Parameters<typeof updateSupabaseOwnedCard>[2];
    };
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Card id required" }, { status: 400 });
    }
    const supabase = requireSupabase(ctx);
    await updateSupabaseOwnedCard(supabase, id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/owned-cards", error);
    const { status, message } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const { ids } = (await request.json()) as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Card ids required" }, { status: 400 });
    }
    const supabase = requireSupabase(ctx);
    await deleteSupabaseOwnedCards(supabase, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/app/owned-cards", error);
    const { status, message } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
