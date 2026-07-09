import { NextRequest, NextResponse } from "next/server";
import { detectGameFromText } from "@/lib/proxy-print/detect-game";
import {
  flattenZones,
  loadZonesFromText,
  orderedSlotsFromZones,
} from "@/lib/proxy-print/parse-deck";
import { buildProxyPrintSlots } from "@/lib/proxy-print/resolve-slots";
import type { ProxyGame } from "@/lib/proxy-print/types";
import { PROXY_GAMES } from "@/lib/proxy-print/types";

async function resolveDeck(deckText: string, game: ProxyGame) {
  const zones = loadZonesFromText(deckText, game);
  const slotRefs = orderedSlotsFromZones(zones);
  if (!slotRefs.length) return null;

  const entries = flattenZones(zones);
  const { slots, missing } = await buildProxyPrintSlots(game, entries, slotRefs);
  const withImage = slots.filter((s) => s.imageUrl).length;

  return {
    game,
    slots,
    missing,
    totalUnique: new Set(entries.map((e) => e.key)).size,
    found: withImage,
    total: slots.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      deckText?: string;
      game?: ProxyGame;
    };

    const deckText = body.deckText?.trim() ?? "";
    if (!deckText) {
      return NextResponse.json({ error: "Empty deck list" }, { status: 400 });
    }

    const detected = detectGameFromText(deckText);
    const preferred =
      body.game && PROXY_GAMES.includes(body.game) ? body.game : detected;
    if (!preferred) {
      return NextResponse.json(
        { error: "Could not detect game. Select one manually." },
        { status: 400 }
      );
    }

    let result = await resolveDeck(deckText, preferred);
    let game = preferred;

    if (result && result.found === 0 && detected && detected !== preferred) {
      const fallback = await resolveDeck(deckText, detected);
      if (fallback && fallback.found > 0) {
        result = fallback;
        game = detected;
      }
    }

    if (!result) {
      return NextResponse.json({ error: "No cards found in list" }, { status: 400 });
    }

    if (result.found === 0) {
      return NextResponse.json(
        {
          error:
            detected && detected !== preferred
              ? `No images found for ${preferred}. Try ${detected}.`
              : "No card images found",
          detected,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...result,
      game,
      autoDetected: game === detected,
      detected,
    });
  } catch (error) {
    console.error("POST /api/proxy-print/resolve", error);
    return NextResponse.json({ error: "Failed to resolve proxy deck" }, { status: 500 });
  }
}
