import { CardAbility, CardPassive } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { getUnitPassives } from './unitPassives';

const isKnockbackImmunityEffect = (e: any) => e?.type === 'immune' && e?.to === 'knockback';

/**
 * A passive whose knockback immunity is a choice made when the unit would be knocked back
 * (e.g. Hold the Gate), rather than an always-on immunity.
 */
function isOptionalKnockbackImmunity(passive: CardPassive): boolean {
  const trigger = (passive.trigger || '').toLowerCase();
  return Boolean(passive.optional) || trigger.includes('wouldbeknockedback');
}

/**
 * Checks whether a unit is currently immune to knockback, reading the passive effects
 * ({ type: 'immune', to: 'knockback', if?: 'self.hasArmour' }) instead of the card text.
 */
export function isImmuneToKnockback(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  if (unit.knockbackImmuneThisTurn) return true;
  return getUnitPassives(unit).some((p) => {
    if (p.id === 'knockback_immunity') return true;
    const effects = p.effects || [];
    // Text fallback only for passives with no effects spec
    if (effects.length === 0) return (p.text || '').toLowerCase().includes('immune to knockback');
    if (isOptionalKnockbackImmunity(p)) return false;
    return effects.some((e: any) => {
      if (!isKnockbackImmunityEffect(e)) return false;
      if (!e.if) return true;
      if (e.if === 'self.hasArmour') return unit.armour > 0;
      return false;
    });
  });
}

/**
 * Returns the passive that lets this unit choose knockback immunity right now, if any
 * (e.g. Hold the Gate: only during the opponent's turn).
 */
export function getOptionalKnockbackImmunityPassive(
  unit: BattlefieldUnit | null | undefined,
  activePlayer: PlayerId
): CardPassive | null {
  if (!unit || isImmuneToKnockback(unit)) return null;
  return (
    getUnitPassives(unit).find((p) => {
      if (!isOptionalKnockbackImmunity(p)) return false;
      if (!(p.effects || []).some(isKnockbackImmunityEffect)) return false;
      const trigger = (p.trigger || '').toLowerCase();
      if (trigger.includes('onopponentturn') && unit.owner === activePlayer) return false;
      return true;
    }) || null
  );
}

/**
 * Applies the effects of choosing an optional knockback immunity passive:
 * immunity for the rest of this turn, plus any cannotInflictKnockback drawback.
 */
export function applyOptionalKnockbackImmunity(unit: BattlefieldUnit, passive: CardPassive): BattlefieldUnit {
  const hasDrawback = (passive.effects || []).some((e: any) => e.type === 'cannotInflictKnockback');
  return {
    ...unit,
    knockbackImmuneThisTurn: true,
    ...(hasDrawback ? { cannotInflictKnockbackNextOwnTurn: true } : {})
  };
}

/**
 * Optional knockback granted by the provider of a free promoted attack
 * (e.g. Deny Entry / Repulsion Spell: "You may have that attack apply knockback 1"; Dirty Blow: "If it's an attack...").
 * Returns the tiles, or 0 when the attack has no such option.
 */
export function getProviderOptionalKnockback(
  executable: CardAbility | null | undefined,
  unit: BattlefieldUnit | null | undefined
): number {
  if (!executable?.parentAbilityId || !unit) return 0;
  const parent = [...(unit.card.abilities || []), ...(unit.grantedAbilities || [])].find(
    (a) => a.id === executable.parentAbilityId
  );
  const eff: any = parent?.effects?.find((e: any) => e.type === 'useAbility');
  const tiles = eff?.optionalKnockback ?? eff?.ifAttackOptionalKnockback;
  return typeof tiles === 'number' ? tiles : 0;
}

/**
 * Extra knockback tiles the attacker's passives add to its attacks' knockback (e.g. Sendoff: "Whenever this unit's
 * attack would apply knockback, you may have it apply 1 additional tile of knockback").
 * Read from { type: 'modifyKnockback', target: 'ownAttacks', addDistance: N, optional?: true }.
 */
export function getAttackerExtraKnockback(unit: BattlefieldUnit | null | undefined): {
  optional: number;
  automatic: number;
  sources: string[];
} {
  const result = { optional: 0, automatic: 0, sources: [] as string[] };
  if (!unit) return result;
  getUnitPassives(unit).forEach((p) => {
    (p.effects || []).forEach((e: any) => {
      if (e.type !== 'modifyKnockback' || e.target !== 'ownAttacks' || typeof e.addDistance !== 'number') return;
      if (e.optional) result.optional += e.addDistance;
      else result.automatic += e.addDistance;
      result.sources.push(p.name);
    });
  });
  return result;
}

/**
 * An ability's own knockback effect that the attacker may choose to apply, or that only applies under a condition
 * (e.g. Disembowel: { type: 'knockback', distance: 1, optional: true, if: 'selfOnTileBehindTarget' }).
 */
export function getAbilityOptionalKnockbackEffect(
  ability: CardAbility | null | undefined
): { distance: number; optional: boolean; if?: string } | null {
  const eff: any = ability?.effects?.find((e: any) => e.type === 'knockback' && (e.optional || e.if));
  if (!eff || typeof eff.distance !== 'number') return null;
  return { distance: eff.distance, optional: Boolean(eff.optional), if: eff.if };
}

/**
 * Number of knockback tiles an ability applies (from "Knockback N" text or its knockback effect).
 */
export function getAbilityKnockbackTiles(ability: CardAbility | null | undefined): number {
  if (!ability) return 0;
  // An optional or conditional knockback ("If ... you may have it apply knockback 1") is never automatic
  if (getAbilityOptionalKnockbackEffect(ability)) return 0;
  // A push in a direction the player chooses (e.g. Overpowering Gust, Burst from Underneath) is resolved by its ability
  if (ability.effects?.some((e: any) => e.type === 'knockback' && e.direction === 'chosen')) return 0;
  const kbMatch = ability.text?.match(/knockback\s+(\d+)/i);
  if (kbMatch) return parseInt(kbMatch[1], 10);
  const kbAny = ability.effects?.find(
    (e: any) => e.type === 'knockback' || e.optionalKnockback || e.ifAttackOptionalKnockback
  ) as Record<string, any> | undefined;
  if (kbAny) {
    if (typeof kbAny.distance === 'number') return kbAny.distance;
    if (typeof kbAny.optionalKnockback === 'number') return kbAny.optionalKnockback;
    if (typeof kbAny.amount === 'number') return kbAny.amount;
  }
  return 0;
}
