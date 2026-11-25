import React from 'react';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { CardItem } from '../types/card';
import { FastForward, Sparkles, Eye } from 'lucide-react';
import { MultiStageState, MultiStageTargetInfo } from '../utils/multiStageAbilities';
import { getUnitPassives } from '../utils/unitPassives';
import { describeAttachments } from '../utils/fairyAttachments';
import { isOncePerTurn, getTurnUsageCount } from '../utils/turnLimits';
import { isFlowingStanceActive } from '../utils/flowingStance';
import { isLeaderOfTheBunchPassive, getLeaderOfTheBunchBonusHp } from '../utils/leaderOfTheBunch';

/**
 * The player's turn panel (bottom right, in play): what the player does rather than the unit taking the turn. Pass
 * Turn, finishing or cancelling a choice under way (a multi-stage ability's Finish and Cancel, an Assist's Cancel), and
 * a little information (bonuses on the unit this turn, cards attached to it, passives it has from elsewhere). Everything
 * the unit does (its abilities, Move, Draw, Assist, abilities granted or borrowed, a choice of cost) is on the big card:
 * see FocusCardPanel.
 */
interface PlayerTurnPanelProps {
  activePlayer: PlayerId;
  activeTurnUnit: BattlefieldUnit | null;
  onPassTurn: () => void;
  passCount: number;
  isAssistLocked?: boolean;
  pendingAssistDeployment?: { card: CardItem } | null;
  lockedAssistCard?: CardItem | null;
  onCancelAssist?: () => void;
  multiStageState?: MultiStageState | null;
  multiStageTargetInfo?: MultiStageTargetInfo | null;
  onFinishMultiStage?: () => void;
  onCancelMultiStage?: () => void;
  onHoverCard?: (card: CardItem | null) => void;
  unitsOnBoard?: Record<string, BattlefieldUnit>;
  // The big card is showing another card (e.g. one in hand) while a unit is taking the turn: puts the unit back on it,
  // where its actions are
  onShowTurnUnit?: (() => void) | null;
  // The panel's width classes (default: its own fixed widths)
  widthClass?: string;
}

export const PlayerTurnPanel: React.FC<PlayerTurnPanelProps> = ({
  activePlayer,
  activeTurnUnit,
  onPassTurn,
  passCount,
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
  onShowTurnUnit,
  widthClass = 'w-80 sm:w-96 md:w-[420px]'
}) => {
  const isPlayer1 = activePlayer === 'player1';
  const bonusRange = activeTurnUnit?.bonusRangeThisTurn || 0;

  return (
    <div className={`${widthClass} bg-stone-900/95 border border-stone-700/80 rounded-xl shadow-2xl p-3 backdrop-blur-md flex flex-col gap-2 select-none animate-in fade-in`}>
      {/* Header Bar: Active Player Badge & Pass Turn */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-stone-800">
        <div
          className={`px-3 py-1 rounded-full text-sm font-title tracking-wider border shadow-md ${
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

      {activeTurnUnit ? (
        <div className="flex flex-col gap-1.5">
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

          {/* An Assist under way: its Cancel */}
          {(pendingAssistDeployment || isAssistLocked) && (
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
          )}

          {/* The big card is showing another card: the unit's actions are on its own card */}
          {onShowTurnUnit && (
            <button
              onClick={onShowTurnUnit}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shadow-md bg-stone-800 hover:bg-stone-700 border-amber-600/70 hover:border-amber-400 text-amber-200 cursor-pointer"
              title={`Show ${activeTurnUnit.card.name} on the big card, with its actions`}
            >
              <Eye className="w-4 h-4" />
              <span>Show {activeTurnUnit.card.name}'s actions</span>
            </button>
          )}

          {/* This turn's bonuses on the unit */}
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

          {/* Cards attached to this unit (e.g. fairies): each one's bonus, and whether it applies now */}
          {(() => {
            const attached = describeAttachments(activeTurnUnit);
            if (attached.length === 0) return null;
            return (
              <div className="flex flex-col gap-1 pt-1.5 border-t border-stone-800">
                <span className="text-[10px] font-mono text-emerald-400/80 font-bold uppercase tracking-wider">Attached</span>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {attached.map((a, i) => (
                    <div
                      key={`attached_${a.card.id}_${i}`}
                      onMouseEnter={() => onHoverCard?.(a.card)}
                      onMouseLeave={() => onHoverCard?.(null)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-xs font-serif border cursor-pointer ${
                        a.active ? 'bg-stone-900/90 border-emerald-900/50 text-emerald-200' : 'bg-stone-900/60 border-stone-800/80 text-stone-500'
                      }`}
                      title={a.passive ? `${a.passive.name}: ${a.passive.text}` : a.card.name}
                    >
                      <span className="truncate font-bold">
                        🧚 {a.card.name}
                        {a.passive ? ` · ${a.passive.name}` : ''}
                      </span>
                      <span className="shrink-0 ml-1 text-[10px] font-mono">{a.active ? 'active' : 'no bonus'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* Unit Passives (Rule: Passives and 1/Turn status) */}
          {(() => {
            const printedPassiveIds = new Set((activeTurnUnit.card.passives || []).map((p) => p.id));
            // (only passives it has from elsewhere, e.g. one Faceless King copied: its own are printed on its card)
            const passives = getUnitPassives(activeTurnUnit).filter((p) => !printedPassiveIds.has(p.id));
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
                    // "The first time this unit spends AP to move each turn ... place it on a tile of your choice within
                    // range 1-2" (e.g. Magical Omnipresence): a modifyMove with firstApMoveBecomesPlace and its placeRange
                    const placeMove: any = ((passive.effects || []) as any[]).find(
                      (e: any) => e.type === 'modifyMove' && e.firstApMoveBecomesPlace
                    );
                    const placeMoveRange: number = Array.isArray(placeMove?.placeRange) ? Math.max(...placeMove.placeRange) : 0;
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
                          {(() => {
                            // "This unit's melee attacks have Range 1-2" (e.g. Cephalopod Reach): a modifyRange on its melee attacks
                            const reach: any = ((passive.effects || []) as any[]).find(
                              (e: any) => e.type === 'modifyRange' && e.appliesTo === 'meleeAttacks' && !e.if && typeof e.amount === 'number'
                            );
                            return reach ? (
                              <span className="text-[9px] font-mono px-1 py-0.5 rounded font-bold bg-teal-950/80 text-teal-300 border border-teal-600/60" title={`${passive.name}: Melee attacks have +${reach.amount} Range`}>
                                +{reach.amount} Melee Range
                              </span>
                            ) : null;
                          })()}
                          {placeMove && (
                            <span
                              className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                                activeTurnUnit?.movedThisTurn
                                  ? 'bg-stone-800 text-stone-500 line-through border border-stone-700'
                                  : 'bg-purple-950/80 text-purple-300 border border-purple-600/60'
                              }`}
                              title={
                                activeTurnUnit?.movedThisTurn
                                  ? `${passive.name}: Range ${placeMoveRange} Move (1/Turn) - Already used this turn`
                                  : `${passive.name}: Range ${placeMoveRange} Move (1/Turn)`
                              }
                            >
                              {activeTurnUnit?.movedThisTurn ? `Range ${placeMoveRange} Move • 1/Turn ✓` : `Range ${placeMoveRange} Move • 1/Turn`}
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
