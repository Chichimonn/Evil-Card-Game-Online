import React, { useState } from 'react';
import { CardPassive, CardItem } from '../types/card';
import { CardPreview } from './CardPreview';
import { Sparkles, Crown, Check } from 'lucide-react';

export interface FacelessKingPassiveChoiceModalProps {
  isOpen: boolean;
  unitName: string;
  promotedCards: CardItem[];
  onConfirm: (chosenPassive: CardPassive | null) => void;
  customArtMap: Record<string, string>;
}

export const FacelessKingPassiveChoiceModal: React.FC<FacelessKingPassiveChoiceModalProps> = ({
  isOpen,
  unitName,
  promotedCards,
  onConfirm,
  customArtMap
}) => {
  // Collect all available passives from the promoted cards underneath
  const availableEntries: { card: CardItem; passive: CardPassive }[] = [];
  promotedCards.forEach((c) => {
    (c.passives || []).forEach((p) => {
      availableEntries.push({ card: c, passive: p });
    });
  });

  const [selectedPassive, setSelectedPassive] = useState<CardPassive | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CardItem | null>(null);

  if (!isOpen) return null;

  const previewCard = hoveredCard || availableEntries.find((e) => e.passive === selectedPassive)?.card || promotedCards[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-4xl bg-[#201a1c] border-2 border-amber-500/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3d3133]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-amber-200">
                  {unitName} • Perfect Synthesis
                </h3>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50">
                  Choose 1 Passive
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Choose up to 1 passive from among the cards fused underneath to gain permanently.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[320px]">
          {/* Passive Selection List */}
          <div className="md:col-span-7 flex flex-col gap-3">
            {availableEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-stone-700 rounded-xl p-6 text-center text-stone-400">
                <Sparkles className="w-8 h-8 text-stone-600 mb-2" />
                <p className="text-sm font-serif">No passives found on the cards under {unitName}.</p>
                <p className="text-xs text-stone-500 mt-1">You may proceed without choosing a passive.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {/* Option to select None */}
                <button
                  onClick={() => setSelectedPassive(null)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedPassive === null
                      ? 'bg-stone-800 border-amber-400/80 ring-2 ring-amber-400/40 text-stone-100'
                      : 'bg-[#2a2224]/80 border-stone-700/60 hover:border-stone-500 text-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-serif font-bold italic">Do not inherit a passive (None)</span>
                    {selectedPassive === null && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                </button>

                {availableEntries.map(({ card, passive }, idx) => {
                  const isSelected = selectedPassive?.id === passive.id && selectedPassive?.name === passive.name;
                  return (
                    <button
                      key={`passive_opt_${passive.id || passive.name}_${idx}`}
                      onClick={() => setSelectedPassive(passive)}
                      onMouseEnter={() => setHoveredCard(card)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/50 text-amber-100 shadow-lg'
                          : 'bg-[#2a2224]/80 border-stone-800 hover:border-amber-600/60 hover:bg-[#342a2d] text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-amber-400/70'}`} />
                          <span className="text-sm font-serif font-bold text-amber-200">
                            {passive.name}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">
                            (from {card.name})
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed pl-6">
                        {passive.text}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card Preview Panel */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-stone-950/50 rounded-xl border border-stone-800/80">
            {previewCard ? (
              <div className="w-full flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase text-amber-400/80 mb-2 font-bold tracking-wider">
                  Source Card Preview
                </span>
                <CardPreview
                  card={previewCard}
                  customArtUrl={customArtMap[previewCard.id]}
                />
              </div>
            ) : (
              <span className="text-xs text-stone-500 font-serif">Hover a passive to preview its card</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#3d3133]">
          <span className="text-xs font-mono text-stone-400">
            Selected: <strong className="text-amber-300">{selectedPassive ? selectedPassive.name : 'None'}</strong>
          </span>
          <button
            onClick={() => onConfirm(selectedPassive)}
            className="px-5 py-2 rounded-xl text-sm font-serif font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Confirm Selection</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
