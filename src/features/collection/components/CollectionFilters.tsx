"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { CARD_CONDITIONS, CARD_LANGUAGES } from "@/types/tcg";
import { isKnownRarity } from "@/lib/rarity/resolve-rarity";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface CollectionFiltersProps {
  /** Sheet on mobile — native selects avoid Radix crashes. */
  inSheet?: boolean;
}

function FilterSelect({
  preferNative,
  value,
  onValueChange,
  options,
}: {
  preferNative: boolean;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <ResponsiveSelect
      preferNative={preferNative}
      value={value}
      onValueChange={onValueChange}
      options={options}
      triggerClassName="h-8"
    />
  );
}

export function CollectionFilters({ inSheet = false }: CollectionFiltersProps) {
  const filters = useCollectionUIStore((s) => s.filters);
  const setFilters = useCollectionUIStore((s) => s.setFilters);
  const resetFilters = useCollectionUIStore((s) => s.resetFilters);
  const { ownedCards, activeCollectionId } = useAppData();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const preferNative = inSheet || isMobile;

  const collectionCards = useMemo(
    () => ownedCards.filter((oc) => oc.collectionId === activeCollectionId),
    [ownedCards, activeCollectionId]
  );

  const sets = useMemo(
    () => [...new Set(collectionCards.map((oc) => oc.card.setCode).filter(Boolean))] as string[],
    [collectionCards]
  );

  const rarities = useMemo(
    () =>
      [
        ...new Set(
          collectionCards
            .filter((oc) => isKnownRarity(oc.card.rarity, oc.card.gameSlug))
            .map((oc) => oc.card.rarity!)
        ),
      ] as string[],
    [collectionCards]
  );

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
          <FilterSelect
            preferNative={preferNative}
            value={filters.gameId ?? "all"}
            onValueChange={(v) => setFilters({ gameId: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All games" },
              ...DEMO_GAMES.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Set</Label>
          <FilterSelect
            preferNative={preferNative}
            value={setFilterValue}
            onValueChange={(v) => setFilters({ setCode: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All sets" },
              ...sets.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Rarity</Label>
          <FilterSelect
            preferNative={preferNative}
            value={rarityFilterValue}
            onValueChange={(v) => setFilters({ rarity: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All rarities" },
              ...rarities.map((r) => ({ value: r, label: r })),
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Language</Label>
          <FilterSelect
            preferNative={preferNative}
            value={filters.language ?? "all"}
            onValueChange={(v) =>
              setFilters({ language: v === "all" ? null : (v as typeof filters.language) })
            }
            options={[
              { value: "all", label: "All" },
              ...CARD_LANGUAGES.map((l) => ({ value: l, label: l })),
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Condition</Label>
          <FilterSelect
            preferNative={preferNative}
            value={filters.condition ?? "all"}
            onValueChange={(v) =>
              setFilters({ condition: v === "all" ? null : (v as typeof filters.condition) })
            }
            options={[
              { value: "all", label: "All" },
              ...CARD_CONDITIONS.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
