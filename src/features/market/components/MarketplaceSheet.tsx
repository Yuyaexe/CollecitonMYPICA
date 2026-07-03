"use client";

import { ExternalLink, Store } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/shared/CardImage";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { buildMarketplaceListings } from "@/features/market/services/marketplace";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";
import { formatCurrency } from "@/lib/utils";

interface MarketplaceSheetProps {
  card: DemoOwnedCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  onViewDetails?: () => void;
}

export function MarketplaceSheet({
  card,
  open,
  onOpenChange,
  currency,
  onViewDetails,
}: MarketplaceSheetProps) {
  if (!card) return null;

  const listings = buildMarketplaceListings(card.card);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Marketplace
          </SheetTitle>
          <SheetDescription>Compare prices and open listings for this card</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex gap-4">
            <CardImage
              src={card.card.imageUrl}
              alt={card.card.name}
              width={72}
              height={100}
              className="shrink-0 rounded-lg"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold leading-tight">{card.card.name}</h3>
                <RarityBadge rarity={card.card.rarity} gameSlug={card.card.gameSlug} />
              </div>
              <p className="text-sm text-muted-foreground">{card.card.setName ?? "Unknown set"}</p>
              <PriceBadge price={card.card.marketPrice} currency={currency} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Open Listings</p>
            {listings.map((listing) => (
              <a
                key={listing.source}
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-all duration-150 hover:border-primary/40 hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{listing.name}</p>
                  <p className="text-xs text-muted-foreground">{listing.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  {listing.price !== null ? (
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(listing.price, listing.currency as Currency)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">View</span>
                  )}
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>

          {onViewDetails && (
            <Button variant="outline" className="w-full" onClick={onViewDetails}>
              View card details
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
