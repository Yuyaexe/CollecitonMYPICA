"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  autoMapColumns,
  parseCsvRows,
  detectPreset,
  type CsvPreset,
  type CsvColumnMapping,
  CSV_PRESETS,
} from "@/features/import/services/csv-parser";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useDemoStore } from "@/lib/demo/store";
import { CARD_CONDITIONS, CARD_LANGUAGES } from "@/types/tcg";
import type { CardCondition, CardLanguage } from "@/types/tcg";
import { toast } from "sonner";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [preset, setPreset] = useState<CsvPreset>("generic");
  const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [fullData, setFullData] = useState<Record<string, string>[]>([]);
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const importRows = useDemoStore((s) => s.importRows);

  const handleFile = useCallback((file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const h = results.meta.fields ?? [];
        setHeaders(h);
        setFullData(results.data);
        setPreview(results.data.slice(0, 5));
        const detected = autoMapColumns(h);
        setMapping(detected);
        setPreset(detectPreset(h));
      },
    });
  }, []);

  const applyPreset = (p: CsvPreset) => {
    setPreset(p);
    const base = autoMapColumns(headers);
    setMapping({ ...base, ...CSV_PRESETS[p] });
  };

  const handleImport = () => {
    if (!mapping) return;
    const parsed = parseCsvRows(fullData, mapping);
    const rows = parsed.map((row) => {
      const game =
        DEMO_GAMES.find((g) => g.slug === row.game || g.name.toLowerCase().includes(row.game)) ??
        DEMO_GAMES[0];
      return {
        name: row.name,
        set: row.set,
        quantity: row.quantity,
        condition: (CARD_CONDITIONS.includes(row.condition as CardCondition)
          ? row.condition
          : "NM") as CardCondition,
        language: (CARD_LANGUAGES.includes(row.language as CardLanguage)
          ? row.language
          : "EN") as CardLanguage,
        gameId: game.id,
        gameSlug: game.slug,
        gameName: game.name,
        isFoil: row.isFoil,
        purchasePrice: row.purchasePrice,
      };
    });
    const count = importRows(rows, mergeDuplicates);
    toast.success(`Imported ${count} cards`);
    onOpenChange(false);
    setMapping(null);
    setHeaders([]);
    setPreview([]);
    setFullData([]);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Import CSV"
      description="Upload a collection export from CardTrader, TCGPlayer, or any CSV"
    >
      <div className="space-y-4">
        {!mapping ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 transition-all duration-150 hover:border-primary/50 hover:bg-muted/30">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Drop CSV file or click to browse</span>
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select value={preset} onValueChange={(v) => applyPreset(v as CsvPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="cardtrader">CardTrader</SelectItem>
                  <SelectItem value="tcgplayer">TCGPlayer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="merge"
                checked={mergeDuplicates}
                onCheckedChange={(c) => setMergeDuplicates(!!c)}
              />
              <Label htmlFor="merge">Merge duplicates (sum quantities)</Label>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                Preview ({preview.length} rows)
              </div>
              {preview.slice(0, 3).map((row, i) => (
                <p key={i} className="truncate text-xs text-muted-foreground">
                  {row[mapping.name]}
                </p>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setMapping(null); setHeaders([]); }}>
                Back
              </Button>
              <Button onClick={handleImport}>Import</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
