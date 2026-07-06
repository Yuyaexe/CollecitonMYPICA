"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { toast } from "sonner";

export function BulkActionsBar() {
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const clearSelection = useCollectionUIStore((s) => s.clearSelection);
  const { ownedCards, deleteOwnedCards } = useAppData();

  const totalCards = ownedCards.reduce((sum, oc) => {
    if (!selectedIds.has(oc.id)) return sum;
    return sum + oc.quantity;
  }, 0);

  const handleDelete = async () => {
    await deleteOwnedCards([...selectedIds]);
    toast.success(`${selectedIds.size} carta(s) removida(s)`);
    clearSelection();
  };

  return (
    <BulkActionBar
      selectedCount={selectedIds.size}
      totalCards={totalCards}
      onClear={clearSelection}
    >
      <Button size="sm" variant="destructive" onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </BulkActionBar>
  );
}
