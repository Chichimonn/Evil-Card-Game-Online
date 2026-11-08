import React from 'react';
import { CardItem } from '../types/card';
import { PlayerId } from '../types/game';
import { useProcessedArt } from '../utils/artHalo';

interface StandeePreviewProps {
  card: CardItem;
  customArtUrl?: string;
  owner?: PlayerId; // colours the pedestal as on the board
  showPedestal?: boolean; // false where there is no owner to show (e.g. the gallery)
  className?: string;
}

/**
 * A card's battlefield standee shown full size in the card preview area (hovering a card in the hand or the gallery),
 * the counterpart of the full card shown when hovering a standee. Same art and white halo as BattlefieldCardStandee,
 * upright and without the board's tilt or status badges.
 */
export const StandeePreview: React.FC<StandeePreviewProps> = ({
  card,
  customArtUrl,
  owner,
  showPedestal = true,
  className = ''
}) => {
  // (with its feet on the bottom edge, as on the board)
  const art = useProcessedArt(
    customArtUrl ? [customArtUrl] : [`/assets/art/${card.id}.png`, `/assets/${card.art || `art/${card.id}.png`}`],
    true
  );
  const pedestal =
    owner === 'player1'
      ? 'bg-sky-950/90 border-sky-400'
      : owner === 'player2'
      ? 'bg-rose-950/90 border-rose-500'
      : 'bg-stone-900/90 border-stone-500';

  return (
    <div
      className={`relative flex flex-col items-center justify-end pointer-events-none select-none w-[260px] h-[360px] animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {showPedestal && <div className={`w-40 h-10 rounded-full absolute bottom-0 border-2 shadow-2xl ${pedestal}`} />}
      {/* The figure's feet on the middle of the pedestal */}
      <div
        className={`w-[232px] h-[324px] relative flex items-center justify-center drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)] ${
          showPedestal ? 'mb-5' : ''
        }`}
      >
        {art.status === 'pending' ? null : art.status === 'ready' ? (
          <img
            src={art.src}
            alt={card.name}
            className="w-full h-full object-contain object-bottom"
            style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900/95 border-2 border-stone-700/80 rounded-xl p-4 text-center">
            <span className="text-xl font-serif font-bold text-stone-200 leading-tight">{card.name}</span>
            <span className="text-xs font-mono text-stone-500 mt-3">{card.id}.png</span>
          </div>
        )}
      </div>
    </div>
  );
};
