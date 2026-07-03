import { NextRequest, NextResponse } from "next/server";
import {
  getDataContext,
  requireSupabase,
  requireUserId,
} from "@/lib/data/server/data-context";
import { parseBackupJson } from "@/features/import/services/backup-import";
import { restoreSupabaseBackup } from "@/lib/data/server/restore-supabase-backup";

export async function POST(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const backup = parseBackupJson(body.backup);
    const supabase = requireSupabase(ctx);
    const userId = requireUserId(ctx);
    const result = await restoreSupabaseBackup(supabase, userId, backup);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/app/backup/restore", error);
    const message = error instanceof Error ? error.message : "Restore failed";
    const status = message === "Authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
