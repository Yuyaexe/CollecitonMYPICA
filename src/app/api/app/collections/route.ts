import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId, isDatabaseConfigured } from "@/lib/db/constants";
import {
  createCollection,
  toggleCollectionFavorite,
} from "@/lib/data/server/collection-service";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { name } = (await request.json()) as { name: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const collection = await createCollection(getLocalUserId(), name.trim());
    return NextResponse.json(collection);
  } catch (error) {
    console.error("POST /api/app/collections", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id } = (await request.json()) as { id: string };
    if (!id) {
      return NextResponse.json({ error: "Collection id required" }, { status: 400 });
    }

    const updated = await toggleCollectionFavorite(id, getLocalUserId());
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/app/collections", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}
