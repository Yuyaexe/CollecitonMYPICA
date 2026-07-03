import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const game = searchParams.get("game") ?? "yugioh";

  if (!id.trim()) {
    return NextResponse.json({ error: "Card id required" }, { status: 400 });
  }

  if (!isApiSupported(game)) {
    return NextResponse.json({ result: null });
  }

  const adapter = getCardAdapter(game);
  if (!adapter) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  try {
    const result = await adapter.getById(id);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "Failed to load card" }, { status: 500 });
  }
}
