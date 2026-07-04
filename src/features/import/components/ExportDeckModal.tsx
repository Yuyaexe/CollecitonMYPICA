"use client";

import { useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPORT_FORMAT_LABELS,
  buildCollectionDecklistContent,
  exportCollectionDecklist,
  getAvailableExportFormats,
  type DeckExportFormat,
} from "@/features/import/services/decklist-export";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { toast } from "sonner";

interface ExportDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: DemoOwnedCard[];
  collectionName: string;
  title?: string;
  description?: string;
}

export function ExportDeckModal({
  open,
  onOpenChange,
  cards,
  collectionName,
  title = "Exportar coleção",
  description = "Escolha o formato de decklist ou CSV",
}: ExportDeckModalProps) {
  const gameSlug = cards[0]?.card.gameSlug;
  const formats = useMemo(
    () => getAvailableExportFormats(cards, gameSlug),
    [cards, gameSlug]
  );
  const [format, setFormat] = useState<DeckExportFormat>("decklist");

  const handleExport = () => {
    try {
      exportCollectionDecklist(cards, collectionName, format, gameSlug);
      toast.success("Export concluído");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    }
  };

  const handleCopy = async () => {
    if (format === "csv") {
      toast.error("Use o download para CSV.");
      return;
    }
    try {
      const content = buildCollectionDecklistContent(cards, format, gameSlug);
      await navigator.clipboard.writeText(content);
      toast.success("Copiado — cole no EDOPro ou CardTrader");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao copiar");
    }
  };

  const previewContent = useMemo(() => {
    if (!open || format === "csv" || cards.length === 0) return null;
    try {
      return buildCollectionDecklistContent(cards, format, gameSlug);
    } catch {
      return null;
    }
  }, [open, format, cards, gameSlug]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Formato</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as DeckExportFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((value) => (
                <SelectItem key={value} value={value}>
                  {EXPORT_FORMAT_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          {format === "decklist" &&
            (gameSlug === "digimon"
              ? "Lista com nome e código — compatível com CardTrader."
              : "Lista com quantidade e nome — compatível com CardTrader e EDOPro.")}
          {format === "ydke" &&
            "Link YDKE — cole no EDOPro (Import) ou YGOPRODeck."}
          {format === "ydk" && "Arquivo .ydk com passcodes — abra no EDOPro."}
          {format === "csv" && "Planilha CSV para CardTrader / Excel."}
        </p>

        {previewContent && (
          <pre className="max-h-40 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
            {previewContent}
          </pre>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {format !== "csv" && (
            <Button
              variant="outline"
              onClick={() => void handleCopy()}
              disabled={cards.length === 0 || !previewContent}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
          )}
          <Button onClick={handleExport} disabled={cards.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Baixar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
