"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useDemoStore } from "@/lib/demo/store";
import { CARD_CONDITIONS, CARD_LANGUAGES } from "@/types/tcg";

export function CollectionFilters() {
  const filters = useCollectionUIStore((s) => s.filters);
  const setFilters = useCollectionUIStore((s) => s.setFilters);
  const resetFilters = useCollectionUIStore((s) => s.resetFilters);
  const ownedCards = useDemoStore((s) => s.ownedCards);
  const activeCollectionId = useDemoStore((s) => s.activeCollectionId);

  const collectionCards = ownedCards.filter((oc) => oc.collectionId === activeCollectionId);
  const sets = [...new Set(collectionCards.map((oc) => oc.card.setCode).filter(Boolean))];
  const rarities = [...new Set(collectionCards.map((oc) => oc.card.rarity).filter(Boolean))];

  return (
    <ScrollArea className="h-full">
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
            value={filters.setCode ?? "all"}
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
            value={filters.rarity ?? "all"}
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

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Price range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              className="h-8"
              value={filters.priceMin ?? ""}
              onChange={(e) =>
                setFilters({ priceMin: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              className="h-8"
              value={filters.priceMax ?? ""}
              onChange={(e) =>
                setFilters({ priceMax: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Min quantity</Label>
          <Input
            type="number"
            min={1}
            className="h-8"
            value={filters.minQuantity ?? ""}
            onChange={(e) =>
              setFilters({ minQuantity: e.target.value ? parseInt(e.target.value) : null })
            }
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="foil-filter"
              checked={filters.isFoil === true}
              onCheckedChange={(c) => setFilters({ isFoil: c ? true : null })}
            />
            <Label htmlFor="foil-filter" className="text-sm">
              Foil only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="wishlist-filter"
              checked={filters.wishlistOnly}
              onCheckedChange={(c) => setFilters({ wishlistOnly: !!c })}
            />
            <Label htmlFor="wishlist-filter" className="text-sm">
              Wishlist only
            </Label>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
