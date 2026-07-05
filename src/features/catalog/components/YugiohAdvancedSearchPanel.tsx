"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  countActiveYgoAdvancedFilters,
  EMPTY_YGO_ADVANCED_FILTERS,
  type YugiohAdvancedSearchFilters,
} from "@/lib/yugioh/advanced-search";
import {
  YGO_ATTRIBUTES,
  YGO_CARD_TYPE_KEYS,
  YGO_CARD_TYPE_LABELS,
  YGO_CATEGORY_TABS,
  YGO_LEVELS,
  YGO_LINK_MARKERS,
  YGO_LINK_VALUES,
  YGO_MONSTER_RACES,
  YGO_SEARCH_FIELD_OPTIONS,
  YGO_SPELL_TRAP_RACES,
  type YugiohCardTypeKey,
  type YugiohFilterLogic,
  type YugiohSearchCategory,
} from "@/lib/yugioh/advanced-search.constants";

interface YugiohAdvancedSearchPanelProps {
  filters: YugiohAdvancedSearchFilters;
  onChange: (filters: YugiohAdvancedSearchFilters) => void;
  onSearch: () => void;
  isSearching?: boolean;
  locale?: "en" | "pt";
}

interface CardSetOption {
  setName: string;
  setCode: string;
  tcgDate: string | null;
}

