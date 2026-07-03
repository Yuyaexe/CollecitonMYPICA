import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    externalId: text("external_id"),
    name: text("name").notNull(),
    setCode: text("set_code"),
    setName: text("set_name"),
    collectorNumber: text("collector_number"),
    rarity: text("rarity"),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_cards_game_name").on(table.gameId, table.name),
    uniqueIndex("idx_cards_game_external").on(table.gameId, table.externalId),
  ]
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  defaultGameId: uuid("default_game_id").references(() => games.id),
  currency: text("currency").notNull().default("USD"),
  theme: text("theme").notNull().default("dark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isFavorite: boolean("is_favorite").notNull().default(false),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ownedCards = pgTable(
  "owned_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    quantity: integer("quantity").notNull().default(1),
    condition: text("condition").notNull().default("NM"),
    language: text("language").notNull().default("EN"),
    isFoil: boolean("is_foil").notNull().default(false),
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_owned_cards_collection").on(table.collectionId),
    index("idx_owned_cards_card").on(table.cardId),
  ]
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ownedCardTags = pgTable(
  "owned_card_tags",
  {
    ownedCardId: uuid("owned_card_id")
      .notNull()
      .references(() => ownedCards.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.ownedCardId, table.tagId] })]
);

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id),
  targetPrice: numeric("target_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  gameId: uuid("game_id").references(() => games.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deckCards = pgTable("deck_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id),
  quantity: integer("quantity").notNull().default(1),
});

export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id),
  source: text("source").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const marketplaceListings = pgTable("marketplace_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id),
  source: text("source").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  url: text("url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  initiatorId: uuid("initiator_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gamesRelations = relations(games, ({ many }) => ({
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  game: one(games, { fields: [cards.gameId], references: [games.id] }),
  ownedCards: many(ownedCards),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  ownedCards: many(ownedCards),
}));

export const ownedCardsRelations = relations(ownedCards, ({ one, many }) => ({
  collection: one(collections, { fields: [ownedCards.collectionId], references: [collections.id] }),
  card: one(cards, { fields: [ownedCards.cardId], references: [cards.id] }),
  tags: many(ownedCardTags),
}));
