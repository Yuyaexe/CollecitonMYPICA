"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { CardImage } from "@/components/shared/CardImage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  isValidImageUrl,
  readImageFileAsDataUrl,
} from "@/features/anime-collection/utils/image";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { toast } from "sonner";

interface EditSeriesCoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesName: string;
  currentCoverUrl: string | null;
  coverColor: string | null;
  onSave: (coverImageUrl: string | null) => void;
}

export function EditSeriesCoverModal({
  open,
  onOpenChange,
  seriesName,
  currentCoverUrl,
  coverColor,
  onSave,
}: EditSeriesCoverModalProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(currentCoverUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl);
  const [loadingFile, setLoadingFile] = useState(false);

  const displayPreview = previewUrl?.trim() || null;

  const resetForm = () => {
    setImageUrl(currentCoverUrl ?? "");
    setPreviewUrl(currentCoverUrl);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) resetForm();
    onOpenChange(next);
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setLoadingFile(true);
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setPreviewUrl(dataUrl);
      setImageUrl(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("anime.photoLoadFailed"));
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) {
      onSave(null);
      onOpenChange(false);
      toast.success(t("anime.coverRemoved"));
      return;
    }
    if (!isValidImageUrl(trimmed)) {
      toast.error(t("anime.coverInvalid"));
      return;
    }
    onSave(trimmed);
    onOpenChange(false);
    toast.success(t("anime.coverUpdated"));
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("anime.changeCover")}
      description={`Custom cover for ${seriesName}.`}
      footer={
        <>
          {currentCoverUrl && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive"
              onClick={() => {
                onSave(null);
                onOpenChange(false);
                toast.success(t("anime.coverRemoved"));
              }}
            >
              Remove cover
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loadingFile}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-5 py-2">
        <div className="flex justify-center">
          <div
            className={cn(
              "relative aspect-square h-36 w-36 overflow-hidden rounded-xl border-4 border-border/80"
            )}
            style={
              !displayPreview && coverColor
                ? { background: `linear-gradient(135deg, ${coverColor}, hsl(0 0% 16%))` }
                : undefined
            }
          >
            {displayPreview ? (
              <CardImage
                src={displayPreview}
                alt={seriesName}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/90">
                {seriesName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="series-cover-url">{t("anime.imageUrl")}</Label>
          <Input
            id="series-cover-url"
            value={imageUrl.startsWith("data:") ? "" : imageUrl}
            placeholder={t("common.urlPlaceholder")}
            onChange={(e) => {
              const value = e.target.value;
              setImageUrl(value);
              setPreviewUrl(value.trim() || null);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("anime.uploadFromComputer")}</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loadingFile}
            onClick={() => fileInputRef.current?.click()}
          >
            {loadingFile ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Choose image
          </Button>
        </div>
      </div>
    </Modal>
  );
}
