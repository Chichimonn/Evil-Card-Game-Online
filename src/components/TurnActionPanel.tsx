import React from 'react';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { CardAbility, CardItem } from '../types/card';
import { Footprints, Hand, Shield, Swords, FastForward, Sparkles, BookOpen } from 'lucide-react';
import {
  getAbilityApCost,
  isPromotedAbilityProvider,
  getQualifyingPromotedAbilities,
  expandVariableCostAbilities
} from '../utils/promotedAbilities';
import { isOncePerTurn, getTurnUsageCount, isAbilityLockedForUnit } from '../utils/turnLimits';
import { isStraightLineAbility } from '../utils/hexGridMath';
import { getAbilityHitStructure } from '../utils/attackLogic';
import { MultiStageState, MultiStageTargetInfo } from '../utils/multiStageAbilities';
import { getUnitPassives, isUnitMindless } from '../utils/unitPassives';
import { getUniversalMoveCost, hasColdFeetEffect, isUnitMovementDisabled, getMoveBlockedMessage } from '../utils/turnRestrictions';
import { hasEsotericPathways, hasMagicalOmnipresence } from '../utils/movementAbilities';
import { isFlowingStanceActive, hasCephalopodReach } from '../utils/flowingStance';
import { isLeaderOfTheBunchPassive, getLeaderOfTheBunchBonusHp } from '../utils/leaderOfTheBunch';

interface TurnActionPanelProps {
  activePlayer: PlayerId;
  activeTurnUnit: BattlefieldUnit | null;
  onUniversalMoveClick: () => void;
  isMovingMode: boolean;
  onUniversalDrawClick: () => void;
  canUniversalDraw: boolean;
  onAbilityClick: (ability: CardAbility) => void;
  activeAbility: CardAbility | null;
  onPromotedAbilitySelect: (promotedAbility: CardAbility, parentAbility: CardAbility) => void;
  onPassTurn: () => void;
  passCount: number;
  onAssistClick?: () => void;
  isAssistLocked?: boolean;
  pendingAssistDeployment?: { card: CardItem; ability: CardAbility } | null;
  lockedAssistCard?: CardItem | null;
  onCancelAssist?: () => void;
  multiStageState?: MultiStageState | null;
  multiStageTargetInfo?: MultiStageTargetInfo | null;
  onFinishMultiStage?: () => void;
  onCancelMultiStage?: () => void;
  onHoverCard?: (card: CardItem | null) => void;
  unitsOnBoard?: Record<string, BattlefieldUnit>;
  onCancelPrepaidAbility?: () => void;
  // Active multi-use provider chain (e.g. Dual Casting): progress label and which promoted abilities may still be chosen
  providerChainInfo?: { label: string; candidateIds: string[]; canFinishChoosing: boolean } | null;
  onFinishChainChoosing?: () => void;
}

