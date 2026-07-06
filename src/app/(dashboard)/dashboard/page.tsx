"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Layers, Upload, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/hooks/useAppData";
import { computeCollectionStats } from "@/features/collection/utils/filters";
import { formatNumber } from "@/lib/utils";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-all duration-150 hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { ownedCards, activeCollectionId, isLoading } = useAppData();
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);

  const collectionCards = ownedCards.filter((oc) => oc.collectionId === activeCollectionId);

  const stats = useMemo(
    () => computeCollectionStats(collectionCards),
    [collectionCards]
  );

  return (
    <div className="flex-1 overflow-auto px-4 py-6 sm:p-8">
      <PageHeader title="Dashboard" description="Overview of your TCG collection">
        <Button asChild>
          <Link href="/collection">
            <Layers className="h-4 w-4" />
            View Collection
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Cards"
          value={isLoading ? "…" : formatNumber(stats.totalCards)}
          icon={Layers}
        />
        <StatCard label="Unique Sets" value={formatNumber(stats.uniqueSets)} icon={BarChart3} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold">Quick Actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/collection">Go to Collection</Link>
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
          <h3 className="font-semibold text-muted-foreground">Value History</h3>
          <p className="mt-2 text-sm text-muted-foreground">Charts coming in Phase 3</p>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
