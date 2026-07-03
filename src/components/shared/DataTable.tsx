"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-lg border border-border", className)}>
      {children}
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-muted disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-muted disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
