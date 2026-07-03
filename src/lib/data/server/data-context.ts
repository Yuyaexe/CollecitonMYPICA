import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isDatabaseConfigured, getLocalUserId } from "@/lib/db/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

export type DataMode = "supabase" | "database" | "demo";

export interface DataContext {
  mode: DataMode;
  userId: string | null;
  supabase: SupabaseClient | null;
  applySessionCookies?: (response: NextResponse) => NextResponse;
}

export async function getDataContext(request?: NextRequest): Promise<DataContext> {
  if (isSupabaseConfigured()) {
    const routeClient = request ? createRouteHandlerClient(request) : null;
    const supabase = routeClient?.supabase ?? (await createSupabaseServer());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        await supabase.rpc("accept_collection_invites");
      } catch {
        // RPC missing until migration 0003 is applied
      }
      return {
        mode: "supabase",
        userId: user.id,
        supabase,
        applySessionCookies: routeClient?.applySessionCookies,
      };
    }
  }

  if (isDatabaseConfigured()) {
    return { mode: "database", userId: getLocalUserId(), supabase: null };
  }

  return { mode: "demo", userId: null, supabase: null };
}

export function requireUserId(ctx: DataContext): string {
  if (!ctx.userId) throw new Error("Authentication required");
  return ctx.userId;
}
