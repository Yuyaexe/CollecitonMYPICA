"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { CARD_CONDITIONS, CARD_LANGUAGES } from "@/types/tcg";
import { isKnownRarity } from "@/lib/rarity/resolve-rarity";

interface CollectionFiltersProps {
  /** When rendered inside a Sheet/Dialog, Select must be non-modal to avoid mobile crashes. */
  inSheet?: boolean;
}

export function CollectionFilters({ inSheet = false }: CollectionFiltersProps) {
  const filters = useCollectionUIStore((s) => s.filters);
  const setFilters = useCollectionUIStore((s) => s.setFilters);
  const resetFilters = useCollectionUIStore((s) => s.resetFilters);
  const { ownedCards, activeCollectionId } = useAppData();

  const collectionCards = ownedCards.filter((oc) => oc.collectionId === activeCollectionId);
  const sets = [...new Set(collectionCards.map((oc) => oc.card.setCode).filter(Boolean))];
  const rarities = [
    ...new Set(
      collectionCards
        .filter((oc) => isKnownRarity(oc.card.rarity, oc.card.gameSlug))
        .map((oc) => oc.card.rarity!)
    ),
  ];

  const setFilterValue =
    filters.setCode && sets.includes(filters.setCode) ? filters.setCode : "all";
  const rarityFilterValue =
    filters.rarity && rarities.includes(filters.rarity) ? filters.rarity : "all";

  return (
    <ScrollArea className={inSheet ? "min-h-0 flex-1" : "h-full"}>
      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filters</h3>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
            Reset
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Game</Label>
          <Select
            value={filters.gameId ?? "all"}
            onValueChange={(v) => setFilters({ gameId: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All games" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All games</SelectItem>
              {DEMO_GAMES.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Set</Label>
          <Select
            value={setFilterValue}
            onValueChange={(v) => setFilters({ setCode: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All sets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sets</SelectItem>
              {sets.map((s) => (
                <SelectItem key={s} value={s!}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Rarity</Label>
          <Select
            value={rarityFilterValue}
            onValueChange={(v) => setFilters({ rarity: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All rarities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rarities</SelectItem>
              {rarities.map((r) => (
                <SelectItem key={r} value={r!}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Language</Label>
          <Select
            value={filters.language ?? "all"}
            onValueChange={(v) =>
              setFilters({ language: v === "all" ? null : (v as typeof filters.language) })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CARD_LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Condition</Label>
          <Select
            value={filters.condition ?? "all"}
            onValueChange={(v) =>
              setFilters({ condition: v === "all" ? null : (v as typeof filters.condition) })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CARD_CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ScrollArea>
  );
}
