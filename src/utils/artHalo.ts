import { useEffect, useState } from 'react';

/**
 * Card art cleanup: a white halo is drawn around the figure, so every background pixel within the halo radius of it
 * becomes solid white. This hides white fringes the background-removal tool left around a figure.
 * Opaque pixels are never changed.
 */
// The halo is this fraction of the image's width thick (so it looks the same on large and small art), and at least the minimum
const HALO_WIDTH_FRACTION = 0.008;
const MIN_HALO_RADIUS = 3;
// Pixels above this alpha count as part of the figure
const OPAQUE_ALPHA = 128;

// Pixels above this alpha are not blank (for finding where the figure's feet are)
const VISIBLE_ALPHA = 32;

// One processed copy per art path (and per bottom alignment), shared by cards and standees
const processedArt = new Map<string, Promise<string | null>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/**
 * Paints solid white every non-opaque pixel within the radius of an opaque one: a round outline around the figure.
 * Per row, the horizontal distance to the nearest opaque pixel; then per column, the nearest of those by straight-line
 * distance. Only pixels within a square of the radius around the figure are checked.
 */
const haloRadius = (artWidth: number) => Math.max(MIN_HALO_RADIUS, Math.round(artWidth * HALO_WIDTH_FRACTION));

function addWhiteHalo(data: Uint8ClampedArray, width: number, height: number, radius = haloRadius(width)) {
  const r = radius;
  const far = r + 1;
  const opaque = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    opaque[i] = data[i * 4 + 3] > OPAQUE_ALPHA ? 1 : 0;
  }

  // Row pass: horizontal distance to the nearest opaque pixel (capped just past the radius)
  const rowDist = new Uint16Array(width * height).fill(far);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let last = -Infinity;
    for (let x = 0; x < width; x++) {
      if (opaque[row + x]) last = x;
      rowDist[row + x] = Math.min(far, x - last);
    }
    last = Infinity;
    for (let x = width - 1; x >= 0; x--) {
      if (opaque[row + x]) last = x;
      rowDist[row + x] = Math.min(rowDist[row + x], far, last - x);
    }
  }

  // Column pass, on background pixels within the square of the figure only
  const rSq = r * r;
  const near = new Uint8Array(height);
  for (let x = 0; x < width; x++) {
    near.fill(0);
    let last = -Infinity;
    for (let y = 0; y < height; y++) {
      if (rowDist[y * width + x] <= r) last = y;
      if (y - last <= r) near[y] = 1;
    }
    last = Infinity;
    for (let y = height - 1; y >= 0; y--) {
      if (rowDist[y * width + x] <= r) last = y;
      if (last - y <= r) near[y] = 1;
    }
    for (let y = 0; y < height; y++) {
      if (!near[y] || opaque[y * width + x]) continue;
      let inHalo = false;
      for (let dy = -r; dy <= r && !inHalo; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        const dx = rowDist[ny * width + x];
        if (dx <= r && dx * dx + dy * dy <= rSq) inHalo = true;
      }
      if (!inHalo) continue;
      const p = (y * width + x) * 4;
      data[p] = 255;
      data[p + 1] = 255;
      data[p + 2] = 255;
      data[p + 3] = 255;
    }
  }
}

/** Rows of blank pixels below the lowest non-blank one. */
function blankRowsAtBottom(data: Uint8ClampedArray, width: number, height: number): number {
  for (let y = height - 1; y >= 0; y--) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > VISIBLE_ALPHA) return height - 1 - y;
    }
  }
  return 0;
}

/**
 * The art with its white halo. alignBottom (for standees): the image gets a margin of the halo's width on every side, so
 * the halo around a figure that reaches the edge of its art is drawn in full (spilling past the art's edge), and the
 * figure is moved down so its lowest non-blank pixel is on the bottom edge of the image; a standee drawn bottom-aligned
 * then stands on its platform.
 */
async function processArt(src: string, alignBottom = false): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const radius = haloRadius(img.naturalWidth);
    const margin = alignBottom ? radius + 1 : 0;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth + margin * 2;
    canvas.height = img.naturalHeight + margin * 2;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return src;
    ctx.drawImage(img, margin, margin);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    addWhiteHalo(imageData.data, canvas.width, canvas.height, radius);
    const shift = alignBottom ? blankRowsAtBottom(imageData.data, canvas.width, canvas.height) : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, shift);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? URL.createObjectURL(blob) : src;
  } catch {
    return null;
  }
}

/** The cleaned art for the first of these paths that loads, or null if none does. */
export function getProcessedArt(paths: string[], alignBottom = false): Promise<string | null> {
  const key = `${alignBottom ? 'bottom:' : ''}${paths.join('|')}`;
  let pending = processedArt.get(key);
  if (!pending) {
    pending = (async () => {
      for (const path of Array.from(new Set(paths))) {
        const result = await processArt(path, alignBottom);
        if (result) return result;
      }
      return null;
    })();
    processedArt.set(key, pending);
  }
  return pending;
}

export type ProcessedArt = { status: 'pending' } | { status: 'ready'; src: string } | { status: 'error' };

/**
 * Cleaned art for a card, trying each path in order (e.g. its own art file, then its declared art). alignBottom: the
 * standee version, with the figure's feet on the bottom edge (see processArt).
 */
export function useProcessedArt(paths: string[], alignBottom = false): ProcessedArt {
  const key = paths.join('|');
  const [state, setState] = useState<{ key: string; art: ProcessedArt }>({ key, art: { status: 'pending' } });

  useEffect(() => {
    let cancelled = false;
    getProcessedArt(key.split('|'), alignBottom).then((src) => {
      if (cancelled) return;
      setState({ key, art: src ? { status: 'ready', src } : { status: 'error' } });
    });
    return () => {
      cancelled = true;
    };
  }, [key, alignBottom]);

  return state.key === key ? state.art : { status: 'pending' };
}
