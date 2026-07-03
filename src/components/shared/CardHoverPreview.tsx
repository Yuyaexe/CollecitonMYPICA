"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CardImage } from "@/components/shared/CardImage";
import { cn } from "@/lib/utils";

const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = 308;
const GAP = 14;
const SHOW_DELAY_MS = 180;

interface CardHoverPreviewProps {
  src: string | null | undefined;
  previewSrc?: string | null;
  alt: string;
  children: React.ReactNode;
  className?: string;
}

function computePosition(anchor: DOMRect): { top: number; left: number } {
  let left = anchor.right + GAP;
  let top = anchor.top + anchor.height / 2 - PREVIEW_HEIGHT / 2;

  if (left + PREVIEW_WIDTH > window.innerWidth - 12) {
    left = anchor.left - PREVIEW_WIDTH - GAP;
  }
  if (left < 12) {
    left = Math.min(anchor.right + GAP, window.innerWidth - PREVIEW_WIDTH - 12);
  }

  top = Math.max(12, Math.min(top, window.innerHeight - PREVIEW_HEIGHT - 12));

  return { top, left };
}

export function CardHoverPreview({
  src,
  previewSrc,
  alt,
  children,
  className,
}: CardHoverPreviewProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const imageSrc = previewSrc ?? src;

  const hide = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setVisible(false);
  }, []);

  const show = useCallback(() => {
    if (!imageSrc) return;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      setPosition(computePosition(anchor.getBoundingClientRect()));
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, [imageSrc]);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", hide);
    };
  }, [visible, hide]);

  useEffect(() => () => hide(), [hide]);

  return (
    <>
      <div
        ref={anchorRef}
        className={cn("inline-flex", className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {visible &&
        imageSrc &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200] animate-in fade-in-0 zoom-in-95 duration-150"
            style={{ top: position.top, left: position.left, width: PREVIEW_WIDTH }}
            role="presentation"
          >
            <div className="overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border/60">
              <CardImage
                src={imageSrc}
                alt={alt}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                className="object-contain"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
