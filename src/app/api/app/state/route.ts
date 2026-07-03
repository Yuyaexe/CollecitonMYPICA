import { NextResponse } from "next/server";
import { getLocalUserId, isDatabaseConfigured } from "@/lib/db/constants";
import { getAppState } from "@/lib/data/server/collection-service";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const state = await getAppState(getLocalUserId());
    return NextResponse.json(state);
  } catch (error) {
    console.error("GET /api/app/state", error);
    return NextResponse.json({ error: "Failed to load app state" }, { status: 500 });
  }
}
