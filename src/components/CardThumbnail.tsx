import React, { useRef, useState, useEffect } from 'react';
import { CardItem } from '../types/card';
import { CardView } from './CardView';
import { useCardImages } from '../context/CardImageContext';

export const CardThumbnail: React.FC<{
  card: CardItem;
  customArtUrl?: string;
  allowScrollAbilities?: boolean;
}> = ({ card, customArtUrl, allowScrollAbilities = false }) => {
  const { cardImages } = useCardImages();
  const preloadedImage = cardImages[card.id];

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    if (preloadedImage && !allowScrollAbilities && !customArtUrl) return;
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        setScale(containerRef.current.offsetWidth / 750);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [preloadedImage, allowScrollAbilities, customArtUrl]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!allowScrollAbilities) return;
    const scrollBox = containerRef.current?.querySelector('.card-abilities-scroll') as HTMLDivElement | null;
    if (scrollBox) {
      const { scrollTop, scrollHeight, clientHeight } = scrollBox;
      const canScrollDown = e.deltaY > 0 && scrollTop < scrollHeight - clientHeight - 1;
      const canScrollUp = e.deltaY < 0 && scrollTop > 1;
      if (canScrollDown || canScrollUp) {
        e.preventDefault();
        e.stopPropagation();
        scrollBox.scrollTop += e.deltaY * 0.85;
      }
    }
  };

  // If pre-rendered full card image is available and scrollable abilities not requested, render image directly
  if (preloadedImage && !allowScrollAbilities && !customArtUrl) {
    return (
      <div className="w-full aspect-[5/7] relative overflow-hidden bg-black flex items-center justify-center select-none rounded-lg">
        <img
          src={preloadedImage}
          alt={card.name}
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="w-full aspect-[5/7] relative overflow-hidden bg-black flex items-center justify-center select-none"
      style={{
        imageRendering: 'auto',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transform: 'translateZ(0)'
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: '750px',
          height: '1050px',
          pointerEvents: allowScrollAbilities ? 'auto' : 'none',
          backfaceVisibility: 'hidden'
        }}
        className="absolute top-0 left-0"
      >
        <CardView card={card} customArtUrl={customArtUrl} scale={1} frameMode="overlay" />
      </div>
    </div>
  );
};

