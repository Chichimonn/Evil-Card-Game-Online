import React from 'react';
import { CardItem } from '../types/card';

/** What a card shows where its art goes while it has no art file: the same plain note on every card. */
export const CardArtFallback: React.FC<{ card: CardItem }> = () => (
  <div className="w-full h-full flex items-center justify-center bg-stone-900 select-none">
    <span className="font-mono text-2xl tracking-widest text-stone-500">[no art found]</span>
  </div>
);
