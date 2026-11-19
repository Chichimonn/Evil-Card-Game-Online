import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { NewsItem } from '../data/news';

// An email address in the news text becomes a link that opens the player's email app
const EMAIL = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;
const withEmailLinks = (text: string): React.ReactNode =>
  text.split(EMAIL).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`mailto:${part}`} className="text-amber-300 underline underline-offset-2 hover:text-amber-200">
        {part}
      </a>
    ) : (
      part
    )
  );

/**
 * The news pop-up on the main screen (see data/news.ts): its picture across the top, its title under it, then its text.
 * It stays until it's closed (the X, the Close button, Escape, or a click outside it).
 */
export const NewsModal: React.FC<{ news: NewsItem; onClose: () => void }> = ({ news, onClose }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const close = onClose;

  // Escape closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news.id]);

  const paragraphs = news.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div
      data-input-always
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-title"
        className="relative w-full max-w-5xl max-h-[85vh] flex flex-col rounded-2xl border border-[#433738] bg-[#272021] shadow-2xl overflow-hidden"
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/60 text-stone-300 hover:text-stone-50 hover:bg-black/80 transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto">
          {/* The picture (a 2:1 panel), fitted to the panel's width and top (never stretched; anything taller than the panel is cut off at the bottom), or until it's added, a plain panel with the title */}
          <div className="relative w-full aspect-[2/1] overflow-hidden bg-[#1c1917] border-b border-[#433738] flex items-center justify-center">
            {imageFailed ? (
              <span className="font-title text-3xl text-stone-500 px-6 text-center">{news.title}</span>
            ) : (
              <img src={news.image} alt={news.title} className="absolute top-0 left-0 w-full h-auto" onError={() => setImageFailed(true)} />
            )}
          </div>

          <div className="px-8 py-3.5 flex flex-col gap-1.5">
            <h2 id="news-title" className="font-title text-2xl text-amber-300 leading-tight">
              {news.title}
            </h2>
            {paragraphs.map((p, i) =>
              /^[^\n]{1,40}:$/.test(p) ? (
                <h3 key={i} className="font-title text-lg text-stone-100 mt-1 leading-tight">
                  {p}
                </h3>
              ) : (
                <p key={i} className="text-sm leading-snug text-stone-300 whitespace-pre-line">
                  {withEmailLinks(p)}
                </p>
              )
            )}
          </div>
        </div>

        <div className="px-8 py-2.5 border-t border-[#433738] flex justify-end">
          <button
            onClick={close}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
