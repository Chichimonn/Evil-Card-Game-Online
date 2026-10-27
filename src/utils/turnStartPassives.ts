import { BattlefieldUnit, PlayerId } from '../types/game';
import { getUnitPassives } from './unitPassives';

export interface TurnStartPassivesResult {
  updatedUnits: Record<string, BattlefieldUnit>;
  logMessages: string[];
}

/**
 * Evaluates and applies all turn-start passives for units currently on the battlefield.
 *
 * Rules:
 * 1. "turnStart" / "At the start of each player's turn" / "At the start of each turn":
 *    Triggers at the start of every turn (both Player 1 and Player 2 turns).
 *    Example: Topaz Mage (armour up to 2), Euclase Mage (armour up to 1),
 *    Garnet Mage (armour up to 1), Opal Mage (armour up to 2), Amethyst Mage (armour up to 1),
 *    Frostbinder (armour up to 2), Carapace Crusher (armour up to 4), Animus Twin (armour up to 2),
 *    Starburst Wizard (armour up to 2), Blade Singer (armour up to 4),
 *    Gemstone Paladin (armour up to 3), Cannon Squadron (armour up to 1).
 *
 * 2. "ownTurnStart" / "At the start of your turn":
 *    Triggers only at the start of the controlling player's turn (unit.owner === currentTurnPlayer).
 *    Example: Marsh Hydra (heals 1 damage if damaged).
 *
 * They resolve once per turn: pass that turn's `turnKey` and a unit already marked with it is skipped, so calling
 * this again later in the same turn (e.g. when the unit is chosen to take it) changes nothing.
 */
export function applyTurnStartPassives(
  units: Record<string, BattlefieldUnit>,
  turnPlayer: PlayerId,
  turnKey?: number
): TurnStartPassivesResult {
  const nextUnits = { ...units };
  const logMessages: string[] = [];

  Object.entries(nextUnits).forEach(([hexId, unit]) => {
    // Obstacles/wall tokens have no passives
    if (unit.card.isWall) return;
    // Already resolved this turn
    if (turnKey !== undefined && unit.turnStartKey === turnKey) return;
    if (turnKey !== undefined) nextUnits[hexId] = { ...unit, turnStartKey: turnKey };

    // Collect active passives for the unit (cards under do not grant passives, except Faceless King chosenPassive)
    const passives = getUnitPassives(unit);

    if (passives.length === 0) return;

    let currentArmour = unit.armour || 0;
    let currentDamage = unit.damageCounters || 0;
    let unitChanged = false;

    // Use a Set to avoid duplicate passive names triggering on the same unit
    const processedPassives = new Set<string>();

    passives.forEach((passive) => {
      const passiveKey = passive.id || passive.name;
      if (processedPassives.has(passiveKey)) return;
      processedPassives.add(passiveKey);

      const trigger = (passive.trigger || '').toLowerCase();
      const text = (passive.text || '').toLowerCase();
      const effects = passive.effects || [];

      // Check if this passive triggers on turn start (either each turn or own turn)
      const isTurnStartPassive =
        trigger === 'turnstart' ||
        trigger === 'ownturnstart' ||
        effects.some((e: any) => {
          const trig = (e.trigger || '').toLowerCase();
          return trig === 'turnstart' || trig === 'ownturnstart';
        }) ||
        text.includes('at the start of each turn') ||
        text.includes("at the start of each player's turn") ||
        text.includes('start of each turn') ||
        text.includes("start of each player's turn") ||
        text.includes('at the start of your turn') ||
        text.includes('start of your turn');

      if (!isTurnStartPassive) {
        return;
      }

      // "At the start of your turn" (ownTurnStart) only happens on the controlling player's turn
      const isOwnTurnOnly =
        trigger === 'ownturnstart' || (text.includes('start of your turn') && !text.includes('each'));
      if (isOwnTurnOnly && unit.owner !== turnPlayer) return;
      const effectApplies = (eTrig: string) => eTrig !== 'ownturnstart' || unit.owner === turnPlayer;

      // User instruction: Allow turnstart passives to take effect when EACH turn starts
      // (their player's and the opponent's) if they do not already.

      // 1. ARMOUR EFFECT: "armour up to X" / "gain X armour"
      // Armour is set to Math.max(currentArmour, X). If already at or above X, it does not decrease.
      let upTo: number | undefined;
      const armourEffect = effects.find((e: any) => {
        if (e.type !== 'armour') return false;
        const eTrig = (e.trigger || '').toLowerCase();
        if (!effectApplies(eTrig)) return false;
        if (eTrig === 'turnstart' || eTrig === 'ownturnstart') return true;
        if (!e.trigger && (trigger === 'turnstart' || trigger === 'ownturnstart' || trigger === 'multiple' || isTurnStartPassive)) {
          return true;
        }
        return false;
      });

      if (armourEffect && typeof armourEffect.upTo === 'number') {
        upTo = armourEffect.upTo;
      } else if (armourEffect && typeof armourEffect.amount === 'number') {
        upTo = armourEffect.amount;
      } else {
        const match = text.match(/armours?\s+up\s+to\s+(\d+)/i) || text.match(/gain[s]?\s+(\d+)\s+armour/i);
        if (match) {
          upTo = parseInt(match[1], 10);
        }
      }

      if (upTo !== undefined && upTo > 0) {
        if (currentArmour < upTo) {
          currentArmour = upTo;
          unitChanged = true;
          logMessages.push(
            `${unit.card.name}'s ${passive.name}: Armoured up to ${upTo} (${unit.owner === 'player1' ? 'P1' : 'P2'} on ${hexId})`
          );
        }
      }

      // 2. HEAL EFFECT: "heals X damage" / "if this unit is damaged, it heals X damage"
      let healAmount: number | undefined;
      const healEffect = effects.find((e: any) => {
        if (e.type !== 'heal') return false;
        const eTrig = (e.trigger || '').toLowerCase();
        if (!effectApplies(eTrig)) return false;
        if (eTrig === 'turnstart' || eTrig === 'ownturnstart') return true;
        if (!e.trigger && (trigger === 'turnstart' || trigger === 'ownturnstart' || trigger === 'multiple' || isTurnStartPassive)) {
          return true;
        }
        return false;
      });

      if (healEffect && typeof healEffect.amount === 'number') {
        healAmount = healEffect.amount;
      } else {
        const match = text.match(/heals?\s+(\d+)\s+damage/i);
        if (match) {
          healAmount = parseInt(match[1], 10);
        }
      }

      if (healAmount !== undefined && healAmount > 0) {
        // If damaged
        if (currentDamage > 0) {
          const healed = Math.min(currentDamage, healAmount);
          currentDamage = Math.max(0, currentDamage - healAmount);
          unitChanged = true;
          logMessages.push(
            `${unit.card.name}'s ${passive.name}: Healed ${healed} damage (${currentDamage}/${unit.card.hp} counters remaining on ${hexId})`
          );
        }
      }
    });

    if (unitChanged) {
      nextUnits[hexId] = {
        ...nextUnits[hexId],
        armour: currentArmour,
        damageCounters: currentDamage
      };
    }
  });

  return { updatedUnits: nextUnits, logMessages };
}
