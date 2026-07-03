import { NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import { getAppState } from "@/lib/data/server/collection-service";
import { getSupabaseAppState } from "@/lib/data/server/supabase-service";

export async function GET() {
  const ctx = await getDataContext();

  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    if (ctx.mode === "supabase" && ctx.supabase) {
      const state = await getSupabaseAppState(ctx.supabase, requireUserId(ctx));
      return NextResponse.json(state);
    }
    const state = await getAppState(requireUserId(ctx));
    return NextResponse.json(state);
  } catch (error) {
    console.error("GET /api/app/state", error);
    return NextResponse.json({ error: "Failed to load app state" }, { status: 500 });
  }
}
