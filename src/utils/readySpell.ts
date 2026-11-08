import { CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { getCostOptions } from './promotedAbilities';

/**
 * An ability that readies one of this unit's own abilities to interrupt with (e.g. Ready Spell: "This unit may use a
 * 2AP ability for free as a react effect when an enemy unit uses an ability until the end of your opponent's next
 * turn"). Read from { type: 'setReact', trigger, once?, effects: [{ type: 'useAbility', source: 'self', filter: { cost } }] }:
 * trigger 'enemyUnitUsesAbility' interrupts abilities only, 'enemyUnitTakesAction' any action (abilities, moves, draws);
 * once: it is used up after one interrupt. Returns the AP cost the readied ability must have.
 */
export function getReactAbilitySpec(
  ability: CardAbility | null | undefined
): { cost: number; once: boolean; onAnyAction: boolean } | null {
  for (const e of (ability?.effects || []) as any[]) {
    if (e.type !== 'setReact' || (e.trigger !== 'enemyUnitUsesAbility' && e.trigger !== 'enemyUnitTakesAction')) continue;
    const use = (e.effects || []).find((x: any) => x.type === 'useAbility' && x.source === 'self');
    if (use && typeof use.filter?.cost === 'number') {
      return { cost: use.filter.cost, once: Boolean(e.once), onAnyAction: e.trigger === 'enemyUnitTakesAction' };
    }
  }
  return null;
}

const ownAbilities = (unit: BattlefieldUnit): CardAbility[] => [
  ...(unit.card.abilities || []),
  ...(unit.grantedAbilities || [])
];

/** The unit's own abilities that can be readied: they can be used at that AP cost, and don't ready others. */
export function getReactAbilityChoices(unit: BattlefieldUnit, reactAbility: CardAbility, cost: number): CardAbility[] {
  return ownAbilities(unit).filter(
    (a) => a.id !== reactAbility.id && !getReactAbilitySpec(a) && getCostOptions(a).includes(cost)
  );
}

/** The readied ability of a unit whose ready react is active during `actingPlayer`'s turn, if any. */
export function getReadiedAbility(unit: BattlefieldUnit | null | undefined, actingPlayer: PlayerId): CardAbility | null {
  const r = unit?.readySpell;
  if (!unit || !r || unit.owner === actingPlayer || r.expiresOnTurnEndFor !== actingPlayer) return null;
  return ownAbilities(unit).find((a) => a.id === r.abilityId) || null;
}

/**
 * The free use of a readied ability as a react: the ability itself (same id and name, so every rule for it applies
 * as on the unit's own turn), costing nothing and resolving as though its AP cost were spent. readiedReact lets it
 * skip "this turn" usage limits and requirements, since it isn't this unit's turn (see canUseAbilityThisTurn).
 */
export function buildReadiedUse(ability: CardAbility, cost: number): CardAbility {
  return {
    ...ability,
    cost: 0,
    selectedCost: undefined,
    apSpentAs: cost,
    readiedReact: true
  };
}
