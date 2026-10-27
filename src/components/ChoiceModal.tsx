import React from 'react';
import { Sparkles } from 'lucide-react';

export interface ChoiceModalOption {
  label: string;
  value: string;
  primary?: boolean;
}

interface ChoiceModalProps {
  title: string;
  message: string;
  options: ChoiceModalOption[];
  onChoose: (value: string) => void;
}

/** A small yes/no style decision popup (e.g. "You may have this attack apply knockback 1"). */
export const ChoiceModal: React.FC<ChoiceModalProps> = ({ title, message, options, onChoose }) => (
  <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in">
    <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-stone-900 border-2 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-md w-full text-center">
      <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-base uppercase tracking-wider">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <span>{title}</span>
      </div>
      <p className="text-sm text-stone-200 font-sans">{message}</p>
      <div className="flex flex-wrap gap-3 w-full">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChoose(opt.value)}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wide cursor-pointer transition-colors shadow-md ${
              opt.primary
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                : 'bg-stone-700 hover:bg-stone-600 text-stone-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);
