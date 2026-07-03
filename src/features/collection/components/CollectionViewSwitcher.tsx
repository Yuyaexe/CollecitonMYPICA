"use client";

import { LayoutGrid, LayoutList, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCollectionUIStore,
  type CollectionViewMode,
} from "@/features/collection/stores/collection-ui.store";

const MODES: { id: CollectionViewMode; label: string; icon: typeof LayoutList }[] = [
  { id: "table", label: "List", icon: LayoutList },
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "compact", label: "Cards", icon: Rows3 },
];

export function CollectionViewSwitcher({ className }: { className?: string }) {
  const viewMode = useCollectionUIStore((s) => s.viewMode);
  const setViewMode = useCollectionUIStore((s) => s.setViewMode);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5",
        className
      )}
      role="group"
      aria-label="Collection view mode"
    >
      {MODES.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs",
            viewMode === id && "bg-background shadow-sm"
          )}
          onClick={() => setViewMode(id)}
          aria-pressed={viewMode === id}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
