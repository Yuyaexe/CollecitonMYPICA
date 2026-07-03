"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export function BulkActionsBar() {
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const clearSelection = useCollectionUIStore((s) => s.clearSelection);
  const { ownedCards, profile, deleteOwnedCards } = useAppData();

  const selectionStats = useMemo(() => {
    let totalCards = 0;
    let totalValue = 0;
    for (const oc of ownedCards) {
      if (!selectedIds.has(oc.id)) continue;
      totalCards += oc.quantity;
      totalValue += (oc.card.marketPrice ?? 0) * oc.quantity;
    }
    return { totalCards, totalValue };
  }, [ownedCards, selectedIds]);

  const handleDelete = async () => {
    await deleteOwnedCards([...selectedIds]);
    toast.success(`${selectedIds.size} carta(s) removida(s)`);
    clearSelection();
  };

  return (
    <BulkActionBar
      selectedCount={selectedIds.size}
      totalCards={selectionStats.totalCards}
      totalValue={formatCurrency(selectionStats.totalValue, profile.currency)}
      onClear={clearSelection}
    >
      <Button size="sm" variant="destructive" onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </BulkActionBar>
  );
}
