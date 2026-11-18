import { CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { getHexDistance, getSurroundingHexes, isTargetedAbility } from '../utils/hexGridMath';
import { isChargeFlightAbility } from '../utils/chargeFlightAbility';
import { getPathSpec } from '../utils/paths';
import { isPromotedAbilityProvider } from '../utils/promotedAbilities';

/**
 * The computer opponent's choices (Endless). It acts at random, but favours attacking when it can. It plays through
 * the same handlers a player's clicks use (see the CPU driver in App.tsx); this file only decides what to do.
 */

export const CPU_ATTACK_CHANCE = 0.8;
export const CPU_APPROACH_CHANCE = 0.75;

type Board = Record<string, BattlefieldUnit>;

const enemyHexes = (board: Board, me: PlayerId) => Object.keys(board).filter((h) => board[h].owner !== me && !board[h].card.isWall);

/** Distance from a tile to the nearest enemy of `me` (Infinity when there are none). */
export const distanceToNearestEnemy = (hex: string, board: Board, me: PlayerId): number =>
  enemyHexes(board, me).reduce((best, h) => Math.min(best, getHexDistance(hex, h)), Infinity);

// Effects the computer has no use for: it has no hand or deck
const CARD_EFFECTS = ['draw', 'loot', 'lookTop', 'revealTop', 'scry', 'returnFromGraveyard', 'reinforce', 'putBottom'];

/** Whether the computer can use this ability at all (it skips card effects and abilities drawn along a path). */
export function isCpuUsableAbility(ability: CardAbility): boolean {
  const effects = (ability.effects || []) as any[];
  if (ability.tags?.includes('assist')) return false;
  if (effects.some((e) => CARD_EFFECTS.includes(e.type)) && !effects.some((e) => e.type === 'damage')) return false;
  if (isChargeFlightAbility(ability) || getPathSpec(ability) || (ability as any).usesPath) return false;
  return true;
}

export const isAttackAbility = (ability: CardAbility): boolean =>
  Boolean(ability.tags?.includes('melee')) ||
  ((ability.effects || []) as any[]).some((e) => e.type === 'damage' && e.target !== 'self' && e.area !== 'self') ||
  isPromotedAbilityProvider(ability);

/** Roughly whether an attack could reach an enemy from here (the engine checks for real once it is chosen). */
export function attackCouldReach(ability: CardAbility, hex: string, board: Board, me: PlayerId): boolean {
  const nearest = distanceToNearestEnemy(hex, board, me);
  if (!isFinite(nearest)) return false;
  if (!isTargetedAbility(ability)) {
    // Centred on the unit (e.g. Sunburst): an enemy next to it
    return getSurroundingHexes(hex).some((h) => board[h] && board[h].owner !== me);
  }
  const max = Array.isArray(ability.range) ? ability.range[ability.range.length - 1] : ability.tags?.includes('melee') ? 1 : 2;
  // Promoted-ability providers and straight lines may reach further than listed: try them when anything is near
  return nearest <= Math.max(max, isPromotedAbilityProvider(ability) ? 2 : max) + 1;
}

export type CpuAction =
  | { kind: 'ability'; ability: CardAbility }
  | { kind: 'move'; to: string }
  | { kind: 'end' };

/**
 * One action for the unit taking the turn: an attack most of the time when one could land, otherwise a step toward
 * the nearest enemy, another ability, or the end of its turn.
 */
export function chooseCpuAction(
  unit: BattlefieldUnit,
  hex: string,
  board: Board,
  usable: CardAbility[],
  canMove: boolean,
  random: () => number
): CpuAction {
  const me = unit.owner;
  const attacks = usable.filter((a) => isAttackAbility(a) && attackCouldReach(a, hex, board, me));
  const others = usable.filter((a) => !isAttackAbility(a) && !isTargetedAbility(a));
  const nearest = distanceToNearestEnemy(hex, board, me);
  const steps = canMove ? getSurroundingHexes(hex).filter((h) => !board[h]) : [];
  const closer = steps.filter((h) => distanceToNearestEnemy(h, board, me) < nearest);

  if (attacks.length > 0 && random() < CPU_ATTACK_CHANCE) return { kind: 'ability', ability: attacks[Math.floor(random() * attacks.length)] };
  if (closer.length > 0 && nearest > 1 && random() < CPU_APPROACH_CHANCE) return { kind: 'move', to: closer[Math.floor(random() * closer.length)] };
  const options: CpuAction[] = [
    ...attacks.map((a) => ({ kind: 'ability' as const, ability: a })),
    ...others.map((a) => ({ kind: 'ability' as const, ability: a })),
    ...(nearest > 1 ? closer : steps).map((to) => ({ kind: 'move' as const, to }))
  ];
  if (options.length === 0) return { kind: 'end' };
  return options[Math.floor(random() * options.length)];
}

/**
 * Which of the legal target tiles to click: for a heal, a damaged friendly unit; for an attack on a unit, an enemy; for
 * a tile, the one with the most enemies on and around it (fewest friendly units). Null when nothing is worth it.
 */
export function chooseCpuTarget(
  ability: CardAbility,
  legal: string[],
  board: Board,
  me: PlayerId,
  random: () => number
): string | null {
  if (legal.length === 0) return null;
  const effects = (ability.effects || []) as any[];
  const heals = effects.some((e) => e.type === 'heal' && e.target === 'friendlyTarget');
  const friendlyOnly = ability.target === 'friendlyUnit';
  if (heals || friendlyOnly) {
    const allies = legal.filter((h) => board[h] && board[h].owner === me);
    const hurt = allies.filter((h) => board[h].damageCounters > 0);
    const pool = heals ? hurt : allies;
    return pool.length ? pool[Math.floor(random() * pool.length)] : null;
  }
  const scored = legal.map((h) => {
    const around = [h, ...getSurroundingHexes(h)];
    const enemies = around.filter((t) => board[t] && board[t].owner !== me).length;
    const allies = around.filter((t) => board[t] && board[t].owner === me).length;
    const onEnemy = board[h] && board[h].owner !== me ? 3 : 0;
    const onAlly = board[h] && board[h].owner === me ? -5 : 0;
    return { h, score: onEnemy + onAlly + enemies - allies * 0.5 + random() * 0.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  // An attack with nothing hostile at the best spot isn't worth it, except one that only needs an empty tile (e.g. a move)
  const best = scored[0];
  const needsEnemy = isAttackAbility(ability) && ability.target !== 'emptyTile';
  if (needsEnemy && best.score < 1) return null;
  return best.h;
}

/** Which unit takes the computer's turn: one with AP, more likely the closer it is to an enemy. */
export function chooseCpuUnit(candidates: string[], board: Board, me: PlayerId, random: () => number): string | null {
  if (candidates.length === 0) return null;
  const weights = candidates.map((h) => 1 / (1 + Math.max(0, distanceToNearestEnemy(h, board, me) - 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
