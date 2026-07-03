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

## Supabase Setup

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
