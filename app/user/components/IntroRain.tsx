// components/IntroRain.tsx
"use client";

import { useEffect, useRef } from "react";
import { WORD_GRID, WORD_TEXT } from "./introRainWord";

type IntroRainProps = {
  /** The word that forms out of the falling characters ("\n" stacks lines) */
  word?: string;
  /** Characters used for the rain */
  chars?: string;
  /** Characters the word settles into (dense glyphs keep the letters solid) */
  wordChars?: string;
  /** Max height of each character cell in px (shrinks automatically on small screens) */
  fontSize?: number;
  /** Height in px of the slot the word settles into (defaults to scaling with its width) */
  height?: number;
  /** Colour of the falling characters */
  rainColor?: string;
  /** Colour of the leading character in each column */
  headColor?: string;
  /** Colour of the settled word (defaults to the theme's --primary) */
  wordColor?: string;
  /** Font used to draw the hidden word shape */
  wordFont?: string;
  /** ms until the word is guaranteed to be fully formed */
  formDuration?: number;
  /** Average ms between the single drips that fall once the word has formed (0 = none) */
  dripInterval?: number;
  className?: string;
};

const DEFAULT_CHARS =
  "abcdefghijklmnopqrstuvwxyz0123456789/.,';[]{}<>?!@#$%^&*()-=+";

const DEFAULT_WORD_CHARS = "#@$%&8B0WMQNHRD";

const MONO_FONT = "ui-monospace, Menlo, Consolas, monospace";

/** Width of a character cell relative to its height, roughly a monospace glyph */
const CELL_ASPECT = 0.65;

/**
 * A title that forms out of characters raining down the whole page.
 * Once formed the word stays on screen. The rain sits behind the page content,
 * so the rest of the page stays usable while it falls.
 */