export const TurnActionPanel: React.FC<TurnActionPanelProps> = ({
  activePlayer,
  activeTurnUnit,
  onUniversalMoveClick,
  isMovingMode,
  onUniversalDrawClick,
  canUniversalDraw,
  onAbilityClick,
  activeAbility,
  onPromotedAbilitySelect,
  onPassTurn,
  passCount,
  onAssistClick,
  isAssistLocked = false,
  pendingAssistDeployment,
  lockedAssistCard,
  onCancelAssist,
  multiStageState,
  multiStageTargetInfo,
  onFinishMultiStage,
  onCancelMultiStage,
  onHoverCard,
  unitsOnBoard,
  onCancelPrepaidAbility,
  providerChainInfo,
  onFinishChainChoosing
}) => {
  const isPlayer1 = activePlayer === 'player1';

  // Determine if there is currently an active ability that allows choosing a promoted ability for free
  const parentProviderAbility = React.useMemo(() => {
    if (!activeAbility) return null;
    if (isPromotedAbilityProvider(activeAbility)) {
      return activeAbility;
    }
    // If activeAbility is an attack executed from a provider:
    if (activeAbility.parentAbilityId && activeTurnUnit) {
      const allAbs = [...(activeTurnUnit.card?.abilities || []), ...(activeTurnUnit.grantedAbilities || [])];
      return allAbs.find((a) => a.id === activeAbility.parentAbilityId) || null;
    }
    return null;
  }, [activeAbility, activeTurnUnit]);

  // Extract ONLY qualifying abilities for the active provider ability
  const qualifyingAbilities = React.useMemo(() => {
    if (!parentProviderAbility || !activeTurnUnit?.promotedCards) {
      return [];
    }
    const all = getQualifyingPromotedAbilities(parentProviderAbility, activeTurnUnit.promotedCards, activeTurnUnit);
    return providerChainInfo ? all.filter((q) => providerChainInfo.candidateIds.includes(q.ability.id)) : all;
  }, [parentProviderAbility, activeTurnUnit, providerChainInfo]);

  const unitPassives = React.useMemo(() => {
    return activeTurnUnit ? getUnitPassives(activeTurnUnit) : [];
  }, [activeTurnUnit]);

  const isMindless = React.useMemo(() => {
    return isUnitMindless(activeTurnUnit);
  }, [activeTurnUnit]);

  const hasRapidCatalog = React.useMemo(() => {
    return unitPassives.some(
      (p) => p.id === 'rapid_catalog' || p.id === 'rapid_catalogue' || p.name === 'Rapid Catalog' || p.name === 'Rapid Catalogue'
    );
  }, [unitPassives]);

  return (
    <div className="w-80 sm:w-96 md:w-[420px] bg-stone-900/95 border border-stone-700/80 rounded-xl shadow-2xl p-3 backdrop-blur-md flex flex-col gap-2 select-none animate-in fade-in">
      {/* Header Bar: Active Player Badge & Pass Turn */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-stone-800">
        <div
          className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider border shadow-md ${
            isPlayer1
              ? 'bg-sky-950 border-sky-400 text-sky-200'
              : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}
        >
          {isPlayer1 ? "Player 1's Turn" : "Player 2's Turn"}
        </div>

        <button
          onClick={onPassTurn}
          disabled={isAssistLocked}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-bold text-xs border transition-all shadow-xs shrink-0 ${
            isAssistLocked
              ? 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 hover:border-amber-400 active:scale-95 cursor-pointer'
          }`}
          title={isAssistLocked ? "Locked in to Assist ability: Select target on board" : "Pass turn to the other player"}
        >
          <FastForward className="w-4 h-4 text-amber-400" />
          <span>{passCount > 0 ? `Pass (${passCount}/10)` : 'Pass Turn'}</span>
        </button>
      </div>

      {/* Taking turn info or prompt */}
      {activeTurnUnit ? (
        <div className="flex flex-col gap-1.5">
          <div
            className="flex items-center justify-between bg-stone-950/80 px-2.5 py-1 rounded-lg border border-stone-800/80 hover:border-amber-400/60 transition-colors text-xs cursor-pointer"
            onMouseEnter={() => onHoverCard?.(activeTurnUnit.card)}
            onMouseLeave={() => onHoverCard?.(null)}
            title={`Preview card: ${activeTurnUnit.card.name}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono text-stone-400 uppercase">Unit:</span>
              <strong className="text-amber-300 font-serif font-bold text-xs truncate">
                {activeTurnUnit.card.name}
              </strong>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeTurnUnit.turnStartingAp !== undefined && activeTurnUnit.turnStartingAp < activeTurnUnit.card.ap && (
                <span
                  className="px-1.5 py-0.5 rounded-md bg-purple-950/95 border border-purple-400 text-purple-200 font-black text-[9px] font-mono shadow-xs animate-pulse"
                  title={`Noxious Burst: Started turn with 1 less AP (${activeTurnUnit.turnStartingAp} AP)`}
                >
                  ☠️-1AP
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/80 text-amber-300 font-black text-[10px] shrink-0 font-mono">
                {activeTurnUnit.currentAp} AP
              </span>
            </div>
          </div>

          {/* Multi-Stage Targeting Indicator Banner */}
          {multiStageState && multiStageTargetInfo && (
            <div className="bg-amber-950/80 border-2 border-amber-400 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-lg">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  {multiStageState.ability.name}{' '}
                  {multiStageState.targets.length > 0
                    ? `(${multiStageState.targets.length} tiles)`
                    : `(Stage ${multiStageState.stage})`}
                </span>
                <div className="flex items-center gap-1">
                  {multiStageTargetInfo.isOptional && onFinishMultiStage && (
                    <button
                      onClick={onFinishMultiStage}
                      className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
                      title="Finish targeting with current selections"
                    >
                      {multiStageTargetInfo.finishButtonLabel || 'Finish'}
                    </button>
                  )}
                  {onCancelMultiStage && (
                    <button
                      onClick={onCancelMultiStage}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[10px] uppercase tracking-wider cursor-pointer border border-stone-600 transition-colors"
                      title="Cancel targeting"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-amber-100 font-sans leading-tight">
                {multiStageTargetInfo.promptMessage}
              </div>
            </div>
          )}

          {/* Active Assist Banner with Cancel Button or Normal Assist Button */}
          {pendingAssistDeployment || isAssistLocked ? (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-950/80 border-2 border-amber-500/80 shadow-md animate-in fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                  </span>
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-amber-300">
                    {pendingAssistDeployment ? 'Reinforce Assist' : 'Assist Active'}
                  </span>
                </div>
                {onCancelAssist && (
                  <button
                    onClick={onCancelAssist}
                    className="px-2 py-1 rounded-md bg-red-900/90 hover:bg-red-800 text-red-100 border border-red-500/80 text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                    title="Cancel Assist and send card to Graveyard without using ability"
                  >
                    Cancel Assist
                  </button>
                )}
              </div>
              <div className="text-xs text-stone-200">
                {pendingAssistDeployment ? (
                  <>
                    <strong className="text-amber-200">{pendingAssistDeployment.card.name}</strong>: Click an empty tile on your back row to place unit, or click Cancel.
                  </>
                ) : (
                  <>
                    <strong className="text-amber-200">{lockedAssistCard?.name || 'Assist Unit'}</strong>: Select a target on the board for free, or click Cancel.
                  </>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onAssistClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-serif font-bold transition-all shadow-md select-none group bg-yellow-950/60 hover:bg-yellow-900/80 border-yellow-400 text-yellow-300 cursor-pointer"
              title="Use Assist/Inspiring ability"
              aria-label="Use Assist/Inspiring ability"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400 animate-pulse"></span>
              </span>
              <span>Use Assist/Inspiring ability</span>
            </button>
          )}

          {/* Universal Actions (Move & Draw) */}
          {(() => {
            const moveCost = activeTurnUnit ? getUniversalMoveCost(activeTurnUnit, unitsOnBoard) : 1;
            const isMoveTaxed = activeTurnUnit ? hasColdFeetEffect(activeTurnUnit, unitsOnBoard) && !activeTurnUnit.movedThisTurn : false;
            const hasEsoteric = activeTurnUnit ? hasEsotericPathways(activeTurnUnit) : false;
            const hasOmni = activeTurnUnit ? hasMagicalOmnipresence(activeTurnUnit) : false;
            const isOmniExhausted = hasOmni && Boolean(activeTurnUnit?.movedThisTurn);
            const isMoveDisabled = activeTurnUnit ? isUnitMovementDisabled(activeTurnUnit) || isOmniExhausted : false;

            return (
              <div className="grid grid-cols-2 gap-2">
                {/* Universal Move (1 AP, or 2 AP if Cold Feet/Gravity taxed) */}
                <button
                  onClick={onUniversalMoveClick}
                  disabled={isAssistLocked || isMoveDisabled || activeTurnUnit.currentAp < moveCost}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold border transition-all ${
                    isAssistLocked || isMoveDisabled
                      ? 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                      : isMovingMode
                      ? 'bg-emerald-500 text-stone-950 border-emerald-300 ring-2 ring-emerald-400 shadow-md cursor-pointer'
                      : activeTurnUnit.currentAp >= moveCost
                      ? isMoveTaxed
                        ? 'bg-stone-800 hover:bg-cyan-950 text-cyan-300 border-cyan-700/60 hover:border-cyan-500 shadow-xs cursor-pointer'
                        : hasOmni
                        ? 'bg-stone-800 hover:bg-purple-950 text-purple-300 border-purple-600/60 hover:border-purple-400 shadow-xs cursor-pointer'
                        : 'bg-stone-800 hover:bg-emerald-950 text-emerald-300 border-emerald-700/60 hover:border-emerald-500 shadow-xs cursor-pointer'
                      : 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                  }`}
                  title={
                    isOmniExhausted
                      ? "Magical Omnipresence: This unit may only move once per turn (already moved this turn)."
                      : isMoveDisabled
                      ? activeTurnUnit
                        ? getMoveBlockedMessage(activeTurnUnit)
                        : 'Unit cannot move.'
                      : isMoveTaxed
                      ? `Move (${moveCost} AP): Cold Feet / Gravity active! First move costs an additional 1 AP.${hasEsoteric ? ' Wraparound movement active via Esoteric Pathways.' : ''}`
                      : hasOmni
                      ? `Move (${moveCost} AP): Move to any empty tile within Range 2 (1/Turn).`
                      : hasEsoteric
                      ? `Move (${moveCost} AP): Click to move to any empty surrounding tile or legal wraparound boundary (Esoteric Pathways).`
                      : `Move (${moveCost} AP): Click this then click any empty surrounding tile`
                  }
                >
                  <Footprints className="w-4 h-4" />
                  <span>Move {hasOmni ? '(R2)' : `(${moveCost}AP)`}</span>
                  {hasOmni && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                        isOmniExhausted
                          ? 'bg-stone-800 text-stone-500 line-through border border-stone-700'
                          : 'bg-purple-950/90 text-purple-300 border border-purple-500/80 shadow-xs'
                      }`}
                      title={isOmniExhausted ? "Magical Omnipresence: 1/Turn used" : "Magical Omnipresence: 1/Turn move"}
                    >
                      {isOmniExhausted ? '1/Turn ✓' : '1/Turn'}
                    </span>
                  )}
                  {isMoveTaxed && <span className="text-[10px] text-cyan-300 ml-0.5" title="Cold Feet / Gravity +1 AP">❄️</span>}
                </button>

                {/* Universal Draw (1 AP) or Rapid Catalogue */}
                <button
                  onClick={onUniversalDrawClick}
                  disabled={isAssistLocked || !canUniversalDraw || isMindless || activeTurnUnit.currentAp < 1}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold border transition-all ${
                !isAssistLocked && canUniversalDraw && !isMindless && activeTurnUnit.currentAp >= 1
                  ? hasRapidCatalog
                    ? 'bg-stone-800 hover:bg-amber-950 text-amber-300 border-amber-600/70 hover:border-amber-400 shadow-xs cursor-pointer'
                    : 'bg-stone-800 hover:bg-sky-950 text-sky-300 border-sky-700/60 hover:border-sky-500 shadow-xs cursor-pointer'
                  : 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
              }`}
              title={
                isMindless
                  ? "Mindless: This unit cannot use the Draw action."
                  : hasRapidCatalog
                  ? "Rapid Catalogue (1 AP): Look at top 2 cards of your deck. Put 1 into your hand, 1 on bottom of deck. (Replaces Universal Draw, once per turn)."
                  : "Draw (1 AP): Draw 1 card. Use once per turn."
              }
            >
              {hasRapidCatalog ? <BookOpen className="w-4 h-4 text-amber-400" /> : <Hand className="w-4 h-4" />}
              <span>
                {hasRapidCatalog ? 'Rapid Catalogue (1AP)' : 'Draw (1AP)'}
                {activeTurnUnit.usedUniversalDrawThisTurn ? ' ✓' : ''}
              </span>
            </button>
          </div>
        );
      })()}

          {/* Unit Printed Abilities & Inspiring/Granted Abilities */}
          {(() => {
            const printed = activeTurnUnit.card.abilities || [];
            const granted = activeTurnUnit.grantedAbilities || [];
            const allAbilities = expandVariableCostAbilities([...printed, ...granted]);
            const bonusRange = activeTurnUnit.bonusRangeThisTurn || 0;

            if (allAbilities.length === 0) return null;

            return (
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto custom-scrollbar">
                {bonusRange > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/90 border border-teal-500/80 text-teal-200 text-xs font-mono font-bold shadow-xs shrink-0">
                    <span>🔭</span>
                    <span>Broaden Search: +{bonusRange} Range to Abilities</span>
                  </div>
                )}
                {isFlowingStanceActive(activeTurnUnit) && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-500/80 text-blue-200 text-xs font-mono font-bold shadow-xs shrink-0">
                    <span>🌊</span>
                    <span>Flowing Stance: Melee attacks have Range 1-2 (not moved this turn)</span>
                  </div>
                )}
                {allAbilities
                  .map((ability, idx) => {
                    const cost = getAbilityApCost(ability);
                    const isOpt = isOncePerTurn(ability);
                    const baseKey = ability.baseAbilityId || (ability.id?.includes('__cost_') ? ability.id.split('__cost_')[0] : null);
                    const usedCount = getTurnUsageCount(activeTurnUnit, ability.id || ability.name) +
                      (baseKey ? getTurnUsageCount(activeTurnUnit, baseKey) : 0);
                    const isUsedOncePerTurn = isOpt && usedCount >= 1;
                    const isLocked = isAbilityLockedForUnit(activeTurnUnit, ability);
                    const canAfford = activeTurnUnit.currentAp >= cost && !isUsedOncePerTurn && !isLocked;
                    const isProvider = isPromotedAbilityProvider(ability);
                    const isActive =
                      activeAbility?.id === ability.id ||
                      activeAbility?.parentAbilityId === ability.id;
                    const isAttack =
                      (ability.tags?.includes('melee') ||
                      ability.tags?.includes('ranged') ||
                      ability.tags?.includes('attack') ||
                      ability.text.toLowerCase().includes('deal') ||
                      ability.text.toLowerCase().includes('damage')) &&
                      ability.id !== 'death_mark';
                    const isMelee =
                      ability.tags?.includes('melee') ||
                      ability.text.toLowerCase().includes('melee');

                    const isGranted = (activeTurnUnit.grantedAbilities || []).some(
                      (ga) => ga.id === ability.id
                    );

                    return (
                      <button
                        key={`${ability.id}_${idx}`}
                        onClick={() => onAbilityClick(ability)}
                        onMouseEnter={() => onHoverCard?.(activeTurnUnit.card)}
                        onMouseLeave={() => onHoverCard?.(null)}
                        disabled={!canAfford || isUsedOncePerTurn || isLocked || isAssistLocked}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs sm:text-sm font-serif font-bold border transition-all ${
                          isLocked
                            ? 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                            : isUsedOncePerTurn
                            ? 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                            : isActive
                            ? isGranted
                              ? 'bg-purple-600 text-white border-purple-300 ring-2 ring-purple-400 shadow-md cursor-pointer'
                              : isProvider
                              ? 'bg-purple-600 text-white border-purple-300 ring-2 ring-purple-400 shadow-md cursor-pointer'
                              : 'bg-red-500 text-stone-950 border-red-300 ring-2 ring-red-400 shadow-md cursor-pointer'
                            : canAfford
                            ? isGranted
                              ? 'bg-stone-800 hover:bg-purple-950 text-purple-200 border-purple-500/70 hover:border-purple-400 cursor-pointer shadow-xs'
                              : isProvider
                              ? 'bg-stone-800 hover:bg-purple-950 text-purple-200 border-purple-700/60 hover:border-purple-400 cursor-pointer'
                              : 'bg-stone-800 hover:bg-amber-950 text-amber-200 border-amber-600/60 hover:border-amber-400 cursor-pointer'
                            : 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                        }`}
                        title={`${ability.name} (${cost} AP)${isGranted ? ' [Inspiring ability granted until end of turn]' : ''}${isLocked ? ' [Locked for this turn via Overload Gemstone]' : ''}${isUsedOncePerTurn ? ' [Already used this turn]' : ''}: ${ability.text}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isAttack ? (
                            <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{ability.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {isGranted && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-purple-950/90 text-purple-300 border border-purple-500/80">
                              Inspiring
                            </span>
                          )}
                          {ability.isMultiStage && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-cyan-950/90 text-cyan-300 border border-cyan-500/80"
                              title="Multi-stage targeting ability"
                            >
                              Multi-Stage
                            </span>
                          )}
                          {isStraightLineAbility(ability) && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/60">
                              Line
                            </span>
                          )}
                          {bonusRange > 0 && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-teal-950/90 text-teal-300 border border-teal-500/80 shadow-xs"
                              title={`+${bonusRange} Range to abilities this turn from Broaden Search`}
                            >
                              +{bonusRange} Range
                            </span>
                          )}
                          {isMelee && isFlowingStanceActive(activeTurnUnit) && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-blue-950/90 text-blue-300 border border-blue-500/80 shadow-xs"
                              title="Flowing Stance: Melee attack treated as Range 1-2 (has not moved this turn)"
                            >
                              Range 1-2
                            </span>
                          )}
                          {isMelee && hasCephalopodReach(activeTurnUnit) && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-teal-950/90 text-teal-300 border border-teal-500/80 shadow-xs"
                              title="Cephalopod Reach: +1 Range to melee attacks"
                            >
                              +1 Range
                            </span>
                          )}
                          {(() => {
                            const hitStruct = getAbilityHitStructure(ability, activeTurnUnit);
                            if (!hitStruct.isMultiHit && !hitStruct.badgeText) return null;
                            return (
                              <span
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-red-950/80 text-rose-300 border border-rose-600/60"
                                title={hitStruct.summaryText}
                              >
                                {hitStruct.badgeText || `${hitStruct.hits.length} Hits`}
                              </span>
                            );
                          })()}
                          {isLocked && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-stone-800 text-amber-400 border border-amber-600/70"
                              title="Locked for this turn via Overload Gemstone"
                            >
                              🔒 Locked
                            </span>
                          )}
                          {isOpt && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                isUsedOncePerTurn
                                  ? 'bg-stone-800 text-stone-500 line-through'
                                  : 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                              }`}
                            >
                              {isUsedOncePerTurn ? '1/Turn ✓' : '1/Turn'}
                            </span>
                          )}
                          <span className="font-mono text-xs text-stone-300 font-bold">
                            {cost} AP
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            );
          })()}

          {/* Qualifying Abilities from Promoted Cards (Only allowed once the parent ability is selected with its AP cost) */}
          {parentProviderAbility && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-purple-900/60 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider truncate">
                  Free Abilities for {parentProviderAbility.name} ({getAbilityApCost(parentProviderAbility)} AP)
                </span>
                {(activeAbility?.prepaidByParent || providerChainInfo) && onCancelPrepaidAbility ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {providerChainInfo?.canFinishChoosing && onFinishChainChoosing && (
                      <button
                        onClick={onFinishChainChoosing}
                        className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                        title="Stop choosing and use the chosen abilities"
                      >
                        Done
                      </button>
                    )}
                    <button
                      onClick={onCancelPrepaidAbility}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[10px] uppercase tracking-wider cursor-pointer border border-stone-600 transition-colors"
                      title="Cancel (the AP is already spent; any remaining uses are lost)"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] font-mono font-bold bg-purple-950 border border-purple-500/80 text-purple-200 px-1 rounded shrink-0">
                    {getAbilityApCost(parentProviderAbility)} AP Cost
                  </span>
                )}
              </div>

              {providerChainInfo && (
                <div className="text-[10px] font-mono text-amber-200 px-2 py-1 rounded bg-amber-950/60 border border-amber-700/60">
                  {providerChainInfo.label}
                </div>
              )}

              {qualifyingAbilities.length === 0 ? (
                <div className="text-[10px] font-mono text-amber-300/80 p-2 bg-stone-950/80 rounded border border-amber-900/40 text-center">
                  No matching qualifying abilities among promoted cards for {parentProviderAbility.name}.
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {qualifyingAbilities.map(({ cardName, ability: promAb, card }, idx) => {
                    const isSelected = activeAbility?.id === `${parentProviderAbility.id}__${promAb.id}`;
                    const isOpt = isOncePerTurn(promAb);
                    const usedCount = getTurnUsageCount(activeTurnUnit, promAb.id || promAb.name);
                    const isParentLocked = isAbilityLockedForUnit(activeTurnUnit, parentProviderAbility);
                    const isPromLocked = isAbilityLockedForUnit(activeTurnUnit, promAb) || isParentLocked;
                    const isUsedOncePerTurn = isOpt && usedCount >= 1;
                    const isAttack =
                      promAb.tags?.includes('melee') ||
                      promAb.tags?.includes('ranged') ||
                      promAb.tags?.includes('attack') ||
                      promAb.text.toLowerCase().includes('deal') ||
                      promAb.text.toLowerCase().includes('damage');

                    return (
                      <button
                        key={`qualifying_${cardName}_${promAb.id}_${idx}`}
                        onClick={() => onPromotedAbilitySelect(promAb, parentProviderAbility)}
                        onMouseEnter={() => onHoverCard?.(card)}
                        onMouseLeave={() => onHoverCard?.(null)}
                        disabled={isUsedOncePerTurn || isPromLocked || isAssistLocked}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-serif font-bold border transition-all ${
                          isUsedOncePerTurn
                            ? 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                            : isSelected
                            ? 'bg-purple-600 text-white border-purple-300 ring-2 ring-purple-400 shadow-md cursor-pointer'
                            : 'bg-purple-950/70 hover:bg-purple-900 text-purple-200 border-purple-700/60 hover:border-purple-400 cursor-pointer'
                        }`}
                        title={`${promAb.name} (from ${cardName} - free via ${parentProviderAbility.name})${isUsedOncePerTurn ? ' [Already used this turn]' : ''}: ${promAb.text}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isAttack ? (
                            <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                          )}
                          <span className="truncate">{promAb.name}</span>
                          <span className="text-[9px] font-mono text-purple-400 font-normal">
                            ({cardName})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isStraightLineAbility(promAb) && (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/60">
                              Line
                            </span>
                          )}
                          {(activeTurnUnit.bonusRangeThisTurn || 0) > 0 && (
                            <span
                              className="text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase bg-teal-950/90 text-teal-300 border border-teal-500/80 shadow-xs"
                              title={`+${activeTurnUnit.bonusRangeThisTurn} Range to abilities this turn from Broaden Search`}
                            >
                              +{activeTurnUnit.bonusRangeThisTurn} Range
                            </span>
                          )}
                          {isAttack && isFlowingStanceActive(activeTurnUnit) && (promAb.tags?.includes('melee') || promAb.text?.toLowerCase().includes('melee')) && (
                            <span
                              className="text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase bg-blue-950/80 text-blue-300 border border-blue-500/60 shadow-xs"
                              title="Flowing Stance: Melee attack treated as Range 1-2 (has not moved this turn)"
                            >
                              Range 1-2
                            </span>
                          )}
                          {isAttack && hasCephalopodReach(activeTurnUnit) && (promAb.tags?.includes('melee') || promAb.text?.toLowerCase().includes('melee')) && (
                            <span
                              className="text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase bg-teal-950/80 text-teal-300 border border-teal-500/60 shadow-xs"
                              title="Cephalopod Reach: +1 Range to melee attacks"
                            >
                              +1 Range
                            </span>
                          )}
                          {(() => {
                            const promHitStruct = getAbilityHitStructure(promAb, activeTurnUnit);
                            if (!promHitStruct.isMultiHit && !promHitStruct.badgeText) return null;
                            return (
                              <span
                                className="text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase bg-red-950/80 text-rose-300 border border-rose-600/60"
                                title={promHitStruct.summaryText}
                              >
                                {promHitStruct.badgeText || `${promHitStruct.hits.length} Hits`}
                              </span>
                            );
                          })()}
                          {isOpt && (
                            <span
                              className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                                isUsedOncePerTurn
                                  ? 'bg-stone-800 text-stone-500 line-through'
                                  : 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                              }`}
                            >
                              {isUsedOncePerTurn ? '1/Turn ✓' : '1/Turn'}
                            </span>
                          )}
                          <span className="font-mono text-[9px] text-emerald-300 font-black">
                            FREE
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* Unit Passives (Rule: Passives and 1/Turn status) */}
          {(() => {
            const passives = getUnitPassives(activeTurnUnit);
            if (passives.length === 0) return null;
            return (
              <div className="flex flex-col gap-1 pt-1.5 border-t border-stone-800">
                <span className="text-[10px] font-mono text-amber-400/80 font-bold uppercase tracking-wider">
                  Passives
                </span>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {passives.map((passive, pIdx) => {
                    const isOpt = isOncePerTurn(passive);
                    const usedCount = getTurnUsageCount(activeTurnUnit, passive.id || passive.name);
                    const isUsedOncePerTurn = isOpt && usedCount >= 1;
                    return (
                      <div
                        key={`passive_${passive.id || passive.name}_${pIdx}`}
                        onMouseEnter={() => {
                          const originCard = activeTurnUnit.promotedCards?.find((c) => c.passives?.some((p) => p.name === passive.name || p.id === passive.id)) || activeTurnUnit.card;
                          onHoverCard?.(originCard);
                        }}
                        onMouseLeave={() => onHoverCard?.(null)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-xs font-serif border cursor-pointer hover:border-amber-400/50 transition-colors ${
                          isUsedOncePerTurn
                            ? 'bg-stone-900/60 border-stone-800/80 text-stone-500'
                            : 'bg-stone-900/90 border-amber-900/40 text-amber-200'
                        }`}
                        title={`${passive.name}: ${passive.text}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Sparkles
                            className={`w-3 h-3 shrink-0 ${
                              isUsedOncePerTurn ? 'text-stone-600' : 'text-amber-400'
                            }`}
                          />
                          <span className={`truncate font-bold ${isUsedOncePerTurn ? 'line-through text-stone-500' : ''}`}>
                            {passive.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isLeaderOfTheBunchPassive(passive) && unitsOnBoard && (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/60" title={`Leader of the Bunch: +${getLeaderOfTheBunchBonusHp(activeTurnUnit, unitsOnBoard)} Max HP from surrounding friendly units`}>
                              +{getLeaderOfTheBunchBonusHp(activeTurnUnit, unitsOnBoard)} HP
                            </span>
                          )}
                          {(passive.id?.toLowerCase() === 'cephalopod_reach' || passive.name?.toLowerCase().includes('cephalopod reach')) && (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded font-bold bg-teal-950/80 text-teal-300 border border-teal-600/60" title="Cephalopod Reach: Melee attacks have +1 Range">
                              +1 Melee Range
                            </span>
                          )}
                          {(passive.id?.toLowerCase() === 'magical_omnipresence' || passive.name?.toLowerCase().includes('magical omnipresence')) && (
                            <span
                              className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                                activeTurnUnit?.movedThisTurn
                                  ? 'bg-stone-800 text-stone-500 line-through border border-stone-700'
                                  : 'bg-purple-950/80 text-purple-300 border border-purple-600/60'
                              }`}
                              title={
                                activeTurnUnit?.movedThisTurn
                                  ? "Magical Omnipresence: Range 2 Move (1/Turn) - Already used this turn"
                                  : "Magical Omnipresence: Range 2 Move (1/Turn)"
                              }
                            >
                              {activeTurnUnit?.movedThisTurn ? 'Range 2 Move • 1/Turn ✓' : 'Range 2 Move • 1/Turn'}
                            </span>
                          )}
                          {isOpt && (
                            <span
                              className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                                isUsedOncePerTurn
                                  ? 'bg-stone-800 text-stone-500 line-through'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                              }`}
                            >
                              {isUsedOncePerTurn ? '1/Turn ✓' : '1/Turn'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <span className="text-[11px] font-mono text-stone-400 leading-snug">
          Choose a friendly unit on the board to take a turn, or Reinforce a card from hand
        </span>
      )}
    </div>
  );
};