function FilterSection({
  title,
  defaultOpen = true,
  onClear,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-border/60 bg-muted/20">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
          <span className="truncate">{title}</span>
        </button>
        {onClear && (
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClear}
            aria-label={`Limpar ${title}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && <div className="space-y-3 border-t border-border/40 px-3 py-3">{children}</div>}
    </section>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className
      )}
    >
      {label}
    </button>
  );
}

function LogicToggle({
  value,
  onChange,
}: {
  value: YugiohFilterLogic;
  onChange: (value: YugiohFilterLogic) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border/60 p-0.5 text-[11px]">
      {(["or", "and"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "rounded px-2 py-0.5 font-semibold uppercase tracking-wide",
            value === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {mode === "or" ? "ou" : "e"}
        </button>
      ))}
    </div>
  );
}

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function StatRange({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Mín."
          value={min ?? ""}
          onChange={(e) => onMinChange(e.target.value === "" ? null : Number(e.target.value))}
          className="h-8 text-xs"
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Máx."
          value={max ?? ""}
          onChange={(e) => onMaxChange(e.target.value === "" ? null : Number(e.target.value))}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function YugiohAdvancedSearchPanel({
  filters,
  onChange,
  onSearch,
  isSearching = false,
}: YugiohAdvancedSearchPanelProps) {
  const [editionFilter, setEditionFilter] = useState("");

  const { data: cardSets = [] } = useQuery<CardSetOption[]>({
    queryKey: ["ygo-cardsets"],
    queryFn: async () => {
      const res = await fetch("/api/cards/yugioh/cardsets");
      const json = (await res.json()) as { sets?: CardSetOption[] };
      return json.sets ?? [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const filteredSets = useMemo(() => {
    const q = editionFilter.trim().toLowerCase();
    if (!q) return cardSets;
    return cardSets.filter(
      (set) =>
        set.setName.toLowerCase().includes(q) ||
        set.setCode.toLowerCase().includes(q)
    );
  }, [cardSets, editionFilter]);

  const activeCount = countActiveYgoAdvancedFilters(filters);

  const patch = (partial: Partial<YugiohAdvancedSearchFilters>) =>
    onChange({ ...filters, ...partial });

  const toggleCardType = (key: YugiohCardTypeKey, field: "cardTypes" | "excludeTypes") => {
    patch({ [field]: toggleInList(filters[field], key) });
  };

  const showMonsterFilters = filters.category === "all" || filters.category === "monster";
  const showSpellTrapIcons =
    filters.category === "all" || filters.category === "spell" || filters.category === "trap";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Modo de busca</Label>
          <Select
            value={filters.searchField}
            onValueChange={(value) =>
              patch({ searchField: value as YugiohAdvancedSearchFilters["searchField"] })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YGO_SEARCH_FIELD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px] flex-[2] space-y-1">
          <Label className="text-xs text-muted-foreground">Palavra-chave</Label>
          <Input
            value={filters.keyword}
            onChange={(e) => patch({ keyword: e.target.value })}
            placeholder="Opcional — nome, arquetipo..."
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
        </div>
        <div className="min-w-[120px] space-y-1">
          <Label className="text-xs text-muted-foreground">Ordenar</Label>
          <Select
            value={filters.sort}
            onValueChange={(value) =>
              patch({ sort: value as YugiohAdvancedSearchFilters["sort"] })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A–Z)</SelectItem>
              <SelectItem value="atk">ATK</SelectItem>
              <SelectItem value="def">DEF</SelectItem>
              <SelectItem value="level">Nível</SelectItem>
              <SelectItem value="new">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {YGO_CATEGORY_TABS.map((tab) => (
          <ToggleChip
            key={tab.value}
            label={tab.label}
            active={filters.category === tab.value}
            onClick={() => patch({ category: tab.value as YugiohSearchCategory })}
          />
        ))}
      </div>

      <ScrollArea className="h-[min(52vh,420px)] pr-3">
        <div className="space-y-3 pb-2">
          {showMonsterFilters && (
            <FilterSection
              title="Atributo"
              onClear={filters.attributes.length ? () => patch({ attributes: [] }) : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                {YGO_ATTRIBUTES.map((attr) => (
                  <ToggleChip
                    key={attr.value}
                    label={attr.label}
                    active={filters.attributes.includes(attr.value)}
                    onClick={() =>
                      patch({ attributes: toggleInList(filters.attributes, attr.value) })
                    }
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {showSpellTrapIcons && (
            <FilterSection
              title="Ícone (Magia / Armadilha)"
              defaultOpen={filters.category !== "all"}
              onClear={
                filters.spellTrapRaces.length ? () => patch({ spellTrapRaces: [] }) : undefined
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {YGO_SPELL_TRAP_RACES.map((race) => (
                  <ToggleChip
                    key={race.value}
                    label={race.label}
                    active={filters.spellTrapRaces.includes(race.value)}
                    onClick={() =>
                      patch({
                        spellTrapRaces: toggleInList(filters.spellTrapRaces, race.value),
                      })
                    }
                  />
                ))}
              </div>
            </FilterSection>
          )}

          {showMonsterFilters && (
            <FilterSection
              title="Tipo de monstro"
              onClear={filters.monsterRaces.length ? () => patch({ monsterRaces: [] }) : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                {YGO_MONSTER_RACES.map((race) => (
                  <ToggleChip
                    key={race.value}
                    label={race.label}
                    active={filters.monsterRaces.includes(race.value)}
                    onClick={() =>
                      patch({ monsterRaces: toggleInList(filters.monsterRaces, race.value) })
                    }
                  />
                ))}
              </div>
            </FilterSection>
          )}

          <FilterSection
            title="Tipo de card"
            onClear={filters.cardTypes.length ? () => patch({ cardTypes: [] }) : undefined}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Combinar tipos</span>
              <LogicToggle
                value={filters.cardTypesLogic}
                onChange={(cardTypesLogic) => patch({ cardTypesLogic })}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {YGO_CARD_TYPE_KEYS.map((key) => (
                <ToggleChip
                  key={key}
                  label={YGO_CARD_TYPE_LABELS[key]}
                  active={filters.cardTypes.includes(key)}
                  onClick={() => toggleCardType(key, "cardTypes")}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Excluir tipos"
            defaultOpen={false}
            onClear={filters.excludeTypes.length ? () => patch({ excludeTypes: [] }) : undefined}
          >
            <div className="flex flex-wrap gap-1.5">
              {YGO_CARD_TYPE_KEYS.map((key) => (
                <ToggleChip
                  key={key}
                  label={YGO_CARD_TYPE_LABELS[key]}
                  active={filters.excludeTypes.includes(key)}
                  onClick={() => toggleCardType(key, "excludeTypes")}
                />
              ))}
            </div>
          </FilterSection>

          {showMonsterFilters && (
            <>
              <FilterSection
                title="Nível / Classe"
                onClear={filters.levels.length ? () => patch({ levels: [] }) : undefined}
              >
                <div className="flex flex-wrap gap-1">
                  {YGO_LEVELS.map((level) => (
                    <ToggleChip
                      key={level}
                      label={String(level)}
                      active={filters.levels.includes(level)}
                      onClick={() => patch({ levels: toggleInList(filters.levels, level) })}
                      className="min-w-[2rem] px-1.5"
                    />
                  ))}
                </div>
              </FilterSection>

              <FilterSection
                title="Escala Pêndulo"
                defaultOpen={false}
                onClear={filters.scales.length ? () => patch({ scales: [] }) : undefined}
              >
                <div className="flex flex-wrap gap-1">
                  {YGO_LEVELS.map((scale) => (
                    <ToggleChip
                      key={scale}
                      label={String(scale)}
                      active={filters.scales.includes(scale)}
                      onClick={() => patch({ scales: toggleInList(filters.scales, scale) })}
                      className="min-w-[2rem] px-1.5"
                    />
                  ))}
                </div>
              </FilterSection>

              <FilterSection
                title="Link"
                defaultOpen={false}
                onClear={
                  filters.linkValues.length || filters.linkMarkers.length
                    ? () => patch({ linkValues: [], linkMarkers: [] })
                    : undefined
                }
              >
                <Label className="text-xs text-muted-foreground">Classificação Link</Label>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {YGO_LINK_VALUES.map((link) => (
                    <ToggleChip
                      key={link}
                      label={String(link)}
                      active={filters.linkValues.includes(link)}
                      onClick={() =>
                        patch({ linkValues: toggleInList(filters.linkValues, link) })
                      }
                      className="min-w-[2rem] px-1.5"
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Setas Link</Label>
                  <LogicToggle
                    value={filters.linkMarkersLogic}
                    onChange={(linkMarkersLogic) => patch({ linkMarkersLogic })}
                  />
                </div>
                <div className="mt-2 inline-grid grid-cols-3 gap-1">
                  {YGO_LINK_MARKERS.map((marker) => (
                    <button
                      key={marker.value}
                      type="button"
                      title={marker.value}
                      onClick={() =>
                        patch({
                          linkMarkers: toggleInList(filters.linkMarkers, marker.value),
                        })
                      }
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors",
                        filters.linkMarkers.includes(marker.value)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {marker.label}
                    </button>
                  ))}
                </div>
              </FilterSection>
            </>
          )}

          {showMonsterFilters && (
            <FilterSection title="ATK / DEF">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatRange
                  label="ATK"
                  min={filters.atkMin}
                  max={filters.atkMax}
                  onMinChange={(atkMin) => patch({ atkMin })}
                  onMaxChange={(atkMax) => patch({ atkMax })}
                />
                <StatRange
                  label="DEF"
                  min={filters.defMin}
                  max={filters.defMax}
                  onMinChange={(defMin) => patch({ defMin })}
                  onMaxChange={(defMax) => patch({ defMax })}
                />
              </div>
            </FilterSection>
          )}

          <FilterSection title="Data de lançamento (TCG)" defaultOpen={false}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Início</Label>
                <Input
                  type="date"
                  value={filters.startDate ?? ""}
                  onChange={(e) => patch({ startDate: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Término</Label>
                <Input
                  type="date"
                  value={filters.endDate ?? ""}
                  onChange={(e) => patch({ endDate: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </FilterSection>

          <FilterSection
            title="Edição"
            defaultOpen={false}
            onClear={filters.cardSets.length ? () => patch({ cardSets: [] }) : undefined}
          >
            <Input
              value={editionFilter}
              onChange={(e) => setEditionFilter(e.target.value)}
              placeholder="Filtrar edições..."
              className="mb-2 h-8 text-xs"
            />
            <ScrollArea className="h-44 pr-2">
              <div className="space-y-1">
                {filteredSets.slice(0, 200).map((set) => {
                  const checked = filters.cardSets.includes(set.setName);
                  return (
                    <label
                      key={`${set.setCode}-${set.setName}`}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          patch({
                            cardSets: toggleInList(filters.cardSets, set.setName),
                          })
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0 text-xs leading-snug">
                        {set.setName}
                        <span className="text-muted-foreground"> ({set.setCode})</span>
                      </span>
                    </label>
                  );
                })}
                {filteredSets.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Nenhuma edição encontrada
                  </p>
                )}
              </div>
            </ScrollArea>
          </FilterSection>
        </div>
      </ScrollArea>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
        <p className="text-xs text-muted-foreground">
          {activeCount > 0 ? `${activeCount} filtro(s) ativo(s)` : "Selecione filtros ou digite uma palavra-chave"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...EMPTY_YGO_ADVANCED_FILTERS })}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Limpar
          </Button>
          <Button type="button" size="sm" onClick={onSearch} disabled={isSearching}>
            <Search className="mr-1.5 h-3.5 w-3.5" />
            {isSearching ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
