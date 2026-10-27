import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CardItem } from '../types/card';
import { initialCardsData } from '../data/cardsData';
import { CardView, CARD_HEADING_FONT, CARD_BODY_FONT, getSetBackgroundPath } from '../components/CardView';
import { toPng, getFontEmbedCSS } from 'html-to-image';
import { getAllCachedCardImages, saveCachedCardImage } from '../services/cardImageDB';

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
  totalCount: initialCardsData.cards.length,
  getCardImage: () => undefined
});

export const useCardImages = () => useContext(CardImageContext);

declare global {
  interface Window {
    __CARD_IMAGE_CACHE__?: Record<string, string>;
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
  const allCards = initialCardsData.cards;
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
        ...Array.from(new Set(missingCards.map(getSetBackgroundPath).filter((p): p is string => Boolean(p))))
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

      // The web fonts are embedded into each captured face (built once, from the first card, and reused)
      let fontEmbedCSS: string | undefined;

      // Render missing cards one by one
      for (let i = 0; i < missingCards.length; i++) {
        const card = missingCards[i];
        try {
          setCurrentRenderCard(card);

          // Allow React to mount and layout the card with key={card.id} in the host element
          await new Promise((r) => setTimeout(r, 30));

          if (hostRef.current && hostRef.current.firstElementChild) {
            const targetEl = hostRef.current.firstElementChild as HTMLElement;

            // Wait until the image for this exact card is loaded and verified to be card.id
            // (the art is cleaned up first, behind a pending marker; with neither, no art file loaded and the placeholder shows)
            const maxWait = Date.now() + 4000;
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
            while (Date.now() < maxWait) {
              const background = targetEl.querySelector('img[data-set-background]') as HTMLImageElement | null;
              if (!background || (background.complete && background.naturalWidth > 0)) break;
              await new Promise((r) => setTimeout(r, 20));
            }

            if (fontEmbedCSS === undefined) {
              try {
                fontEmbedCSS = await getFontEmbedCSS(targetEl);
              } catch (err) {
                console.warn('Could not embed card fonts:', err);
                fontEmbedCSS = '';
              }
            }

            const dataUrl = await toPng(targetEl, {
              fontEmbedCSS,
              skipFonts: !fontEmbedCSS,
              pixelRatio: 2,
              cacheBust: false
            });

            currentMap[card.id] = dataUrl;
            // Only keep faces drawn with real art, so art added later shows on the next load
            if (hasArt) saveCachedCardImage(card.id, dataUrl);
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
