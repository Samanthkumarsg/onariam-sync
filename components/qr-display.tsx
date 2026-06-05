"use client";

import QRCode from "qrcode";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

type Props = {
  url: string;
  size?: number;
  className?: string;
};

export function QrDisplay({ url, size = 200, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;

    const isDark = resolvedTheme === "dark";
    void QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: {
        dark: isDark ? "#ededf0" : "#17171c",
        light: isDark ? "#1e1e24" : "#ffffff",
      },
    });
  }, [url, size, resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={size}
      height={size}
      aria-label={`QR code for ${url}`}
    />
  );
}
