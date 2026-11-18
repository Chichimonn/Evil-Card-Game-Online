import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CardItem } from '../types/card';
import { initialCardsData } from '../data/cardsData';
import {
  CardView,
  CARD_HEADING_FONT,
  CARD_BODY_FONT,
  getCardBackgroundPath,
  getSetBackgroundPath,
  getCardArtPaths
} from '../components/CardView';
import { toSvg } from 'html-to-image';
import { getAllCachedCardFaces, saveCachedCardFace, removeCachedCardFaces } from '../services/cardImageDB';
import { getProcessedArt } from '../utils/artHalo';
import { getTokenGalleryCards } from '../utils/tokenCards';
import { LOADING_MESSAGES } from '../data/loadingMessages';

// Every card face drawn: the real cards, then the tokens (shown after them in the gallery)
const RENDERED_CARDS: CardItem[] = [...initialCardsData.cards, ...getTokenGalleryCards(initialCardsData)];

interface CardImageContextType {
  cardImages: Record<string, string>;
  isReady: boolean;
  loadedCount: number;
  totalCount: number;
  getCardImage: (cardId: string) => string | undefined;
}

const CardImageContext = createContext<CardImageContextType>({
  cardImages: {},
  isReady: false,
  loadedCount: 0,
  totalCount: RENDERED_CARDS.length,
  getCardImage: () => undefined
});

export const useCardImages = () => useContext(CardImageContext);

declare global {
  interface Window {
    __CARD_IMAGE_CACHE__?: Record<string, string>;
  }
}

// The card fonts (declared in index.css), inlined as data URLs so each captured card face carries them
const CARD_FONT_FILES = [
  { family: 'Card Pirata One', url: '/assets/fonts/pirata-one-latin-400-normal.woff2' },
  { family: 'Card IM Fell English', url: '/assets/fonts/im-fell-english-latin-400-normal.woff2' }
];

async function buildCardFontEmbedCSS(): Promise<string> {
  const rules = await Promise.all(
    CARD_FONT_FILES.map(async ({ family, url }) => {
      const blob = await (await fetch(url)).blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return `@font-face { font-family: '${family}'; src: url(${dataUrl}) format('woff2'); font-weight: 400; font-style: normal; }`;
    })
  );
  return rules.join('\n');
}

/**
 * Whether a captured card face came out whole: a card is an opaque black-framed rectangle with a coloured name bar
 * (its class colour, split between classes on a card with several, so the colour itself isn't checked). A capture that
 * lost the card's styles has see-through edges or nothing where the bar should be.
 */
function isWholeCardFace(face: HTMLCanvasElement): boolean {
  try {
    const w = 60;
    const h = 84;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(face, 0, 0, w, h);
    const pixel = (x: number, y: number) => ctx.getImageData(Math.round(x * (w - 1)), Math.round(y * (h - 1)), 1, 1).data;
    // The middle of each edge, just inside it
    const edges = [pixel(0.5, 0.02), pixel(0.03, 0.5), pixel(0.97, 0.5), pixel(0.5, 0.98)];
    if (edges.some((p) => p[3] < 200)) return false;
    // Both ends of the name bar, below the black its top half sits on, are opaque and coloured (no darker than
    // stone-900, rgb 28 25 23, in their brightest channel), not the black of the frame
    const isBar = (p: Uint8ClampedArray) => p[3] >= 200 && Math.max(p[0], p[1], p[2]) >= 20;
    return isBar(pixel(0.04, 0.09)) && isBar(pixel(0.96, 0.09));
  } catch {
    // Can't check here: take the capture as it is
    return true;
  }
}

// ---- Which saved faces are still good ----
// Each face is saved with a signature of what it was drawn from: the card's data, the stamps (size and time modified) of
// its art and set background files, and the face-drawing code (see vite.config.ts). A face is drawn again only when its
// own signature changes, so adding or changing a few cards (or anything that isn't about card faces) redraws just those.
declare const __ART_STAMPS__: Record<string, string>;
declare const __FACE_CODE_ID__: string;
const ART_STAMPS: Record<string, string> = typeof __ART_STAMPS__ === 'object' && __ART_STAMPS__ ? __ART_STAMPS__ : {};
const FACE_CODE_ID: string = typeof __FACE_CODE_ID__ === 'string' ? __FACE_CODE_ID__ : 'unknown';

