/**
 * Seeds demo profile, collection, and sample cards into local Docker Postgres.
 * Run after: npm run db:push (with DATABASE_URL set)
 */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://deckvault:deckvault@localhost:5432/deckvault";

const DEMO_USER_ID = "b0000000-0000-4000-8000-000000000001";
const DEMO_COLLECTION_ID = "b0000000-0000-4000-8000-000000000002";
const YUGIOH_GAME_ID = "a0000000-0000-4000-8000-000000000001";

const SAMPLE_CARDS = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    name: "Dark Magician",
    setName: "Legend of Blue Eyes White Dragon",
    rarity: "Ultra Rare",
    imageUrl: "https://images.ygoprodeck.com/images/cards/46986414.jpg",
    externalId: "46986414",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    name: "Blue-Eyes White Dragon",
    setName: "Legend of Blue Eyes White Dragon",
    rarity: "Ultra Rare",
    imageUrl: "https://images.ygoprodeck.com/images/cards/89631139.jpg",
    externalId: "89631139",
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    name: "Pot of Greed",
    setName: "Spell Ruler",
    rarity: "Common",
    imageUrl: "https://images.ygoprodeck.com/images/cards/55144522.jpg",
    externalId: "55144522",
  },
];

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false });

  try {
    await sql`SELECT 1`;
    console.log("Connected to Postgres");

    await sql`
      INSERT INTO games (id, slug, name) VALUES
        ('a0000000-0000-4000-8000-000000000001', 'yugioh', 'Yu-Gi-Oh!'),
        ('a0000000-0000-4000-8000-000000000002', 'pokemon', 'Pokemon'),
        ('a0000000-0000-4000-8000-000000000003', 'digimon', 'Digimon'),
        ('a0000000-0000-4000-8000-000000000004', 'magic', 'Magic: The Gathering'),
        ('a0000000-0000-4000-8000-000000000005', 'onepiece', 'One Piece'),
        ('a0000000-0000-4000-8000-000000000006', 'lorcana', 'Disney Lorcana')
      ON CONFLICT (slug) DO NOTHING
    `;

    await sql`
      INSERT INTO profiles (user_id, display_name, default_game_id, currency, theme)
      VALUES (${DEMO_USER_ID}, 'Collector', ${YUGIOH_GAME_ID}, 'USD', 'dark')
      ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name
    `;

    await sql`
      INSERT INTO collections (id, user_id, name, is_default, is_favorite)
      VALUES (${DEMO_COLLECTION_ID}, ${DEMO_USER_ID}, 'My Collection', true, true)
      ON CONFLICT (id) DO NOTHING
    `;

    for (const card of SAMPLE_CARDS) {
      await sql`
        INSERT INTO cards (id, game_id, external_id, name, set_name, rarity, image_url)
        VALUES (
          ${card.id},
          ${YUGIOH_GAME_ID},
          ${card.externalId},
          ${card.name},
          ${card.setName},
          ${card.rarity},
          ${card.imageUrl}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      const ownedId = `d0000000-0000-4000-8000-${card.id.slice(-12)}`;
      await sql`
        INSERT INTO owned_cards (id, collection_id, card_id, quantity, condition, language)
        VALUES (${ownedId}, ${DEMO_COLLECTION_ID}, ${card.id}, 1, 'NM', 'EN')
        ON CONFLICT (id) DO NOTHING
      `;
    }

    const [{ count: collectionCount }] =
      await sql`SELECT COUNT(*)::int AS count FROM collections`;
    const [{ count: cardCount }] =
      await sql`SELECT COUNT(*)::int AS count FROM owned_cards`;

    console.log(`Seed complete: ${collectionCount} collection(s), ${cardCount} owned card row(s).`);
    console.log("View data at http://localhost:8080 (Adminer)");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
