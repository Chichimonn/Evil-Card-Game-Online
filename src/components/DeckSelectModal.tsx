import React, { useState, useMemo, useEffect } from 'react';
import { CardItem } from '../types/card';
import { CheckCircle2, X, Sword, ChevronDown } from 'lucide-react';
import { useCardImages } from '../context/CardImageContext';
import { CardThumbnail } from './CardThumbnail';
import { CardPreview } from './CardPreview';

export interface SelectableDeck {
  id: string;
  name: string;
  category: 'active' | 'saved' | 'preset';
  cardCount: number;
  cardList: CardItem[];
  isValid: boolean;
}

interface DeckSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDecks: (decks: { player1: SelectableDeck; player2: SelectableDeck }) => void;
  allCards: CardItem[];
  customArtMap: Record<string, string>;
}

// Preset decks locked into everyone's list at the bottom (No descriptions)
const PRESET_DECKS = [
  {
    id: 'preset_knights',
    name: 'Knights of the Bulwark',
    cardIds: [
      'sentinel_knight', 'sentinel_knight', 'sentinel_knight',
      'imbued_knight', 'imbued_knight', 'imbued_knight',
      'polearm_knight', 'polearm_knight', 'polearm_knight',
      'greatsword_knight', 'greatsword_knight', 'greatsword_knight',
      'longbow_knight', 'longbow_knight', 'longbow_knight',
      'bastion_knight', 'bastion_knight', 'bastion_knight',
      'daring_cavalier', 'daring_cavalier', 'daring_cavalier',
      'orders_chosen', 'orders_chosen', 'orders_chosen',
      'ironclad_peacekeeper', 'ironclad_peacekeeper', 'ironclad_peacekeeper',
      'vanguard_commander', 'vanguard_commander', 'vanguard_commander',
      'gateway_guardians', 'gateway_guardians', 'gateway_guardians',
      'drakerider_paladin', 'drakerider_paladin', 'drakerider_paladin',
      'duelist_fighter', 'duelist_fighter', 'duelist_fighter',
      'combat_cook'
    ]
  },
  {
    id: 'preset_shadows',
    name: 'Shadow Syndicate',
    cardIds: [
      'shade_assassin', 'shade_assassin', 'shade_assassin',
      'cutthroat_assassin', 'cutthroat_assassin', 'cutthroat_assassin',
      'poisonblade_assassin', 'poisonblade_assassin', 'poisonblade_assassin',
      'powder_keg_plunderer', 'powder_keg_plunderer', 'powder_keg_plunderer',
      'swashbuckle_plunderer', 'swashbuckle_plunderer', 'swashbuckle_plunderer',
      'twinaxe_plunderer', 'twinaxe_plunderer', 'twinaxe_plunderer',
      'wielder_of_night', 'wielder_of_night', 'wielder_of_night',
      'blight_phantom', 'blight_phantom', 'blight_phantom',
      'high_seas_captain', 'high_seas_captain', 'high_seas_captain',
      'corsair_saboteur', 'corsair_saboteur', 'corsair_saboteur',
      'goreblade_executioner', 'goreblade_executioner', 'goreblade_executioner',
      'duelist_fighter', 'duelist_fighter', 'duelist_fighter',
      'brawl_fighter', 'brawl_fighter', 'brawl_fighter',
      'combat_cook'
    ]
  },
  {
    id: 'preset_arcane',
    name: 'Arcane Convergence',
    cardIds: [
      'topaz_mage', 'topaz_mage', 'topaz_mage',
      'euclase_mage', 'euclase_mage', 'euclase_mage',
      'garnet_mage', 'garnet_mage', 'garnet_mage',
      'opal_mage', 'opal_mage', 'opal_mage',
      'dravite_mage', 'dravite_mage', 'dravite_mage',
      'amethyst_mage', 'amethyst_mage', 'amethyst_mage',
      'nexus_sorcerer', 'nexus_sorcerer', 'nexus_sorcerer',
      'catalyst_curator', 'catalyst_curator', 'catalyst_curator',
      'archivist_sage', 'archivist_sage', 'archivist_sage',
      'fateweaver_sage', 'fateweaver_sage', 'fateweaver_sage',
      'leyline_invoker', 'leyline_invoker', 'leyline_invoker',
      'frostbinder', 'frostbinder', 'frostbinder',
      'starburst_wizard', 'starburst_wizard', 'starburst_wizard',
      'combat_cook'
    ]
  }
];

type DeckPlayer = 'player1' | 'player2';
const PLAYER_LABEL: Record<DeckPlayer, string> = { player1: 'Player 1', player2: 'Player 2' };

