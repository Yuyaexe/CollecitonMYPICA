import { NextRequest, NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import { toggleWishlist } from "@/lib/data/server/collection-service";
import { toggleSupabaseWishlist } from "@/lib/data/server/supabase-service";

export async function POST(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const { cardId } = (await request.json()) as { cardId: string };
    const userId = requireUserId(ctx);
    if (ctx.mode === "supabase" && ctx.supabase) {
      await toggleSupabaseWishlist(ctx.supabase, userId, cardId);
    } else {
      await toggleWishlist(userId, cardId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/app/wishlist", error);
    return NextResponse.json({ error: "Failed to toggle wishlist" }, { status: 500 });
  }
}
