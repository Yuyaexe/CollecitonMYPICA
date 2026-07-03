"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

interface PriceBadgeProps {
  price: number | null;
  currency?: "USD" | "BRL";
  trend?: number | null;
  className?: string;
}

export function PriceBadge({ price, currency = "USD", trend, className }: PriceBadgeProps) {
  if (price === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-sm font-medium tabular-nums">{formatCurrency(price, currency)}</span>
      {trend !== undefined && trend !== null && <MarketBadge trend={trend} />}
    </div>
  );
}

interface MarketBadgeProps {
  trend: number;
  className?: string;
}

export function MarketBadge({ trend, className }: MarketBadgeProps) {
  if (trend === 0) {
    return (
      <Badge variant="outline" className={cn("border-muted-foreground/30 text-muted-foreground", className)}>
        <Minus className="h-3 w-3" />
      </Badge>
    );
  }

  const positive = trend > 0;
  return (
    <Badge
      className={cn(
        "gap-0.5 border-0",
        positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
        className
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(trend).toFixed(1)}%
    </Badge>
  );
}
