# DeckVault

Modern TCG Collection Manager for Yu-Gi-Oh, Pokemon, Digimon, Magic, One Piece, and Lorcana.

## Quick Start (Windows)

**Double-click `DeckVault.bat`** to start the app (requires Node.js 20+).

Or use `DeckVault.vbs` to launch without a console window.

## Manual Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/collection](http://localhost:3000/collection)

## Demo Mode

Without Supabase configured, the app runs in **Demo Mode** with localStorage persistence. Click "Continue in Demo Mode" on the login page.

## Docker (local Postgres — no Supabase cloud)

Run PostgreSQL on your PC and browse collections/cards in **Adminer** (web UI).

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

**Windows (PowerShell bloqueando npm):** use o **CMD** em vez do PowerShell:

```cmd
npm.cmd install
npm.cmd run docker:setup
```

Se preferir corrigir o PowerShell permanentemente (uma vez):

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

```powershell
npm install
npm run docker:setup
```

This starts Postgres + Adminer, creates tables, and seeds sample Yu-Gi-Oh cards.

| Service | URL | Credentials |
|---------|-----|-------------|
| **Adminer** (view DB) | http://localhost:8080 | System: PostgreSQL · Server: `postgres` · User: `deckvault` · Password: `deckvault` · DB: `deckvault` |
| **Drizzle Studio** | `npm run db:studio` | Uses `DATABASE_URL` from `.env.local` |
| **App** | http://localhost:3000 | Copy `.env.docker.example` → `.env.local`, then `npm run dev` |

**Useful commands:**

```bash
npm run docker:up      # start Postgres + Adminer only
npm run docker:down    # stop containers
npm run docker:seed    # re-seed demo data (after db:push)
docker compose --profile full up -d app   # run Next.js inside Docker
```

**Tables to browse in Adminer:** `collections`, `cards`, `owned_cards`, `profiles`

> The UI reads and writes collections through the API when `DATABASE_URL` is set in `.env.local`. Without it, Demo Mode (localStorage) is used.

## GitHub

Repository: [github.com/Yuyaexe/CollecitonMYPICA](https://github.com/Yuyaexe/CollecitonMYPICA)

```bash
git clone https://github.com/Yuyaexe/CollecitonMYPICA.git
cd CollecitonMYPICA
npm install
npm run docker:setup   # optional: local database
npm run dev
```

## Supabase (cloud — play with friends remotely)

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor** → run migrations in order:
   - `src/lib/db/migrations/0001_seed_and_indexes.sql`
   - Push schema: `npm run db:push` with `DATABASE_URL` = Supabase connection string (Settings → Database)
   - `src/lib/db/migrations/0002_rls_policies.sql`
   - `src/lib/db/migrations/0003_collaboration.sql`
3. **Database → Replication** → ensure `owned_cards` and `collections` are in `supabase_realtime` publication
4. Copy `.env.local.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-....pooler.supabase.com:6543/postgres
```

5. `npm run dev` → sign up / log in (no Demo Mode when Supabase is configured)

### Play together

1. **You:** Collection → **Share** icon → invite friend&apos;s email
2. **Friend:** Sign up with **that same email** → log in → collection appears
3. **Live sync:** cards update without refresh; colored border shows which card your friend is viewing
4. **Online avatars** appear in the collection header

## Supabase Setup (legacy notes)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and fill in credentials
3. Run SQL migrations from `src/lib/db/migrations/` in the Supabase SQL editor
4. Enable `pg_trgm` extension in Database → Extensions

```bash
npm run db:push   # alternative: push Drizzle schema directly
```

**Security:** Never include `SUPABASE_SERVICE_ROLE_KEY` in the Tauri `.exe` bundle.

## Desktop App (.exe)

Requires [Rust](https://rustup.rs/) installed:

```powershell
npm run build
npm run tauri:build
# or: .\launcher\build.ps1
```

Output: `src-tauri/target/release/deckvault.exe`

> Unsigned executables may trigger Windows SmartScreen on first run.

## Features (Phase 1)

- Collection with virtualized table (10k+ cards)
- Sticky filters (game, set, rarity, condition, language, price, foil, wishlist)
- Quick Add via **Yu-Gi-Oh** (YGOPRODeck), **Pokemon** (pokemontcg.io), **Digimon** (digimoncard.io)
- **Marketplace listings** — double-click a card to compare TCGPlayer, Cardmarket, etc.
- **Card navigation** — single-click select, double-click marketplace, middle-click new tab, Enter for details
- CSV Import (CardTrader, TCGPlayer, Generic presets)
- CSV Export
- Multi-collection support
- Keyboard shortcuts (`/` search, arrows, Enter for details)
- Bulk selection and delete
- Dark theme (Obsidian-inspired)

## Auto-Update (GitHub)

1. Set `NEXT_PUBLIC_GITHUB_REPO=your-user/deckvault` in `.env.local`
2. For Tauri `.exe`: configure `src-tauri/tauri.conf.json` updater pubkey + endpoints
3. Publish releases with `launcher/latest.json.example` as template
4. Users check via **Settings → Check for updates**

Next.js 15 · TypeScript · Tailwind · shadcn/ui · TanStack Table/Virtual · Zustand · React Query · Supabase · Drizzle ORM · Tauri 2
