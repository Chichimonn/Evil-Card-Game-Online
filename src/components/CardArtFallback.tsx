import React from 'react';
import { CardItem } from '../types/card';
import { Shield, Sparkles, Sword, Zap, Heart, Flame, Skull, Crosshair, Feather } from 'lucide-react';
import { formatFusionRequirements } from '../utils/reinforceRules';

interface CardArtFallbackProps {
  card: CardItem;
}

export const CardArtFallback: React.FC<CardArtFallbackProps> = ({ card }) => {
  // Determine color theme based on card properties
  const isMage = card.id.includes('mage') || card.id.includes('sorcerer') || card.id.includes('wizard') || card.id.includes('magi');
  const isKnight = card.id.includes('knight') || card.id.includes('paladin') || card.id.includes('commander') || card.id.includes('guardian');
  const isAssassin = card.id.includes('assassin') || card.id.includes('phantom') || card.id.includes('night');
  const isPlunderer = card.id.includes('plunderer') || card.id.includes('captain') || card.id.includes('corsair') || card.id.includes('saboteur');
  const isBeast = card.id.includes('boar') || card.id.includes('mammoth') || card.id.includes('grizzly') || card.id.includes('drake') || card.id.includes('roc') || card.id.includes('wyvern') || card.id.includes('crusher') || card.id.includes('titan') || card.id.includes('hydra');

  let gradient = 'from-amber-900/40 via-stone-800 to-stone-900';
  let accentColor = '#d97706';
  let IconComponent = Shield;

  if (isMage) {
    gradient = 'from-indigo-950 via-purple-900/60 to-slate-900';
    accentColor = '#818cf8';
    IconComponent = Sparkles;
  } else if (isKnight) {
    gradient = 'from-sky-950 via-slate-800 to-zinc-900';
    accentColor = '#38bdf8';
    IconComponent = Shield;
  } else if (isAssassin) {
    gradient = 'from-emerald-950 via-slate-900 to-black';
    accentColor = '#10b981';
    IconComponent = Skull;
  } else if (isPlunderer) {
    gradient = 'from-red-950 via-amber-950/80 to-stone-900';
    accentColor = '#f59e0b';
    IconComponent = Crosshair;
  } else if (isBeast) {
    gradient = 'from-orange-950 via-stone-900 to-stone-950';
    accentColor = '#ea580c';
    IconComponent = Flame;
  } else if (card.id.includes('cook')) {
    gradient = 'from-amber-900/60 via-stone-800 to-stone-900';
    accentColor = '#f59e0b';
    IconComponent = Flame;
  } else if (card.id.includes('sage')) {
    gradient = 'from-teal-950 via-slate-900 to-zinc-900';
    accentColor = '#2dd4bf';
    IconComponent = Feather;
  } else {
    gradient = 'from-zinc-900 via-stone-800 to-zinc-950';
    accentColor = '#a8a29e';
    IconComponent = Sword;
  }

  return (
    <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-6 select-none`}>
      {/* Subtle geometric pattern rings */}
      <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center">
        <div className="w-96 h-96 border border-white/20 rounded-full" />
        <div className="w-72 h-72 border border-dashed border-white/30 rounded-full absolute" />
        <div className="w-48 h-48 border border-white/20 rounded-full absolute" />
      </div>

      {/* Central Class Crest */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div 
          className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-white/10 backdrop-blur-sm"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <IconComponent className="w-12 h-12" style={{ color: accentColor }} />
        </div>

        <h3 className="text-xl font-bold text-white tracking-wide font-serif mb-1 px-4 drop-shadow-md">
          {card.name}
        </h3>
        
        <p className="text-xs text-stone-300/80 font-mono uppercase tracking-widest">
          {card.reinforce?.mode === 'promote' && `Promoted Unit · ${card.reinforce.requirement?.[0]?.[0] || 'Hero'}`}
          {card.reinforce?.mode === 'fusion' && `Fusion Unit · ${formatFusionRequirements(card)}`}
          {card.reinforce?.mode === 'tribute' && `Tribute Unit · ${card.reinforce.count} Tributes`}
          {card.basic && 'Basic Unit'}
          {card.isWall && 'Token · Wall'}
        </p>
      </div>

      {/* Subtle asset notice */}
      <div className="absolute bottom-3 text-center px-4">
        <span className="text-[10px] text-stone-400/60 font-mono tracking-tight">
          Waiting for assets/art/{card.id}.png (or drop art file)
        </span>
      </div>
    </div>
  );
};
