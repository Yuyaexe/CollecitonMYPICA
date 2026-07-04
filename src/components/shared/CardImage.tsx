"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface CardImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  /** Used when the primary URL fails to load (e.g. CardTrader placeholder). */
  fallbackSrc?: string | null;
}

export function CardImage({
  src,
  alt,
  width,
  height,
  className,
  fill,
  sizes,
  fallbackSrc,
}: CardImageProps) {
  const [error, setError] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setError(false);
    setActiveSrc(src);
  }, [src]);

  useEffect(() => {
    if (
      error &&
      fallbackSrc &&
      fallbackSrc !== activeSrc &&
      fallbackSrc !== src
    ) {
      setError(false);
      setActiveSrc(fallbackSrc);
    }
  }, [error, fallbackSrc, activeSrc, src]);

  if (!activeSrc || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-[10px] text-muted-foreground",
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        N/A
      </div>
    );
  }

  if (activeSrc.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={activeSrc}
        alt={alt}
        className={cn(fill && "absolute inset-0 h-full w-full", "object-contain", className)}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Image
      src={activeSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      sizes={sizes}
      unoptimized
      className={cn("object-contain", className)}
      onError={() => setError(true)}
    />
  );
}
