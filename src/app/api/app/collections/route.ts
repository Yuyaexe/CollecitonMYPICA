import { NextRequest, NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import {
  createCollection,
  toggleCollectionFavorite,
} from "@/lib/data/server/collection-service";
import {
  createSupabaseCollection,
  toggleSupabaseCollectionFavorite,
} from "@/lib/data/server/supabase-service";

export async function POST(request: NextRequest) {
  const ctx = await getDataContext(request);
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const { name } = (await request.json()) as { name: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const userId = requireUserId(ctx);
    const collection =
      ctx.mode === "supabase" && ctx.supabase
        ? await createSupabaseCollection(ctx.supabase, userId, name.trim())
        : await createCollection(userId, name.trim());

    const response = NextResponse.json(collection);
    return ctx.applySessionCookies?.(response) ?? response;
  } catch (error) {
    console.error("POST /api/app/collections", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "Failed to create collection";
    const status = message === "Authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getDataContext(request);
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const { id } = (await request.json()) as { id: string };
    if (!id) {
      return NextResponse.json({ error: "Collection id required" }, { status: 400 });
    }

    if (ctx.mode === "supabase" && ctx.supabase) {
      await toggleSupabaseCollectionFavorite(ctx.supabase, id);
    } else {
      await toggleCollectionFavorite(id, requireUserId(ctx));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/collections", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}
