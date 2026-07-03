"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  totalCards?: number;
  totalValue?: string;
  onClear: () => void;
  children: ReactNode;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  totalCards,
  totalValue,
  onClear,
  children,
  className,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border bg-card px-6 py-3 shadow-lg",
            className
          )}
        >
          <span className="text-sm font-medium">
            {selectedCount} selecionada{selectedCount !== 1 ? "s" : ""}
            {totalCards !== undefined && totalCards !== selectedCount && (
              <span className="text-muted-foreground"> · {totalCards} cartas</span>
            )}
          </span>
          {totalValue && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
              {totalValue}
            </span>
          )}
          <div className="flex items-center gap-2">{children}</div>
          <button
            onClick={onClear}
            className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Limpar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
