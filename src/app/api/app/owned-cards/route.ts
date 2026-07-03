import { NextRequest, NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import {
  addCardFromSearch,
  deleteOwnedCards,
  importRows,
  updateOwnedCard,
} from "@/lib/data/server/collection-service";
import {
  addSupabaseCardFromSearch,
  deleteSupabaseOwnedCards,
  importSupabaseRows,
  updateSupabaseOwnedCard,
} from "@/lib/data/server/supabase-service";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage } from "@/types/tcg";

export async function POST(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;
    const userId = requireUserId(ctx);

    if (action === "add-from-search") {
      const { collectionId, result, gameId, gameSlug, gameName } = body as {
        collectionId: string;
        result: CardSearchResult;
        gameId: string;
        gameSlug: string;
        gameName: string;
      };
      if (ctx.mode === "supabase" && ctx.supabase) {
        await addSupabaseCardFromSearch(ctx.supabase, collectionId, result, gameId);
      } else {
        await addCardFromSearch(userId, collectionId, result, gameId, gameSlug, gameName);
      }
      return NextResponse.json({ ok: true });
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
      const count =
        ctx.mode === "supabase" && ctx.supabase
          ? await importSupabaseRows(ctx.supabase, collectionId, rows, mergeDuplicates)
          : await importRows(userId, collectionId, rows, mergeDuplicates);
      return NextResponse.json({ imported: count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/app/owned-cards", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
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
      updates: Parameters<typeof updateOwnedCard>[2];
    };
    if (ctx.mode === "supabase" && ctx.supabase) {
      await updateSupabaseOwnedCard(ctx.supabase, id, updates);
    } else {
      await updateOwnedCard(requireUserId(ctx), id, updates);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/owned-cards", error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const { ids } = (await request.json()) as { ids: string[] };
    if (ctx.mode === "supabase" && ctx.supabase) {
      await deleteSupabaseOwnedCards(ctx.supabase, ids);
    } else {
      await deleteOwnedCards(requireUserId(ctx), ids);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/app/owned-cards", error);
    return NextResponse.json({ error: "Failed to delete cards" }, { status: 500 });
  }
}
