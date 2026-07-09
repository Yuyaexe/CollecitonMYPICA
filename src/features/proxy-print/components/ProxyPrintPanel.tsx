"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FileUp, ClipboardPaste, Printer, Trash2, Eye, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { ProxyBinderPreview } from "@/features/proxy-print/components/ProxyBinderPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { detectGameFromText } from "@/lib/proxy-print/detect-game";
import { buildProxyPdf, previewLayoutText } from "@/lib/proxy-print/build-pdf";
import {
  GAME_LABELS,
  PROXY_GAMES,
  type CardSizePreset,
  type ProxyGame,
  type ProxyPrintSlot,
} from "@/lib/proxy-print/types";
import { useLocale, useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InputMode = "paste" | "file";

export function ProxyPrintPanel() {
  const t = useT();
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [deckText, setDeckText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [game, setGame] = useState<ProxyGame>("yugioh");
  const [cardSize, setCardSize] = useState<CardSizePreset>("yugioh");
  const [dpi, setDpi] = useState<200 | 300>(300);
  const [cardsGlued, setCardsGlued] = useState(true);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMax, setProgressMax] = useState(100);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [slots, setSlots] = useState<ProxyPrintSlot[]>([]);
  const [spreadIndex, setSpreadIndex] = useState(0);

  const hasPreview = slots.length > 0;

  const preview = useMemo(
    () => previewLayoutText(cardSize, cardsGlued, locale === "pt-BR" ? "pt-BR" : "en"),
    [cardSize, cardsGlued, locale]
  );

  const refreshDetection = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setStatus(t("proxyPrint.hint"));
        return;
      }
      const detected = detectGameFromText(text);
      setStatus(
        detected
          ? t("proxyPrint.gameDetected", { game: GAME_LABELS[detected] })
          : t("proxyPrint.gameManual")
      );
    },
    [t]
  );

  const handlePasteChange = (value: string) => {
    setDeckText(value);
    setFileName(null);
    setInputMode("paste");
    setSlots([]);
    refreshDetection(value);
  };

  const handlePasteClipboard = async () => {
    try {
      const data = await navigator.clipboard.readText();
      handlePasteChange(data);
    } catch {
      toast.info(t("proxyPrint.clipboardEmpty"));
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setDeckText(text);
    setFileName(file.name);
    setInputMode("file");
    setSlots([]);
    if (file.name.toLowerCase().endsWith(".ydk")) setGame("yugioh");
    refreshDetection(text);
    if (fileRef.current) fileRef.current.value = "";
  };

  const resolveSlotsFromApi = async (): Promise<ProxyPrintSlot[]> => {
    const text = deckText.trim();
    if (!text) throw new Error(t("proxyPrint.needList"));

    const detected = detectGameFromText(text);
    const gameToUse = detected ?? game;
    if (detected) setGame(detected);

    const res = await fetch("/api/proxy-print/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckText: text, game: gameToUse }),
      signal: abortRef.current?.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? t("proxyPrint.failed"));
    if (data.game) setGame(data.game);
    const next = data.slots as ProxyPrintSlot[];
    setSlots(next);
    setSpreadIndex(0);
    return next;
  };

  const handlePreview = async () => {
    abortRef.current = new AbortController();
    setBusy(true);
    setProgress(0);
    setStatus(t("proxyPrint.resolving"));

    try {
      const resolved = await resolveSlotsFromApi();
      setStatus(t("proxyPrint.previewReady", { count: resolved.length }));
      const missing = resolved.filter((s) => !s.imageUrl).length;
      if (missing) toast.warning(t("proxyPrint.partialResolve", { count: missing }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus(t("proxyPrint.cancelled"));
        return;
      }
      toast.error(err instanceof Error ? err.message : t("proxyPrint.failed"));
      setStatus(t("proxyPrint.error"));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const handleGenerate = async () => {
    abortRef.current = new AbortController();
    setPdfBusy(true);
    setBusy(true);
    setProgress(0);

    try {
      let currentSlots = slots;
      if (!currentSlots.length) {
        setStatus(t("proxyPrint.resolving"));
        currentSlots = await resolveSlotsFromApi();
      }

      const imageUrls = currentSlots.map((s) => s.imageUrl).filter(Boolean) as string[];
      if (!imageUrls.length) {
        toast.warning(t("proxyPrint.needPreview"));
        return;
      }

      setProgressMax(imageUrls.length);
      setStatus(t("proxyPrint.buildingPdf"));

      const blob = await buildProxyPdf({
        imageUrls,
        cardSize,
        dpi,
        cardsGlued,
        signal: abortRef.current.signal,
        onProgress: ({ current, total }) => {
          setProgress(current);
          setProgressMax(total);
        },
      });

      const stem = fileName?.replace(/\.[^.]+$/, "") ?? "proxies";
      const suffix = cardsGlued ? "_glued" : "_spaced";
      const filename = `${stem}${suffix}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(t("proxyPrint.done"));
      setStatus(t("proxyPrint.ready", { name: filename }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus(t("proxyPrint.cancelled"));
        return;
      }
      toast.error(err instanceof Error ? err.message : t("proxyPrint.failed"));
      setStatus(t("proxyPrint.error"));
    } finally {
      setBusy(false);
      setPdfBusy(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => abortRef.current?.abort();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <LoadingOverlay
        active={pdfBusy}
        fullscreen
        title={status || t("proxyPrint.generating")}
        description={
          progressMax > 0 ? `${Math.min(progress, progressMax)} / ${progressMax}` : undefined
        }
      />

      <div className="shrink-0 overflow-auto px-4 py-6 sm:px-8 sm:pb-4">
        <PageHeader title={t("proxyPrint.title")} description={t("proxyPrint.description")} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pb-6 lg:flex-row lg:overflow-hidden lg:px-8 lg:pb-8">
        <div className="w-full shrink-0 space-y-5 lg:w-[min(100%,22rem)] lg:overflow-y-auto lg:pr-2 xl:w-96">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={inputMode === "paste" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("paste")}
            >
              {t("proxyPrint.modePaste")}
            </Button>
            <Button
              type="button"
              variant={inputMode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setInputMode("file");
                fileRef.current?.click();
              }}
            >
              <FileUp className="mr-1.5 h-4 w-4" />
              {t("proxyPrint.modeFile")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".ydk,.txt"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>

          {inputMode === "paste" ? (
            <div className="space-y-2">
              <Label htmlFor="proxy-deck">{t("proxyPrint.pasteLabel")}</Label>
              <textarea
                id="proxy-deck"
                value={deckText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={t("proxyPrint.pastePlaceholderNames")}
                rows={7}
                className={cn(
                  "flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handlePasteClipboard()}
                >
                  <ClipboardPaste className="mr-1.5 h-4 w-4" />
                  {t("proxyPrint.pasteClipboard")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeckText("");
                    setSlots([]);
                    setStatus(t("proxyPrint.hint"));
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t("common.clear")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              {fileName ? (
                <p>
                  <span className="text-muted-foreground">{t("proxyPrint.fileSelected")}: </span>
                  <span className="font-medium">{fileName}</span>
                </p>
              ) : (
                <p className="text-muted-foreground">{t("proxyPrint.pickFile")}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <Label>{t("proxyPrint.game")}</Label>
              <ResponsiveSelect
                value={game}
                onValueChange={(v) => setGame(v as ProxyGame)}
                options={PROXY_GAMES.map((g) => ({ value: g, label: GAME_LABELS[g] }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("proxyPrint.dpi")}</Label>
              <ResponsiveSelect
                value={String(dpi)}
                onValueChange={(v) => setDpi(v === "200" ? 200 : 300)}
                options={[
                  { value: "300", label: t("proxyPrint.dpiHd") },
                  { value: "200", label: t("proxyPrint.dpiFast") },
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("proxyPrint.cardSize")}</Label>
            <div className="flex flex-col gap-2">
              {(["yugioh", "bandai"] as CardSizePreset[]).map((preset) => (
                <label
                  key={preset}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    cardSize === preset ? "border-primary bg-primary/5" : "border-border/60"
                  )}
                >
                  <input
                    type="radio"
                    name="card-size"
                    className="sr-only"
                    checked={cardSize === preset}
                    onChange={() => setCardSize(preset)}
                  />
                  {preset === "yugioh" ? t("proxyPrint.sizeYgo") : t("proxyPrint.sizeBandai")}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("proxyPrint.spacing")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={cardsGlued ? "default" : "outline"}
                size="sm"
                onClick={() => setCardsGlued(true)}
              >
                {t("proxyPrint.spacingGlued")}
              </Button>
              <Button
                type="button"
                variant={!cardsGlued ? "default" : "outline"}
                size="sm"
                onClick={() => setCardsGlued(false)}
              >
                {t("proxyPrint.spacingSeparated")}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{preview}</p>
          {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handlePreview()}>
              <Eye className="mr-2 h-4 w-4" />
              {t("proxyPrint.preview")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void handleGenerate()}>
              <Printer className="mr-2 h-4 w-4" />
              {t("proxyPrint.generate")}
            </Button>
            {busy ? (
              <Button type="button" variant="ghost" onClick={handleCancel}>
                {t("common.cancel")}
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">{t("proxyPrint.printHint")}</p>
        </div>

        <div className="relative flex min-h-[28rem] flex-1 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-background p-3 sm:p-4 lg:min-h-0 lg:overflow-hidden">
          {busy && !pdfBusy ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>{status || t("proxyPrint.resolving")}</p>
            </div>
          ) : hasPreview ? (
            <ProxyBinderPreview
              slots={slots}
              spreadIndex={spreadIndex}
              onSpreadChange={setSpreadIndex}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <p>{t("proxyPrint.previewEmpty")}</p>
              <p className="text-xs">{t("proxyPrint.previewEmptyHint")}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
