import assert from "node:assert/strict";
import {
  detectDecklistFormat,
  parseDecklist,
} from "../src/features/import/services/decklist-parser";

const ygoWithLegacySetCodes = `Main Deck
3 Dark Magician SDK-001
3 Blue-Eyes White Dragon LOB-001
3 Pot of Greed
2 Raigeki LOB-024`;

const ygoParsed = parseDecklist(ygoWithLegacySetCodes);
assert.equal(detectDecklistFormat(ygoWithLegacySetCodes), "yugioh-text");
assert.equal(ygoParsed.gameSlug, "yugioh");
assert.equal(ygoParsed.entries.length, 4, "must not drop lines without Digimon-shaped IDs");
assert.ok(
  ygoParsed.entries.some((entry) => entry.name === "Pot of Greed"),
  "Pot of Greed must survive import parsing"
);

const digimonWithHeaders = `Main Deck
4 Agumon BT1-001
4 Gabumon BT1-002
3 Patamon BT1-003
Side Deck
2 Tai Kamiya P-001`;

const digimonParsed = parseDecklist(digimonWithHeaders);
assert.equal(detectDecklistFormat(digimonWithHeaders), "digimon-text");
assert.equal(digimonParsed.gameSlug, "digimon");
assert.equal(digimonParsed.entries.length, 4);

const forcedYgoOnLegacy = parseDecklist(ygoWithLegacySetCodes, "yugioh");
assert.equal(forcedYgoOnLegacy.entries.length, 4);

console.log("Decklist parse checks passed.");
