import React from 'react';
import { CardItem } from '../types/card';
import { CardPreview } from './CardPreview';

interface ScryModalProps {
  card: CardItem;
  unitName: string;
  customArtUrl?: string;
  title?: string;
  subtitle?: string;
  onChoose: (toBottom: boolean) => void;
  onCancel?: () => void;
}

export const ScryModal: React.FC<ScryModalProps> = ({
  card,
  unitName,
  customArtUrl,
  title = 'Foresight: Scry 1',
  subtitle,
  onChoose,
  onCancel
}) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-stone-900 border border-amber-400/80 shadow-2xl">
      <div className="text-center">
        <div className="font-mono font-bold text-amber-300 uppercase tracking-wider text-sm">{title}</div>
        <div className="text-xs text-stone-400">
          {subtitle || `${unitName} looks at the top card of your deck`}
        </div>
      </div>
      <div className="w-64">
        <CardPreview card={card} customArtUrl={customArtUrl} />
      </div>
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex gap-3">
          <button
            onClick={() => onChoose(false)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer shadow-md transition-colors"
          >
            Keep on top
          </button>
          <button
            onClick={() => onChoose(true)}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm border border-stone-600 cursor-pointer shadow-md transition-colors"
          >
            Put on bottom
          </button>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-1 px-3 py-1 rounded-md text-xs text-red-300 hover:text-red-100 hover:bg-red-950/60 border border-red-800/60 transition-colors cursor-pointer"
          >
            Cancel Assist (Send to Graveyard)
          </button>
        )}
      </div>
    </div>
  </div>
);