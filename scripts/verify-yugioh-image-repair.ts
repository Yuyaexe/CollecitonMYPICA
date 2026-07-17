import assert from "node:assert/strict";
import { buildYugiohImageRepairUpdates } from "../src/hooks/useYugiohImageRepairBatch";

const passcode = "46986414";
const cardTraderImage =
  "https://product-images.cardtrader.com/blueprints/201101-dark-magician/square.jpg";

const ctCard = {
  gameSlug: "yugioh",
  externalId: "201101",
  imageUrl: cardTraderImage,
  rarity: "Ultra Rare",
  cardTraderBlueprintId: "201101",
};

const ctRepair = buildYugiohImageRepairUpdates(ctCard, passcode);
assert.ok(ctRepair, "CardTrader art should still repair image URL");
assert.equal(ctRepair.imageUrl?.includes(passcode), true);
assert.equal(
  ctRepair.externalId,
  undefined,
  "must not overwrite CardTrader blueprint externalId with a passcode"
);

const wrongPasscodeCard = {
  gameSlug: "yugioh",
  externalId: "12345678",
  imageUrl: "https://images.ygoprodeck.com/images/cards/12345678.jpg",
  rarity: null,
  cardTraderBlueprintId: null,
};

const passcodeRepair = buildYugiohImageRepairUpdates(wrongPasscodeCard, passcode);
assert.ok(passcodeRepair);
assert.equal(passcodeRepair.externalId, passcode);

console.log("Yu-Gi-Oh image repair checks passed.");
