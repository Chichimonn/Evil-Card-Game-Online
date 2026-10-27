import React, { useState } from 'react';
import { CardItem } from '../types/card';
import { CardArtFallback } from './CardArtFallback';

export const UnitTokenImage: React.FC<{ card: CardItem; customArtUrl?: string }> = ({
  card,
  customArtUrl
}) => {
  const [hasError, setHasError] = useState(false);
  const primarySrc = customArtUrl || `/assets/art/${card.id}.png`;

  return (
    <div className="w-full h-full relative bg-stone-900 flex items-center justify-center">
      {!hasError ? (
        <img
          src={primarySrc}
          alt={card.name}
          className="w-full h-full object-cover object-center"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full scale-125 transform">
          <CardArtFallback card={card} />
        </div>
      )}
    </div>
  );
};
