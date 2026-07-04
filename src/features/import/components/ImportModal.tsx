"use client";

import { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import { FileText, Loader2, Upload } from "lucide-react";
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
import {
  aggregateDeckEntries,
  parseDecklist,
} from "@/features/import/services/decklist-parser";
import type { DecklistGameSlug, ResolvedDeckEntry } from "@/features/import/types";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { CARD_CONDITIONS, CARD_LANGUAGES } from "@/types/tcg";
import type { CardCondition, CardLanguage } from "@/types/tcg";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportTab = "decklist" | "csv";

const GAME_OPTIONS: { value: DecklistGameSlug | "auto"; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "yugioh", label: "Yu-Gi-Oh!" },
  { value: "digimon", label: "Digimon" },
];

const FORMAT_LABELS: Record<string, string> = {
  ydke: "YDKE",
  ydk: "YDK",
  "yugioh-text": "Yu-Gi-Oh! (texto)",
  "digimon-text": "Digimon (texto)",
  unknown: "Texto",
};

async function resolveDeckEntries(
  entries: ReturnType<typeof aggregateDeckEntries>,
  gameSlug: DecklistGameSlug
): Promise<ResolvedDeckEntry[]> {
  const res = await fetch("/api/cards/resolve-deck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameSlug, entries }),
  });
  if (!res.ok) throw new Error("Failed to resolve decklist");
  const json = (await res.json()) as { resolved: ResolvedDeckEntry[] };
  return json.resolved;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [tab, setTab] = useState<ImportTab>("decklist");
  const [deckText, setDeckText] = useState("");
  const [gamePreference, setGamePreference] = useState<DecklistGameSlug | "auto">("auto");
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);

  const [preset, setPreset] = useState<CsvPreset>("generic");
  const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [fullData, setFullData] = useState<Record<string, string>[]>([]);

  const { importRows, importDeckFromSearch } = useAppData();

  const parsedDeck = useMemo(() => {
    if (!deckText.trim()) return null;
    const preferred = gamePreference === "auto" ? undefined : gamePreference;
    const parsed = parseDecklist(deckText, preferred);
    return { ...parsed, entries: aggregateDeckEntries(parsed.entries) };
  }, [deckText, gamePreference]);

  const resetState = useCallback(() => {
    setDeckText("");
    setMapping(null);
    setHeaders([]);
    setPreview([]);
    setFullData([]);
    setImporting(false);
  }, []);

  const handleDeckFile = useCallback(async (file: File) => {
    const text = await file.text();
    setDeckText(text.trim());
  }, []);

  const handleCsvFile = useCallback((file: File) => {
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

  const handleDeckImport = async () => {
    if (!parsedDeck || parsedDeck.entries.length === 0) {
      toast.error("Nenhuma carta encontrada na lista");
      return;
    }

    const gameSlug = parsedDeck.gameSlug === "unknown" ? "yugioh" : parsedDeck.gameSlug;
    const game =
      DEMO_GAMES.find((g) => g.slug === gameSlug) ??
      DEMO_GAMES.find((g) => g.slug === "yugioh")!;

    setImporting(true);
    try {
      const resolved = await resolveDeckEntries(parsedDeck.entries, gameSlug);
      const withResults = resolved.filter((row) => row.result);
      const failed = resolved.length - withResults.length;

      if (withResults.length === 0) {
        toast.error("Nenhuma carta foi reconhecida. Verifique o formato ou o jogo.");
        return;
      }

      const count = await importDeckFromSearch(
        withResults.map((row) => ({
          result: row.result!,
          quantity: row.entry.quantity,
          gameId: game.id,
          gameSlug: game.slug,
          gameName: game.name,
        })),
        mergeDuplicates
      );

      toast.success(
        failed > 0
          ? `Importadas ${count} cartas (${failed} não encontradas)`
          : `Importadas ${count} cartas`
      );
      onOpenChange(false);
      resetState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar");
    } finally {
      setImporting(false);
    }
  };

  const handleCsvImport = async () => {
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
    const count = await importRows(rows, mergeDuplicates);
    toast.success(`Imported ${count} cards`);
    onOpenChange(false);
    resetState();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
      title="Importar coleção"
      description="Cole uma decklist, YDKE, YDK ou CSV"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {(["decklist", "csv"] as ImportTab[]).map((value) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 px-3 text-xs", tab === value && "bg-background shadow-sm")}
              onClick={() => setTab(value)}
            >
              {value === "decklist" ? "Deck / Lista" : "CSV"}
            </Button>
          ))}
        </div>

        {tab === "decklist" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Jogo</Label>
                <Select
                  value={gamePreference}
                  onValueChange={(v) => setGamePreference(v as DecklistGameSlug | "auto")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-muted/30">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  Arquivo .txt / .ydk
                  <input
                    type="file"
                    accept=".txt,.ydk,.ydke,text/plain"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && void handleDeckFile(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Decklist</Label>
              <textarea
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
                placeholder={`Cole YDKE, YDK ou lista de cartas:\n\n// Digimon\n4 Pagumon   BT25-005\n\n// Yu-Gi-Oh!\n1 Ash Blossom & Joyous Spring`}
                className={cn(
                  "flex min-h-[220px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm transition-all duration-150",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              />
            </div>

            {parsedDeck && parsedDeck.entries.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  {parsedDeck.entries.length} cartas · {FORMAT_LABELS[parsedDeck.format] ?? parsedDeck.format}
                </div>
                {parsedDeck.entries.slice(0, 5).map((entry, index) => (
                  <p key={index} className="truncate text-xs text-muted-foreground">
                    {entry.quantity}× {entry.name}
                    {entry.setCode ? ` · ${entry.setCode}` : ""}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="merge-deck"
                checked={mergeDuplicates}
                onCheckedChange={(c) => setMergeDuplicates(!!c)}
              />
              <Label htmlFor="merge-deck">Mesclar duplicatas (somar quantidades)</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void handleDeckImport()}
                disabled={importing || !parsedDeck?.entries.length}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar
              </Button>
            </div>
          </>
        ) : (
          <>
            {!mapping ? (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 transition-all duration-150 hover:border-primary/50 hover:bg-muted/30">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">CSV do CardTrader, TCGPlayer, etc.</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
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
                    id="merge-csv"
                    checked={mergeDuplicates}
                    onCheckedChange={(c) => setMergeDuplicates(!!c)}
                  />
                  <Label htmlFor="merge-csv">Merge duplicates (sum quantities)</Label>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-sm font-medium">Preview ({preview.length} rows)</p>
                  {preview.slice(0, 3).map((row, i) => (
                    <p key={i} className="truncate text-xs text-muted-foreground">
                      {row[mapping.name]}
                    </p>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setMapping(null)}>
                    Back
                  </Button>
                  <Button onClick={() => void handleCsvImport()}>Import CSV</Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
