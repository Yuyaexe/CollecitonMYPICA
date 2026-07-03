import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId, isDatabaseConfigured } from "@/lib/db/constants";
import { toggleWishlist } from "@/lib/data/server/collection-service";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { cardId } = (await request.json()) as { cardId: string };
    const added = await toggleWishlist(getLocalUserId(), cardId);
    return NextResponse.json({ added });
  } catch (error) {
    console.error("POST /api/app/wishlist", error);
    return NextResponse.json({ error: "Failed to toggle wishlist" }, { status: 500 });
  }
}
