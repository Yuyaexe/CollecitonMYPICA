import { NextRequest, NextResponse } from "next/server";
import { yugiohAdapter } from "@/features/catalog/services/card-api/yugioh.adapter";
import { cloneSearchResultForJson } from "@/features/catalog/services/serialize-search-results";
import { yugiohCardNamesMatch } from "@/lib/yugioh/lookup";
import { resolveYugiohPasscodeForCard } from "@/lib/yugioh/resolve-passcode";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const set = searchParams.get("set")?.trim().toUpperCase() ?? "";

  try {
    if (set) {
      const bySet = await yugiohAdapter.getBySetNumber(set);
      if (bySet) {
        if (!name || yugiohCardNamesMatch(bySet.name, name)) {
          return NextResponse.json({ result: cloneSearchResultForJson(bySet) });
        }
      }
    }

    if (name) {
      const passcode = await resolveYugiohPasscodeForCard({ name });
      if (passcode) {
        const detail = await yugiohAdapter.getById(passcode);
        if (detail && yugiohCardNamesMatch(detail.name, name)) {
          return NextResponse.json({ result: cloneSearchResultForJson(detail) });
        }
      }

      const results = await yugiohAdapter.searchByNameOnly(name);
      const match =
        results.find((result) => yugiohCardNamesMatch(result.name, name)) ?? null;
      return NextResponse.json({ result: match ? cloneSearchResultForJson(match) : null });
    }

    return NextResponse.json({ result: null });
  } catch (error) {
    console.error("GET /api/cards/yugioh/resolve", error);
    return NextResponse.json({ error: "Failed to resolve card" }, { status: 500 });
  }
}
