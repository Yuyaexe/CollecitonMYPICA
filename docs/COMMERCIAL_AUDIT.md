# DeckVault — Commercial Audit

**Date:** 2026-07-20 (updated: Live removed)  
**Code evidence score (pre-slim):** **6.2 / 10**  
**Product decision:** Slim-down + Group C cleanup. **Live realtime collab removed** by owner request after the option-B pass.

This document records the audit findings and the **binding product decisions** that were implemented. It is not a wishlist for Phase 2–4 features that were cut.

---

## Executive summary

DeckVault is a coherent **TCG collection MVP** (Yu-Gi-Oh, Pokémon, Digimon) with local demo mode, optional Supabase cloud, import/export, anime side collection, proxy print, and file JSON backup/restore.

**Owner decisions (current):**

| Keep | Cut |
|------|-----|
| Collection + `/collections` | Wishlist product |
| JSON **file** backup/restore | Deck builder product |
| Anime collection | Price history / portfolio graphs |
| Proxy print | Trading |
| Multi-TCG (YGO / PKMN / Digimon) | Notifications feed |
| YGO advanced search, Tauri, CardTrader **links** | Tags product, in-collection Folders table |
| Share invite (Supabase) | Phase 4 community / premium packaging |
| | Magic / One Piece / Lorcana **game seeds** |
| | **Live** (Realtime sync, presence, Live badge) |

---

## What shipped

### 1. Cut dead roadmap (`0010` + schema + rules)

- Drizzle schema slimmed to: `games`, `cards`, `profiles`, `collections`, `collection_members`, `collection_invites`, `owned_cards`.
- Migration [`0010_drop_unused_phase_tables.sql`](../src/lib/db/migrations/0010_drop_unused_phase_tables.sql) drops unused Phase tables and game seeds.
- Empty API dirs removed; rules + README matched product scope.

### 2. Live — removed

Removed from the client:

- Live badge / realtime status
- Presence channel + `CollaboratorPresence`
- `postgres_changes` subscription + remote-sync toast
- Peer highlight on collection rows

Share-by-email (members/invites) remains for cloud collections; updates appear on normal refetch/navigation, not as Live presence.

### 3. Group C cleanup

- Deleted orphan `EditSeriesCoverModal.tsx`.
- Removed dead exports (`formatCurrency`, unused marketplace helpers).
- Shared binder chrome for TCG + anime.

### 4. Explicitly preserved

- Settings → Backup download/restore **by JSON file**.
- `/collections` Collection Manager.
- Anime, proxy-print, multi-TCG catalog paths.

---

## Remaining risks

| ID | Issue | Priority |
|----|--------|----------|
| C1 | Catalog APIs — **caps + Zod added** on resolve-deck / resolve-batch / proxy-print; rate limit IP still open | Medium |
| C3 | God modules (AdvancedSearch, QuickAdd, demo store, settings) — AdvancedSearch now lazy in QuickAdd | Medium–High |
| A1 | `CardImage` optimizes trusted hosts; binder slots memoized (full virtualization still open) | Medium |

---

## Architecture (current truth)

```
Demo (Zustand persist) ──► Collection UI ◄── Supabase (React Query + /api/app/*)
        │                         │                    │
   Anime (local only)      Share invite          members/invites
   File backup JSON                              accept on login
```

- **Runtime DB access:** supabase-js (Drizzle schema is the typed contract + migrations source of truth).

---

## Out of scope

Deck builder, wishlist UI, price graphs, trading, notifications feed, community Phase 4, Magic/OP/Lorcana as first-class catalog games, in-collection folders, tags product, **Live realtime UI**.

Backup-by-file and `/collections` are **not** negotiable removals.
