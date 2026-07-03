import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId, isDatabaseConfigured } from "@/lib/db/constants";
import {
  addCardFromSearch,
  deleteOwnedCards,
  importRows,
  updateOwnedCard,
} from "@/lib/data/server/collection-service";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage } from "@/types/tcg";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "add-from-search") {
      const { collectionId, result, gameId, gameSlug, gameName } = body as {
        collectionId: string;
        result: CardSearchResult;
        gameId: string;
        gameSlug: string;
        gameName: string;
      };
      await addCardFromSearch(
        getLocalUserId(),
        collectionId,
        result,
        gameId,
        gameSlug,
        gameName
      );
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
      const count = await importRows(
        getLocalUserId(),
        collectionId,
        rows,
        mergeDuplicates
      );
      return NextResponse.json({ imported: count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/app/owned-cards", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id, updates } = (await request.json()) as {
      id: string;
      updates: Parameters<typeof updateOwnedCard>[2];
    };
    await updateOwnedCard(getLocalUserId(), id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/owned-cards", error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { ids } = (await request.json()) as { ids: string[] };
    await deleteOwnedCards(getLocalUserId(), ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/app/owned-cards", error);
    return NextResponse.json({ error: "Failed to delete cards" }, { status: 500 });
  }
}
