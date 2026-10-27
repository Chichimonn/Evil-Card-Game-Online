import { useEffect, useState } from 'react';

/**
 * Card art cleanup: a white halo is drawn around the figure, so every background pixel within HALO_RADIUS of it
 * becomes solid white. This hides white fringes the background-removal tool left around a figure.
 * Opaque pixels are never changed.
 */
const HALO_RADIUS = 3;
// Pixels above this alpha count as part of the figure
const OPAQUE_ALPHA = 128;

// One processed copy per art path, shared by cards and standees
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
 * Candidates come from a cheap square neighbourhood (a row pass, then a column pass); each is then checked against
 * the round radius.
 */
function addWhiteHalo(data: Uint8ClampedArray, width: number, height: number) {
  const r = HALO_RADIUS;
  const opaque = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    opaque[i] = data[i * 4 + 3] > OPAQUE_ALPHA ? 1 : 0;
  }

  // Row pass: an opaque pixel within r horizontally
  const nearRow = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let last = -Infinity;
    for (let x = 0; x < width; x++) {
      if (opaque[row + x]) last = x;
      if (x - last <= r) nearRow[row + x] = 1;
    }
    last = Infinity;
    for (let x = width - 1; x >= 0; x--) {
      if (opaque[row + x]) last = x;
      if (last - x <= r) nearRow[row + x] = 1;
    }
  }

  const offsets: [number, number][] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if ((dx !== 0 || dy !== 0) && dx * dx + dy * dy <= r * r + 1) offsets.push([dx, dy]);
    }
  }
  const nearOpaque = (x: number, y: number) =>
    offsets.some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < width && ny < height && opaque[ny * width + nx] === 1;
    });

  // Column pass over the row result, then the round check, on background pixels only
  const near = new Uint8Array(height);
  for (let x = 0; x < width; x++) {
    near.fill(0);
    let last = -Infinity;
    for (let y = 0; y < height; y++) {
      if (nearRow[y * width + x]) last = y;
      if (y - last <= r) near[y] = 1;
    }
    last = Infinity;
    for (let y = height - 1; y >= 0; y--) {
      if (nearRow[y * width + x]) last = y;
      if (last - y <= r) near[y] = 1;
    }
    for (let y = 0; y < height; y++) {
      if (!near[y] || opaque[y * width + x] || !nearOpaque(x, y)) continue;
      const p = (y * width + x) * 4;
      data[p] = 255;
      data[p + 1] = 255;
      data[p + 2] = 255;
      data[p + 3] = 255;
    }
  }
}

async function processArt(src: string): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    addWhiteHalo(imageData.data, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? URL.createObjectURL(blob) : src;
  } catch {
    return null;
  }
}

/** The cleaned art for the first of these paths that loads, or null if none does. */
export function getProcessedArt(paths: string[]): Promise<string | null> {
  const key = paths.join('|');
  let pending = processedArt.get(key);
  if (!pending) {
    pending = (async () => {
      for (const path of Array.from(new Set(paths))) {
        const result = await processArt(path);
        if (result) return result;
      }
      return null;
    })();
    processedArt.set(key, pending);
  }
  return pending;
}

export type ProcessedArt = { status: 'pending' } | { status: 'ready'; src: string } | { status: 'error' };

/** Cleaned art for a card, trying each path in order (e.g. its own art file, then its declared art). */
export function useProcessedArt(paths: string[]): ProcessedArt {
  const key = paths.join('|');
  const [state, setState] = useState<{ key: string; art: ProcessedArt }>({ key, art: { status: 'pending' } });

  useEffect(() => {
    let cancelled = false;
    getProcessedArt(key.split('|')).then((src) => {
      if (cancelled) return;
      setState({ key, art: src ? { status: 'ready', src } : { status: 'error' } });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state.key === key ? state.art : { status: 'pending' };
}
