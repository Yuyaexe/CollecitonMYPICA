"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SearchDebugEntry } from "@/features/catalog/services/search-debug";

interface SearchDebugConsoleProps {
  entries: SearchDebugEntry[];
  errorMessage?: string | null;
  className?: string;
}

const LEVEL_STYLES: Record<SearchDebugEntry["level"], string> = {
  info: "text-muted-foreground",
  warn: "text-amber-400",
  error: "text-destructive",
  success: "text-emerald-400",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SearchDebugConsole({
  entries,
  errorMessage,
  className,
}: SearchDebugConsoleProps) {
  const [open, setOpen] = useState(true);

  const summary = useMemo(() => {
    const errors = entries.filter((e) => e.level === "error").length;
    const warns = entries.filter((e) => e.level === "warn").length;
    if (errors > 0) return `${errors} error(s), ${entries.length} step(s)`;
    if (warns > 0) return `${warns} warning(s), ${entries.length} step(s)`;
    return `${entries.length} step(s)`;
  }, [entries]);

  if (entries.length === 0 && !errorMessage) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-zinc-950/80 font-mono text-[11px]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/30"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Terminal className="h-3.5 w-3.5" />
          Search console
          <span className="text-muted-foreground">({summary})</span>
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="max-h-40 overflow-y-auto border-t border-border/60 px-3 py-2">
          {errorMessage && (
            <p className="mb-2 text-destructive">{errorMessage}</p>
          )}
          {entries.length === 0 ? (
            <p className="text-muted-foreground">No debug steps recorded.</p>
          ) : (
            <ul className="space-y-1">
              {entries.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={LEVEL_STYLES[entry.level]}>
                  <span className="text-muted-foreground/70">[{formatTime(entry.at)}]</span>{" "}
                  <span className="text-primary/80">{entry.stage}</span> — {entry.message}
                  {entry.ms != null && (
                    <span className="text-muted-foreground"> ({entry.ms}ms)</span>
                  )}
                  {entry.detail && (
                    <div className="mt-0.5 pl-4 text-[10px] text-muted-foreground">{entry.detail}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchDebugToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant={enabled ? "secondary" : "ghost"}
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={onToggle}
    >
      <Terminal className="h-3.5 w-3.5" />
      Console
    </Button>
  );
}
