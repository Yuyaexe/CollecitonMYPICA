"use client";

import { useState } from "react";
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
}

export function CardImage({
  src,
  alt,
  width,
  height,
  className,
  fill,
  sizes,
}: CardImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
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

  return (
    <Image
      src={src}
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
