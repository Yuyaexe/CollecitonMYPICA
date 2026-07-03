import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isDatabaseConfigured, getLocalUserId } from "@/lib/db/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DataMode = "supabase" | "database" | "demo";

export interface DataContext {
  mode: DataMode;
  userId: string | null;
  supabase: SupabaseClient | null;
}

export async function getDataContext(): Promise<DataContext> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        await supabase.rpc("accept_collection_invites");
      } catch {
        // RPC missing until migration 0003 is applied
      }
      return { mode: "supabase", userId: user.id, supabase };
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
