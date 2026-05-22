"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";

type Props = {
  url: string;
  size?: number;
  className?: string;
};

export function QrDisplay({ url, size = 200, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;
    void QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: { dark: "#0f1011", light: "#f7f8f8" },
    });
  }, [url, size]);

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