export default function IntroRain({
  word = "Market Rewind",
  chars = DEFAULT_CHARS,
  wordChars = DEFAULT_WORD_CHARS,
  fontSize = 10,
  height,
  rainColor = "#2f9e5b",
  headColor = "#d9ffe6",
  wordColor,
  wordFont = 'system-ui, -apple-system, "Segoe UI", sans-serif',
  formDuration = 3500,
  dripInterval = 350,
  className = "",
}: IntroRainProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!slot || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(slot);
    const settledColor = () => wordColor || styles.getPropertyValue("--primary").trim() || "#fff";
    const randChar = () => chars[Math.floor(Math.random() * chars.length)];
    const randWordChar = () => wordChars[Math.floor(Math.random() * wordChars.length)];

    const lines = word
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    // The default word has a hand-tuned shape; anything else is traced from the font
    const grid = lines.join("\n") === WORD_TEXT ? WORD_GRID : null;

    let w = 0;
    let h = 0;
    let cell = fontSize; // cell height
    let cellW = fontSize; // cell width, narrower to match monospace glyphs
    let cols = 0;
    let rows = 0;
    let mask = new Uint8Array(0); // 1 = this cell belongs to the word
    let locked = new Uint8Array(0); // 1 = a character has settled here
    let lockedChar: string[] = [];
    let lockedAt = new Float32Array(0);
    let drops: number[] = [];
    let speeds: number[] = [];
    let target = 0;
    let lockedCount = 0;
    let formed = false;

    const lock = (i: number, now: number) => {
      locked[i] = 1;
      lockedChar[i] = randWordChar();
      lockedAt[i] = now;
      lockedCount++;
    };

    // Everything the layout depends on; when it changes the grid is rebuilt
    let layoutKey = "";
    const currentLayout = () => {
      const r = slot.getBoundingClientRect();
      const el = document.documentElement;
      return [r.left, r.top, r.width, r.height, el.clientWidth, el.clientHeight, window.devicePixelRatio].join();
    };

    const setup = () => {
      layoutKey = currentLayout();
      const rect = slot.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // The canvas is fixed to the screen (so it can never cause scrollbars)
      // and sized to the visible area, not counting any scrollbars
      w = document.documentElement.clientWidth;
      h = document.documentElement.clientHeight;

      if (grid) {
        // Size the cells so the hand-tuned shape fills the slot
        cellW = Math.min(
          (rect.width * 0.95) / grid[0].length,
          ((rect.height * 0.95) / grid.length) * CELL_ASPECT,
        );
        cell = cellW / CELL_ASPECT;
      } else {
        // Small cells (about 130 across the slot) so the letters keep their detail
        cell = Math.max(5, Math.min(fontSize, Math.round(rect.width / 130)));
        cellW = Math.max(4, Math.round(cell * CELL_ASPECT));
      }
      cols = Math.ceil(w / cellW);
      rows = Math.ceil(h / cell);

      // Where the slot sits on the screen, in cells
      const slotLeft = Math.round(rect.left / cellW);
      const slotCols = Math.floor(rect.width / cellW);
      const slotTop = Math.round(rect.top / cell);
      const slotRows = Math.floor(rect.height / cell);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      mask = new Uint8Array(cols * rows);
      locked = new Uint8Array(cols * rows);
      lockedChar = new Array(cols * rows);
      lockedAt = new Float32Array(cols * rows);
      target = 0;
      lockedCount = 0;

      const shape = grid ?? traceWord(slotCols, slotRows);
      placeShape(shape, slotLeft, slotCols, slotTop, slotRows);

      // Speed is in cells per frame, scaled so the fall takes about a second
      const baseSpeed = Math.max(1, rows / 40);
      speeds = Array.from({ length: cols }, () => baseSpeed * (0.8 + Math.random() * 0.5));

      if (formed || reduceMotion) {
        // Already played (or motion is off): show the finished word straight away
        const now = performance.now() - 1000;
        for (let i = 0; i < mask.length; i++) if (mask[i]) lock(i, now);
        drops = Array.from({ length: cols }, () => rows + 1);
      } else {
        drops = Array.from({ length: cols }, () => -Math.random() * rows * 0.4);
      }
    };

    // Centre the word's shape ("#" = cell in the word) in the slot
    const placeShape = (
      shape: string[],
      slotLeft: number,
      slotCols: number,
      slotTop: number,
      slotRows: number,
    ) => {
      const left = slotLeft + Math.floor((slotCols - shape[0].length) / 2);
      const top = slotTop + Math.max(0, Math.floor((slotRows - shape.length) / 2));
      shape.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
          const row = top + r;
          const col = left + c;
          if (line[c] !== "#" || row >= rows || col < 0 || col >= cols) continue;
          mask[row * cols + col] = 1;
          target++;
        }
      });
    };

    // Draw the word at full resolution, then check how much of each cell it covers.
    // Returns a slot-sized shape in the same format as WORD_GRID.
    const traceWord = (slotCols: number, slotRows: number) => {
      const offW = slotCols * cellW;
      const offH = slotRows * cell;
      const off = document.createElement("canvas");
      off.width = offW;
      off.height = offH;
      const o = off.getContext("2d", { willReadFrequently: true })!;
      o.textAlign = "left";
      o.textBaseline = "alphabetic";
      o.fillStyle = "#fff";

      // Size the font so cap height is a whole number of rows, then sit each
      // baseline on a row boundary. Round letters overshoot the baseline by a
      // pixel or two; aligned like this the overshoot never fills a stray row.
      o.font = `900 100px ${wordFont}`;
      const capRatio = o.measureText("H").actualBoundingBoxAscent / 100;
      const widthRatio = Math.max(...lines.map((l) => o.measureText(l).width)) / 100;
      const gapRows = 1;
      let capRows = Math.floor((slotRows * 0.8 - gapRows * (lines.length - 1)) / lines.length);
      while (capRows > 1 && ((capRows * cell) / capRatio) * widthRatio > offW * 0.95) capRows--;
      const size = (capRows * cell) / capRatio;
      o.font = `900 ${size}px ${wordFont}`;

      const blockRows = capRows * lines.length + gapRows * (lines.length - 1);
      const firstTop = Math.floor((slotRows - blockRows) / 2);
      lines.forEach((line, n) => {
        const baselineRow = firstTop + (capRows + gapRows) * n + capRows;
        o.fillText(line, (offW - o.measureText(line).width) / 2, baselineRow * cell);
      });
      const data = o.getImageData(0, 0, offW, offH).data;
      const alpha = (x: number, y: number) => data[(y * offW + x) * 4 + 3];

      // True when an empty line of pixels runs right through the cell with ink
      // on both sides, e.g. the thin gap between an "i" and its dot. Filling
      // that cell would glue two separate shapes together.
      const straddlesGap = (x0: number, y0: number) => {
        const rowEmpty = (k: number) => {
          for (let x = x0; x < x0 + cellW; x++) if (alpha(x, y0 + k) > 40) return false;
          return true;
        };
        const colEmpty = (k: number) => {
          for (let y = y0; y < y0 + cell; y++) if (alpha(x0 + k, y) > 40) return false;
          return true;
        };
        // Is there an empty line between the first and last lines with ink?
        const gapInside = (n: number, empty: (k: number) => boolean) => {
          const lines = Array.from({ length: n }, (_, k) => empty(k));
          const first = lines.indexOf(false);
          const last = lines.lastIndexOf(false);
          return lines.slice(first + 1, last).some(Boolean);
        };
        return gapInside(cell, rowEmpty) || gapInside(cellW, colEmpty);
      };

      const filled = new Uint8Array(slotCols * slotRows);
      const coverage = new Float32Array(slotCols * slotRows);
      for (let r = 0; r < slotRows; r++) {
        for (let c = 0; c < slotCols; c++) {
          const x0 = c * cellW;
          const y0 = r * cell;
          let sum = 0;
          for (let y = y0; y < y0 + cell; y++) {
            for (let x = x0; x < x0 + cellW; x++) sum += alpha(x, y);
          }
          const i = r * slotCols + c;
          coverage[i] = sum / (cell * cellW * 255);
          if (coverage[i] > 0.45 && !straddlesGap(x0, y0)) filled[i] = 1;
        }
      }

      const at = (r: number, c: number) =>
        r >= 0 && r < slotRows && c >= 0 && c < slotCols ? filled[r * slotCols + c] : 0;

      // Trim outer corners that are only partly covered, like the slanted top of
      // a "t". One pass only, so curves lose their jaggies but keep their shape.
      const corners: number[] = [];
      for (let r = 0; r < slotRows; r++) {
        for (let c = 0; c < slotCols; c++) {
          const i = r * slotCols + c;
          if (!filled[i] || coverage[i] > 0.65) continue;
          const vertical = at(r - 1, c) + at(r + 1, c);
          const horizontal = at(r, c - 1) + at(r, c + 1);
          if (vertical === 1 && horizontal === 1) corners.push(i);
        }
      }
      for (const i of corners) filled[i] = 0;

      // Strokes are at least two cells thick, so a cell touching fewer than two
      // others is a stray from a slanted edge or curve. Prune until none are left.
      for (let pruned = true; pruned; ) {
        pruned = false;
        for (let r = 0; r < slotRows; r++) {
          for (let c = 0; c < slotCols; c++) {
            if (!filled[r * slotCols + c]) continue;
            if (at(r - 1, c) + at(r + 1, c) + at(r, c - 1) + at(r, c + 1) < 2) {
              filled[r * slotCols + c] = 0;
              pruned = true;
            }
          }
        }
      }

      return Array.from({ length: slotRows }, (_, r) =>
        Array.from(filled.subarray(r * slotCols, (r + 1) * slotCols), (f) => (f ? "#" : ".")).join(""),
      );
    };

    setup();

    const start = performance.now();
    let last = 0;
    let raf = 0;
    let drainedAt = 0;

    // Once the intro is over, the occasional lone drip falls down a random column
    const DRIP_TRAIL = 14;
    type Drip = { col: number; row: number; speed: number; trail: string[] };
    let drips: Drip[] = [];

    const updateDrips = (now: number, dt: number) => {
      if (!reduceMotion && dripInterval > 0 && Math.random() < dt / dripInterval) {
        drips.push({
          col: Math.floor(Math.random() * cols),
          row: -1,
          speed: Math.max(1, rows / 40) * (0.6 + Math.random() * 0.5),
          trail: [],
        });
      }

      ctx.font = `${cell}px ${MONO_FONT}`;
      ctx.textBaseline = "top";
      for (const d of drips) {
        const prevRow = Math.floor(d.row);
        d.row += d.speed;
        const row = Math.floor(d.row);
        // A fresh character for each new row, so the trail doesn't flicker
        for (let r = prevRow + 1; r <= row; r++) {
          d.trail.unshift(randChar());
          // Light up word characters as the drip passes behind them
          const i = r * cols + d.col;
          if (r >= 0 && r < rows && locked[i]) lockedAt[i] = now;
        }
        d.trail.length = Math.min(d.trail.length, DRIP_TRAIL);

        d.trail.forEach((ch, k) => {
          const r = row - k;
          if (r < 0 || r >= rows) return;
          ctx.globalAlpha = 1 - k / DRIP_TRAIL;
          ctx.fillStyle = k === 0 ? headColor : rainColor;
          ctx.fillText(ch, d.col * cellW, r * cell);
        });
      }
      ctx.globalAlpha = 1;
      // Drop finished drips, and any left outside the grid after a resize
      drips = drips.filter((d) => Math.floor(d.row) - DRIP_TRAIL < rows && d.col < cols);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 30) return; // ~30fps feels more like falling text
      const dt = now - last;
      last = now;

      // Rebuild if anything moved or resized: the window, the slot (e.g. an error
      // message pushed the page around) or the screen scaling (another monitor)
      if (currentLayout() !== layoutKey) setup();

      const progress = Math.min((now - start) / formDuration, 1);

      // Fade the previous frame towards transparent to leave trails. The fade
      // never quite reaches zero, so a second after the rain has drained the
      // leftover haze is wiped (the word is redrawn below every frame).
      if (formed && !drainedAt && drops.every((d) => d > rows)) drainedAt = now;
      if (drainedAt && now - drainedAt > 1000) {
        ctx.clearRect(0, 0, w, h);
        updateDrips(now, dt);
      } else {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.font = `${cell}px ${MONO_FONT}`;
      ctx.textBaseline = "top";

      for (let c = 0; c < cols; c++) {
        if (drops[c] > rows) continue;
        const prevRow = Math.floor(drops[c]);
        drops[c] += speeds[c];
        const row = Math.floor(drops[c]);

        // Every word cell this drop passes through catches a character
        for (let r = Math.max(prevRow + 1, 0); r <= Math.min(row, rows - 1); r++) {
          const i = r * cols + c;
          if (mask[i] && !locked[i]) lock(i, now);
        }

        // Recolour the old head so the trail is in the rain colour
        if (prevRow >= 0 && prevRow < rows) {
          ctx.fillStyle = rainColor;
          ctx.fillText(randChar(), c * cellW, prevRow * cell);
        }
        if (row >= 0 && row < rows) {
          ctx.fillStyle = headColor;
          ctx.fillText(randChar(), c * cellW, row * cell);
        }

        // Keep the rain going until the word is formed, then let it drain away
        if (!formed && row > rows) drops[c] = -Math.random() * rows * 0.3;
      }

      // Guarantee the word finishes on time
      if (progress >= 1 && lockedCount < target) {
        for (let i = 0; i < mask.length; i++) if (mask[i] && !locked[i]) lock(i, now);
      }
      if (target > 0 && lockedCount >= target) formed = true;

      // Draw the settled characters on top, bold and fully opaque
      const color = settledColor();
      ctx.font = `bold ${cell}px ${MONO_FONT}`;
      for (let i = 0; i < locked.length; i++) {
        if (!locked[i]) continue;
        const x = (i % cols) * cellW;
        const y = Math.floor(i / cols) * cell;
        if (Math.random() < 0.01) lockedChar[i] = randWordChar(); // subtle flicker
        ctx.clearRect(x, y, cellW, cell);
        ctx.fillStyle = now - lockedAt[i] < 180 ? headColor : color;
        ctx.fillText(lockedChar[i], x, y);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [
    word,
    chars,
    wordChars,
    fontSize,
    rainColor,
    headColor,
    wordColor,
    wordFont,
    formDuration,
    dripInterval,
  ]);

  return (
    <div ref={slotRef} className={`relative w-full ${className}`} style={height ? { height } : { aspectRatio: "6 / 1" }}>
      <h1 className="sr-only">{word.replace(/\n/g, " ")}</h1>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 block"
      />
    </div>
  );
}
