"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { SearchBar } from "@/components/shared/SearchBar";
import { CardImage } from "@/components/shared/CardImage";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useDemoStore } from "@/lib/demo/store";
import { isApiSupported } from "@/features/catalog/services/card-api";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import { toast } from "sonner";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const addCardFromSearch = useDemoStore((s) => s.addCardFromSearch);
  const defaultGameId = useDemoStore((s) => s.profile.defaultGameId);
  const game = DEMO_GAMES.find((g) => g.id === defaultGameId) ?? DEMO_GAMES[0];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["card-search", debouncedQuery, game.slug],
    queryFn: async () => {
      const res = await fetch(
        `/api/cards/search?q=${encodeURIComponent(debouncedQuery)}&game=${game.slug}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Search failed");
      }
      return (json.results ?? []) as CardSearchResult[];
    },
    enabled: debouncedQuery.length >= 2 && isApiSupported(game.slug),
    staleTime: 5 * 60 * 1000,
  });

  const handleAdd = (result: CardSearchResult) => {
    addCardFromSearch(result, game.id, game.slug, game.name);
    toast.success(`Added ${result.name}`);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Quick Add"
      description={`Search ${game.name} catalog`}
      className="sm:max-w-xl"
    >
      <div className="space-y-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={`Search ${game.name} cards...`}
          enableShortcut={false}
        />

        {!isApiSupported(game.slug) && (
          <p className="text-sm text-muted-foreground">
            API not available for {game.name}. Use CSV Import instead.
          </p>
        )}

        <ScrollArea className="h-[320px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {data?.map((result) => (
            <button
              key={`${result.externalId}-${result.setCode}`}
              onClick={() => handleAdd(result)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all duration-150 hover:bg-muted"
            >
              <CardImage
                src={result.imageUrl}
                alt={result.name}
                width={36}
                height={48}
                className="shrink-0 rounded"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{result.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {result.setName ?? "—"}
                  {result.collectorNumber ? ` #${result.collectorNumber}` : ""}
                  {result.rarity ? ` · ${result.rarity}` : ""}
                  {result.edition ? ` · ${result.edition}` : ""}
                </p>
              </div>
              {result.price !== null && (
                <span className="text-sm text-muted-foreground">${result.price.toFixed(2)}</span>
              )}
              <Plus className="h-4 w-4 text-primary" />
            </button>
          ))}

          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Search failed. Check your connection and try again.
            </p>
          )}

          {debouncedQuery.length >= 2 && !isLoading && !isError && data?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No cards found</p>
          )}
        </ScrollArea>
      </div>
    </Modal>
  );
}
