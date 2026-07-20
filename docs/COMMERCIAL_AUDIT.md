# DeckVault — Commercial Audit

**Date:** 2026-07-20  
**Code evidence score (pre-slim):** **6.2 / 10**  
**Product decision:** Slim-down + **Live option B** (keep & fix 2-person collab) + Group C cleanup.

This document records the audit findings and the **binding product decisions** that were implemented. It is not a wishlist for Phase 2–4 features that were cut.

---

## Executive summary

DeckVault is a coherent **TCG collection MVP** (Yu-Gi-Oh, Pokémon, Digimon) with local demo mode, optional Supabase cloud, import/export, anime side collection, proxy print, and file JSON backup/restore.

Commercial risk before this pass came from: open/unbounded catalog APIs, schema drift (Phase 2–4 tables without UI), god files, and a roadmap that advertised products that did not exist in the nav.

**Owner decisions (implemented):**

| Keep | Cut |
|------|-----|
| Collection + `/collections` | Wishlist product |
| JSON **file** backup/restore | Deck builder product |
| Anime collection | Price history / portfolio graphs |
| Proxy print | Trading |
| Multi-TCG (YGO / PKMN / Digimon) | Notifications feed |
| YGO advanced search, Tauri, CardTrader **links** | Tags product, in-collection Folders table |
| **Live collab (option B)** | Phase 4 community / premium packaging |
| | Magic / One Piece / Lorcana **game seeds** |

---

## What shipped in this pass

### 1. Cut dead roadmap (`0010` + schema + rules)

- Drizzle schema slimmed to: `games`, `cards`, `profiles`, `collections`, `collection_members`, `collection_invites`, `owned_cards`.
- Migration [`0010_drop_unused_phase_tables.sql`](../src/lib/db/migrations/0010_drop_unused_phase_tables.sql) drops tags/folders/wishlists/decks/price_history/listings/trades/notifications and removes unused game seeds; ensures `owned_cards` is on Realtime publication when available.
- Empty API dirs removed: `scan-card`, `scan-binder`, `prices`, `wishlist`.
- Cursor rules + README updated to match real product scope (no PriceBadge / Phase 2–4 fiction).

### 2. Live collab — option B

Not a Google Docs clone: **shared collection + presence**.

| Area | Change |
|------|--------|
| Card sync | `postgres_changes` on `owned_cards` with subscription status; remote changes toast (local edits suppressed) |
| Presence | Channel stays up; selection updates via `track()` without resubscribe |
| Share UX | Clearer invite steps (email → login → collection appears → Live badge) |
| Badge | **Live** only when Realtime and/or presence is actually connected (not “any Supabase mode”) |
| Sidebar | Labels **Cloud** / **Local** (honest mode, not fake Live) |

### 3. Group C cleanup

- Deleted orphan `EditSeriesCoverModal.tsx`.
- Removed dead exports (`formatCurrency`, unused marketplace open helpers).
- Shared binder chrome: [`BinderChrome.tsx`](../src/components/shared/binder/BinderChrome.tsx) used by TCG + anime binders.

### 4. Explicitly preserved

- Settings → Backup download/restore **by JSON file** (never removed or replaced).
- `/collections` Collection Manager.
- Anime, proxy-print, multi-TCG catalog paths.

---

## Remaining risks (not fixed in this pass)

Prioritized from the audit; still open:

| ID | Issue | Priority |
|----|--------|----------|
| C1 | Catalog / resolve / proxy APIs open, no Zod/rate limit/caps | Critical |
| C3 | God modules (AdvancedSearch, QuickAdd, demo store, settings) | High |
| C4 | Dual demo/cloud without prominent local-mode + backup CTA banner | High |
| C6 | Almost no product automated tests | High |
| A1 | `CardImage` `unoptimized`; binder not virtualized | Medium–High |
| A2 | a11y gaps (some controls lack labels) | Medium |
| A3 | Loading polish / skeletons | Medium |

**Recommended next week:** API caps + Zod on expensive routes; local-mode banner with “Download backup” CTA; a11y labels on sidebar/search/binder.

---

## Architecture (current truth)

```
Demo (Zustand persist) ──► Collection UI ◄── Supabase (React Query + /api/app/*)
        │                         │                    │
   Anime (local only)      Live Realtime         members/invites
   File backup JSON         presence channel     accept on login
```

- **Runtime DB access:** supabase-js (Drizzle schema is the typed contract + migrations source of truth).
- **Live:** requires Supabase + `owned_cards` in `supabase_realtime` publication (see README).

---

## Scoring notes

| Dimension | Pre-pass | After slim + Live B (expected) |
|-----------|----------|--------------------------------|
| Product honesty | Weak (roadmap lie) | Stronger |
| Core collection UX | Good | Good |
| Collab trust | Badge lied | Honest Live + toast |
| API / cost safety | Poor | Still poor (C1) |
| Maintainability | God files | Slightly better (binder shared; schema smaller) |

**Target note in ~90 days** (if Top API + polish + tests land): **8.0–8.5**.

---

## Out of scope forever (until explicitly revived)

Deck builder, wishlist UI, price graphs, trading, notifications feed, community Phase 4, Magic/OP/Lorcana as first-class catalog games, in-collection folders, tags as a product feature.

Backup-by-file and `/collections` are **not** negotiable removals.

---

## Verification checklist

- [x] Schema no longer declares dead Phase 2–4 tables  
- [x] Migration `0010` present  
- [x] Empty scan/prices/wishlist API dirs gone  
- [x] Rules/README without PriceBadge / fake Phase 2–4  
- [x] Live badge gated on Realtime/presence status  
- [x] Presence does not tear down channel on card selection  
- [x] Orphan cover modal deleted  
- [x] Binder chrome shared TCG ↔ anime  
- [x] `tsc --noEmit` clean after changes  

*Lighthouse / knip / viewport screenshots were deferred (not required by the four approved todos).*
