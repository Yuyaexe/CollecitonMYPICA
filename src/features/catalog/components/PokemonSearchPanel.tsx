"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardImage } from "@/components/shared/CardImage";
import { PurchasedCardOverlay } from "@/components/shared/PurchasedCardOverlay";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { CardSearchResult } from "../services/card-api/types";
import { pokemonPrintLabel, type PokemonSearchPage } from "../services/pokemon-search";

interface Props {
  initialQuery?: string;
  onSelect: (card: CardSearchResult) => void;
  disabled?: boolean;
  showPurchases?: boolean;
  density?: "large" | "comfortable" | "compact";
}

export function PokemonSearchPanel({
  initialQuery = "",
  onSelect,
  disabled,
  showPurchases = false,
  density = "comfortable",
}: Props) {
  const t = useT();
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [number, setNumber] = useState("");
  const [setId, setSetId] = useState("");
  const [order, setOrder] = useState("newest");
  const [terms, setTerms] = useState({ query: initialQuery, number: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setTerms({ query: query.trim(), number: number.trim() }), 350);
    return () => clearTimeout(timer);
  }, [query, number]);

  const sets = useQuery<{ id: string; name: string }[]>({
    queryKey: ["pokemon-sets"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/cards/pokemon/sets", { signal });
      if (!response.ok) throw new Error("sets");
      return (await response.json()).sets ?? [];
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const hasQuery = Boolean(terms.query || terms.number || setId);
  const typing = query.trim() !== terms.query || number.trim() !== terms.number;
  const search = useInfiniteQuery({
    queryKey: ["pokemon-search", terms.query, terms.number, setId, order],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }): Promise<PokemonSearchPage> => {
      const params = new URLSearchParams({ game: "pokemon", q: terms.query, number: terms.number, set: setId, order, page: String(pageParam) });
      const response = await fetch(`/api/cards/search?${params}`, { signal });
      if (!response.ok) throw new Error("search");
      return response.json();
    },
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    enabled: hasQuery,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const cards = [...new Map((search.data?.pages.flatMap((page) => page.results) ?? []).map((card) => [card.externalId, card])).values()];
  const lastPage = search.data?.pages.at(-1);
  const totalCount =
    lastPage && !lastPage.hasMore
      ? lastPage.totalCount
      : search.data?.pages[0]?.totalCount ?? null;
  const selectClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";
  const gridClass =
    density === "compact"
      ? "grid-cols-2 sm:grid-cols-4"
      : density === "large"
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  useEffect(() => {
    resultsRef.current?.scrollTo({ top: 0 });
  }, [terms.query, terms.number, setId, order]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
          event.preventDefault();
          setTerms({ query: query.trim(), number: number.trim() });
          if (!typing && hasQuery) void search.refetch();
        }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("pokemonSearch.name")}
            placeholder={t("pokemonSearch.placeholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 rounded-lg pl-9"
          />
        </div>
        <Button
          type="submit"
          className="h-10 shrink-0 px-5"
          disabled={search.isFetching || (!query.trim() && !number.trim() && !setId)}
        >
          {search.isFetching && !search.isFetchingNextPage
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Search className="mr-2 h-4 w-4" />}
          {t("pokemonSearch.search")}
        </Button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1.5" htmlFor={`${id}-set`}>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("pokemonSearch.expansion")}</span>
          <select id={`${id}-set`} value={setId} onChange={(event) => setSetId(event.target.value)} className={selectClass}>
            <option value="">{t("quickAdd.allCollections")}</option>
            {(sets.data ?? []).map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5" htmlFor={`${id}-number`}>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("pokemonSearch.number")}</span>
          <Input
            id={`${id}-number`}
            placeholder="025 / TG05"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            className="h-10 rounded-lg"
          />
        </label>
        <label className="space-y-1.5 sm:col-span-2" htmlFor={`${id}-order`}>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("pokemonSearch.order")}</span>
          <select id={`${id}-order`} value={order} onChange={(event) => setOrder(event.target.value)} className={selectClass}>
            <option value="newest">{t("pokemonSearch.newest")}</option>
            <option value="oldest">{t("pokemonSearch.oldest")}</option>
            <option value="number">{t("pokemonSearch.number")}</option>
          </select>
        </label>
      </div>

      {sets.isError && <p className="text-xs text-destructive">{t("pokemonSearch.setsError")} <button type="button" className="underline" onClick={() => void sets.refetch()}>{t("pokemonSearch.retry")}</button></p>}
      <div className="flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground" aria-live="polite">
        <span>
          {hasQuery && search.data
            ? totalCount == null
              ? t("pokemonSearch.countAtLeast", { shown: cards.length })
              : t("pokemonSearch.count", { shown: cards.length, total: totalCount })
            : t("pokemonSearch.hint")}
        </span>
        {(search.isFetching || typing) && (
          <span className="flex items-center gap-1.5">
            <Loader2 aria-label={t("pokemonSearch.loading")} className="h-3.5 w-3.5 animate-spin" />
            {t("pokemonSearch.loading")}
          </span>
        )}
      </div>

      {hasQuery && search.isError && cards.length === 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3" role="alert">
          <div className="flex min-w-0 items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{t("pokemonSearch.error")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void (search.isFetchNextPageError ? search.fetchNextPage() : search.refetch())}>
            {t("pokemonSearch.retry")}
          </Button>
        </div>
      ) : (
      <div
        ref={resultsRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/50 bg-muted/5 p-2",
          cards.length > 0 ? "sm:p-3" : "min-h-[150px]"
        )}
      >
        {hasQuery && <div className={cn("grid auto-rows-max items-start gap-2.5", gridClass)}>
          {cards.map((card) => <button
            key={card.externalId} type="button" disabled={disabled || typing}
            onClick={() => { setSelectedId(card.externalId); onSelect(card); }}
            title={`${card.name} — ${pokemonPrintLabel(card)}`}
            className={cn(
              "group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
              selectedId === card.externalId ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border/60"
            )}
          >
            <div className="relative aspect-[63/88] w-full overflow-hidden bg-muted/60 p-1.5">
              <CardImage
                src={card.imageUrl}
                alt={`${card.name} — ${pokemonPrintLabel(card)}`}
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 190px"
                className="object-contain p-1.5 transition-transform duration-200 group-hover:scale-[1.025]"
              />
              {showPurchases && <PurchasedCardOverlay card={{ ...card, gameSlug: "pokemon" }} />}
            </div>
            <div className="space-y-1 border-t border-border/40 p-2.5">
              <p className="line-clamp-1 text-sm font-semibold leading-tight">{card.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{card.setName}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">
                  #{card.collectorNumber}{typeof card.metadata.printedTotal === "number" ? ` / ${card.metadata.printedTotal}` : ""}
                </span>
                {card.rarity && (
                  <span className="max-w-[48%] truncate rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {card.rarity}
                  </span>
                )}
              </div>
            </div>
          </button>)}
        </div>}
        {hasQuery && !search.isFetching && !search.isError && cards.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("quickAdd.noCardsFound")}</p>}
        {hasQuery && search.isFetchNextPageError && cards.length > 0 && (
          <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-3 border-t border-destructive/20 bg-background/95 px-3 py-2 backdrop-blur">
            <span className="text-xs text-destructive">{t("pokemonSearch.error")}</span>
            <Button size="sm" variant="outline" onClick={() => void search.fetchNextPage()}>
              {t("pokemonSearch.retry")}
            </Button>
          </div>
        )}
        {hasQuery && search.hasNextPage && !search.isFetchNextPageError && <div className="sticky bottom-0 mt-3 flex justify-center border-t border-border/50 bg-background/90 px-2 py-3 backdrop-blur">
          <Button variant="secondary" className="min-w-44 shadow-sm" disabled={search.isFetching || typing} onClick={() => void search.fetchNextPage()}>
            {search.isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("pokemonSearch.more")}
          </Button>
        </div>}
      </div>
      )}
    </div>
  );
}
