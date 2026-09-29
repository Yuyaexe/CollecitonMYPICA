import { NextRequest, NextResponse } from "next/server";
import { resolveYgoProDeckCardUrl } from "@/lib/yugioh/resolve-site-url";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  const externalId = request.nextUrl.searchParams.get("externalId")?.trim() || null;
  if (!name) {
    return NextResponse.json({ error: "Missing card name" }, { status: 400 });
  }

  try {
    const url = await resolveYgoProDeckCardUrl(name, externalId);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to resolve YGOPRODeck URL" }, { status: 502 });
  }
}
