import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId, isDatabaseConfigured } from "@/lib/db/constants";
import { updateProfile } from "@/lib/data/server/collection-service";
import type { DemoProfile } from "@/lib/demo/types";

export async function PATCH(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Partial<DemoProfile>;
    await updateProfile(getLocalUserId(), body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/app/profile", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
