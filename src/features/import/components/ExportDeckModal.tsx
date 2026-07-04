"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
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
}

export function ExportDeckModal({
  open,
  onOpenChange,
  cards,
  collectionName,
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Exportar coleção"
      description="Escolha o formato de decklist ou CSV"
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
            gameSlug === "digimon"
              ? "Exporta como // DeckList com nome e código da carta."
              : "Exporta lista com quantidade e nome das cartas."}
          {format === "ydke" && "Link YDKE compatível com EDOPro e YGOPRODeck."}
          {format === "ydk" && "Arquivo .ydk com passcodes Yu-Gi-Oh!."}
          {format === "csv" && "Planilha CSV para CardTrader / Excel."}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={cards.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
