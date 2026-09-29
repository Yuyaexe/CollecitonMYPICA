import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/cards/search/route";
import { buildProxyPrintSlots } from "../src/lib/proxy-print/resolve-slots";
import { flattenZones, loadZonesFromText, orderedSlotsFromZones } from "../src/lib/proxy-print/parse-deck";
import { parsePokemonSearch } from "../src/features/catalog/services/pokemon-search";
import { detectGameFromText } from "../src/lib/proxy-print/detect-game";
import { resetPokemonPrimaryCircuitForTesting } from "../src/features/catalog/services/card-api/pokemon.adapter";

test.beforeEach(() => {
  resetPokemonPrimaryCircuitForTesting();
});

const card = (number: number) => ({
  id: `base1-${number}`, name: "Pikachu", number: String(number), rarity: "Common",
  set: { id: "base1", name: "Base Set", printedTotal: 102, ptcgoCode: "BS" },
  images: { small: `https://images.pokemontcg.io/base1/${number}.png`, large: `https://images.pokemontcg.io/base1/${number}_hires.png` },
});

test("Pokemon search exposes every page instead of truncating to 24 prints", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page") ?? 1);
    const size = Number(url.searchParams.get("pageSize") ?? 250);
    const cards = Array.from({ length: 60 }, (_, i) => card(i + 1));
    return Response.json({ data: cards.slice((page - 1) * size, page * size), totalCount: 60 });
  });
  const first = await (await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&q=Pikachu&page=1"))).json();
  assert.equal(first.results.length, 48);
  assert.equal(first.totalCount, 60);
  assert.equal(first.hasMore, true);
  const second = await (await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&q=Pikachu&page=2"))).json();
  assert.equal(second.results[0].externalId, "base1-49");
  assert.equal(second.results.length, 12);
  assert.equal(second.hasMore, false);
});

test("Pokemon set and collector number search does not treat the number as a card name", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const q = new URL(String(input)).searchParams.get("q") ?? "";
    const matches = q.includes('set.id:"base1"') && q.includes('number:"58"') && !q.includes("name:58");
    return Response.json({ data: matches ? [card(58)] : [], totalCount: matches ? 1 : 0 });
  });
  const response = await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&set=base1&q=058/102"));
  const body = await response.json();
  assert.equal(body.results[0]?.externalId, "base1-58");
});

test("all-uppercase Pokemon names are not mistaken for set codes", () => {
  assert.deepEqual(parsePokemonSearch("PIKACHU 58"), { name: "PIKACHU", number: "58", setCode: "" });
  assert.deepEqual(parsePokemonSearch("EEVEE 50"), { name: "EEVEE", number: "50", setCode: "" });
});

test("prefix search uses the catalog wildcard syntax outside a quoted phrase", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const q = new URL(String(input)).searchParams.get("q");
    return q === "name:Pikachu*" ? Response.json({ data: [card(58)], totalCount: 1 }) : new Response(null, { status: 400 });
  });
  const response = await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&q=Pikachu"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).results[0].externalId, "base1-58");
});

test("upstream Pokemon failures are errors, not an empty successful search", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const response = await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&q=Pikachu"));
  assert.equal(response.status, 500);
});

test("Pokemon fallback uses native TCGdex pagination and set filtering", async (t) => {
  let tcgdexCardsQuery = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === "api.pokemontcg.io") {
      return new Response(null, { status: 503 });
    }
    if (url.pathname.endsWith("/sets")) {
      return Response.json([{ id: "base1", name: "Base Set" }]);
    }
    tcgdexCardsQuery = url.search;
    return Response.json([
      { id: "base1-49", localId: "49", name: "Pikachu", image: "https://assets.tcgdex.net/en/base/base1/49" },
      { id: "base1-50", localId: "50", name: "Pikachu", image: "https://assets.tcgdex.net/en/base/base1/50" },
      { id: "base1-51", localId: "51", name: "Pikachu", image: "https://assets.tcgdex.net/en/base/base1/51" },
    ]);
  });

  const response = await GET(new NextRequest(
    "http://localhost/api/cards/search?game=pokemon&q=Pikachu&set=base1&page=2"
  ));
  const body = await response.json();
  const tcgdexParams = new URLSearchParams(tcgdexCardsQuery);

  assert.equal(response.status, 200);
  assert.equal(tcgdexParams.get("pagination:page"), "2");
  assert.equal(tcgdexParams.get("pagination:itemsPerPage"), "48");
  assert.equal(tcgdexParams.get("set.id"), "base1");
  assert.equal(body.results.length, 3);
  assert.equal(body.totalCount, 51);
  assert.equal(body.hasMore, false);
});

test("Pokemon circuit breaker skips the unstable primary after a retryable failure", async (t) => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === "api.pokemontcg.io") {
      primaryCalls++;
      return new Response(null, { status: 502 });
    }
    if (url.pathname.endsWith("/sets")) {
      return Response.json([{ id: "base1", name: "Base Set" }]);
    }
    fallbackCalls++;
    return Response.json([
      { id: "base1-58", localId: "58", name: "Pikachu", image: "https://assets.tcgdex.net/en/base/base1/58" },
    ]);
  });

  const first = await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&q=Pikachu"));
  const second = await GET(new NextRequest("http://localhost/api/cards/search?game=pokemon&q=Eevee"));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 2);
});

test("Pokemon proxy never substitutes another edition when the requested print is missing", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === "limitlesstcg.com") return new Response('<img src="https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pokemon/wrong.png">');
    return Response.json({ data: [], totalCount: 0 });
  });
  const zones = loadZonesFromText("1 Pikachu BS 58", "pokemon");
  const result = await buildProxyPrintSlots("pokemon", flattenZones(zones), orderedSlotsFromZones(zones));
  assert.equal(result.slots[0].imageUrl, null);
  assert.equal(result.missing.length, 1);
});

test("Pokemon search parses a print number without breaking numbered names or VMAX", () => {
  assert.deepEqual(parsePokemonSearch("Porygon2"), { name: "Porygon2", number: "", setCode: "" });
  assert.deepEqual(parsePokemonSearch("Pikachu VMAX 044/185"), { name: "Pikachu VMAX", number: "044", setCode: "" });
  assert.deepEqual(parsePokemonSearch("Pikachu VIV 44"), { name: "Pikachu", number: "44", setCode: "VIV" });
});

test("Pokemon proxy keeps an explicitly selected print across a new preview", async (t) => {
  const selected = "https://images.pokemontcg.io/base1/58_hires.png";
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: [card(1)] }));
  const zones = loadZonesFromText(`1 Pikachu | ${selected}`, "pokemon");
  const result = await buildProxyPrintSlots("pokemon", flattenZones(zones), orderedSlotsFromZones(zones));
  assert.equal(result.slots[0].imageUrl, selected);
});

test("choosing a Pokemon edition does not change automatic game detection", () => {
  assert.equal(detectGameFromText("1 Pikachu BS 58 | https://images.pokemontcg.io/base1/58_hires.png"), "pokemon");
});

test("one unavailable Pokemon lookup does not discard other selected images", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const selected = "https://images.pokemontcg.io/base1/58_hires.png";
  const zones = loadZonesFromText(`1 Pikachu BS 58 | ${selected}\n1 Eevee BS 50`, "pokemon");
  const result = await buildProxyPrintSlots("pokemon", flattenZones(zones), orderedSlotsFromZones(zones));
  assert.equal(result.slots[0].imageUrl, selected);
  assert.equal(result.slots[1].imageUrl, null);
  assert.equal(result.missing.length, 1);
});
