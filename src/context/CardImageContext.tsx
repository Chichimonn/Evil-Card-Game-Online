import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CardItem } from '../types/card';
import { initialCardsData } from '../data/cardsData';
import { CardView, CARD_HEADING_FONT, CARD_BODY_FONT, getCardBackgroundPath } from '../components/CardView';
import { toPng } from 'html-to-image';
import { getAllCachedCardImages, saveCachedCardImage } from '../services/cardImageDB';
import { getTokenGalleryCards } from '../utils/tokenCards';

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
 * Whether a captured card face came out whole: a card is an opaque black-framed rectangle with a dark stone top bar.
 * A capture that lost the card's styles has see-through edges or loose pictures where the top bar should be.
 */
async function isWholeCardFace(dataUrl: string): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const w = 60;
    const h = 84;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const pixel = (x: number, y: number) => ctx.getImageData(Math.round(x * (w - 1)), Math.round(y * (h - 1)), 1, 1).data;
    // The middle of each edge, just inside it
    const edges = [pixel(0.5, 0.02), pixel(0.03, 0.5), pixel(0.97, 0.5), pixel(0.5, 0.98)];
    if (edges.some((p) => p[3] < 200)) return false;
    // Both ends of the top bar are its dark stone colour (stone-900, rgb 28 25 23) on every card
    const isBar = (p: Uint8ClampedArray) =>
      p[3] >= 200 && Math.abs(p[0] - 28) <= 12 && Math.abs(p[1] - 25) <= 12 && Math.abs(p[2] - 23) <= 12;
    return isBar(pixel(0.03, 0.03)) && isBar(pixel(0.97, 0.03));
  } catch {
    // Can't check here: take the capture as it is
    return true;
  }
}

