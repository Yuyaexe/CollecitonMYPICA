"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TruncatedTooltipProps {
  text: string | null | undefined;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function TruncatedTooltip({
  text,
  className,
  side = "top",
}: TruncatedTooltipProps) {
  const value = text?.trim();
  if (!value || value === "—") {
    return <span className={cn("truncate", className)}>—</span>;
  }

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <span className={cn("block min-w-0 truncate", className)}>{value}</span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-sm">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
