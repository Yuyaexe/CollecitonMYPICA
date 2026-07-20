# DeckVault

Manage your **Yu-Gi-Oh!**, **Pokémon**, and **Digimon** cards in one place — collection, imports/exports, anime side collection, proxy print, and optional cloud sharing.

## Get started (2 minutes)

**Windows:** double-click `DeckVault.bat`

**Or from the terminal:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000/collection](http://localhost:3000/collection)

No account needed. Your data stays in the browser until you set up cloud sync.

## What you can do

- **Collection views** — grid, binder (drag to reorder; drop on *Anterior* / *Próxima* to move across pages), table, compact
- **Search & add** — Yu-Gi-Oh! cards from **YGOPRODeck** (names, images, sets, passcodes)
- **Import** — decklists (text with `Monster` / `Spell` / `Trap` sections, YDKE, YDK), DigimonCard.io format, CSV
- **Export** — TXT decklist, CSV, `.ydk` (EdoPro)
- **Collections** — multiple collections, share with a collaborator (Supabase)
- **Live** — when cloud + Realtime are on, see who is viewing which card and sync card changes
- **Mercado** — external links per card (Yu-Gi-Oh!: TCGPlayer, Liga Yu-Gi-Oh!, MyP Cards, CardTrader)
- **Anime collection** — optional side collection for character/series cards
- **Proxy print** — print proxy sheets
- **Backup** — download/restore a JSON file from Settings (always available; do not skip this)

**Card data sources**

| Game | Catalog & images | Marketplace |
|------|------------------|-------------|
| Yu-Gi-Oh! | [YGOPRODeck](https://ygoprodeck.com/) | TCGPlayer, Liga, MyP, CardTrader (links only) |
| Pokémon | Pokémon TCG API | TCGPlayer, Cardmarket, CardTrader |
| Digimon | DigimonCard.io API | TCGPlayer, Cardmarket, CardTrader |

CardTrader is **not** used for search or live prices — only product/search URLs in the Mercado section.

**Save your data:** Settings → Backup → download JSON. Restore anytime from the same screen.

---

## Advanced setup

Everything below is optional — only needed for cloud sync, sharing collections, or building a desktop app.

### Demo vs Supabase

| Mode | When to use |
|------|-------------|
| **Demo** | Try locally, no setup. Data in browser (localStorage). |
| **Supabase** | Login, cloud backup, share collections with friends, Live presence. |

### Supabase + Vercel

1. Create a project at [supabase.com](https://supabase.com)
2. Copy env vars into `.env.local` (Supabase URL, anon key, `DATABASE_URL`)
3. Run migrations in the SQL Editor — files `0001` through `0010` in `src/lib/db/migrations/`, in order
4. **Database → Publications** — add `owned_cards` (and optionally `collections`) to `supabase_realtime`
5. Deploy to [Vercel](https://vercel.com)
6. Supabase → **Authentication → URL Configuration** — set Site URL to your Vercel domain

**Share a collection:** Collection → Share → friend's email → they sign up / log in with that email → accept invite.

### Migrations

Run in SQL Editor, in order:

1. `0001_seed_and_indexes.sql`
2. `0002_rls_policies.sql`
3. `0003_collaboration.sql`
4. `0004_create_collection_rpc.sql`
5. `0005_rls_phase3_tables.sql` (legacy; tables dropped in `0010`)
6. `0006_security_hardening.sql`
7. `0007_rls_missing_policies.sql`
8. `0008_private_rls_helpers.sql`
9. `0009_cards_catalog_immutable.sql` (if present)
10. `0010_drop_unused_phase_tables.sql`

**Auth tip:** enable **Leaked password protection** under Authentication → Providers → Email.

### Backup details

- **Download** — profile, collections, and cards as DeckVault JSON
- **Restore** — merges into existing collections (same collection name = same collection)
- CT app exports (`yugioh-backup-*.json`, `yugioh-collection-*.json`) import via Settings → Restore

### Desktop app (.exe)

Requires [Rust](https://rustup.rs/):

```powershell
npm run tauri:build
```

Output: `src-tauri/target/release/deckvault.exe`

### Dev scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
```

## Out of scope

Deck builder, wishlist product, price graphs, trading, notifications feed, and community features are **not** part of the current product. Tags and in-collection folders were removed from the schema.