// The stamp of a file in the art folder ('' when there is no such file)
const artStamp = (url: string | null): string => (url ? ART_STAMPS[url.replace(/^\/assets\/art\//, '')] || '' : '');

// A short hash of a string (two 32-bit FNV-1a style hashes with different starting points)
function hashString(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000393);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

const getCardFaceSignature = (card: CardItem): string =>
  hashString(
    [
      FACE_CODE_ID,
      JSON.stringify(card),
      ...getCardArtPaths(card).map(artStamp),
      artStamp(getCardBackgroundPath(card)),
      artStamp(getSetBackgroundPath(card))
    ].join('|')
  );

// ---- Loading and drawing ----

// How long to wait on any one file before going on without it
const FILE_TIMEOUT_MS = 60000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p.catch(() => null), sleep(ms).then(() => null)]);

function loadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// ---- Copying only the styles a card face needs ----
// html-to-image copies every computed style property of every element into the captured picture: hundreds per element,
// most of them at their defaults or Tailwind's own variables, which made each capture about a megabyte and slow. It is
// given instead the properties that differ from the browser's defaults on some element of a face drawn so far. The
// library keeps the first list it is given and reads it on every capture, so this one array is passed and grows as
// faces using more properties are drawn (each face adds its own before it is captured), so every face is drawn with
// all the properties it uses, the same as before.
const NEEDED_STYLE_PROPERTIES: string[] = [];
const neededStyleSet = new Set<string>();
let defaultStylesFrame: HTMLIFrameElement | null = null;
const defaultStyles = new Map<string, Record<string, string>>();

// The browser's own default styles for an element of this kind (in a blank page, without the game's stylesheet)
function getDefaultStyles(el: Element): Record<string, string> {
  const key = `${el.namespaceURI}|${el.tagName}`;
  let styles = defaultStyles.get(key);
  if (styles) return styles;
  if (!defaultStylesFrame) {
    defaultStylesFrame = document.createElement('iframe');
    defaultStylesFrame.setAttribute('aria-hidden', 'true');
    defaultStylesFrame.style.cssText = 'position:fixed;left:-30000px;top:0;width:10px;height:10px;border:0';
    document.body.appendChild(defaultStylesFrame);
    const doc = defaultStylesFrame.contentDocument!;
    doc.open();
    doc.write('<!doctype html><html><body></body></html>');
    doc.close();
  }
  const doc = defaultStylesFrame.contentDocument!;
  const probe = doc.createElementNS(el.namespaceURI || 'http://www.w3.org/1999/xhtml', el.tagName.toLowerCase());
  doc.body.appendChild(probe);
  const computed = defaultStylesFrame.contentWindow!.getComputedStyle(probe);
  styles = {};
  for (let i = 0; i < computed.length; i++) styles[computed[i]] = computed.getPropertyValue(computed[i]);
  probe.remove();
  defaultStyles.set(key, styles);
  return styles;
}

// Adds the style properties this face uses (any not at the browser's default on one of its elements)
function addNeededStyleProperties(face: HTMLElement) {
  for (const el of [face, ...Array.from(face.querySelectorAll('*'))]) {
    const computed = getComputedStyle(el);
    const defaults = getDefaultStyles(el);
    for (let i = 0; i < computed.length; i++) {
      const name = computed[i];
      // (Tailwind's variables are already worked into the computed values)
      if (neededStyleSet.has(name) || name.startsWith('--')) continue;
      if (computed.getPropertyValue(name) !== defaults[name]) {
        neededStyleSet.add(name);
        NEEDED_STYLE_PROPERTIES.push(name);
      }
    }
  }
}

/**
 * Draws an element onto a canvas at pixelRatio times its size, as html-to-image's toCanvas does, except that it never
 * waits for an animation frame: those don't come while the page is in a background tab, which would stall the loading.
 */
async function captureToCanvas(
  el: HTMLElement,
  options: { fontEmbedCSS?: string; skipFonts?: boolean; pixelRatio: number }
): Promise<HTMLCanvasElement> {
  const width = el.clientWidth;
  const height = el.clientHeight;
  addNeededStyleProperties(el);
  const svg = await toSvg(el, { ...options, width, height, cacheBust: false, includeStyleProperties: NEEDED_STYLE_PROPERTIES });
  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('The captured card face could not be read'));
    img.src = svg;
  });
  try {
    await img.decode();
  } catch {
    // (drawn as loaded)
  }
  const canvas = document.createElement('canvas');
  canvas.width = width * options.pixelRatio;
  canvas.height = height * options.pixelRatio;
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Waits until the check passes or the time runs out; whether it passed. The check is run again whenever something
 * inside root changes or a picture in it finishes loading, not on a timer: the browser slows timers right down while the
 * window is in the background or covered, which made every face wait about a second.
 */
