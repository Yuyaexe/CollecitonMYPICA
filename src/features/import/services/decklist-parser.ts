import { parseYdke } from "@/features/import/services/ydke-codec";
import type {
  DecklistFormat,
  DecklistGameSlug,
  ParsedDeckEntry,
  ParsedDecklist,
} from "@/features/import/types";

const YGO_SECTIONS = new Set([
  "monster",
  "monsters",
  "spell",
  "spells",
  "trap",
  "traps",
  "extra",
  "extra deck",
  "side",
  "side deck",
  "main",
  "main deck",
]);

const DIGIMON_LINE =
  /^(\d+)[x×]?\s+(.+)\s+([A-Za-z][A-Za-z0-9]*-\d+[A-Za-z0-9_]*)\s*$/;

const QUANTITY_NAME_LINE = /^(\d+)[x×]?\s+(.+?)\s*$/;

const ONEPIECE_LINE =
  /^(\d+)[x×]?\s+(.+?)(?:\s*\(([A-Za-z0-9]+-\d+[A-Za-z0-9_]*)\))?\s*$/;

const PASSCODE_LINE = /^\d{5,10}$/;

function sectionFromHeader(line: string): ParsedDeckEntry["section"] | null {
  const normalized = line.trim().toLowerCase();
  if (normalized.startsWith("extra")) return "extra";
  if (normalized.startsWith("side")) return "side";
  return "main";
}

function isSectionHeader(line: string): boolean {
  return YGO_SECTIONS.has(line.trim().toLowerCase());
}

function pushPasscodes(
  entries: ParsedDeckEntry[],
  passcodes: number[],
  section: ParsedDeckEntry["section"]
) {
  for (const passcode of passcodes) {
    if (!passcode) continue;
    entries.push({
      quantity: 1,
      name: String(passcode),
      setCode: null,
      passcode,
      section,
    });
  }
}

function parseYdk(content: string): ParsedDeckEntry[] {
  const entries: ParsedDeckEntry[] = [];
  let section: ParsedDeckEntry["section"] = "main";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#created")) continue;

    if (line.startsWith("#main") || line.startsWith("!main")) {
      section = "main";
      continue;
    }
    if (line.startsWith("#extra") || line.startsWith("!extra")) {
      section = "extra";
      continue;
    }
    if (line.startsWith("#side") || line.startsWith("!side")) {
      section = "side";
      continue;
    }

    const passcode = parseInt(line.replace(/^0+/, "") || line, 10);
    if (!Number.isFinite(passcode) || !PASSCODE_LINE.test(line)) continue;

    entries.push({
      quantity: 1,
      name: line,
      setCode: null,
      passcode,
      section,
    });
  }

  return entries;
}

function parseDigimonText(content: string): ParsedDeckEntry[] {
  const entries: ParsedDeckEntry[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    const match = line.match(DIGIMON_LINE);
    if (!match) continue;

    entries.push({
      quantity: parseInt(match[1], 10),
      name: match[2].trim(),
      setCode: match[3].trim(),
      passcode: null,
      section: null,
    });
  }

  return entries;
}

function parseYugiohText(content: string): ParsedDeckEntry[] {
  const entries: ParsedDeckEntry[] = [];
  let section: ParsedDeckEntry["section"] = "main";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    if (isSectionHeader(line)) {
      section = sectionFromHeader(line);
      continue;
    }

    const match = line.match(QUANTITY_NAME_LINE);
    if (!match) continue;

    entries.push({
      quantity: parseInt(match[1], 10),
      name: match[2].trim(),
      setCode: null,
      passcode: null,
      section,
    });
  }

  return entries;
}

function parseOnePieceText(content: string): ParsedDeckEntry[] {
  const entries: ParsedDeckEntry[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    const digimonMatch = line.match(DIGIMON_LINE);
    if (digimonMatch) {
      entries.push({
        quantity: parseInt(digimonMatch[1], 10),
        name: digimonMatch[2].trim(),
        setCode: digimonMatch[3].trim(),
        passcode: null,
        section: null,
      });
      continue;
    }

    const match = line.match(ONEPIECE_LINE);
    if (!match) continue;

    entries.push({
      quantity: parseInt(match[1], 10),
      name: match[2].trim(),
      setCode: match[3]?.trim() ?? null,
      passcode: null,
      section: null,
    });
  }

  return entries;
}

function parseYdkeContent(content: string): ParsedDeckEntry[] {
  const deck = parseYdke(content.trim());
  if (!deck) return [];

  const entries: ParsedDeckEntry[] = [];
  pushPasscodes(entries, deck.main, "main");
  pushPasscodes(entries, deck.extra, "extra");
  pushPasscodes(entries, deck.side, "side");
  return entries;
}

function detectGameSlug(content: string, format: DecklistFormat): DecklistGameSlug {
  if (format === "ydke" || format === "ydk" || format === "yugioh-text") {
    return "yugioh";
  }

  const lower = content.toLowerCase();
  if (
    format === "digimon-text" ||
    lower.includes("digimon") ||
    /\b(BT|EX|ST|LM|P)-\d+/i.test(content)
  ) {
    return "digimon";
  }

  return "unknown";
}

export function detectDecklistFormat(content: string): DecklistFormat {
  const trimmed = content.trim();
  if (!trimmed) return "unknown";
  if (/^ydke:\/\//i.test(trimmed)) return "ydke";
  if (/#main|!main/i.test(trimmed)) return "ydk";

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0]?.startsWith("// DeckList")) return "digimon-text";

  const digimonMatches = lines.filter((line) => DIGIMON_LINE.test(line)).length;
  if (digimonMatches >= 2) return "digimon-text";

  const ygoSectionCount = lines.filter((line) => isSectionHeader(line)).length;
  if (ygoSectionCount >= 2) return "yugioh-text";

  const qtyLines = lines.filter((line) => QUANTITY_NAME_LINE.test(line)).length;
  if (qtyLines >= 2) return "yugioh-text";

  return "unknown";
}

export function parseDecklist(
  content: string,
  preferredGame?: DecklistGameSlug
): ParsedDecklist {
  const format = detectDecklistFormat(content);
  let entries: ParsedDeckEntry[] = [];

  switch (format) {
    case "ydke":
      entries = parseYdkeContent(content);
      break;
    case "ydk":
      entries = parseYdk(content);
      break;
    case "digimon-text":
      entries = parseDigimonText(content);
      break;
    case "yugioh-text":
      entries = parseYugiohText(content);
      break;
    default:
      entries = parseDigimonText(content);
      if (entries.length === 0) {
        entries = parseOnePieceText(content);
      }
      if (entries.length === 0) {
        entries = parseYugiohText(content);
      }
      break;
  }

  const gameSlug =
    preferredGame && preferredGame !== "unknown"
      ? preferredGame
      : detectGameSlug(content, format);

  return { format, gameSlug, entries };
}

export function aggregateDeckEntries(entries: ParsedDeckEntry[]): ParsedDeckEntry[] {
  const map = new Map<string, ParsedDeckEntry>();

  for (const entry of entries) {
    const key = [
      entry.passcode ?? "",
      entry.name.toLowerCase(),
      entry.setCode?.toLowerCase() ?? "",
      entry.section ?? "",
    ].join("|");

    const existing = map.get(key);
    if (existing) {
      existing.quantity += entry.quantity;
      continue;
    }
    map.set(key, { ...entry });
  }

  return Array.from(map.values());
}
