import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { CardItem } from '../types/card';
import { CardThumbnail } from './CardThumbnail';
import { CardPreview } from './CardPreview';

export interface CardChoiceOption {
  label: string;
  value: string;
  card?: CardItem;
}

interface CardChoiceModalProps {
  title: string;
  message: string;
  options: CardChoiceOption[];
  customArtMap: Record<string, string>;
  onChoose: (value: string) => void;
}

/**
 * A choice of a card (e.g. which card Reassemble discards, which card Chilling Insight returns): the cards themselves,
 * as in the loot window. Click one, then confirm. Options without a card (e.g. "Don't discard") are buttons beside it.
 */
export const CardChoiceModal: React.FC<CardChoiceModalProps> = ({ title, message, options, customArtMap, onChoose }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<CardItem | null>(null);
  useEffect(() => {
    setSelected(null);
    setHovered(null);
  }, [title, message, options]);

  const cardOptions = options.filter((o) => o.card);
  const otherOptions = options.filter((o) => !o.card);
  const chosen = cardOptions.find((o) => o.value === selected) || null;
  const preview = hovered || chosen?.card || cardOptions[0]?.card || null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-4xl bg-stone-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-400 text-amber-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-amber-200">{title}</h3>
            <p className="text-xs font-mono text-stone-300 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-5 max-h-[62vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cardOptions.map((o) => {
                const isSelected = o.value === selected;
                return (
                  <div
                    key={o.value}
                    onMouseEnter={() => setHovered(o.card!)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(isSelected ? null : o.value)}
                    className={`relative aspect-[5/7] rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-amber-400 ring-4 ring-amber-400/60 shadow-xl shadow-amber-500/30 -translate-y-1'
                        : 'border-stone-800 hover:border-stone-600 opacity-90 hover:opacity-100'
                    }`}
                  >
                    <CardThumbnail card={o.card!} customArtUrl={customArtMap[o.card!.id]} />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-950/50 flex items-center justify-center z-20">
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {preview && (
            <div className="w-60 sm:w-64 shrink-0 hidden md:flex flex-col items-center justify-center p-3 bg-stone-950/70 rounded-xl border border-stone-800">
              <CardPreview card={preview} customArtUrl={customArtMap[preview.id]} />
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex flex-wrap items-center justify-end gap-3">
          {otherOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => onChoose(o.value)}
              className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer transition-colors"
            >
              {o.label}
            </button>
          ))}
          <button
            onClick={() => chosen && onChoose(chosen.value)}
            disabled={!chosen}
            className={`px-6 py-2.5 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all ${
              chosen ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg ring-2 ring-amber-300 cursor-pointer' : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            {chosen ? chosen.label : 'Choose a card'}
          </button>
        </div>
      </div>
    </div>
  );
};
