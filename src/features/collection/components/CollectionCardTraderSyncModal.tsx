"use client";

import { useCallback, useRef, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppData } from "@/hooks/useAppData";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useCardTraderBulkStore } from "@/features/collection/stores/cardtrader-bulk.store";
import {
  dedupeOwnedCardsForSync,
  runCollectionCardTraderSync,
  type CardTraderSyncMode,
  type CollectionCardTraderSyncProgress,
} from "@/features/market/services/collection-cardtrader-sync";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { toast } from "sonner";

interface CollectionCardTraderSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionCards: DemoOwnedCard[];
}

export function CollectionCardTraderSyncModal({
  open,
  onOpenChange,
  collectionCards,
}: CollectionCardTraderSyncModalProps) {
  const { profile, updateOwnedCard } = useAppData();
  const refreshPrices = useCollectionUIStore((s) => s.refreshPrices);
  const mergeQuote = useCardTraderBulkStore((s) => s.mergeQuote);

  const cancelRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<CardTraderSyncMode | null>(null);
  const [progress, setProgress] = useState<CollectionCardTraderSyncProgress | null>(null);

  const variantCount = dedupeOwnedCardsForSync(collectionCards).length;

  const handleClose = useCallback(
    (next: boolean) => {
      if (running) {
        cancelRef.current = true;
        return;
      }
      onOpenChange(next);
      if (!next) {
        setProgress(null);
        setMode(null);
      }
    },
    [running, onOpenChange]
  );

  const startSync = useCallback(
    async (syncMode: CardTraderSyncMode) => {
      if (collectionCards.length === 0) {
        toast.error("Nenhuma carta na coleção");
        return;
      }

      cancelRef.current = false;
      setRunning(true);
      setMode(syncMode);
      setProgress({ current: 0, total: variantCount, updated: 0, skipped: 0 });

      try {
        const result = await runCollectionCardTraderSync({
          cards: collectionCards,
          currency: profile.currency,
          mode: syncMode,
          shouldCancel: () => cancelRef.current,
          onProgress: setProgress,
          onQuote: mergeQuote,
          updateOwnedCard,
        });

        refreshPrices();

        if (cancelRef.current) {
          toast.message("Sincronização cancelada", {
            description: `${result.updated} variantes atualizadas antes de cancelar`,
          });
        } else if (syncMode === "links") {
          toast.success("Links CardTrader atualizados", {
            description: `${result.updated} variantes corrigidas · ${result.skipped} sem match`,
          });
        } else {
          toast.success("Preços e links atualizados", {
            description: `${result.updated} variantes · ${result.skipped} sem dados CardTrader`,
          });
        }

        if (!cancelRef.current) {
          onOpenChange(false);
          setProgress(null);
          setMode(null);
        }
      } catch {
        toast.error("Falha ao sincronizar com CardTrader");
      } finally {
        setRunning(false);
        cancelRef.current = false;
      }
    },
    [
      collectionCards,
      mergeQuote,
      onOpenChange,
      profile.currency,
      refreshPrices,
      updateOwnedCard,
      variantCount,
    ]
  );

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="CardTrader"
      description={
        running
          ? mode === "links"
            ? "Corrigindo links e blueprints…"
            : "Buscando preços e links para toda a coleção…"
          : `${variantCount} variantes únicas nesta coleção (sem limite de 48).`
      }
      footer={
        running ? (
          <Button
            variant="outline"
            onClick={() => {
              cancelRef.current = true;
            }}
          >
            Cancelar
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        )
      }
    >
      <div className="space-y-5 py-2">
        {running && progress ? (
          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-center text-sm tabular-nums text-muted-foreground">
              {progress.current} / {progress.total} variantes · {pct}%
            </p>
            <p className="text-center text-xs text-muted-foreground">
              {progress.updated} corrigidas · {progress.skipped} sem match
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <Button
              type="button"
              variant="outline"
              className={cn("h-auto flex-col items-start gap-1 px-4 py-3 text-left")}
              onClick={() => void startSync("links")}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Link2 className="h-4 w-4" />
                Corrigir links CardTrader
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Revalida blueprints (LART, SCR/QSCR, etc.) sem focar em preço
              </span>
            </Button>

            <Button
              type="button"
              className="h-auto flex-col items-start gap-1 px-4 py-3 text-left"
              onClick={() => void startSync("full")}
            >
              <span className="flex items-center gap-2 font-semibold">
                <RefreshCw className="h-4 w-4" />
                Atualizar todos os preços e links
              </span>
              <span className="text-xs font-normal text-primary-foreground/80">
                Busca CardTrader para cada variante · pode levar alguns minutos
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                refreshPrices();
                toast.message("Atualizando preços rápidos (48 variantes)");
                onOpenChange(false);
              }}
            >
              Só atualização rápida (48 variantes visíveis)
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
