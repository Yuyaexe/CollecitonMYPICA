import { NextRequest, NextResponse } from "next/server";
import { getDataContext, requireUserId } from "@/lib/data/server/data-context";
import { parseBackupJson } from "@/features/import/services/backup-import";
import { restoreLocalBackup } from "@/lib/data/server/restore-local-backup";
import { restoreSupabaseBackup } from "@/lib/data/server/restore-supabase-backup";

export async function POST(request: NextRequest) {
  const ctx = await getDataContext();
  if (ctx.mode === "demo") {
    return NextResponse.json({ error: "Not in server mode" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const backup = parseBackupJson(body.backup);
    const userId = requireUserId(ctx);

    const result =
      ctx.mode === "supabase" && ctx.supabase
        ? await restoreSupabaseBackup(ctx.supabase, userId, backup)
        : await restoreLocalBackup(userId, backup);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/app/backup/restore", error);
    const message = error instanceof Error ? error.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
