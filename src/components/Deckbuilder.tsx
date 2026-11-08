import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CardItem } from '../types/card';
import { CardThumbnail } from './CardThumbnail';
import { useCardImages } from '../context/CardImageContext';
import { playCardDrawSound } from '../utils/audio';
import { formatFusionRequirements, formatTributeRequirements } from '../utils/reinforceRules';
import {
  Plus,
  Minus,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  Layers,
  Edit3,
  Save,
  BookmarkCheck,
  FolderOpen,
  X,
  GripVertical
} from 'lucide-react';
 
export interface DeckCardEntry {
  card: CardItem;
  quantity: number;
}
 
export interface SavedDeck {
  id: string;
  name: string;
  updatedAt: string;
  cardCount: number;
  cards: { id: string; quantity: number }[];
}
 
interface DeckbuilderProps {
  cards: CardItem[];
}
 
const LOCAL_STORAGE_SAVED_DECKS = 'evil_cg_saved_decks';
const LOCAL_STORAGE_ACTIVE_DECK = 'evil_cg_active_deck';
 
// Width of each card tile in the catalog, in pixels. Change this to resize cards.
const TILE_W = 360;

// Tokens can't go in a deck
const isTokenCard = (card: CardItem) => card.isWall || card.art?.includes('token') || card.type === 'token';

const UNCLASSED = 'unclassed';

// A class filter matches a card of that class, or a promote/tribute/fusion card whose requirement names it
// The class a card is grouped under when sorting: its first class tag, else the first class its requirement names
const getCardSortClass = (card: CardItem): string | null =>
  card.classTags?.[0] || (card.reinforce?.requirement || []).flat().find((name) => name && name !== '*') || null;

const cardMatchesClass = (card: CardItem, cls: string): boolean => {
  // Unclassed: cards that go with no class at all (no class tag, and no class named in a requirement)
  if (cls === UNCLASSED) return getCardSortClass(card) === null;
  const target = cls.toLowerCase();
  return (
    Boolean(card.classTags?.some((t) => t.toLowerCase() === target)) ||
    Boolean(card.reinforce?.requirement?.some((options) => options.some((o) => o.toLowerCase() === target)))
  );
};