export const DeckSelectModal: React.FC<DeckSelectModalProps> = ({
  isOpen,
  onClose,
  onConfirmDecks,
  allCards,
  customArtMap = {},
}) => {
  const { cardImages } = useCardImages();
  const [selectedDeckIds, setSelectedDeckIds] = useState<Record<DeckPlayer, string>>({ player1: '', player2: '' });
  const [hoveredDeckCard, setHoveredDeckCard] = useState<CardItem | null>(null);

  const cardsById = useMemo(() => {
    const map = new Map<string, CardItem>();
    allCards.forEach((c) => map.set(c.id, c));
    return map;
  }, [allCards]);

  const { customDecks, lockedPresetDecks, allDecksMap } = useMemo(() => {
    const customList: SelectableDeck[] = [];
    const presetList: SelectableDeck[] = [];
    const map = new Map<string, SelectableDeck>();

    // 1. Active deck from Deckbuilder
    try {
      const activeStr = localStorage.getItem('evil_cg_active_deck');
      if (activeStr) {
        const active = JSON.parse(activeStr);
        if (active.cards && Array.isArray(active.cards) && active.cards.length > 0) {
          const cardList: CardItem[] = [];
          active.cards.forEach((entry: { id: string; quantity: number }) => {
            const card = cardsById.get(entry.id);
            if (card) {
              for (let i = 0; i < entry.quantity; i++) cardList.push(card);
            }
          });

          if (cardList.length > 0) {
            const deck: SelectableDeck = {
              id: 'active_deck',
              name: active.name || 'Current Active Deck',
              category: 'active',
              cardCount: cardList.length,
              cardList,
              isValid: true
            };
            customList.push(deck);
            map.set(deck.id, deck);
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Saved custom decks from Deckbuilder
    try {
      const savedStr = localStorage.getItem('evil_cg_saved_decks');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (Array.isArray(saved)) {
          saved.forEach((deck: { id: string; name: string; cardCount: number; cards: { id: string; quantity: number }[] }) => {
            const cardList: CardItem[] = [];
            deck.cards.forEach((entry) => {
              const card = cardsById.get(entry.id);
              if (card) {
                for (let i = 0; i < entry.quantity; i++) cardList.push(card);
              }
            });

            if (cardList.length > 0) {
              const savedDeckItem: SelectableDeck = {
                id: `saved_${deck.id}`,
                name: deck.name,
                category: 'saved',
                cardCount: cardList.length,
                cardList,
                isValid: true
              };
              customList.push(savedDeckItem);
              map.set(savedDeckItem.id, savedDeckItem);
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. Preset Starter Decks
    PRESET_DECKS.forEach((preset) => {
      const cardList: CardItem[] = [];
      preset.cardIds.forEach((id) => {
        const card = cardsById.get(id) || allCards[0];
        if (card) cardList.push(card);
      });

      const presetDeck: SelectableDeck = {
        id: preset.id,
        name: preset.name,
        category: 'preset',
        cardCount: cardList.length,
        cardList,
        isValid: true
      };
      presetList.push(presetDeck);
      map.set(presetDeck.id, presetDeck);
    });

    return { customDecks: customList, lockedPresetDecks: presetList, allDecksMap: map };
  }, [allCards, cardsById]);

  // Pre-select the first available deck for each player when opening so they can proceed immediately
  useEffect(() => {
    if (!isOpen) return;
    const fallback = customDecks[0]?.id || lockedPresetDecks[0]?.id || '';
    setSelectedDeckIds((prev) => {
      const next = { ...prev };
      (['player1', 'player2'] as DeckPlayer[]).forEach((p) => {
        if (!next[p] || !allDecksMap.has(next[p])) next[p] = fallback;
      });
      return next.player1 === prev.player1 && next.player2 === prev.player2 ? prev : next;
    });
  }, [isOpen, customDecks, lockedPresetDecks, allDecksMap]);

  const selectedDecks: Record<DeckPlayer, SelectableDeck | null> = {
    player1: selectedDeckIds.player1 ? allDecksMap.get(selectedDeckIds.player1) || null : null,
    player2: selectedDeckIds.player2 ? allDecksMap.get(selectedDeckIds.player2) || null : null
  };
  const canProceed = Boolean(selectedDecks.player1 && selectedDecks.player2);

  if (!isOpen) return null;

  const renderPlayerPicker = (player: DeckPlayer) => {
    const selectedDeck = selectedDecks[player];
    const accent = player === 'player1' ? 'sky' : 'rose';
    return (
      <div className="flex flex-col gap-3 min-w-0">
        <label
          htmlFor={`deck-dropdown-${player}`}
          className={`text-xs font-mono font-bold uppercase tracking-wider ${accent === 'sky' ? 'text-sky-300' : 'text-rose-300'}`}
        >
          {PLAYER_LABEL[player]}'s deck:
        </label>

        <div className="relative">
          <select
            id={`deck-dropdown-${player}`}
            value={selectedDeckIds[player]}
            onChange={(e) => setSelectedDeckIds((prev) => ({ ...prev, [player]: e.target.value }))}
            className="w-full px-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 font-serif text-sm focus:outline-hidden focus:border-sky-400 transition-colors appearance-none cursor-pointer pr-10"
          >
            <option value="" disabled>
              -- Select a Deck --
            </option>

            {customDecks.length > 0 && (
              <optgroup label="Your Custom Decks">
                {customDecks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}{deck.category === 'active' ? ' • [Active]' : ''}
                  </option>
                ))}
              </optgroup>
            )}

            <optgroup label="Preset Starter Decks">
              {lockedPresetDecks.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} • [Preset]
                </option>
              ))}
            </optgroup>
          </select>

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Selected deck badge & card thumbnails */}
        {selectedDeck ? (
          <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl border border-stone-800 bg-stone-950 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${accent === 'sky' ? 'text-sky-400' : 'text-rose-400'}`} />
                <span className="font-serif font-bold text-sm text-stone-100 truncate block">
                  {selectedDeck.name}
                </span>
              </div>
              <span className={`text-xs font-mono font-bold shrink-0 ${accent === 'sky' ? 'text-sky-400' : 'text-rose-400'}`}>
                {selectedDeck.cardCount} cards
              </span>
            </div>

            {/* Unique Cards Scrollable Row with Hover Previews */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase text-stone-400 font-semibold">
                Cards in Deck (Hover to preview):
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1 bg-stone-950/80 rounded-xl border border-stone-800">
                {Array.from(new Set(selectedDeck.cardList.map((c) => c.id))).map((cId) => {
                  const card = selectedDeck.cardList.find((c) => c.id === cId);
                  if (!card) return null;
                  const count = selectedDeck.cardList.filter((c) => c.id === cId).length;
                  return (
                    <div
                      key={`deck-modal-preview-${player}-${card.id}`}
                      onMouseEnter={() => setHoveredDeckCard(card)}
                      onMouseLeave={() => setHoveredDeckCard(null)}
                      className="relative w-12 h-16 rounded-md overflow-hidden shrink-0 border border-stone-800 hover:border-sky-400 bg-stone-950 cursor-pointer shadow-md transition-all group hover:scale-105"
                      title={`${card.name} (${count}x) - Hover to preview full card`}
                    >
                      {cardImages[card.id] ? (
                        <img
                          src={cardImages[card.id]}
                          alt={card.name}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <CardThumbnail card={card} />
                      )}
                      {count > 1 && (
                        <div className="absolute top-0.5 right-0.5 px-1 rounded-full bg-sky-500 text-stone-950 font-mono font-black text-[9px] shadow-sm">
                          ×{count}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">
            Choose a deck from the dropdown above.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-full bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950 border border-sky-800/60 text-sky-400">
              <Sword className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-100">
              Choose each player's deck:
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: one deck picker per player */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-stone-900/60 overflow-y-auto">
          {renderPlayerPicker('player1')}
          {renderPlayerPicker('player2')}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              if (selectedDecks.player1 && selectedDecks.player2) {
                onConfirmDecks({ player1: selectedDecks.player1, player2: selectedDecks.player2 });
              }
            }}
            disabled={!canProceed}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
              canProceed
                ? 'bg-sky-400 hover:bg-sky-300 text-stone-950 shadow-lg shadow-sky-500/25 ring-2 ring-sky-300 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-stone-800 text-stone-500'
            }`}
            title={!canProceed ? 'Choose a deck for both players to proceed' : 'Proceed to battle'}
          >
            <Sword className="w-4 h-4" />
            <span>Proceed</span>
          </button>
        </div>
      </div>

      {/* Floating Card Preview on Hover in Deck Select Modal */}
      {hoveredDeckCard && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none drop-shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <CardPreview
            card={hoveredDeckCard}
            customArtUrl={customArtMap[hoveredDeckCard.id]}
            className="w-64 sm:w-72"
            imageClassName="max-w-[260px] max-h-[380px]"
          />
        </div>
      )}
    </div>
  );
};