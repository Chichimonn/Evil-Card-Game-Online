import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { FAQ } from '../data/faq';

/** The Frequently Asked Questions (written in src/data/faq.ts), opened from the top bar's menu. */
export const FaqModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Escape closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      data-input-always
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-title"
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[#433738] bg-[#272021] shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#433738]">
          <h2 id="faq-title" className="font-serif font-black text-xl text-stone-100 tracking-wide">
            Frequently Asked Questions
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-[#3d3334] transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {FAQ.length === 0 ? (
            <p className="text-stone-400 text-sm">The FAQ is coming soon.</p>
          ) : (
            FAQ.map((entry, i) => (
              <div key={i}>
                <h3 className="font-semibold text-amber-300 text-[15px]">{entry.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-300 whitespace-pre-line">{entry.answer}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
