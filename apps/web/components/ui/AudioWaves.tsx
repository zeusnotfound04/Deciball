"use client";

import { useEffect, useRef } from "react";

interface AudioWavesProps {
  color?: string;
  barCount?: number;
  speed?: number;
  opacity?: number;
  className?: string;
}

export default function AudioWaves({
  color = "#ffffff",
  barCount = 64,
  speed = 1,
  opacity = 0.15,
  className = "",
}: AudioWavesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);
      time += 0.008 * speed;

      const centerY = h * 0.5;
      const barWidth = w / barCount;
      const maxBarHeight = h * 0.35;

      // --- Layer 1: Background frequency bars (center-out) ---
      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;
        const normalizedPos = i / barCount;

        // Multiple sine waves at different frequencies = audio spectrum look
        const freq1 = Math.sin(normalizedPos * 3.5 + time * 1.2) * 0.5;
        const freq2 = Math.sin(normalizedPos * 7 + time * 0.8) * 0.3;
        const freq3 = Math.sin(normalizedPos * 13 + time * 2) * 0.15;
        const freq4 = Math.sin(normalizedPos * 1.5 - time * 0.5) * 0.4;

        const combined = (freq1 + freq2 + freq3 + freq4 + 1) * 0.5;
        const barHeight = combined * maxBarHeight;

        // Fade edges
        const edgeFade =
          Math.min(normalizedPos * 4, 1) * Math.min((1 - normalizedPos) * 4, 1);

        const alpha = opacity * edgeFade * (0.3 + combined * 0.7);

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;

        // Draw mirrored from center
        const gap = 2;
        ctx.fillRect(
          x + gap / 2,
          centerY - barHeight,
          barWidth - gap,
          barHeight * 2
        );
      }

      // --- Layer 2: Flowing waveform line ---
      ctx.globalAlpha = opacity * 0.8;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let x = 0; x <= w; x += 3) {
        const normalizedX = x / w;
        const wave1 = Math.sin(normalizedX * 6 + time * 1.5) * 40;
        const wave2 = Math.sin(normalizedX * 11 - time * 1.1) * 20;
        const wave3 = Math.sin(normalizedX * 2.5 + time * 0.7) * 60;

        const edgeFade =
          Math.min(normalizedX * 3, 1) * Math.min((1 - normalizedX) * 3, 1);
        const y = centerY + (wave1 + wave2 + wave3) * edgeFade;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // --- Layer 3: Second waveform (thinner, offset) ---
      ctx.globalAlpha = opacity * 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x <= w; x += 3) {
        const normalizedX = x / w;
        const wave1 = Math.sin(normalizedX * 8 - time * 1.8) * 30;
        const wave2 = Math.sin(normalizedX * 4 + time * 0.9) * 50;
        const wave3 = Math.cos(normalizedX * 14 + time * 2.2) * 15;

        const edgeFade =
          Math.min(normalizedX * 3, 1) * Math.min((1 - normalizedX) * 3, 1);
        const y = centerY + (wave1 + wave2 + wave3) * edgeFade;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // --- Layer 4: Subtle pulse circles from center ---
      const pulseCount = 3;
      for (let i = 0; i < pulseCount; i++) {
        const phase = (time * 0.3 + (i * Math.PI * 2) / pulseCount) % (Math.PI * 2);
        const radius = (phase / (Math.PI * 2)) * Math.min(w, h) * 0.6;
        const fadeOut = 1 - phase / (Math.PI * 2);

        ctx.globalAlpha = opacity * 0.15 * fadeOut;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(w * 0.5, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, barCount, speed, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
}
