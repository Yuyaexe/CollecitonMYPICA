import type { DeckEntry, ProxyGame } from "@/lib/proxy-print/types";

const ONEPIECE_ID = /\b((?:OP|ST|EB|PRB)\d{2}-\d{3}|P-\d{3})\b/i;
const DIGIMON_CODE =
  /^(?:P-\d{3}|LM-\d{3}|[A-Z]{1,3}\d{1,2}-\d{2,3})(?:_P(\d+))?$/i;
const DIGIMON_ID_TAIL =
  /\b((?:P-\d{3}|LM-\d{3}|[A-Z]{1,3}\d{1,2}-\d{2,3})(?:_P\d+)?)\s*$/i;

function parseQtyBody(line: string): { qty: number; body: string } | null {
  const s = line.trim().replace(/\t/g, " ");
  if (!s) return null;
  const m1 = s.match(/^(\d+)\s*[xX×]\s*(.+)$/);
  if (m1) return { qty: parseInt(m1[1], 10), body: m1[2].trim() };
  const m2 = s.match(/^(\d+)\s+(.+)$/);
  if (m2) return { qty: parseInt(m2[1], 10), body: m2[2].trim() };
  return { qty: 1, body: s };
}

function extractArtHint(body: string): { body: string; artHint: string | null } {
  let s = body.trim();
  const atEnd = s.match(/(?:@|v)(\d+)\s*$/i);
  if (atEnd) {
    return { body: s.slice(0, atEnd.index).trim(), artHint: atEnd[1] };
  }
  const tokens = s.split(/\s+/);
  if (tokens.at(-1)?.toUpperCase() === "FA" || tokens.at(-1)?.toUpperCase() === "AA") {
    return { body: tokens.slice(0, -1).join(" "), artHint: tokens.at(-1)!.toLowerCase() };
  }
  return { body: s, artHint: null };
}

function entryKeyForGame(game: ProxyGame, body: string): { key: string; artHint: string | null } {
  if (game === "onepiece") {
    const m = body.match(ONEPIECE_ID);
    if (m) return { key: m[1].toUpperCase().replace(/\s/g, ""), artHint: null };
  }
  if (game === "digimon") {
    const tokens = body.split(/\s+/);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const raw = tokens[i].trim().toUpperCase();
      const m = raw.match(DIGIMON_CODE);
      if (m) {
        if (m[1]) return { key: raw.replace(/_P\d+$/i, ""), artHint: m[1] };
        return { key: raw, artHint: null };
      }
    }
    const tail = body.match(DIGIMON_ID_TAIL);
    if (tail) return { key: tail[1].toUpperCase(), artHint: null };
  }
  return { key: body.trim(), artHint: null };
}

export function parseYdkText(text: string): Record<string, DeckEntry[]> {
  const zones: Record<string, DeckEntry[]> = { main: [], extra: [], side: [] };
  let section: string | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "#main") {
      section = "main";
      continue;
    }
    if (line === "#extra") {
      section = "extra";
      continue;
    }
    if (line === "!side" || line === "#side") {
      section = "side";
      continue;
    }
    if (line.startsWith("#") || line.startsWith("!")) continue;
    if (/^\d{1,8}$/.test(line) && section) {
      const key = String(parseInt(line, 10));
      zones[section].push({
        key,
        name: key,
        quantity: 1,
        query: line,
      });
    }
  }
  return zones;
}

export function parseTextDeckContent(text: string, game: ProxyGame): Record<string, DeckEntry[]> {
  const zones: Record<string, DeckEntry[]> = {};
  let section = "deck";

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim().replace(/\t/g, " ");
    if (!line || line.startsWith("//")) continue;
    if (/^.+:\s*\d+\s*$/.test(line) && !/^\d/.test(line)) continue;

    if (line.startsWith("#")) {
      const tag = line.slice(1).trim().toLowerCase();
      if (["main", "extra", "side", "egg", "deck"].includes(tag)) section = tag;
      else section = tag || "deck";
      zones[section] ??= [];
      continue;
    }

    const parsed = parseQtyBody(line);
    if (!parsed || parsed.qty <= 0 || !parsed.body) continue;

    const { body, artHint: hintFromBody } = extractArtHint(parsed.body);
    const { key, artHint: codeArt } = entryKeyForGame(game, body);
    const artHint = hintFromBody ?? codeArt;

    zones[section] ??= [];
    zones[section].push({
      key,
      name: game === "yugioh" && /^\d+$/.test(key) ? key : body.trim(),
      quantity: parsed.qty,
      query: line,
      artHint,
    });
  }

  return Object.keys(zones).length ? zones : { deck: [] };
}

export function loadZonesFromText(text: string, game: ProxyGame): Record<string, DeckEntry[]> {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return { deck: [] };

  if (game === "yugioh" || /#main\b/.test(normalized)) {
    const ydk = parseYdkText(normalized);
    if (Object.values(ydk).some((z) => z.length > 0)) return ydk;
  }
  return parseTextDeckContent(normalized, game);
}

export function flattenZones(zones: Record<string, DeckEntry[]>): DeckEntry[] {
  return Object.values(zones).flat();
}

export function uniqueEntriesPreserveOrder(entries: DeckEntry[]): DeckEntry[] {
  const seen = new Set<string>();
  const out: DeckEntry[] = [];
  for (const e of entries) {
    if (!seen.has(e.key)) {
      seen.add(e.key);
      out.push(e);
    }
  }
  return out;
}

export function uniqueKeysPreserveOrder(entries: DeckEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries) {
    if (!seen.has(e.key)) {
      seen.add(e.key);
      out.push(e.key);
    }
  }
  return out;
}

export function expandEntries(entries: DeckEntry[]): string[] {
  const ordered: string[] = [];
  for (const e of entries) {
    for (let i = 0; i < e.quantity; i++) ordered.push(e.key);
  }
  return ordered;
}

export function orderedSlotsFromZones(
  zones: Record<string, DeckEntry[]>
): { slotId: string; entryKey: string; entry: DeckEntry }[] {
  const preferred = ["main", "extra", "side", "deck", "egg"];
  const slots: { slotId: string; entryKey: string; entry: DeckEntry }[] = [];
  let index = 0;

  const pushZone = (entries: DeckEntry[]) => {
    for (const entry of entries) {
      for (let q = 0; q < entry.quantity; q++) {
        slots.push({
          slotId: `slot-${index++}`,
          entryKey: entry.key,
          entry,
        });
      }
    }
  };

  for (const name of preferred) {
    if (zones[name]) pushZone(zones[name]);
  }
  for (const name of Object.keys(zones).sort()) {
    if (!preferred.includes(name)) pushZone(zones[name]);
  }
  return slots;
}

export function orderedKeysFromZones(zones: Record<string, DeckEntry[]>): string[] {
  const preferred = ["main", "extra", "side", "deck", "egg"];
  const keys: string[] = [];
  for (const name of preferred) {
    if (zones[name]) keys.push(...expandEntries(zones[name]));
  }
  for (const name of Object.keys(zones).sort()) {
    if (!preferred.includes(name)) keys.push(...expandEntries(zones[name]));
  }
  return keys;
}
