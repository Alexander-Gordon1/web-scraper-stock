// components/BackgroundRain.tsx
"use client";

import { useEffect, useRef } from "react";
import { DEFAULT_CHARS, MONO_FONT } from "./IntroRain";

type BackgroundRainProps = {
  /** Height of each character cell in px */
  fontSize?: number;
  /** Average ms between new drips */
  dripInterval?: number;
  /** How fast drips fall, in character rows per second */
  rowsPerSecond?: number;
  /** Characters in each drip's fading tail */
  trail?: number;
  /** Overall strength, so text on top stays readable */
  opacity?: number;
  rainColor?: string;
  headColor?: string;
  className?: string;
};

/**
 * Slow, faint drips falling from the top of their container, in the same style as
 * IntroRain's rain. Fills its positioned parent; put it behind the content.
 */
export default function BackgroundRain({
  fontSize = 12,
  dripInterval = 220,
  rowsPerSecond = 5,
  trail = 8,
  opacity = 0.45,
  rainColor = "#2f9e5b",
  headColor = "#d9ffe6",
  className = "",
}: BackgroundRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // motion off: leave the space empty
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cellW = Math.round(fontSize * 0.65);
    let w = 0;
    let cols = 0;
    let rows = 0;

    // keep the canvas sharp and the same size as its container
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / cellW);
      rows = Math.ceil(h / fontSize);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const randChar = () => DEFAULT_CHARS[Math.floor(Math.random() * DEFAULT_CHARS.length)];

    type Drip = { col: number; row: number; speed: number; chars: string[] };
    let drips: Drip[] = [];
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // capped so coming back to the tab doesn't dump a burst of drips
      const dt = Math.min(now - last, 100);
      last = now;

      if (Math.random() < dt / dripInterval) {
        drips.push({
          col: Math.floor(Math.random() * cols),
          row: -1,
          speed: rowsPerSecond * (0.6 + Math.random() * 0.8),
          chars: [],
        });
      }

      ctx.clearRect(0, 0, w, rows * fontSize);
      ctx.font = `${fontSize}px ${MONO_FONT}`;
      ctx.textBaseline = "top";

      for (const d of drips) {
        const prevRow = Math.floor(d.row);
        d.row += (d.speed * dt) / 1000;
        // a fresh character for each new row, so the tail doesn't flicker
        for (let r = prevRow + 1; r <= Math.floor(d.row); r++) d.chars.unshift(randChar());
        d.chars.length = Math.min(d.chars.length, trail);

        d.chars.forEach((ch, k) => {
          const r = Math.floor(d.row) - k;
          if (r < 0 || r >= rows) return;
          ctx.globalAlpha = (1 - k / trail) * opacity;
          ctx.fillStyle = k === 0 ? headColor : rainColor;
          ctx.fillText(ch, d.col * cellW, r * fontSize);
        });
      }
      ctx.globalAlpha = 1;
      // drop drips whose tail has left the bottom (or that are off the side after a resize)
      drips = drips.filter((d) => Math.floor(d.row) - trail < rows && d.col < cols);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [fontSize, dripInterval, rowsPerSecond, trail, opacity, rainColor, headColor]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none block h-full w-full ${className}`} />;
}