export const Deckbuilder: React.FC<DeckbuilderProps> = ({
  cards
}) => {
  const { cardImages } = useCardImages();

  // Load saved state or default
  const [deckName, setDeckName] = useState("My EVIL Deck");
  const [deckEntries, setDeckEntries] = useState<DeckCardEntry[]>([]);
 
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'basic' | 'promote' | 'fusion' | 'tribute' | 'token'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'class' | 'name' | 'hp' | 'ap'>('class');
  const [copied, setCopied] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
 
  // Rename Deck feature
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(deckName);
 
  // Saved Decks modal
  const [showSavedDecksModal, setShowSavedDecksModal] = useState(false);
  const [savedDecksList, setSavedDecksList] = useState<SavedDeck[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SAVED_DECKS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
 
  // Auto-persist active deck
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_ACTIVE_DECK,
        JSON.stringify({
          name: deckName,
          cards: deckEntries.map(e => ({ id: e.card.id, quantity: e.quantity }))
        })
      );
    } catch {
      // ignore
    }
  }, [deckName, deckEntries]);
 
  // Deck statistics (Limits: max 3 per card, max 40 total)
  const totalCards = useMemo(() => {
    return deckEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }, [deckEntries]);
 
  const isDeckFull = totalCards >= 40;
 
  const stats = useMemo(() => {
    if (deckEntries.length === 0) return { avgHp: 0, apCounts: {}, typeCounts: {} };
 
    let totalHp = 0;
    const apCounts: Record<number, number> = {};
    const typeCounts: Record<string, number> = {
      basic: 0,
      promote: 0,
      fusion: 0,
      tribute: 0,
      token: 0
    };
 
    deckEntries.forEach(entry => {
      totalHp += entry.card.hp * entry.quantity;
      apCounts[entry.card.ap] = (apCounts[entry.card.ap] || 0) + entry.quantity;
 
      if (entry.card.basic) typeCounts.basic += entry.quantity;
      else if (entry.card.reinforce?.mode === 'promote') typeCounts.promote += entry.quantity;
      else if (entry.card.reinforce?.mode === 'fusion') typeCounts.fusion += entry.quantity;
      else if (entry.card.reinforce?.mode === 'tribute') typeCounts.tribute += entry.quantity;
      else if (entry.card.isWall) typeCounts.token += entry.quantity;
    });
 
    return {
      avgHp: Math.round((totalHp / totalCards) * 10) / 10,
      apCounts,
      typeCounts
    };
  }, [deckEntries, totalCards]);
 
  // Catalog filtered cards sorted by Class Tags
  // Every class in the game (from class tags and reinforce requirements), ordered by how many deckable cards go with
  // it (the cards that class filter shows), then alphabetically; Unclassed last. The class sort uses the same order.
  const classOptions = useMemo(() => {
    const deckable = cards.filter((card) => !isTokenCard(card));
    const names = new Map<string, string>();
    deckable.forEach((card) => {
      [...(card.classTags || []), ...(card.reinforce?.requirement || []).flat()].forEach((name) => {
        if (name && name !== '*' && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
      });
    });
    const options = Array.from(names.values())
      .map((name) => ({ id: name, label: name, count: deckable.filter((card) => cardMatchesClass(card, name)).length }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const unclassedCount = deckable.filter((card) => cardMatchesClass(card, UNCLASSED)).length;
    if (unclassedCount > 0) options.push({ id: UNCLASSED, label: 'Unclassed', count: unclassedCount });
    return options;
  }, [cards]);

  const catalogCards = useMemo(() => {
    const classRank = new Map(classOptions.map((cls, i) => [cls.id.toLowerCase(), i]));
 
    const filtered = cards.filter(card => {
      // Disallow tokens from player deck building
      if (isTokenCard(card)) return false;
 
      if (categoryFilter === 'basic' && !card.basic) return false;
      if (categoryFilter === 'promote' && card.reinforce?.mode !== 'promote') return false;
      if (categoryFilter === 'fusion' && card.reinforce?.mode !== 'fusion') return false;
      if (categoryFilter === 'tribute' && card.reinforce?.mode !== 'tribute') return false;
 
      // Class Tag Filter
      if (classFilter !== 'all' && !cardMatchesClass(card, classFilter)) return false;
 
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        return (
          card.name.toLowerCase().includes(query) ||
          card.id.toLowerCase().includes(query) ||
          card.classTags?.some(t => t.toLowerCase().includes(query)) ||
          card.reinforce?.requirement?.some(options => options.some(o => o !== '*' && o.toLowerCase().includes(query))) ||
          card.abilities?.some(a => a.name.toLowerCase().includes(query))
        );
      }
      return true;
    });
 
    // Sort by class (a card goes with its own class, else the class it requires), name, hp, or ap
    return [...filtered].sort((a, b) => {
      if (sortBy === 'class') {
        const aClass = getCardSortClass(a)?.toLowerCase();
        const bClass = getCardSortClass(b)?.toLowerCase();
        const aRank = aClass ? (classRank.get(aClass) ?? classRank.size) : classRank.size + 1;
        const bRank = bClass ? (classRank.get(bClass) ?? classRank.size) : classRank.size + 1;
 
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'hp') {
        return b.hp - a.hp;
      }
      if (sortBy === 'ap') {
        return b.ap - a.ap;
      }
      return 0;
    });
  }, [cards, categoryFilter, classFilter, searchFilter, sortBy, classOptions]);
 
  // Add card to deck (Max 3 copies of each card, max 40 total, no tokens)
  const handleAddCard = (card: CardItem) => {
    if (isTokenCard(card)) return;
    if (totalCards >= 40) return;
    const existing = deckEntries.find(e => e.card.id === card.id);
    if (existing && existing.quantity >= 3) return;
 
    playCardDrawSound();
    setDeckEntries(prev => {
      const match = prev.find(e => e.card.id === card.id);
      if (match) {
        if (match.quantity >= 3) return prev;
        return prev.map(e => e.card.id === card.id ? { ...e, quantity: e.quantity + 1 } : e);
      }
      return [...prev, { card, quantity: 1 }];
    });
  };
 
  // Remove card from deck
  const handleRemoveCard = (cardId: string) => {
    setDeckEntries(prev => {
      const existing = prev.find(e => e.card.id === cardId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map(e => e.card.id === cardId ? { ...e, quantity: e.quantity - 1 } : e);
      }
      return prev.filter(e => e.card.id !== cardId);
    });
  };
 
  // Remove entire entry
  const handleDeleteCard = (cardId: string) => {
    setDeckEntries(prev => prev.filter(e => e.card.id !== cardId));
  };
 
  // Clear deck
  const handleClearDeck = () => {
    setDeckEntries([]);
  };
 
  // Save Deck Feature (Online browser persistence via localStorage)
  const handleSaveDeck = () => {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_SAVED_DECKS);
      const existing: SavedDeck[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedDeck: SavedDeck = {
        id: `deck_${Date.now()}`,
        name: deckName.trim() || 'Untitled Deck',
        updatedAt: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        cardCount: totalCards,
        cards: deckEntries.map(e => ({ id: e.card.id, quantity: e.quantity }))
      };
 
      // Filter out duplicate names or update
      const filtered = existing.filter(d => d.name.toLowerCase() !== updatedDeck.name.toLowerCase());
      const updatedList = [updatedDeck, ...filtered];
 
      localStorage.setItem(LOCAL_STORAGE_SAVED_DECKS, JSON.stringify(updatedList));
      setSavedDecksList(updatedList);
 
      setSaveSuccessMsg(`Deck "${updatedDeck.name}" saved!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to save deck to storage:', err);
    }
  };
 
  // Load a Saved Deck
  const handleLoadSavedDeck = (savedDeck: SavedDeck) => {
    setDeckName(savedDeck.name);
    const loadedEntries: DeckCardEntry[] = [];
    savedDeck.cards.forEach(item => {
      const card = cards.find(c => c.id === item.id);
      if (card) {
        loadedEntries.push({ card, quantity: Math.min(item.quantity, 3) });
      }
    });
    setDeckEntries(loadedEntries);
    setShowSavedDecksModal(false);
    playCardDrawSound();
  };
 
  // Delete a Saved Deck
  const handleDeleteSavedDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = savedDecksList.filter(d => d.id !== id);
      localStorage.setItem(LOCAL_STORAGE_SAVED_DECKS, JSON.stringify(updated));
      setSavedDecksList(updated);
    } catch {
      // ignore
    }
  };
 
  // Confirm Rename Deck
  const handleConfirmRename = () => {
    if (renameValue.trim()) {
      setDeckName(renameValue.trim());
    }
    setIsRenaming(false);
  };
 
  // Copy decklist to clipboard
  const handleCopyDeckList = () => {
    const lines = [
      `=== ${deckName} (${totalCards}/40 Cards) ===`,
      ...deckEntries.map(e => `${e.quantity}x ${e.card.name} [${e.card.hp} HP / ${e.card.ap} AP]`)
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  // Export deck as JSON
  const handleExportJson = () => {
    const exportData = {
      deckName,
      created: new Date().toISOString(),
      cardCount: totalCards,
      limit: 40,
      cards: deckEntries.map(e => ({
        id: e.card.id,
        name: e.card.name,
        quantity: e.quantity
      }))
    };
 
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName.toLowerCase().replace(/\s+/g, '_')}_deck.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
 
  // Drag and Drop state between deck and pool
  const [draggingFrom, setDraggingFrom] = useState<'pool' | 'deck' | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragCounterDeck, setDragCounterDeck] = useState(0);
  const [dragCounterPool, setDragCounterPool] = useState(0);
 
  const handleGlobalDragEnd = () => {
    setDraggingFrom(null);
    setDraggedCardId(null);
    setDragCounterDeck(0);
    setDragCounterPool(0);
  };
 
  const handleDeckDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingFrom === 'pool') {
      setDragCounterDeck((prev) => prev + 1);
    }
  };
 
  const handleDeckDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounterDeck((prev) => Math.max(0, prev - 1));
  };
 
  const handleDeckDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingFrom === 'pool') {
      e.dataTransfer.dropEffect = 'copy';
    }
  };
 
  const handleDeckDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounterDeck(0);
    let cardId = draggedCardId;
 
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        if (parsed.cardId) cardId = parsed.cardId;
      }
    } catch {
      // ignore
    }
 
    if (cardId) {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        handleAddCard(card);
      }
    }
 
    setDraggingFrom(null);
    setDraggedCardId(null);
  };
 
  const handlePoolDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingFrom === 'deck') {
      setDragCounterPool((prev) => prev + 1);
    }
  };
 
  const handlePoolDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounterPool((prev) => Math.max(0, prev - 1));
  };
 
  const handlePoolDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingFrom === 'deck') {
      e.dataTransfer.dropEffect = 'move';
    }
  };
 
  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounterPool(0);
    let cardId = draggedCardId;
 
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        if (parsed.cardId) cardId = parsed.cardId;
      }
    } catch {
      // ignore
    }
 
    if (cardId) {
      handleRemoveCard(cardId);
    }
 
    setDraggingFrom(null);
    setDraggedCardId(null);
  };
 
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1800px] mx-auto w-full p-6 gap-6 relative select-none">
      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-sky-400 text-stone-950 font-bold px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-3">
          <BookmarkCheck className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
 
      {/* ================= LEFT COLUMN: CURRENT DECK & STATS ================= */}
      <div
        onDragEnter={handleDeckDragEnter}
        onDragLeave={handleDeckDragLeave}
        onDragOver={handleDeckDragOver}
        onDrop={handleDeckDrop}
        className="w-full lg:w-[460px] bg-stone-900/60 border border-stone-800 rounded-xl flex flex-col overflow-hidden shrink-0 shadow-xl relative"
      >
        {/* 50% transparency green overlay with ADD written across when hovering to add a card */}
        {draggingFrom === 'pool' && dragCounterDeck > 0 && (
          <div className="absolute inset-0 z-50 bg-emerald-500/50 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none border-4 border-emerald-400 border-dashed rounded-xl animate-in fade-in duration-150">
            <Plus className="w-16 h-16 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] stroke-[4] animate-bounce" />
            <span className="text-5xl sm:text-6xl font-black text-white tracking-widest drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] uppercase font-mono mt-1">
              ADD
            </span>
            <span className="text-xs font-mono font-bold text-white drop-shadow-md mt-1 bg-black/40 px-11 py-1 rounded-full">
              Drop here to add to deck
            </span>
          </div>
        )}
        {/* Deck Header */}
        <div className="p-4 border-b border-stone-800 bg-stone-900 flex flex-col gap-3">
          {/* Deck Title & Rename Deck Feature */}
          <div className="flex items-center justify-between gap-3">
            {isRenaming ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  autoFocus
                  placeholder="Enter deck name..."
                  className="bg-stone-950 px-2.5 py-1 rounded font-serif font-bold text-lg text-stone-100 border border-sky-400 focus:outline-hidden flex-1"
                />
                <button
                  onClick={handleConfirmRename}
                  className="px-2.5 py-1 bg-red-800 text-red-50 font-bold rounded text-xs hover:bg-red-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  className="px-2 py-1 bg-stone-800 text-stone-300 rounded text-xs hover:bg-stone-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-serif font-bold text-xl text-stone-100 truncate">
                  {deckName}
                </h3>
                <button
                  onClick={() => {
                    setRenameValue(deckName);
                    setIsRenaming(true);
                  }}
                  className="p-1 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-colors shrink-0"
                  title="Rename Deck"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
 
            {/* Deck Count Pill: Limit 40 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
                  isDeckFull
                    ? 'bg-sky-950 text-sky-300 border-sky-400 shadow-sm'
                    : totalCards >= 30
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                {totalCards} / 40 Cards {isDeckFull && '(Full)'}
              </span>
            </div>
          </div>
 
          {/* Quick Deck Actions with Save Deck & Rename Deck */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Save Deck Feature */}
            <button
              onClick={handleSaveDeck}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-red-800 hover:bg-red-700 text-red-50 font-bold rounded shadow-xs transition-colors"
              title="Save Deck to online browser storage"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Deck</span>
            </button>
 
            {/* Saved Decks Viewer */}
            <button
              onClick={() => setShowSavedDecksModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 transition-colors"
              title="View and load saved decks"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Saved Decks ({savedDecksList.length})</span>
            </button>
 
            {/* Rename Deck Button */}
            {!isRenaming && (
              <button
                onClick={() => {
                  setRenameValue(deckName);
                  setIsRenaming(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 transition-colors"
                title="Rename this deck"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
            )}
 
            <button
              onClick={handleCopyDeckList}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 transition-colors"
              title="Copy decklist as text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 transition-colors"
              title="Export deck as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={handleClearDeck}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-800 hover:bg-rose-900/60 text-stone-300 hover:text-rose-200 rounded border border-stone-700 transition-colors"
              title="Clear all cards"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
 
          {/* Deck Rules Notice */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono px-1">
            <span>Limit: Up to 3 per card</span>
            <span>Limit: Maximum 40 cards total</span>
          </div>
 
          {/* Deck Stats Bar */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800/80 text-xs">
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800/80 text-center">
              <span className="text-[10px] text-stone-400 font-mono block uppercase">Avg HP</span>
              <span className="font-mono font-bold text-rose-300 text-sm">{stats.avgHp}</span>
            </div>
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800/80 text-center">
              <span className="text-[10px] text-stone-400 font-mono block uppercase">Basics / Promotes</span>
              <span className="font-mono font-bold text-sky-300 text-sm">
                {stats.typeCounts.basic || 0} / {stats.typeCounts.promote || 0}
              </span>
            </div>
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800/80 text-center">
              <span className="text-[10px] text-stone-400 font-mono block uppercase">Fusions / Tributes</span>
              <span className="font-mono font-bold text-purple-300 text-sm">
                {stats.typeCounts.fusion || 0} / {stats.typeCounts.tribute || 0}
              </span>
            </div>
          </div>
        </div>
 
        {/* Deck Cards List */}
        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
          {deckEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
              <Layers className="w-10 h-10 mb-2 opacity-40 text-sky-400" />
              <p className="text-sm font-semibold text-stone-300 font-serif">Deck is Empty</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Select cards from the card catalog on the right to start building your deck (up to 3 each, max 40 total).
              </p>
            </div>
          ) : (
            deckEntries.map(entry => {
              const isAtMaxCopies = entry.quantity >= 3;
 
              return (
                <div
                  key={`deck-card-${entry.card.id}`}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'deck-to-pool', cardId: entry.card.id }));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingFrom('deck');
                    setDraggedCardId(entry.card.id);
                  }}
                  onDragEnd={handleGlobalDragEnd}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-950/60 border border-stone-800 hover:border-sky-500/50 transition-colors group cursor-grab active:cursor-grabbing select-none"
                  title="Drag card to pool to remove"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-stone-600 group-hover:text-stone-400 shrink-0 -mr-0.5" />
                    {/* Mini preview thumbnail */}
                    <div className="w-8 h-11 rounded overflow-hidden shrink-0 border border-stone-800 bg-stone-950 flex items-center justify-center">
                      {cardImages[entry.card.id] ? (
                        <img
                          src={cardImages[entry.card.id]}
                          alt={entry.card.name}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <CardThumbnail card={entry.card} />
                      )}
                    </div>
                    <span
                      className={`w-6 h-6 rounded font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                        isAtMaxCopies
                          ? 'bg-sky-500 text-stone-950 border-sky-300'
                          : 'bg-sky-950/80 text-sky-300 border-sky-700/80'
                      }`}
                      title={`${entry.quantity} / 3 copies`}
                    >
                      {entry.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-stone-100 font-serif truncate group-hover:text-sky-300 transition-colors">
                          {entry.card.name}
                        </h4>
                        {isAtMaxCopies && (
                          <span className="text-[9px] font-mono text-sky-400 bg-sky-950/60 px-1 rounded uppercase">
                            Max 3
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono">
                        <span className="text-rose-400">{entry.card.hp} HP</span>
                        <span>·</span>
                        <span className="text-sky-400">{entry.card.ap} AP</span>
                        <span>·</span>
                        <span className="capitalize truncate" title={entry.card.reinforce?.mode === 'fusion' ? `Fusion: ${formatFusionRequirements(entry.card)}` : entry.card.reinforce?.mode === 'tribute' ? formatTributeRequirements(entry.card) : undefined}>
                          {entry.card.basic ? 'Basic' : entry.card.reinforce?.mode === 'fusion' ? `Fusion (${formatFusionRequirements(entry.card)})` : entry.card.reinforce?.mode || 'Unit'}
                        </span>
                      </div>
                    </div>
                  </div>
 
                  {/* Counter & Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleRemoveCard(entry.card.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAddCard(entry.card)}
                      disabled={isAtMaxCopies || isDeckFull}
                      className="p-1.5 text-stone-400 hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-stone-400 hover:bg-stone-800 rounded transition-colors"
                      title={isAtMaxCopies ? "Max 3 copies reached" : isDeckFull ? "Deck full (40/40)" : "Increase quantity"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(entry.card.id)}
                      className="p-1.5 text-stone-500 hover:text-rose-500 hover:bg-stone-800 rounded transition-colors ml-0.5"
                      title="Remove from deck"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
 
      {/* ================= RIGHT COLUMN: CARD CATALOG POOL ================= */}
      <div
        onDragEnter={handlePoolDragEnter}
        onDragLeave={handlePoolDragLeave}
        onDragOver={handlePoolDragOver}
        onDrop={handlePoolDrop}
        className="flex-1 bg-stone-900/60 border border-stone-800 rounded-xl flex flex-col overflow-hidden shadow-xl relative"
      >
        {/* 50% transparency red overlay with REMOVE written across at the top when dragging card from deck to pool */}
        {draggingFrom === 'deck' && dragCounterPool > 0 && (
          <div className="absolute inset-0 z-50 bg-rose-600/50 backdrop-blur-[2px] flex flex-col items-center justify-start pt-8 sm:pt-12 pointer-events-none border-4 border-rose-500 border-dashed rounded-xl animate-in fade-in duration-150">
            <Trash2 className="w-14 h-14 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] stroke-[3.5] animate-bounce mb-1" />
            <span className="text-5xl sm:text-6xl font-black text-white tracking-widest drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] uppercase font-mono">
              REMOVE
            </span>
            <span className="text-xs font-mono font-bold text-white drop-shadow-md mt-1.5 bg-black/40 px-3.5 py-1 rounded-full">
              Drop here to remove from deck
            </span>
          </div>
        )}
 
        {/* Catalog Header with Search & Filters */}
        <div className="p-4 border-b border-stone-800 bg-stone-900 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif font-bold text-lg text-stone-100 flex items-center gap-2">
              <span>Available Cards ({catalogCards.length})</span>
            </h3>
 
            {/* Controls Row: Search */}
            <div className="flex items-center gap-2.5">
              {/* Search box */}
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-700 rounded text-xs text-stone-100 placeholder:text-stone-500 focus:outline-hidden focus:border-sky-400"
                />
              </div>
            </div>
          </div>
 
          {/* Category Filter Chips (No tokens) & Sort Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'basic', label: 'Basic Units' },
                { id: 'promote', label: 'Promote' },
                { id: 'fusion', label: 'Fusion' },
                { id: 'tribute', label: 'Tribute' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as typeof categoryFilter)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-red-800 text-red-50 font-bold'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
 
            {/* Sort Selector: Class, Name, HP, AP */}
            <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800">
              <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">Sort:</span>
              {[
                { id: 'class', label: 'Class' },
                { id: 'name', label: 'Name' },
                { id: 'hp', label: 'HP' },
                { id: 'ap', label: 'AP' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as typeof sortBy)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    sortBy === opt.id
                      ? 'bg-red-800 text-red-50 font-black shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
 
          {/* Class Filter: every class, matching cards of that class or that require it */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-stone-800/80">
            <label htmlFor="deckbuilder-class-filter" className="text-[10px] font-mono text-stone-400 font-bold uppercase">
              Class:
            </label>
            <select
              id="deckbuilder-class-filter"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs font-mono text-stone-100 focus:outline-hidden focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.label}
                </option>
              ))}
            </select>
          </div>
        </div>
 
        {/* Catalog Card Grid: each column is exactly one tile wide */}
        <div
          className="flex-1 min-h-0 p-4 overflow-y-auto grid justify-center auto-rows-max content-start gap-5 custom-scrollbar"
          style={{ gridTemplateColumns: `repeat(auto-fill, ${TILE_W}px)` }}
        >
          {catalogCards.map(card => {
            const currentInDeck = deckEntries.find(e => e.card.id === card.id)?.quantity || 0;
            const isAtMax = currentInDeck >= 3;
 
            return (
              /* Card image with a direct Add button */
              <div
                key={`cat-card-${card.id}`}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'pool-to-deck', cardId: card.id }));
                  e.dataTransfer.effectAllowed = 'copy';
                  setDraggingFrom('pool');
                  setDraggedCardId(card.id);
                }}
                onDragEnd={handleGlobalDragEnd}
                className="relative rounded-xl overflow-hidden shadow-xl border border-stone-800 hover:border-sky-500/60 bg-stone-950 select-none flex flex-col transition-colors"
                title="Drag to deck to add, or click Add to Deck"
              >
                {/* Card preview image scaled to fit the tile */}
                <div className="w-full relative aspect-[5/7] bg-stone-950 flex items-center justify-center overflow-hidden">
                  {cardImages[card.id] ? (
                    <img
                      src={cardImages[card.id]}
                      alt={card.name}
                      className="w-full h-full object-contain select-none pointer-events-none"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'translateZ(0)'
                      }}
                    />
                  ) : (
                    <CardThumbnail card={card} />
                  )}
                  {/* Sleek corner pill showing current in deck when > 0 */}
                  {currentInDeck > 0 && (
                    <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 bg-sky-400 text-stone-950 font-mono font-bold text-xs rounded-full shadow-lg border border-sky-300 flex items-center gap-1 pointer-events-none">
                      <span>{currentInDeck} / 3 in deck</span>
                      {isAtMax && <span className="text-[10px] uppercase font-black">(Max)</span>}
                    </div>
                  )}
                </div>
 
                {/* Bottom Bar: Clean details & Add Button */}
                <div className="p-3 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif font-bold text-stone-100 text-sm leading-tight truncate">
                      {card.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400 mt-0.5">
                      <span className="text-rose-400 font-semibold">{card.hp} HP</span>
                      <span>·</span>
                      <span className="text-sky-400 font-semibold">{card.ap} AP</span>
                      {card.classTags && card.classTags.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-300">{card.classTags.join(', ')}</span>
                        </>
                      )}
                    </div>
                    {card.reinforce?.mode === 'fusion' && (
                      <div className="text-[10px] font-mono text-purple-300 font-semibold truncate mt-0.5" title={`Fusion: ${formatFusionRequirements(card)}`}>
                        Fusion: {formatFusionRequirements(card)}
                      </div>
                    )}
                  </div>
 
                  <button
                    onClick={() => handleAddCard(card)}
                    disabled={isAtMax || isDeckFull}
                    className="px-3.5 py-2 bg-red-800 hover:bg-red-700 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-red-50 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer shrink-0"
                    title={
                      isAtMax
                        ? 'Max 3 copies reached'
                        : isDeckFull
                        ? 'Deck full (40/40)'
                        : 'Add card to deck'
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAtMax ? 'Max (3)' : isDeckFull ? 'Deck Full' : 'Add'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* ================= STANDARD BOTTOM NOTICE ================= */}
          <footer className="col-span-full w-full border-t border-stone-800/80 bg-stone-900/90 py-3 px-6 text-center text-stone-400 leading-relaxed mt-4 rounded-xl">
            <div className="max-w-4xl mx-auto">
              <p className="font-serif text-stone-400" style={{ fontSize: '7pt', lineHeight: '1.4' }}>
                EVIL Card Game, 2026, was made by 1 person across hundreds of hours with the help of countless friends, kind strangers, and AI agents. Absolutely no AI artwork was used for the cards in this game. EVIL Card Game is not under official copyright. Please do not steal this game. Anybody who does so having read this notice openly admits that they are a cod fish, a scallywag, and a devious villain. Please enjoy the game.
              </p>
            </div>
          </footer>
        </div>
      </div>
 
      {/* ================= SAVED DECKS MODAL ================= */}
      {showSavedDecksModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-sky-400" />
                <h3 className="font-serif font-bold text-lg text-stone-100">Saved Decks</h3>
              </div>
              <button
                onClick={() => setShowSavedDecksModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
 
            <div className="max-h-80 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
              {savedDecksList.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-sm">
                  <BookmarkCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-400" />
                  <p>No saved decks yet.</p>
                  <p className="text-xs text-stone-600 mt-1">
                    Click "Save Deck" in the deck header to store your creations in browser storage!
                  </p>
                </div>
              ) : (
                savedDecksList.map(deck => (
                  <div
                    key={deck.id}
                    onClick={() => handleLoadSavedDeck(deck)}
                    className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-sky-400/60 hover:bg-stone-950 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <h4 className="font-serif font-bold text-stone-100 group-hover:text-sky-400 transition-colors">
                        {deck.name}
                      </h4>
                      <p className="text-xs font-mono text-stone-400 mt-0.5">
                        {deck.cardCount} Cards · Saved {deck.updatedAt}
                      </p>
                    </div>
 
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs bg-sky-400/10 text-sky-400 border border-sky-400/30 rounded font-medium group-hover:bg-sky-400 group-hover:text-stone-950 transition-colors">
                        Load
                      </span>
                      <button
                        onClick={(e) => handleDeleteSavedDeck(deck.id, e)}
                        className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded transition-colors"
                        title="Delete saved deck"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
 
            <div className="pt-2 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => setShowSavedDecksModal(false)}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
 