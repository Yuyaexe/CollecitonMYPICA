import { NextRequest, NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import { inviteToCollection } from "@/lib/data/server/supabase-service";

export async function POST(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode !== "supabase" || !ctx.supabase) {
    return NextResponse.json({ error: "Supabase auth required" }, { status: 503 });
  }

  try {
    const { collectionId, email } = (await request.json()) as {
      collectionId: string;
      email: string;
    };
    if (!collectionId || !email?.trim()) {
      return NextResponse.json({ error: "collectionId and email required" }, { status: 400 });
    }

    await inviteToCollection(ctx.supabase, requireUserId(ctx), collectionId, email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/app/collections/invite", error);
    const message = error instanceof Error ? error.message : "Invite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