function waitFor(root: HTMLElement | null, check: () => boolean, ms: number): Promise<boolean> {
  if (check()) return Promise.resolve(true);
  if (!root) return Promise.resolve(false);
  return new Promise((resolve) => {
    const done = (passed: boolean) => {
      observer.disconnect();
      root.removeEventListener('load', recheck, true);
      root.removeEventListener('error', recheck, true);
      clearTimeout(timer);
      resolve(passed);
    };
    const recheck = () => {
      if (check()) done(true);
    };
    const observer = new MutationObserver(recheck);
    observer.observe(root, { childList: true, subtree: true, attributes: true });
    // (load and error don't bubble, but can be caught on their way down)
    root.addEventListener('load', recheck, true);
    root.addEventListener('error', recheck, true);
    const timer = setTimeout(() => done(check()), ms);
  });
}

/**
 * A message from LOADING_MESSAGES, changing every few seconds (never the same one twice in a row) while `active`.
 */
function useRotatingMessage(active: boolean): string {
  const pickOther = (current: number) => {
    if (LOADING_MESSAGES.length < 2) return 0;
    let next = current;
    while (next === current) next = Math.floor(Math.random() * LOADING_MESSAGES.length);
    return next;
  };
  const [index, setIndex] = useState(() => pickOther(-1));
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setIndex((i) => pickOther(i)), 2600);
    return () => clearInterval(timer);
  }, [active]);
  return LOADING_MESSAGES[index] || 'Loading cards...';
}

