# DeckVault

Web-based TCG collection manager for **Yu-Gi-Oh**, **Pokémon**, and **Digimon**.

Organize your collection, build decks, see which cards you own or are missing, export decks (TXT, CSV, `.ydk` for EdoPro), and generate shopping lists with only the missing cards.

## Quick Start

**Windows:** double-click `DeckVault.bat` (Node.js 20+).

```bash
npm install
npm run dev
```

Open [http://localhost:3000/collection](http://localhost:3000/collection)

## Modes

- **Demo (offline)** — no setup; data stays in the browser. Backup via **Settings → Backup**.
- **Supabase (online)** — cloud sync, login, and shared collections.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` → `.env.local` and fill in your keys
3. Run migrations `0001`–`0008` in the SQL Editor (`src/lib/db/migrations/`)
4. Enable realtime for `owned_cards` and `collections`
5. Deploy to [Vercel](https://vercel.com) and set the Site URL in Supabase Auth

**Share a collection:** Collection → Share → invite by email.

## Backup

**Settings → Backup** — download or restore a JSON backup of your profile, collections, and cards.

## Desktop

```powershell
npm run tauri:build
```

Output: `src-tauri/target/release/deckvault.exe` (requires [Rust](https://rustup.rs/))

## Stack

Next.js · TypeScript · Tailwind · Supabase · Drizzle · Tauri
