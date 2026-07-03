"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children: ReactNode;
  className?: string;
}

export function BulkActionBar({ selectedCount, onClear, children, className }: BulkActionBarProps) {
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
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2">{children}</div>
          <button
            onClick={onClear}
            className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
