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
| **Supabase (recommended)** | Cloud DB + login + play with friends |
| **Docker Postgres** | Local DB, no cloud — copy `.env.docker.example` → `.env.local`, run `npm run docker:setup` |
| **Demo** | No `.env.local` — localStorage only |

## Supabase + Vercel (play with friends)

1. Create project at [supabase.com](https://supabase.com)
2. `npm run db:push` with Supabase `DATABASE_URL` in `.env.local`
3. **SQL Editor** → run in order: `0001_seed_and_indexes.sql`, `0002_rls_policies.sql`, `0003_collaboration.sql`
4. **Database → Publications** → add `owned_cards` and `collections` to `supabase_realtime`
5. Copy `.env.local.example` → `.env.local` and fill Supabase keys
6. Deploy to [Vercel](https://vercel.com) from [GitHub repo](https://github.com/Yuyaexe/CollecitonMYPICA)
7. Supabase → **Authentication → URL Configuration** → set Site URL to your Vercel link

**Play together:** Collection → Share → friend's email → friend signs up with same email.

## Backup & Restore

**Settings → Backup**

- **Baixar backup** — JSON with profile, collections, and cards
- **Restaurar backup** — merges cards into existing collections (same name = same collection)

Store backups on Google Drive, OneDrive, or a USB drive.

## Docker (local Postgres)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```cmd
copy .env.docker.example .env.local
npm.cmd run docker:setup
npm.cmd run dev
```

| Service | URL |
|---------|-----|
| Adminer | http://localhost:8080 |
| App | http://localhost:3000 |

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
