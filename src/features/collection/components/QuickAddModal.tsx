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
import { useAppData } from "@/hooks/useAppData";
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
  const { addCardFromSearch, profile } = useAppData();
  const defaultGameId = profile.defaultGameId;
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

  const handleAdd = async (result: CardSearchResult) => {
    await addCardFromSearch(result, game.id, game.slug, game.name);
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
      className="sm:max-w-3xl"
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

        <ScrollArea className="h-[420px] pr-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {data && data.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {data.map((result) => (
                <button
                  key={`${result.externalId}-${result.setCode ?? result.setName}-${result.collectorNumber ?? ""}`}
                  type="button"
                  onClick={() => handleAdd(result)}
                  className="group flex flex-col rounded-lg p-1.5 text-left transition-all duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title={result.name}
                >
                  <div className="relative aspect-[59/86] w-full overflow-hidden rounded-md bg-muted shadow-sm ring-1 ring-border/50 transition-transform duration-150 group-hover:scale-[1.03] group-hover:ring-primary/40">
                    <CardImage
                      src={result.imageUrl}
                      alt={result.name}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 120px"
                      className="object-contain"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                      <Plus className="h-6 w-6 text-white drop-shadow-md" />
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground">
                    {result.name}
                  </p>
                </button>
              ))}
            </div>
          )}

          {isError && (
            <p className="py-12 text-center text-sm text-destructive">
              Search failed. Check your connection and try again.
            </p>
          )}

          {debouncedQuery.length >= 2 && !isLoading && !isError && data?.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No cards found</p>
          )}
        </ScrollArea>
      </div>
    </Modal>
  );
}