// Preloads an array of image URLs to ensure browser cache is primed
function preloadAssetImages(urls: string[]): Promise<void> {
  return new Promise((resolve) => {
    let completed = 0;
    const total = urls.length;
    if (total === 0) return resolve();

    const checkDone = () => {
      completed++;
      if (completed >= total) resolve();
    };

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      if (img.complete) {
        checkDone();
      } else {
        img.onload = checkDone;
        img.onerror = checkDone;
      }
    });

    // Safety timeout in case any asset hangs
    setTimeout(resolve, 2000);
  });
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

  const [currentRenderCard, setCurrentRenderCard] = useState<CardItem | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    async function initCardImages() {
      // 1. Check in-memory global cache first
      let currentMap: Record<string, string> = { ...(window.__CARD_IMAGE_CACHE__ || {}) };
      
      // 2. Check IndexedDB
      if (Object.keys(currentMap).length < totalCount) {
        const idbMap = await getAllCachedCardImages();
        currentMap = { ...idbMap, ...currentMap };
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

      // Preload all art and cardback images
      const artUrls = [
        '/assets/frames/cardback.png',
        ...missingCards.map((c) => `/assets/art/${c.id}.png`),
        // (the small copies of the set backgrounds that the card faces use, not the full-size ones)
        ...Array.from(new Set(missingCards.map(getCardBackgroundPath).filter((p): p is string => Boolean(p))))
      ];
      await preloadAssetImages(artUrls);

      // The card fonts must be loaded before cards are laid out (the text is sized to fit with their metrics)
      try {
        await Promise.all([
          document.fonts.load(`40px ${CARD_HEADING_FONT}`),
          document.fonts.load(`40px ${CARD_BODY_FONT}`)
        ]);
        await document.fonts.ready;
      } catch {
        // Fall back to the serif stack
      }

      // The card fonts are embedded into each captured face (built once, on the first card, and reused)
      let fontEmbedCSS: string | undefined;

      // Render missing cards one by one
      for (let i = 0; i < missingCards.length; i++) {
        const card = missingCards[i];
        try {
          setCurrentRenderCard(card);

          // Allow React to mount and lay out this card (its face is marked with its id) in the host element
          const mountBy = Date.now() + 3000;
          do {
            await new Promise((r) => setTimeout(r, 30));
          } while (
            Date.now() < mountBy &&
            (hostRef.current?.firstElementChild as HTMLElement | null)?.dataset.cardFace !== card.id
          );

          if (hostRef.current && hostRef.current.firstElementChild) {
            const targetEl = hostRef.current.firstElementChild as HTMLElement;

            // Wait until the image for this exact card is loaded and verified to be card.id
            // (the art is cleaned up first, behind a pending marker; with neither, no art file loaded and the placeholder shows)
            // (each picture gets its own wait, so a slow art file doesn't use up the background's time)
            let maxWait = Date.now() + 8000;
            let hasArt = false;
            while (Date.now() < maxWait) {
              const cardImg = targetEl.querySelector(
                `img[data-art-card-id="${card.id}"]`
              ) as HTMLImageElement | null;
              if (cardImg && cardImg.complete && cardImg.naturalWidth > 0) {
                hasArt = true;
                break;
              }
              if (!cardImg && !targetEl.querySelector(`[data-art-pending="${card.id}"]`)) break;
              await new Promise((r) => setTimeout(r, 20));
            }

            // And for the set's background picture (removed if it fails to load)
            maxWait = Date.now() + 8000;
            let hasBackground = false;
            while (Date.now() < maxWait) {
              const background = targetEl.querySelector('img[data-set-background]') as HTMLImageElement | null;
              if (!background || (background.complete && background.naturalWidth > 0)) {
                hasBackground = true;
                break;
              }
              await new Promise((r) => setTimeout(r, 20));
            }

            if (fontEmbedCSS === undefined) {
              try {
                fontEmbedCSS = await buildCardFontEmbedCSS();
              } catch (err) {
                console.warn('Could not embed card fonts:', err);
                fontEmbedCSS = '';
              }
            }

            // Capture the face, checking the picture came out whole: now and then a capture loses the card's styles
            // (its black frame, layout and white text), leaving the pictures loose and the text invisible. Such a
            // capture is taken again, and never kept.
            let dataUrl = '';
            let whole = false;
            for (let attempt = 0; attempt < 3 && !whole; attempt++) {
              if (attempt > 0) {
                await new Promise((r) => requestAnimationFrame(() => r(null)));
                await new Promise((r) => setTimeout(r, 150));
              }
              const shot = await toPng(targetEl, {
                fontEmbedCSS,
                skipFonts: !fontEmbedCSS,
                pixelRatio: 2,
                cacheBust: false
              });
              whole = targetEl.isConnected && targetEl.dataset.cardFace === card.id && (await isWholeCardFace(shot));
              if (whole || !dataUrl) dataUrl = shot;
            }
            if (!whole) console.warn(`Card face for ${card.name} (${card.id}) came out incomplete; it will be redrawn next load`);

            currentMap[card.id] = dataUrl;
            // Only keep whole faces drawn with their real art and background, so a face drawn before a picture arrived
            // (a slow connection), a broken capture, or art added later is drawn again on the next load
            if (whole && hasArt && hasBackground) saveCachedCardImage(card.id, dataUrl);
          }
        } catch (err) {
          console.warn(`Failed to capture image for card ${card.name} (${card.id}):`, err);
        }

        setLoadedCount(Object.keys(currentMap).length);
        // Yield to browser to keep UI responsive and smooth
        await new Promise((r) => requestAnimationFrame(r));
      }

      // Cleanup
      setCurrentRenderCard(null);
      window.__CARD_IMAGE_CACHE__ = currentMap;
      setCardImages({ ...currentMap });
      setIsReady(true);
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

          <div className="w-64 sm:w-80 flex flex-col items-center gap-2.5 px-4">
            <div className="flex items-center justify-between w-full text-xs font-mono text-stone-400">
              <span>Loading Cards</span>
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
        {currentRenderCard && (
          <CardView
            key={currentRenderCard.id}
            card={currentRenderCard}
            id="card-preload-canvas"
          />
        )}
      </div>

      {children}
    </CardImageContext.Provider>
  );
};
