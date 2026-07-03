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
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage, Currency } from "@/types/tcg";

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
      const { collectionId, result, gameId, gameSlug } = body as {
        collectionId: string;
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

      await addSupabaseCardFromSearch(
        supabase,
        collectionId,
        result,
        gameId,
        gameSlug,
        currency
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "import-deck") {
      const { collectionId, items, mergeDuplicates } = body as {
        collectionId: string;
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
      const { collectionId, rows, mergeDuplicates } = body as {
        collectionId: string;
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
    const message = error instanceof Error ? error.message : "Operation failed";
    const status = message === "Authentication required" ? 401 : 500;
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
    const supabase = requireSupabase(ctx);
    await updateSupabaseOwnedCard(supabase, id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/owned-cards", error);
    const message = error instanceof Error ? error.message : "Failed to update card";
    const status = message === "Authentication required" ? 401 : 500;
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
    const supabase = requireSupabase(ctx);
    await deleteSupabaseOwnedCards(supabase, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/app/owned-cards", error);
    const message = error instanceof Error ? error.message : "Failed to delete cards";
    const status = message === "Authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