export const CardImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allCards = RENDERED_CARDS;
  const totalCount = allCards.length;

  const [cardImages, setCardImages] = useState<Record<string, string>>(() => window.__CARD_IMAGE_CACHE__ || {});
  const [isReady, setIsReady] = useState<boolean>(() => {
    const memory = window.__CARD_IMAGE_CACHE__;
    return !!(memory && Object.keys(memory).length >= totalCount);
  });
  const [loadedCount, setLoadedCount] = useState<number>(() => {
    const memory = window.__CARD_IMAGE_CACHE__;
    return memory ? Object.keys(memory).length : 0;
  });

  // The cards being drawn right now, one per drawing slot
  const [drawSlots, setDrawSlots] = useState<(CardItem | null)[]>([]);
  const loadingMessage = useRotatingMessage(!isReady);
  const hostRef = useRef<HTMLDivElement>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    async function initCardImages() {
      const startedAt = performance.now();
      const signatures: Record<string, string> = {};
      allCards.forEach((c) => (signatures[c.id] = getCardFaceSignature(c)));

      // 1. Faces already drawn: this session's (in memory), else the saved ones whose signature still matches
      const currentMap: Record<string, string> = { ...(window.__CARD_IMAGE_CACHE__ || {}) };
      if (Object.keys(currentMap).length < totalCount) {
        const saved = await getAllCachedCardFaces();
        Object.entries(saved).forEach(([id, face]) => {
          if (!currentMap[id] && face.sig === signatures[id]) currentMap[id] = URL.createObjectURL(face.png);
        });
        removeCachedCardFaces(Object.keys(saved).filter((id) => !(id in signatures)));
      }

      const missingCards = allCards.filter((c) => !currentMap[c.id]);

      if (missingCards.length === 0) {
        window.__CARD_IMAGE_CACHE__ = currentMap;
        setCardImages(currentMap);
        setLoadedCount(totalCount);
        setIsReady(true);
        return;
      }

      setCardImages({ ...currentMap });
      setLoadedCount(Object.keys(currentMap).length);

      // 2. Download everything the missing faces need, all at once: each card's art (cleaned up with its white halo,
      // ready for the face to use), the set backgrounds and the card fonts
      const backgrounds = Array.from(
        new Set(missingCards.map(getCardBackgroundPath).filter((p): p is string => Boolean(p)))
      );
      let fontEmbedCSS = '';
      await Promise.all([
        ...missingCards.map((c) => withTimeout(getProcessedArt(getCardArtPaths(c)), FILE_TIMEOUT_MS)),
        ...backgrounds.map((url) => withTimeout(loadImage(url), FILE_TIMEOUT_MS)),
        // The card fonts must be loaded before cards are laid out (the text is sized to fit with their metrics), and
        // are embedded into each captured face
        withTimeout(
          Promise.all([document.fonts.load(`40px ${CARD_HEADING_FONT}`), document.fonts.load(`40px ${CARD_BODY_FONT}`)]).then(
            () => document.fonts.ready
          ),
          FILE_TIMEOUT_MS
        ),
        buildCardFontEmbedCSS()
          .then((css) => (fontEmbedCSS = css))
          .catch((err) => console.warn('Could not embed card fonts:', err))
      ]);
      const downloadedAt = performance.now();

      // 3. Draw the faces one after another (drawing is the page's own work, so several at once only get in each
      // other's way), each face's PNG being encoded off the page's main work while the next face is drawn
      const queue = [...missingCards];
      const setSlot = (slot: number, card: CardItem | null) =>
        setDrawSlots((prev) => {
          const next = prev.slice();
          next[slot] = card;
          return next;
        });

      // Time spent in each part of drawing, for the log
      const spent = { mount: 0, pictures: 0, capture: 0 };
      const encoding: Promise<void>[] = [];
      const drawCard = async (card: CardItem, slot: number) => {
        let mark = performance.now();
        const lap = (part: keyof typeof spent) => {
          const now = performance.now();
          spent[part] += now - mark;
          mark = now;
        };
        setSlot(slot, card);
        const find = () => hostRef.current?.querySelector(`[data-card-face="${card.id}"]`) as HTMLElement | null;
        // Mounted and laid out
        await waitFor(hostRef.current, () => Boolean(find()), 3000);
        const el = find();
        lap('mount');
        if (!el) return;

        // Its art: loaded, else (no art file at all) the drawn placeholder. The art was cleaned up in step 2, so this
        // is quick unless a file was slow to arrive.
        const artImg = () => el.querySelector(`img[data-art-card-id="${card.id}"]`) as HTMLImageElement | null;
        await waitFor(el, () => {
          const img = artImg();
          return img ? img.complete : !el.querySelector(`[data-art-pending="${card.id}"]`);
        }, 8000);
        const img = artImg();
        const hasArt = Boolean(img && img.naturalWidth > 0);
        const expectsArt = getCardArtPaths(card).some((p) => artStamp(p));

        // Its set background (removed if it fails to load)
        const background = () => el.querySelector('img[data-set-background]') as HTMLImageElement | null;
        await waitFor(el, () => {
          const bg = background();
          return !bg || (bg.complete && bg.naturalWidth > 0);
        }, 8000);
        const bg = background();
        const hasBackground = !bg || (bg.complete && bg.naturalWidth > 0);
        lap('pictures');

        // Capture the face, checking the picture came out whole: now and then a capture loses the card's styles
        // (its black frame, layout and white text), leaving the pictures loose and the text invisible. Such a capture
        // is taken again, and never kept.
        let face: HTMLCanvasElement | null = null;
        let whole = false;
        for (let attempt = 0; attempt < 3 && !whole; attempt++) {
          if (attempt > 0) await sleep(150);
          const shot = await captureToCanvas(el, { fontEmbedCSS, skipFonts: !fontEmbedCSS, pixelRatio: 2 });
          whole = el.isConnected && el.dataset.cardFace === card.id && isWholeCardFace(shot);
          if (whole || !face) face = shot;
        }
        lap('capture');
        if (!face) return;
        if (!whole) console.warn(`Card face for ${card.name} (${card.id}) came out incomplete; it will be redrawn next load`);

        // Only keep whole faces drawn with all their pictures, so a face drawn before a picture arrived (a slow
        // connection) or a broken capture is drawn again on the next load. (A card with no art file keeps its placeholder
        // face until art is added, which changes its signature.)
        const keep = whole && (hasArt || !expectsArt) && hasBackground;
        const canvas = face;
        encoding.push(
          new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')).then((png) => {
            if (!png) return;
            currentMap[card.id] = URL.createObjectURL(png);
            setLoadedCount(Object.keys(currentMap).length);
            if (keep) saveCachedCardFace(card.id, { sig: signatures[card.id], png });
          })
        );
      };

      for (let card = queue.shift(); card; card = queue.shift()) {
        try {
          await drawCard(card, 0);
        } catch (err) {
          console.warn(`Failed to capture image for card ${card.name} (${card.id}):`, err);
        }
      }
      setSlot(0, null);
      await Promise.all(encoding);

      // Cleanup
      setDrawSlots([]);
      window.__CARD_IMAGE_CACHE__ = currentMap;
      setCardImages({ ...currentMap });
      setIsReady(true);
      const doneAt = performance.now();
      console.info(
        `Card faces: drew ${missingCards.length} of ${totalCount} in ${((doneAt - startedAt) / 1000).toFixed(1)}s ` +
          `(downloading ${((downloadedAt - startedAt) / 1000).toFixed(1)}s, drawing ${((doneAt - downloadedAt) / 1000).toFixed(1)}s; ` +
          `per card: ${Object.entries(spent)
            .map(([part, ms]) => `${part} ${Math.round(ms / missingCards.length)}ms`)
            .join(', ')})`
      );
    }

    initCardImages();
  }, [allCards, totalCount]);

  const getCardImage = (cardId: string) => cardImages[cardId];

  return (
    <CardImageContext.Provider
      value={{
        cardImages,
        isReady,
        loadedCount,
        totalCount,
        getCardImage
      }}
    >
      {/* Loading screen displaying the full size and resolution card back image rotated 90 degrees clockwise */}
      {!isReady && (
        <div className="fixed inset-0 bg-[#0c0a09] z-[99999] flex flex-col items-center justify-center select-none text-stone-200 gap-6 p-6">
          {/* Card back image rotated 90 degrees clockwise at full size and resolution */}
          <div className="relative flex items-center justify-center drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
            <div className="w-[336px] sm:w-[420px] h-[240px] sm:h-[300px] relative overflow-hidden rounded-2xl border-2 border-stone-800 shadow-2xl flex items-center justify-center bg-[#1e191a] animate-in fade-in zoom-in-95 duration-200">
              <img
                src="/assets/frames/cardback.png"
                alt="Loading Cards"
                className="w-[240px] sm:w-[300px] h-[336px] sm:h-[420px] object-cover select-none pointer-events-none"
                style={{
                  transform: 'rotate(90deg)',
                  imageRendering: '-webkit-optimize-contrast'
                }}
              />
            </div>
          </div>

          <div className="w-80 sm:w-96 flex flex-col items-center gap-2.5 px-4">
            {/* A rotating message (see data/loadingMessages.ts), on its own line so long ones wrap rather than cut off */}
            <p key={loadingMessage} className="w-full min-h-[2.5em] text-center text-sm font-mono text-stone-300 animate-in fade-in duration-300">
              {loadingMessage}
            </p>
            <div className="flex items-center justify-end w-full text-xs font-mono text-stone-500">
              <span>
                {loadedCount} / {totalCount}
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full bg-sky-500 transition-all duration-75 ease-out rounded-full"
                style={{
                  width: `${totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hidden offscreen host for high-resolution card rendering */}
      <div
        ref={hostRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '750px',
          visibility: 'visible',
          pointerEvents: 'none',
          zIndex: -9999
        }}
        aria-hidden="true"
      >
        {drawSlots.map(
          (card, slot) => card && <CardView key={card.id} card={card} id={`card-preload-canvas-${slot}`} />
        )}
      </div>

      {/* The game mounts once the faces are drawn: behind the loading screen it would draw every card live a second time
          (the gallery shows a live card until its face exists), and its large page slows down every capture */}
      {isReady ? children : null}
    </CardImageContext.Provider>
  );
};
