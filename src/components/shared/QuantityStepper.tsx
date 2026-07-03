"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  onRemove?: () => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  onRemove,
  min = 1,
  max = 99999,
  className,
}: QuantityStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = useCallback((n: number) => Math.max(min, Math.min(max, n)), [min, max]);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!Number.isNaN(parsed)) {
      if (parsed < min) {
        onRemove?.();
      } else {
        onChange(clamp(parsed));
      }
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  const decrement = () => {
    if (value <= min) {
      onRemove?.();
      return;
    }
    onChange(clamp(value - 1));
  };
  const increment = () => onChange(clamp(value + 1));

  const atMin = value <= min && !onRemove;
  const atMax = value >= max;

  return (
    <div
      className={cn(
        "inline-flex h-7 items-center rounded-md border border-border/60 bg-background/80",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={atMin || editing}
        onClick={decrement}
        aria-label={value <= min && onRemove ? "Remove from collection" : "Decrease quantity"}
        className={cn(
          "flex h-full w-6 shrink-0 items-center justify-center rounded-l-md border-r border-border/60",
          "text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
      >
        <Minus className="h-3 w-3" />
      </button>

      <div
        className={cn(
          "flex min-w-[2rem] flex-1 items-center justify-center px-0.5",
          !editing && "cursor-text hover:bg-muted/20"
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className="w-full bg-transparent text-center text-sm font-medium tabular-nums outline-none"
            aria-label="Edit quantity"
          />
        ) : (
          <button
            type="button"
            className="w-full px-0.5 text-center text-sm font-medium tabular-nums"
            onClick={() => setEditing(true)}
            aria-label={`Quantity ${value}, click to edit`}
          >
            {value}
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={atMax || editing}
        onClick={increment}
        aria-label="Increase quantity"
        className={cn(
          "flex h-full w-6 shrink-0 items-center justify-center rounded-r-md border-l border-border/60",
          "text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
