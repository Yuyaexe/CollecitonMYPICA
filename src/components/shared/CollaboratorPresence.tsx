"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PresencePeer } from "@/hooks/useCollectionPresence";

interface CollaboratorPresenceProps {
  peers: PresencePeer[];
}

export function CollaboratorPresence({ peers }: CollaboratorPresenceProps) {
  if (peers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-muted-foreground">Online:</span>
      {peers.map((peer) => (
        <Tooltip key={peer.userId} delayDuration={0}>
          <TooltipTrigger asChild>
            <Avatar
              className="h-7 w-7 ring-2 ring-offset-2 ring-offset-background"
              style={{ boxShadow: `0 0 0 2px ${peer.color}` }}
            >
              <AvatarFallback
                className="text-[10px] font-medium text-white"
                style={{ backgroundColor: peer.color }}
              >
                {peer.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{peer.displayName}</p>
            {peer.selectedOwnedCardId ? (
              <p className="text-xs text-muted-foreground">Viewing a card</p>
            ) : (
              <p className="text-xs text-muted-foreground">Browsing collection</p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
