import React from 'react';
import { CardItem } from '../types/card';
import { useCardImages } from '../context/CardImageContext';
import { CardThumbnail } from './CardThumbnail';

interface CardPreviewProps {
  card: CardItem;
  customArtUrl?: string;
  className?: string;
  imageClassName?: string;
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  card,
  customArtUrl,
  className = '',
  imageClassName = ''
}) => {
  const { cardImages } = useCardImages();
  if (!card) return null;
  const preloadedCardImage = cardImages[card.id];

  if (preloadedCardImage) {
    return (
      <div className={`relative flex flex-col items-center justify-center bg-transparent border-0 shadow-none outline-none pointer-events-none select-none max-w-full max-h-full ${className}`}>
        <img
          src={preloadedCardImage}
          alt={card.name}
          className={`w-auto h-auto object-contain rounded-2xl drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-150 ${
            imageClassName || 'max-w-[240px] sm:max-w-[270px] max-h-[350px] sm:max-h-[380px]'
          }`}
          style={{
            imageRendering: '-webkit-optimize-contrast',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center bg-transparent border-0 shadow-none outline-none pointer-events-none select-none max-w-full max-h-full ${className}`}>
      <div className="w-[240px] h-auto max-h-[380px] overflow-hidden drop-shadow-2xl animate-in fade-in duration-150 flex items-center justify-center">
        <CardThumbnail card={card} customArtUrl={customArtUrl} />
      </div>
    </div>
  );
};
