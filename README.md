# DeckVault

Modern TCG Collection Manager for Yu-Gi-Oh, Pokemon, Digimon, Magic, One Piece, and Lorcana.

## Quick Start

**Windows:** double-click `DeckVault.bat` (Node.js 20+ required).

```bash
npm install
npm run dev
```

Open [http://localhost:3000/collection](http://localhost:3000/collection)

## Modes

| Mode | Setup |
|------|--------|
| **Demo (offline)** | No `.env.local` — data stays in this browser (localStorage) |
| **Supabase (online)** | Cloud DB + login + play with friends |

Use **Settings → Backup** in Demo mode to save your collection to a JSON file.

## Supabase + Vercel (play with friends)

1. Create project at [supabase.com](https://supabase.com)
2. `npm run db:push` with Supabase `DATABASE_URL` in `.env.local`
3. **SQL Editor** → run in order: `0001` … `0008` (see `src/lib/db/migrations/`)
4. **Database → Publications** → add `owned_cards` and `collections` to `supabase_realtime`
5. Copy `.env.local.example` → `.env.local` and fill Supabase keys
6. Deploy to [Vercel](https://vercel.com) from [GitHub repo](https://github.com/Yuyaexe/CollecitonMYPICA)
7. Supabase → **Authentication → URL Configuration** → set Site URL to your Vercel link

**Play together:** Collection → Share → friend's email → friend signs up with same email.

## Backup & Restore

**Settings → Backup**

- **Baixar backup** — JSON with profile, collections, and cards (DeckVault format)
- **Restaurar backup** — merges cards into existing collections (same name = same collection)

### Import from CT app (Yu-Gi-Oh)

Backups from `Tools/CT` import automatically:

| CT file | Result in DeckVault |
|---------|---------------------|
| `yugioh-backup-*.json` | One collection per tab (`opa`, `CARDTRADER`, …) |
| `yugioh-collection-*.json` | Single tab export |

1. Export in CT → files land in `Tools/CT/backup/`
2. **Settings → Restaurar backup** → select the JSON from CT

Store backups on Google Drive, OneDrive, or a USB drive. Do not commit `yugioh-*.json` to git.

## Supabase migrations

Run in SQL Editor, in order:

1. `0001_seed_and_indexes.sql`
2. `0002_rls_policies.sql`
3. `0003_collaboration.sql`
4. `0004_create_collection_rpc.sql` — legacy RPC (superseded by `0008`; keep for migration order)
5. `0005_rls_phase3_tables.sql` — RLS for `price_history`, `marketplace_listings`, `trades`
6. `0006_security_hardening.sql` — function grants, search_path, pg_trgm schema
7. `0007_rls_missing_policies.sql` — RLS policies for `folders`, `decks`, `deck_cards`, `owned_card_tags`
8. `0008_private_rls_helpers.sql` — move RLS helpers to `private` schema; remove public SECURITY DEFINER RPCs

**Auth (dashboard):** Authentication → Providers → Email → enable **Leaked password protection** (HaveIBeenPwned).

## Desktop (.exe)

Requires [Rust](https://rustup.rs/):

```powershell
npm run tauri:build
```

Output: `src-tauri/target/release/deckvault.exe`

## Features

- Virtualized collection table (10k+ cards)
- Quick Add (Yu-Gi-Oh, Pokemon, Digimon APIs)
- CSV Import / Export
- Multi-collection + live collaboration (Supabase)
- Marketplace comparison, bulk actions

Next.js 15 · TypeScript · Tailwind · Supabase · Drizzle · Tauri 2
