import { NextRequest, NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import { updateProfile } from "@/lib/data/server/collection-service";
import { updateSupabaseProfile } from "@/lib/data/server/supabase-service";
import type { DemoProfile } from "@/lib/demo/types";

export async function PATCH(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Partial<DemoProfile>;
    const userId = requireUserId(ctx);

    if (ctx.mode === "supabase" && ctx.supabase) {
      await updateSupabaseProfile(ctx.supabase, userId, body);
    } else {
      await updateProfile(userId, body);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/profile", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
