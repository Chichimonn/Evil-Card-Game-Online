import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { getHexDistance, getSurroundingHexes, isTileScorched, isAttackFromBehind, getTileBehindUnit } from './hexGridMath';
import { getUnitPassives, hasFeedingFrenzy } from './unitPassives';
import { getQualifyingPromotedAbilities } from './promotedAbilities';
import { getAttacksUsedThisTurn } from './turnLimits';

export interface AttackHit {
  hitIndex: number;
  damage: number;
  bypassArmourUpTo?: number;
  bypassArmour?: boolean;
  blockWithoutDepleting?: boolean;
  conditionalNote?: string;
  appliedBonuses?: string[];
}

export interface AbilityHitStructure {
  isBladefury: boolean;
  isMultiHit: boolean;
  hits: AttackHit[];
  summaryText: string;
  badgeText: string;
}

export interface HitExecutionRecord {
  hitIndex: number;
  damage: number;
  armourAbsorbed: number;
  hpDamage: number;
  targetDefeated: boolean;
  notes?: string;
}

export interface AttackExecutionOptions {
  attacker?: BattlefieldUnit | null;
  target?: BattlefieldUnit | null;
  ability?: CardAbility | null;
  attackerHex?: string | null;
  targetHex?: string | null;
  unitsOnBoard?: Record<string, BattlefieldUnit>;
  scorchedTiles?: Record<string, any> | null;
}

/**
 * Applies static attacker passives and promoted attack bonuses to attack hits.
 */
export function applyAttackerBonusPassives(
  hits: AttackHit[],
  ability: CardAbility | null | undefined,
  attacker?: BattlefieldUnit | null,
  target?: BattlefieldUnit | null,
  options?: AttackExecutionOptions
): void {
  if (!attacker) return;
  const attackerPassives = getUnitPassives(attacker);
  const isMelee =
    ability?.tags?.includes('melee') ||
    ability?.text?.toLowerCase().includes('melee') ||
    false;

  // Behind condition
  const attackerHex = options?.attackerHex || attacker.hexId;
  const targetHex = options?.targetHex || target?.hexId;
  const targetOwner = target?.owner || (attacker.owner === 'player1' ? 'player2' : 'player1');
  const isBehind = isAttackFromBehind(attackerHex, targetHex, targetOwner, ability);

  // Promoted ability providers
  const parentId =
    ability?.parentAbilityId ||
    (ability?.id?.includes('__') ? ability.id.split('__')[0] : '');

  // A mark on the target (e.g. Target Acquired): this attack deals more per hit; withAttackStatuses consumes the mark
  const mark = target?.damageMark;
  if (mark && mark.bonusPerHit > 0) {
    hits.forEach((h) => {
      if (h.appliedBonuses?.includes('damage_mark')) return;
      h.damage += mark.bonusPerHit;
      h.appliedBonuses = [...(h.appliedBonuses || []), 'damage_mark'];
      h.conditionalNote = h.conditionalNote
        ? `${h.conditionalNote}, +${mark.bonusPerHit} ${mark.sourceName}`
        : `+${mark.bonusPerHit} ${mark.sourceName}`;
    });
  }

  // 1. Knightly Armament: +1 on first hit
  if (parentId === 'knightly_armament' && hits[0] && !hits[0].appliedBonuses?.includes('knightly_armament')) {
    hits[0].damage += 1;
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'knightly_armament'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, +1 Knightly Armament`
      : '+1 Knightly Armament';
  }

  // 2. Invoke Sorcery: +2 on first hit
  if (parentId === 'invoke_sorcery' && hits[0] && !hits[0].appliedBonuses?.includes('invoke_sorcery')) {
    hits[0].damage += 2;
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'invoke_sorcery'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, +2 Invoke Sorcery`
      : '+2 Invoke Sorcery';
  }

  // 3. Too Easy: +2 on first hit
  if (parentId === 'too_easy' && hits[0] && !hits[0].appliedBonuses?.includes('too_easy')) {
    hits[0].damage += 2;
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'too_easy'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, +2 Too Easy`
      : '+2 Too Easy';
  }

  // 4. Dreadknight Smash: +1 on first hit
  if (parentId === 'dreadknight_smash' && hits[0] && !hits[0].appliedBonuses?.includes('dreadknight_smash')) {
    hits[0].damage += 1;
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'dreadknight_smash'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, +1 Dreadknight Smash`
      : '+1 Dreadknight Smash';
  }

  // 5. Elevated Technique: +1 per hit if melee
  if (parentId === 'elevated_technique' && isMelee) {
    for (const h of hits) {
      if (!h.appliedBonuses?.includes('elevated_technique')) {
        h.damage += 1;
        h.appliedBonuses = [...(h.appliedBonuses || []), 'elevated_technique'];
        h.conditionalNote = h.conditionalNote
          ? `${h.conditionalNote}, +1 Elevated Technique`
          : '+1 Elevated Technique';
      }
    }
  }

  // 6. Shield of Blessings (Order's Chosen): "When this unit has armour on it, its attacks deal an additional 2 damage."
  if (attacker.armour > 0 && hits[0] && !hits[0].appliedBonuses?.includes('shield_of_blessings')) {
    const hasShieldOfBlessings = attackerPassives.some(
      (p) => p.id === 'shield_of_blessings' || p.name === 'Shield of Blessings'
    );
    if (hasShieldOfBlessings) {
      hits[0].damage += 2;
      hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'shield_of_blessings'];
      hits[0].conditionalNote = hits[0].conditionalNote
        ? `${hits[0].conditionalNote}, +2 Shield of Blessings`
        : '+2 Shield of Blessings';
    }
  }

  // 7. Drakescale (Drakerider Paladin): "While this unit has armour, it is immune to knockback and its melee attacks deal an additional 2 damage per hit."
  if (attacker.armour > 0 && isMelee) {
    const hasDrakescale = attackerPassives.some(
      (p) => p.id === 'drakescale' || p.name === 'Drakescale'
    );
    if (hasDrakescale) {
      for (const h of hits) {
        if (!h.appliedBonuses?.includes('drakescale')) {
          h.damage += 2;
          h.appliedBonuses = [...(h.appliedBonuses || []), 'drakescale'];
          h.conditionalNote = h.conditionalNote
            ? `${h.conditionalNote}, +2 Drakescale`
            : '+2 Drakescale';
        }
      }
    }
  }

  // 8. Enrage (Savage Grizzly): "If this unit is damaged, it deals an additional 1 damage per hit with attacks."
  if (attacker.damageCounters > 0) {
    const hasEnrage = attackerPassives.some(
      (p) => p.id === 'enrage' || p.name === 'Enrage'
    );
    if (hasEnrage) {
      for (const h of hits) {
        if (!h.appliedBonuses?.includes('enrage')) {
          h.damage += 1;
          h.appliedBonuses = [...(h.appliedBonuses || []), 'enrage'];
          h.conditionalNote = h.conditionalNote
            ? `${h.conditionalNote}, +1 Enrage`
            : '+1 Enrage';
        }
      }
    }
  }

  // 8b. Adrenaline (Brawl Fighter): "If this unit has already taken damage this turn, its attacks deal an additional 2 damage per hit."
  if (attacker.tookDamageThisTurn) {
    const hasAdrenaline = attackerPassives.some(
      (p) => p.id === 'adrenaline' || p.name === 'Adrenaline'
    );
    if (hasAdrenaline) {
      for (const h of hits) {
        if (!h.appliedBonuses?.includes('adrenaline')) {
          h.damage += 2;
          h.appliedBonuses = [...(h.appliedBonuses || []), 'adrenaline'];
          h.conditionalNote = h.conditionalNote
            ? `${h.conditionalNote}, +2 Adrenaline`
            : '+2 Adrenaline';
        }
      }
    }
  }

  // 9. Glimmering Arrows (Dawnglow Archer): "This unit's attacks against armour deal an additional 2 damage per hit."
  if (target && target.armour > 0) {
    const hasGlimmering = attackerPassives.some(
      (p) => p.id === 'glimmering_arrows' || p.name === 'Glimmering Arrows'
    );
    if (hasGlimmering) {
      for (const h of hits) {
        if (!h.appliedBonuses?.includes('glimmering_arrows')) {
          h.damage += 2;
          h.appliedBonuses = [...(h.appliedBonuses || []), 'glimmering_arrows'];
          h.conditionalNote = h.conditionalNote
            ? `${h.conditionalNote}, +2 Glimmering Arrows (vs armour)`
            : '+2 Glimmering Arrows (vs armour)';
        }
      }
    }
  }

  // 10. Backstab (Shade Assassin): "This unit deals an additional 4 damage on the first hit of any attack made from the tile behind the target."
  if (isBehind && hits[0] && !hits[0].appliedBonuses?.includes('backstab')) {
    const hasBackstab = attackerPassives.some(
      (p) => p.id === 'backstab' || p.name === 'Backstab'
    );
    if (hasBackstab) {
      hits[0].damage += 4;
      hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'backstab'];
      hits[0].conditionalNote = hits[0].conditionalNote
        ? `${hits[0].conditionalNote}, +4 Backstab (from behind)`
        : '+4 Backstab (from behind)';
    }
  }

  // 11. Opportunist (Cutthroat Assassin): "This unit's melee attacks made from the tile behind the target deal an additional 1 damage per hit."
  if (isBehind && isMelee) {
    const hasOpportunist = attackerPassives.some(
      (p) => p.id === 'opportunist' || p.name === 'Opportunist'
    );
    if (hasOpportunist) {
      for (const h of hits) {
        if (!h.appliedBonuses?.includes('opportunist')) {
          h.damage += 1;
          h.appliedBonuses = [...(h.appliedBonuses || []), 'opportunist'];
          h.conditionalNote = h.conditionalNote
            ? `${h.conditionalNote}, +1 Opportunist (from behind)`
            : '+1 Opportunist (from behind)';
        }
      }
    }
  }

  // 12. Umbral Strike (Wielder of Night): "If this attack was made from the tile behind the target, it deals an additional 3 damage on the first hit."
  if (parentId === 'umbral_strike' && isBehind && hits[0] && !hits[0].appliedBonuses?.includes('umbral_strike')) {
    hits[0].damage += 3;
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'umbral_strike'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, +3 Umbral Strike (from behind)`
      : '+3 Umbral Strike (from behind)';
  }

  // 13. Inscribed Edge (Harsh Inquisitor): "The first time this unit makes an attack from the tile behind its target each turn, it deals an amount of additional damage equal to half the target's current armour on the first hit (rounded down)."
  if (isBehind && target && target.armour > 1 && hits[0] && !hits[0].appliedBonuses?.includes('inscribed_edge')) {
    const hasInscribedEdge = attackerPassives.some(
      (p) => p.id === 'inscribed_edge' || p.name === 'Inscribed Edge'
    );
    const alreadyUsed = (attacker.usedTurnCounts?.['inscribed_edge'] || 0) > 0;
    if (hasInscribedEdge && !alreadyUsed) {
      const bonus = Math.floor(target.armour / 2);
      if (bonus > 0) {
        hits[0].damage += bonus;
        hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'inscribed_edge'];
        hits[0].conditionalNote = hits[0].conditionalNote
          ? `${hits[0].conditionalNote}, +${bonus} Inscribed Edge (from behind)`
          : `+${bonus} Inscribed Edge (from behind)`;
      }
    }
  }

  // 14. Death Mark (Blight Phantom): "This turn, this unit's attacks against that unit deal an additional 5 damage on the first hit. This effect does not stack."
  if (target && (target.deathMark || target.statuses?.includes('death_mark'))) {
    const isTargetOfAttacker =
      !target.deathMark?.casterInstanceId ||
      target.deathMark.casterInstanceId === attacker.instanceId;
    if (isTargetOfAttacker && hits[0] && !hits[0].appliedBonuses?.includes('death_mark')) {
      const bonus = target.deathMark?.bonusDamage ?? 5;
      hits[0].damage += bonus;
      hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'death_mark'];
      hits[0].conditionalNote = hits[0].conditionalNote
        ? `${hits[0].conditionalNote}, +${bonus} Death Mark`
        : `+${bonus} Death Mark`;
    }
  }

  // 15a. Even-numbered attack bonus (e.g. Twinsoul: "Every second attack this unit uses each turn deals an additional
  // 2 damage per hit"): this attack is number (attacks already made this turn + 1); applies on 2nd, 4th, ...
  attackerPassives.forEach((p) => {
    const eff: any = p.effects?.find((e: any) => e.type === 'damageBonus' && e.if === 'attackNumberThisTurnIsEven');
    if (!eff || typeof eff.amount !== 'number') return;
    const attackNumber = getAttacksUsedThisTurn(attacker) + 1;
    if (attackNumber % 2 !== 0) return;
    const key = `even_attack_${p.id || p.name}`;
    const scoped = eff.scope === 'firstHit' ? hits.slice(0, 1) : hits;
    scoped.forEach((h) => {
      if (h.appliedBonuses?.includes(key)) return;
      h.damage += eff.amount;
      h.appliedBonuses = [...(h.appliedBonuses || []), key];
      h.conditionalNote = h.conditionalNote
        ? `${h.conditionalNote}, +${eff.amount} ${p.name} (attack ${attackNumber})`
        : `+${eff.amount} ${p.name} (attack ${attackNumber})`;
    });
  });

  // 15c. Conditional damage bonuses read from data that no named check above covers:
  //   { type: 'damageBonus', appliesTo: 'ownAttacks' | 'ownMeleeAttacks' | 'ownRangedAttacks', amount, scope,
  //     if: 'self.hasNotMovedThisTurn' }  (e.g. Settle Roots)
  attackerPassives.forEach((p) => {
    const eff: any = p.effects?.find((e: any) => e.type === 'damageBonus' && e.if === 'self.hasNotMovedThisTurn');
    if (!eff || typeof eff.amount !== 'number' || attacker.movedThisTurn) return;
    const distance =
      options?.attackerHex && options?.targetHex ? getHexDistance(options.attackerHex, options.targetHex) : 1;
    const isRangedAttack = Boolean(ability?.tags?.includes('ranged')) || distance > 1 || (ability?.range?.[1] ?? 1) > 1;
    if (eff.appliesTo === 'ownRangedAttacks' && !isRangedAttack) return;
    if (eff.appliesTo === 'ownMeleeAttacks' && !isMelee) return;
    const key = `bonus_${p.id || p.name}`;
    const scoped = eff.scope === 'firstHit' ? hits.slice(0, 1) : hits;
    scoped.forEach((h) => {
      if (h.appliedBonuses?.includes(key)) return;
      h.damage += eff.amount;
      h.appliedBonuses = [...(h.appliedBonuses || []), key];
      h.conditionalNote = h.conditionalNote ? `${h.conditionalNote}, +${eff.amount} ${p.name}` : `+${eff.amount} ${p.name}`;
    });
  });

  // 15b. A buff waiting for this unit's next attack (e.g. Perfect Form: +2 damage per hit after an armour ability)
  const nextBonus = attacker.nextAttackBonus;
  if (nextBonus && nextBonus.amount > 0) {
    const scoped = nextBonus.scope === 'firstHit' ? hits.slice(0, 1) : hits;
    scoped.forEach((h) => {
      if (h.appliedBonuses?.includes('next_attack_bonus')) return;
      h.damage += nextBonus.amount;
      h.appliedBonuses = [...(h.appliedBonuses || []), 'next_attack_bonus'];
      h.conditionalNote = h.conditionalNote
        ? `${h.conditionalNote}, +${nextBonus.amount} ${nextBonus.source}`
        : `+${nextBonus.amount} ${nextBonus.source}`;
    });
  }

  // 15. First-hit reduction on the attacker (e.g. Predictive Strike: "the target deals 3 damage less on the first hit if it attacks")
  const reduction = attacker.firstHitReduction || 0;
  if (reduction > 0 && hits[0] && !hits[0].appliedBonuses?.includes('first_hit_reduction')) {
    hits[0].damage = Math.max(0, hits[0].damage - reduction);
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'first_hit_reduction'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, -${reduction} (foreseen)`
      : `-${reduction} (foreseen)`;
  }
}

/**
 * Calculates the amount of damage an ability inflicts on the unit using it.
 */
export function getAbilitySelfDamage(ability?: CardAbility | null): number {
  if (!ability) return 0;
  let selfDmg = 0;
  if (ability.effects && Array.isArray(ability.effects)) {
    for (const eff of ability.effects) {
      if (eff.type === 'damage' && (eff.target === 'self' || eff.target === 'caster')) {
        const amt = typeof eff.amount === 'number' ? eff.amount : 0;
        const hits = typeof eff.hits === 'number' ? eff.hits : 1;
        selfDmg += amt * hits;
      }
    }
  }
  if (selfDmg > 0) return selfDmg;

  const text = ability.text || '';
  const match1 = text.match(/(?:then,?\s*)?(?:this unit|you)\s+takes?\s+(\d+)\s+damage/i);
  if (match1) return parseInt(match1[1], 10);

  const match2 = text.match(/deal[s]?\s+(\d+)\s+damage\s+to\s+this\s+unit/i);
  if (match2) return parseInt(match2[1], 10);

  return 0;
}

/**
 * Finds the lowest damage number (per hit) among attacks of the promoted card(s).
 * If no promoted cards or no attacks exist, returns a standard fallback (5).
 */
export function getLowestPerHitDamageFromPromotedCards(
  promotedCards?: CardItem[] | null,
  fallback = 5
): { lowestDmg: number; sourceCardName?: string; sourceAbilityName?: string } {
  if (!promotedCards || promotedCards.length === 0) {
    return { lowestDmg: fallback };
  }

  let minDamage = Infinity;
  let sourceCardName: string | undefined;
  let sourceAbilityName: string | undefined;

  for (const card of promotedCards) {
    if (!card.abilities) continue;
    for (const ab of card.abilities) {
      // Check if this ability is an attack
      const isAttack =
        ab.tags?.includes('melee') ||
        ab.tags?.includes('ranged') ||
        ab.tags?.includes('attack') ||
        ab.text.toLowerCase().includes('deal') ||
        ab.text.toLowerCase().includes('damage');

      if (!isAttack) continue;

      // 1. From effect definitions
      for (const eff of (ab.effects || []) as any[]) {
        if (eff.target === 'self' || eff.target === 'caster') continue;
        if (eff.type === 'damage' && typeof eff.amount === 'number' && eff.amount > 0) {
          if (eff.amount < minDamage) {
            minDamage = eff.amount;
            sourceCardName = card.name;
            sourceAbilityName = ab.name;
          }
        }
        if (eff.extraHit && typeof eff.extraHit.amount === 'number' && eff.extraHit.amount > 0) {
          if (eff.extraHit.amount < minDamage) {
            minDamage = eff.extraHit.amount;
            sourceCardName = card.name;
            sourceAbilityName = ab.name;
          }
        }
        if (
          eff.damageToEnemiesMovedThrough &&
          typeof eff.damageToEnemiesMovedThrough === 'number' &&
          eff.damageToEnemiesMovedThrough > 0
        ) {
          if (eff.damageToEnemiesMovedThrough < minDamage) {
            minDamage = eff.damageToEnemiesMovedThrough;
            sourceCardName = card.name;
            sourceAbilityName = ab.name;
          }
        }
      }

      // 2. From ability text: 'deal(s) X damage', 'dealing X damage', 'for X damage'
      const matches = ab.text.matchAll(/(?:deals?|dealing|for)\s+(\d+)\s+damage/gi);
      for (const m of matches) {
        const val = parseInt(m[1], 10);
        if (val > 0 && val < minDamage) {
          minDamage = val;
          sourceCardName = card.name;
          sourceAbilityName = ab.name;
        }
      }

      // 'hits again for X damage'
      const hitsAgainMatches = ab.text.matchAll(/hits\s+again\s+for\s+(\d+)/gi);
      for (const m of hitsAgainMatches) {
        const val = parseInt(m[1], 10);
        if (val > 0 && val < minDamage) {
          minDamage = val;
          sourceCardName = card.name;
          sourceAbilityName = ab.name;
        }
      }

      // 'X damage per hit'
      const perHitMatches = ab.text.matchAll(/(\d+)\s+damage\s+per\s+hit/gi);
      for (const m of perHitMatches) {
        const val = parseInt(m[1], 10);
        if (val > 0 && val < minDamage) {
          minDamage = val;
          sourceCardName = card.name;
          sourceAbilityName = ab.name;
        }
      }
    }
  }

  if (minDamage === Infinity) {
    return { lowestDmg: fallback };
  }

  return { lowestDmg: minDamage, sourceCardName, sourceAbilityName };
}

/**
 * Parses an attack ability to determine its hits and damage structure.
 */
export function getAbilityHitStructure(
  ability: CardAbility | null | undefined,
  attacker?: BattlefieldUnit | null,
  target?: BattlefieldUnit | null,
  options?: AttackExecutionOptions
): AbilityHitStructure {
  if (!ability) {
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: '',
      badgeText: ''
    };
  }

  // Script for Bladefury (Veteran Armsmaster):
  // "Deals damage equal to the lowest damage number (per hit) among attacks of the promoted card.
  // Then, subtract that number from 7, to a minimum of 1. Hits 4 more times dealing that amount of damage."
  // Math formula: lower damage numbers on the promoted card lead to higher overall damage.
  if (ability.id === 'bladefury' || ability.name === 'Bladefury') {
    const actualAttacker = attacker || options?.attacker;
    const { lowestDmg, sourceCardName, sourceAbilityName } = getLowestPerHitDamageFromPromotedCards(
      actualAttacker?.promotedCards,
      5
    );

    const firstHitDmg = lowestDmg;
    const subsequentHitDmg = Math.max(1, 7 - lowestDmg);

    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: firstHitDmg,
        conditionalNote: sourceAbilityName
          ? `lowest promoted hit (${sourceAbilityName}: ${firstHitDmg})`
          : `lowest promoted hit (${firstHitDmg})`
      },
      {
        hitIndex: 2,
        damage: subsequentHitDmg,
        conditionalNote: `7 - ${firstHitDmg} (min 1)`
      },
      {
        hitIndex: 3,
        damage: subsequentHitDmg,
        conditionalNote: `7 - ${firstHitDmg} (min 1)`
      },
      {
        hitIndex: 4,
        damage: subsequentHitDmg,
        conditionalNote: `7 - ${firstHitDmg} (min 1)`
      },
      {
        hitIndex: 5,
        damage: subsequentHitDmg,
        conditionalNote: `7 - ${firstHitDmg} (min 1)`
      }
    ];

    applyAttackerBonusPassives(hits, ability, actualAttacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);

    const summaryText = sourceCardName
      ? `Bladefury: 5 hits (${hits[0].damage} + 4×${hits[1].damage} = ${totalDmg} total dmg). Based on ${sourceCardName}'s lowest hit (${firstHitDmg}), subsequent hits deal 7 - ${firstHitDmg} = ${subsequentHitDmg} each.`
      : `Bladefury: 5 hits (${hits[0].damage} + 4×${hits[1].damage} = ${totalDmg} total dmg). Deals lowest promoted hit, then 4 hits of (7 - dmg, min 1).`;

    return {
      isBladefury: true,
      isMultiHit: true,
      hits,
      summaryText,
      badgeText: `${hits[0].damage}+4×${hits[1].damage} Dmg`
    };
  }

  // Combined attacks (e.g. Gemstone Hammer: "Deals 3 damage. Use a 1AP ranged attack ... For each AP spent, do this
  // again (counts as additional hits)"): one attack whose hits are, per repeat, the lead hit then the chosen attack's hits
  const combined = (ability as any).combinedHits as
    | { leadDamage: number; leadName: string; parts: CardAbility[]; singleHit?: boolean }
    | undefined;
  if (combined && Array.isArray(combined.parts)) {
    const actualAttacker = attacker || options?.attacker;
    // Single hit (e.g. Ultra Blade: "deals damage equal to the total damage those attacks would deal, as a single hit"):
    // each chosen attack is worked out as it would deal (bonuses included), then summed into one hit. Bonuses are not
    // applied again to that hit, since they are already in the attacks' totals.
    if (combined.singleHit) {
      const parts = combined.parts.map((part) => {
        const s = getAbilityHitStructure({ ...part, parentAbilityId: undefined }, actualAttacker, target, options);
        const partHits = s.hits && s.hits.length > 0 ? s.hits : [{ hitIndex: 1, damage: 5 }];
        return { name: part.name, total: partHits.reduce((sum, h) => sum + h.damage, 0) };
      });
      const total = parts.reduce((sum, p) => sum + p.total, 0);
      return {
        isBladefury: false,
        isMultiHit: true,
        hits: [{ hitIndex: 1, damage: total, conditionalNote: parts.map((p) => `${p.name} ${p.total}`).join(' + ') }],
        summaryText: `${ability.name}: one hit of ${total} (${parts.map((p) => `${p.name} ${p.total}`).join(' + ')}).`,
        badgeText: `1 Hit (${total})`
      };
    }
    const hits: AttackHit[] = [];
    combined.parts.forEach((part, rep) => {
      if (combined.leadDamage > 0) {
        hits.push({ hitIndex: hits.length + 1, damage: combined.leadDamage, conditionalNote: `${combined.leadName} ${rep + 1}` });
      }
      const partStruct = getAbilityHitStructure({ ...part, parentAbilityId: undefined }, actualAttacker, target, options);
      const partHits = partStruct.hits && partStruct.hits.length > 0 ? partStruct.hits : [{ hitIndex: 1, damage: 5 }];
      partHits.forEach((h) =>
        hits.push({
          ...h,
          hitIndex: hits.length + 1,
          conditionalNote: h.conditionalNote ? `${h.conditionalNote} (${part.name})` : part.name
        })
      );
    });
    applyAttackerBonusPassives(hits, ability, actualAttacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: `${ability.name}: ${hits.length} hits (${hits.map((h) => h.damage).join(' + ')} = ${totalDmg} total dmg).`,
      badgeText: `${hits.length} Hits`
    };
  }

  // Script for Overload Gemstone (Catalyst Curator):
  // "Use a 1AP attack on the promoted card twice for free as this ability, both against the same target.
  // Use only once per turn. During your next turn, this unit can't use this ability."
  if (
    ability.parentAbilityId === 'overload_gemstone' ||
    ability.id?.startsWith('overload_gemstone__')
  ) {
    const actualAttacker = attacker || options?.attacker;
    const basePromotedId = ability.id?.startsWith('overload_gemstone__')
      ? ability.id.slice('overload_gemstone__'.length)
      : ability.id;

    const baseAbility: CardAbility = {
      ...ability,
      id: basePromotedId,
      parentAbilityId: undefined,
      name: ability.name.replace(/^Overload Gemstone \((.*)\)$/, '$1')
    };

    const baseStruct = getAbilityHitStructure(baseAbility, actualAttacker, target, options);
    const baseHits = baseStruct.hits && baseStruct.hits.length > 0 ? baseStruct.hits : [{ hitIndex: 1, damage: 5 }];

    // Two sequential attacks against the same target
    const hits: AttackHit[] = [
      ...baseHits.map((h, i) => ({
        ...h,
        hitIndex: i + 1,
        conditionalNote: h.conditionalNote ? `${h.conditionalNote} (1st attack)` : '1st attack'
      })),
      ...baseHits.map((h, i) => ({
        ...h,
        hitIndex: baseHits.length + i + 1,
        conditionalNote: h.conditionalNote ? `${h.conditionalNote} (2nd attack)` : '2nd attack'
      }))
    ];

    applyAttackerBonusPassives(hits, ability, actualAttacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    const promoName = baseAbility.name || 'promoted attack';

    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: `Overload Gemstone: Uses ${promoName} twice against target (${hits.map((h) => `${h.damage}`).join(' + ')} = ${totalDmg} total dmg)`,
      badgeText: `${hits.map((h) => h.damage).join('+')} Dmg`
    };
  }

  if (ability.id === 'overload_gemstone' || ability.name === 'Overload Gemstone') {
    const actualAttacker = attacker || options?.attacker;
    const qualifying = actualAttacker?.promotedCards
      ? getQualifyingPromotedAbilities(ability, actualAttacker.promotedCards)
      : [];
    if (qualifying.length > 0) {
      const firstPromo = qualifying[0].ability;
      const baseStruct = getAbilityHitStructure(firstPromo, actualAttacker, target, options);
      const baseHits = baseStruct.hits && baseStruct.hits.length > 0 ? baseStruct.hits : [{ hitIndex: 1, damage: 5 }];
      const hits: AttackHit[] = [
        ...baseHits.map((h, i) => ({ ...h, hitIndex: i + 1, conditionalNote: '1st attack' })),
        ...baseHits.map((h, i) => ({ ...h, hitIndex: baseHits.length + i + 1, conditionalNote: '2nd attack' }))
      ];
      const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
      return {
        isBladefury: false,
        isMultiHit: true,
        hits,
        summaryText: `Overload Gemstone: Uses ${firstPromo.name} twice against target (${totalDmg} total damage)`,
        badgeText: `${hits.map((h) => h.damage).join('+')} Dmg`
      };
    }

    return {
      isBladefury: false,
      isMultiHit: true,
      hits: [
        { hitIndex: 1, damage: 5, conditionalNote: '1st attack' },
        { hitIndex: 2, damage: 5, conditionalNote: '2nd attack' }
      ],
      summaryText: 'Overload Gemstone: Uses a 1AP attack on the promoted card twice for free against the same target',
      badgeText: '2x 1AP Atk'
    };
  }

  // Script for Freeze Time (Frostbinder; id ice_lance):
  // "Deals 11 damage. The target cannot be promoted or fused during your opponent's next turn."
  if (ability.id === 'ice_lance' || ability.name === 'Freeze Time') {
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 11 }];
    applyAttackerBonusPassives(hits, ability, attacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: `Deals ${totalDmg} damage. The target cannot be promoted or fused during your opponent's next turn.`,
      badgeText: `${totalDmg} Dmg`
    };
  }

  // Script for Flawless Parry (Skirmish Captain):
  // "The next time this unit would take damage from an attack until the end of your opponent's next turn, prevent up to 4 damage. Then, if the attacker is within range 1, reflect the attack back at them. This unit's turn ends."
  if (ability.id === 'flawless_parry' || ability.name === 'Flawless Parry') {
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: "The next time this unit would take damage from an attack until the end of your opponent's next turn, prevent up to 4 damage. Then, if the attacker is within range 1, reflect the attack back at them. This unit's turn ends.",
      badgeText: 'Parry (4+R1)'
    };
  }

  // Script for Death Mark (Blight Phantom):
  // "Target an enemy unit. This turn, this unit's attacks against that unit deal an additional 5 damage on the first hit. This effect does not stack."
  if (ability.id === 'death_mark' || ability.name === 'Death Mark') {
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: "Target an enemy unit. This turn, this unit's attacks against that unit deal an additional 5 damage on the first hit. This effect does not stack.",
      badgeText: 'Mark (+5)'
    };
  }

  const selfDmg = getAbilitySelfDamage(ability);
  const targetDamageEffects = (ability.effects || []).filter(
    (e: any) => e.type === 'damage' && e.target !== 'self' && e.target !== 'caster'
  );

  // If the ability only deals damage to self (e.g. Profane Insight)
  if (targetDamageEffects.length === 0 && selfDmg > 0) {
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: `Deals ${selfDmg} damage to this unit`,
      badgeText: `${selfDmg} Self-Dmg`
    };
  }

  const text = ability.text || '';
  const damageEffects = targetDamageEffects;

  // Specific named abilities with damage conditions or distinct subsequent hit damages:
  if (ability.id === 'flaming_dive' || ability.name === 'Flaming Dive') {
    const actualAttacker = attacker || options?.attacker;
    const hasMoved = Boolean(actualAttacker?.movedThisTurn);
    const dmg = hasMoved ? 9 : 7;
    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: dmg,
        conditionalNote: hasMoved ? '+2 moved this turn bonus' : undefined,
        appliedBonuses: hasMoved ? ['flaming_dive'] : []
      }
    ];
    applyAttackerBonusPassives(hits, ability, actualAttacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: hasMoved
        ? `Deals ${totalDmg} damage (7 + 2 moved this turn bonus)`
        : `Deals 7 damage (+2 if unit moved this turn)`,
      badgeText: hasMoved ? `${totalDmg} Dmg` : '7 Dmg'
    };
  }

  if (ability.id === 'guards_strike' || ability.name === "Guard's Strike") {
    const isArmoured = attacker ? attacker.armour > 0 : false;
    const dmg = isArmoured ? 7 : 5;
    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: dmg,
        conditionalNote: isArmoured ? '+2 armoured bonus' : undefined,
        appliedBonuses: isArmoured ? ['guards_strike'] : []
      }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: hits[0].conditionalNote
        ? `Deals ${totalDmg} damage (${hits[0].conditionalNote})`
        : isArmoured
        ? 'Deals 7 damage (5 + 2 armoured bonus)'
        : 'Deals 5 damage (+2 if armoured)',
      badgeText: `${totalDmg} Dmg`
    };
  }

  if (ability.id === 'phlox_shot' || ability.name === 'Phlox Shot') {
    const targetArmoured = target ? target.armour > 0 : false;
    const dmg = targetArmoured ? 7 : 5;
    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: dmg,
        conditionalNote: targetArmoured ? '+2 vs armour bonus' : undefined,
        appliedBonuses: targetArmoured ? ['phlox_shot'] : []
      }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: targetArmoured
        ? `Deals ${totalDmg} damage (5 + 2 vs armour bonus)`
        : 'Deals 5 damage (+2 vs armoured target)',
      badgeText: `${totalDmg} Dmg`
    };
  }

  if (ability.id === 'shove_off' || ability.name === 'Shove Off') {
    const usedOnTarget = Boolean(
      target && (attacker?.usedOnTargets?.['shove_off'] || []).includes(target.instanceId)
    );
    const dmg = usedOnTarget ? 6 : 2;
    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: dmg,
        conditionalNote: usedOnTarget ? '+4 repeat target bonus' : undefined,
        appliedBonuses: usedOnTarget ? ['shove_off'] : []
      }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: usedOnTarget
        ? `Deals ${totalDmg} damage (2 + 4 repeat attack bonus), Knockback 1`
        : 'Deals 2 damage (+4 if repeated on same target), Knockback 1',
      badgeText: `${totalDmg} Dmg`
    };
  }

  if (ability.id === 'disembowel' || ability.name === 'Disembowel') {
    const attackerHex = options?.attackerHex || attacker?.hexId;
    const targetHex = options?.targetHex || target?.hexId;
    const targetOwner = target?.owner || (attacker ? (attacker.owner === 'player1' ? 'player2' : 'player1') : null);
    const isBehind = isAttackFromBehind(attackerHex, targetHex, targetOwner, ability);
    const baseDmg = isBehind ? 8 : 6;
    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: baseDmg,
        conditionalNote: isBehind ? '+2 from behind' : undefined,
        appliedBonuses: isBehind ? ['disembowel'] : []
      }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: isBehind
        ? `Deals 8 damage (6 + 2 from behind), applies knockback 1`
        : `Deals 6 damage (+2 and knockback 1 if made from behind)`,
      badgeText: `${totalDmg} Dmg`
    };
  }

  if (ability.id === 'skirmishers_fury') {
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: 9 },
      { hitIndex: 2, damage: 8 }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hits 2 times: Hit 1 deals 9 damage, Hit 2 deals 8 damage',
      badgeText: '9+8 Dmg'
    };
  }

  if (ability.id === 'shield_bash_and_cleave') {
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: 7 },
      { hitIndex: 2, damage: 4 }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hits 2 times: Hit 1 deals 7 damage, Hit 2 deals 4 damage',
      badgeText: '7+4 Dmg'
    };
  }

  if (ability.id === 'cleave_and_tear') {
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: 4 },
      { hitIndex: 2, damage: 3 }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hits 2 times: Hit 1 deals 4 damage, Hit 2 deals 3 damage',
      badgeText: '4+3 Dmg'
    };
  }

  if (ability.id === 'dual_spin') {
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: 3 },
      { hitIndex: 2, damage: 2 }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hits 2 times: Hit 1 deals 3 damage, Hit 2 deals 2 damage',
      badgeText: '3+2 Dmg'
    };
  }

  if (ability.id === 'deft_skewer') {
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: 4 },
      { hitIndex: 2, damage: 3 }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hits 2 times: Hit 1 deals 4 damage, Hit 2 deals 3 damage',
      badgeText: '4+3 Dmg'
    };
  }

  if (ability.id === 'rip_and_tear') {
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 7 }];
    const noArmour = !target || target.armour === 0;
    if (noArmour) {
      hits.push({ hitIndex: 2, damage: 5, conditionalNote: 'no armour was removed' });
    }
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: noArmour,
      hits,
      summaryText: target
        ? target.armour > 0
          ? `Removes all ${target.armour} armour, then deals 7 damage`
          : 'Hits 2 times (7 + 5 damage, no armour removed)'
        : 'Removes all armour, deals 7 damage (+5 if no armour removed)',
      badgeText: target ? (target.armour > 0 ? '7 Dmg' : '7+5 Dmg') : '7 (+5) Dmg'
    };
  }

  if (ability.id === 'shield_bash_and_cleave') {
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: 7 },
      { hitIndex: 2, damage: 4, conditionalNote: 'cleave' }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: target && target.armour > 0 ? 'Removes up to 2 armour, deals 7 damage + 4 cleave' : 'Deals 7 damage + 4 cleave',
      badgeText: '7+4 Dmg'
    };
  }

  if (ability.id === 'telekinetic_rend') {
    const steal = target ? Math.min(5, target.armour) : 5;
    const hits: AttackHit[] = [{ hitIndex: 1, damage: steal, conditionalNote: `${steal} damage from armour stolen` }];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: `Steals up to 5 armour, deals 1 damage per armour stolen (${steal} dmg)`,
      badgeText: `${steal} Dmg`
    };
  }

  if (ability.id === 'arcane_surge') {
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 6, bypassArmour: true }];
    if (!target || target.damageCounters === 0) {
      hits.push({ hitIndex: 2, damage: 4, bypassArmour: false, conditionalNote: 'target was at full HP' });
    }
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hit 1 deals 6 damage (bypasses armour), then deals 4 damage if target was at full HP',
      badgeText: '6+4 Dmg'
    };
  }
  if (ability.id === 'coup_de_grace') {
    const venomed = Boolean(target?.statuses?.includes('slow_venom'));
    const hits: AttackHit[] = [
      {
        hitIndex: 1,
        damage: venomed ? 10 : 1,
        bypassArmour: !venomed,
        conditionalNote: venomed ? 'target has Slow Venom' : undefined
      }
    ];
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: 'Deals 10 damage if the target has Slow Venom, otherwise 1 damage bypassing armour',
      badgeText: venomed ? '10 Dmg' : '1 Dmg'
    };
  }
  if (ability.id === 'plunge_and_twist') {
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 5 }];
    if (!target || target.armour === 0) {
      hits.push({ hitIndex: 2, damage: 3, conditionalNote: 'target has no armour' });
    }
    applyAttackerBonusPassives(hits, ability, attacker, target);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: 'Hit 1 deals 5 damage, then deals 3 damage if target has no armour',
      badgeText: '5+3 Dmg'
    };
  }

  if (ability.id === 'prismatic_slash') {
    const isScorched = Boolean(
      options?.targetHex && options?.unitsOnBoard && isTileScorched(options.targetHex, options.unitsOnBoard, options?.scorchedTiles)
    );
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 7 }];
    if (isScorched) {
      hits.push({ hitIndex: 2, damage: 4, conditionalNote: 'standing on scorched tile' });
    }
    applyAttackerBonusPassives(hits, ability, attacker, target);
    const isMulti = hits.length > 1;
    return {
      isBladefury: false,
      isMultiHit: isMulti,
      hits,
      summaryText: isMulti
        ? `Hits 2 times: Hit 1 deals ${hits[0].damage} damage, Hit 2 deals ${hits[1].damage} damage (target on scorched tile)`
        : 'Hit 1 deals 7 damage, then deals 4 damage if on scorched tile',
      badgeText: isMulti ? `${hits[0].damage}+${hits[1].damage} Dmg` : '7 Dmg'
    };
  }

  if (ability.id === 'deft_skewer' || ability.name === 'Deft Skewer') {
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 3 }];
    applyAttackerBonusPassives(hits, ability, attacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: `Deals ${totalDmg} damage. Then choose: armour up to 3 or deal 3 more damage`,
      badgeText: `${totalDmg} Dmg`
    };
  }

  if (ability.id === 'vaulting_strike' || ability.name === 'Vaulting Strike') {
    const hits: AttackHit[] = [{ hitIndex: 1, damage: 6 }];
    applyAttackerBonusPassives(hits, ability, attacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: false,
      hits,
      summaryText: `Move to an empty tile surrounding target, then deal ${totalDmg} damage to enemy target`,
      badgeText: `${totalDmg} Dmg`
    };
  }

  // Check structured extraHit:
  const firstEffAny = damageEffects[0] as Record<string, any> | undefined;
  if (firstEffAny && firstEffAny.extraHit) {
    const d1 = typeof firstEffAny.amount === 'number' ? firstEffAny.amount : 5;
    const d2 = typeof firstEffAny.extraHit.amount === 'number' ? firstEffAny.extraHit.amount : d1;
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: d1 },
      { hitIndex: 2, damage: d2 }
    ];
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText:
        d1 !== d2
          ? `Hits 2 times: Hit 1 deals ${d1} damage, Hit 2 deals ${d2} damage`
          : `Hits 2 times (${d1} damage each)`,
      badgeText: d1 !== d2 ? `${d1}+${d2} Dmg` : '2 Hits'
    };
  }

  // Check structured multiple damage effects with asAdditionalHit:
  if (damageEffects.length > 1 && damageEffects.some((e: any) => e.asAdditionalHit)) {
    const hits: AttackHit[] = [];
    let idx = 1;
    for (const de of damageEffects) {
      const amt = typeof de.amount === 'number' ? de.amount : 5;
      const count = typeof de.hits === 'number' ? de.hits : 1;
      for (let i = 0; i < count; i++) {
        hits.push({ hitIndex: idx++, damage: amt });
      }
    }
    const allSame = hits.every((h) => h.damage === hits[0].damage);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: allSame
        ? `Hits ${hits.length} times (${hits[0].damage} damage each)`
        : `Hits ${hits.length} times: ${hits.map((h) => `Hit ${h.hitIndex} deals ${h.damage}`).join(', ')}`,
      badgeText: allSame ? `${hits.length} Hits` : hits.map((h) => h.damage).join('+') + ' Dmg'
    };
  }

  // General multi-hit with identical or conditional damage per hit:
  // A free variable-cost ability resolves as the AP its provider specifies or paid (apSpentAs)
  const apSpent = typeof ability.apSpentAs === 'number'
    ? ability.apSpentAs
    : typeof ability.selectedCost === 'number'
    ? ability.selectedCost
    : Array.isArray(ability.cost)
    ? ability.cost[0]
    : typeof ability.cost === 'number'
    ? ability.cost
    : 1;

  let baseDamage = 5;
  const matchDmg = text.match(/deal[s]?\s+(\d+)\s+damage/i) || text.match(/(\d+)\s+damage/i);
  if (matchDmg) baseDamage = parseInt(matchDmg[1], 10);
  if (damageEffects.length > 0) {
    if (typeof damageEffects[0].amount === 'number') {
      baseDamage = damageEffects[0].amount;
    } else if (
      typeof damageEffects[0].amount === 'object' &&
      damageEffects[0].amount !== null &&
      typeof (damageEffects[0].amount as any).perAP === 'number'
    ) {
      baseDamage = (damageEffects[0].amount as any).perAP * apSpent;
    }
  }

  // Also check if text specifies damage per AP spent (e.g. Glacial Spikes)
  const perApDmgMatch = text.match(/(\d+)\s+damage\s+per\s+AP\s+spent/i);
  if (perApDmgMatch) {
    baseDamage = parseInt(perApDmgMatch[1], 10) * apSpent;
  }

  // Data-driven: "if this ability was already used earlier this turn, deal X instead" (Twinbolt, and borrowed copies)
  const usedEarlierMod = ((damageEffects[0] as any)?.modifiers || []).find(
    (m: any) => m.if === 'thisAbilityUsedEarlierThisTurn' && typeof m.setAmount === 'number'
  );
  if (usedEarlierMod) {
    const baseId = ability.id?.includes('__') ? ability.id.split('__').pop()! : ability.id;
    if ((attacker?.usedTurnCounts?.[baseId] || 0) > 0) baseDamage = usedEarlierMod.setAmount;
  }
  // Data-driven: "if this unit moved before declaring this attack this turn, add amount" (e.g. Flaming Dive)
  const movedThisTurnMod = ((damageEffects[0] as any)?.modifiers || []).find(
    (m: any) =>
      (m.if === 'self.movedBeforeDeclaringThisTurn' ||
        m.if === 'self.movedThisTurn' ||
        m.if === 'movedThisTurn') &&
      typeof m.addAmount === 'number'
  );
  if (movedThisTurnMod) {
    const actualAttacker = attacker || options?.attacker;
    if (actualAttacker?.movedThisTurn) {
      baseDamage += movedThisTurnMod.addAmount;
    }
  }
  // Data-driven modifiers on the attacker's movement and this ability's earlier uses this turn:
  //   { if: 'self.hasNotMovedThisTurn', addAmount }                   (e.g. Flatten Foe)
  //   { addAmount: { perTileMovedThisTurn: N } }                      (e.g. Lance Thrust, Freezing Crash)
  //   { addAmount: { perPreviousUseThisTurn: N }, minAmount }         (e.g. Controlled Burn: -2 per earlier use)
  {
    const actualAttacker = attacker || options?.attacker;
    let minAmount: number | undefined;
    ((damageEffects[0] as any)?.modifiers || []).forEach((m: any) => {
      if (m.if === 'self.hasNotMovedThisTurn' && typeof m.addAmount === 'number') {
        if (!actualAttacker?.movedThisTurn) baseDamage += m.addAmount;
      } else if (typeof m.addAmount?.perTileMovedThisTurn === 'number') {
        baseDamage += m.addAmount.perTileMovedThisTurn * (actualAttacker?.tilesMovedThisTurn || 0);
      } else if (typeof m.addAmount?.perPreviousUseThisTurn === 'number') {
        const useKey = ability.baseAbilityId || ability.id;
        baseDamage += m.addAmount.perPreviousUseThisTurn * (actualAttacker?.usedTurnCounts?.[useKey] || 0);
      }
      if (typeof m.minAmount === 'number') minAmount = Math.max(minAmount ?? 0, m.minAmount);
    });
    if (minAmount !== undefined) baseDamage = Math.max(minAmount, baseDamage);
  }

  if (ability.id === 'fortified_blows' || ability.baseAbilityId === 'fortified_blows') {
    baseDamage = attacker?.armour ?? 2;
  }

  let hitCount = 1;
  const effHits = damageEffects[0]?.hits;
  if (typeof effHits === 'number' && effHits > 1) {
    hitCount = effHits;
  } else if (
    typeof effHits === 'object' &&
    effHits !== null &&
    typeof (effHits as any).perAP === 'number'
  ) {
    hitCount = (effHits as any).perAP * apSpent;
  } else if (/hits\s+(\d+)\s+times\s+per\s+AP\s+spent/i.test(text)) {
    const m = text.match(/hits\s+(\d+)\s+times\s+per\s+AP\s+spent/i);
    if (m) hitCount = parseInt(m[1], 10) * apSpent;
  } else if (/hits\s+twice|hit\s+twice|hits\s+2\s+times|hit\s+2\s+times/i.test(text)) {
    hitCount = 2;
  } else if (/hits\s+three\s+times|hit\s+three\s+times|hits\s+3\s+times|hit\s+3\s+times/i.test(text)) {
    hitCount = 3;
    if (ability.id === 'bursting_bubbles' && attacker && attacker.damageCounters > 0) {
      hitCount = 2;
    }
  } else if (/hits\s+four\s+times|hit\s+four\s+times|hits\s+4\s+times|hit\s+4\s+times/i.test(text)) {
    hitCount = 4;
  } else {
    const countMatch = text.match(/hits\s+(\d+)\s+times/i);
    if (countMatch) hitCount = parseInt(countMatch[1], 10);
  }

  const blockWithoutDepleting =
    damageEffects[0]?.armourInteraction === 'blockWithoutDepleting' ||
    /Armour blocks this attack without depleting/i.test(text);

  if (hitCount > 1) {
    const hits: AttackHit[] = [];
    for (let i = 1; i <= hitCount; i++) {
      hits.push({
        hitIndex: i,
        damage: baseDamage,
        blockWithoutDepleting
      });
    }
    applyAttackerBonusPassives(hits, ability, attacker, target);
    const allSame = hits.every((h) => h.damage === hits[0].damage);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: allSame
        ? `Hits ${hitCount} times (${hits[0].damage} damage each)`
        : `Hits ${hitCount} times: ${hits.map((h) => `Hit ${h.hitIndex} deals ${h.damage}`).join(', ')}`,
      badgeText: allSame ? `${hitCount} Hits` : hits.map((h) => h.damage).join('+') + ' Dmg'
    };
  }

  // Single hit
  const hits: AttackHit[] = [{ hitIndex: 1, damage: baseDamage }];
  applyAttackerBonusPassives(hits, ability, attacker, target);
  const totalDmg = hits[0].damage;
  const hasBonus = Boolean(hits[0].appliedBonuses && hits[0].appliedBonuses.length > 0);
  return {
    isBladefury: false,
    isMultiHit: false,
    hits,
    summaryText: hasBonus ? `${totalDmg} damage (${hits[0].conditionalNote})` : `${totalDmg} damage`,
    badgeText: totalDmg !== baseDamage ? `${totalDmg} Dmg` : ''
  };
}

/**
 * Evaluates damage reduction passives on the target unit and its surroundings.
 */
export function calculateDamageReduction(
  rawDamage: number,
  hitIndex: number,
  totalHits: number,
  currentArmour: number,
  options?: AttackExecutionOptions
): { finalDamage: number; reductionNotes: string[] } {
  if (!options?.target) {
    return { finalDamage: rawDamage, reductionNotes: [] };
  }

  const target = options.target;
  const targetPassives = getUnitPassives(target);

  let distance = 1;
  if (options.attackerHex && options.targetHex) {
    distance = getHexDistance(options.attackerHex, options.targetHex);
  }

  const ability = options.ability;
  const isMelee = ability?.tags?.includes('melee') || distance === 1;
  const isRanged =
    ability?.tags?.includes('ranged') ||
    distance > 1 ||
    (ability?.range && ability.range[1] > 1);

  let currentDmg = rawDamage;
  const reductionNotes: string[] = [];

  // Attacker passives (e.g. Breaker's Resolve: attacks deal at least 3 damage regardless of effects)
  const attackerPassives = getUnitPassives(options.attacker);
  const hasBreakersResolve = attackerPassives.some(
    (p) => p.id === 'breakers_resolve' || p.name === "Breaker's Resolve"
  );

  // Damage reductions read from card data: { type: 'reduceDamage', target: 'self' | 'friendlyUnitsSurroundingSelf',
  //   amount | setTo, from?: 'meleeAttack' | 'rangedAttack' | 'attack', per?: 'attack' | 'hit', scope?: 'firstHit',
  //   minDamage?, if? }. 'per: attack' and 'scope: firstHit' apply on the first hit only. Covers Obscuring Cloak,
  // Iron Foundation, Vanguard Armour, Absolute Fortitude, Thick Hide, Gale Wings, Banner's Cover (from a surrounding
  // friendly unit), Relentless Rage (setTo), Insidious Weed, Regal Wings, Superheated Cloak, Symbiotic Fortitude, ...
  const conditionHolds = (cond: unknown): boolean => {
    if (!cond) return true;
    if (cond === 'damageWouldRemoveArmour') return currentArmour > 0;
    if (cond === 'attackHitsMoreThanOnce && damageWouldRemoveArmour') return totalHits > 1 && currentArmour > 0;
    if (cond === 'self.killedEnemyThisTurn') return Boolean(target.killedEnemyThisTurn);
    if (cond === 'self.hasArmour') return currentArmour > 0;
    return false;
  };
  const applyReduction = (e: any, sourceName: string) => {
    if (e.from === 'meleeAttack' && !isMelee) return;
    if (e.from === 'rangedAttack' && !isRanged) return;
    if ((e.per === 'attack' || e.scope === 'firstHit') && hitIndex !== 1) return;
    if (!conditionHolds(e.if)) return;
    const floor = typeof e.minDamage === 'number' ? e.minDamage : 0;
    let reduced = currentDmg;
    if (typeof e.setTo === 'number') reduced = Math.min(currentDmg, e.setTo);
    else if (typeof e.amount === 'number') reduced = Math.max(floor, currentDmg - e.amount);
    const diff = currentDmg - reduced;
    if (diff > 0) {
      currentDmg = reduced;
      reductionNotes.push(`-${diff} (${sourceName})`);
    }
  };
  targetPassives.forEach((p) => {
    ((p.effects || []) as any[])
      .filter((e) => e.type === 'reduceDamage' && (e.target === 'self' || !e.target))
      .forEach((e) => applyReduction(e, p.name));
  });
  // Auras from surrounding friendly units (e.g. Banner's Cover)
  if (options.targetHex && options.unitsOnBoard) {
    getSurroundingHexes(options.targetHex).forEach((h) => {
      const u = options.unitsOnBoard![h];
      if (!u || u.owner !== target.owner || u.instanceId === target.instanceId) return;
      getUnitPassives(u).forEach((p) => {
        ((p.effects || []) as any[])
          .filter((e) => e.type === 'reduceDamage' && e.target === 'friendlyUnitsSurroundingSelf')
          .forEach((e) => applyReduction(e, p.name));
      });
    });
  }
  // 8. Breaker's Resolve: Attacks deal at least 3 damage regardless of effects
  if (hasBreakersResolve) {
    currentDmg = Math.max(3, currentDmg);
  }

  return {
    finalDamage: currentDmg,
    reductionNotes
  };
}
/**
 * Reductions that apply to any damage, not just attacks ({ from: 'any' }), for damage that doesn't go through an attack
 * such as scorched tiles. e.g. Relentless Rage: "reduce that damage to 1" on a turn when this unit killed an enemy.
 */
export function reduceNonAttackDamage(unit: BattlefieldUnit, amount: number): number {
  let dmg = amount;
  getUnitPassives(unit).forEach((p) => {
    ((p.effects || []) as any[])
      .filter((e) => e.type === 'reduceDamage' && (e.target === 'self' || !e.target) && e.from === 'any')
      .forEach((e) => {
        if (e.if === 'self.killedEnemyThisTurn' && !unit.killedEnemyThisTurn) return;
        if (e.if === 'self.hasArmour' && !(unit.armour > 0)) return;
        if (e.if && e.if !== 'self.killedEnemyThisTurn' && e.if !== 'self.hasArmour') return;
        const floor = typeof e.minDamage === 'number' ? e.minDamage : 0;
        if (typeof e.setTo === 'number') dmg = Math.min(dmg, e.setTo);
        else if (typeof e.amount === 'number') dmg = Math.max(floor, dmg - e.amount);
      });
  });
  return dmg;
}
function getArmourBypass(hit: AttackHit, options?: AttackExecutionOptions): { all: boolean; upTo: number } {
  const ability = options?.ability;
  const dmgEffect = (ability?.effects || []).find((e: any) => e.type === 'damage') as any;
  // A hit's own setting wins (so Arcane Surge's 2nd hit can say false)
  const all = hit.bypassArmour ?? Boolean(dmgEffect?.bypassArmour);
  let upTo = hit.bypassArmourUpTo ?? 0;
  // Passives such as Corrosive Wyvern (bypass up to 3)
  for (const p of getUnitPassives(options?.attacker)) {
    for (const e of (p.effects || []) as any[]) {
      if (e.type === 'bypassArmourUpTo') upTo += e.amount;
    }
  }
  // Borrowed attacks, such as Tenacious Slam (bypass up to 4)
  const parentId = String(ability?.parentAbilityId || (ability?.id?.includes('__') ? ability.id.split('__')[0] : ''));
  const providerBypass: Record<string, number> = { tenacious_slam: 4 };
  upTo += providerBypass[parentId] ?? 0;
  return { all, upTo };
}
/**
 * Resolves each hit sequentially against target armour and damage counters.
 * Stops if the target is defeated by an earlier hit.
 */
export function executeSequentialHits(
  hitsToExecute: AttackHit[],
  initialArmour: number,
  initialDamageCounters: number,
  targetHp: number,
  abilityId?: string,
  options?: AttackExecutionOptions
): {
  finalArmour: number;
  finalDamageCounters: number;
  isDefeated: boolean;
  hitResults: HitExecutionRecord[];
} {
  let currentArmour = initialArmour;
  let currentCounters = initialDamageCounters;
  let shellArmourTriggered = false; // Shell Armour: once per attack
  const hitResults: HitExecutionRecord[] = [];

  for (const hit of hitsToExecute) {
    if (currentCounters >= targetHp) {
      break;
    }

    let hitDmg = hit.damage;
    let notes = hit.conditionalNote || '';

    // Apply attacker damage bonus passives if not already baked into hit
    const attacker = options?.attacker;
    const attackerPassives = getUnitPassives(attacker);
    const isMelee =
      options?.ability?.tags?.includes('melee') ||
      (options?.attackerHex && options?.targetHex
        ? getHexDistance(options.attackerHex, options.targetHex) === 1
        : false);

    // 1. Shield of Blessings (Order's Chosen): "When this unit has armour on it, its attacks deal an additional 2 damage."
    if (hit.hitIndex === 1 && !hit.appliedBonuses?.includes('shield_of_blessings') && (attacker?.armour ?? 0) > 0) {
      if (attackerPassives.some((p) => p.id === 'shield_of_blessings' || p.name === 'Shield of Blessings')) {
        hitDmg += 2;
        notes = notes ? `${notes}, +2 Shield of Blessings` : '+2 Shield of Blessings';
      }
    }
    // 2. Drakescale (Drakerider Paladin): "While this unit has armour, it is immune to knockback and its melee attacks deal an additional 2 damage per hit."
    if (isMelee && !hit.appliedBonuses?.includes('drakescale') && (attacker?.armour ?? 0) > 0) {
      if (attackerPassives.some((p) => p.id === 'drakescale' || p.name === 'Drakescale')) {
        hitDmg += 2;
        notes = notes ? `${notes}, +2 Drakescale` : '+2 Drakescale';
      }
    }
    // 3. Enrage (Savage Grizzly): "If this unit is damaged, it deals an additional 1 damage per hit with attacks."
    if (!hit.appliedBonuses?.includes('enrage') && (attacker?.damageCounters ?? 0) > 0) {
      if (attackerPassives.some((p) => p.id === 'enrage' || p.name === 'Enrage')) {
        hitDmg += 1;
        notes = notes ? `${notes}, +1 Enrage` : '+1 Enrage';
      }
    }
    // 3b. Adrenaline (Brawl Fighter): "If this unit has already taken damage this turn, its attacks deal an additional 2 damage per hit."
    if (!hit.appliedBonuses?.includes('adrenaline') && Boolean(attacker?.tookDamageThisTurn)) {
      if (attackerPassives.some((p) => p.id === 'adrenaline' || p.name === 'Adrenaline')) {
        hitDmg += 2;
        notes = notes ? `${notes}, +2 Adrenaline` : '+2 Adrenaline';
      }
    }
    // 4. Glimmering Arrows (Dawnglow Archer): "This unit's attacks against armour deal an additional 2 damage per hit."
    // Dynamically evaluated against remaining currentArmour!
    if (!hit.appliedBonuses?.includes('glimmering_arrows') && currentArmour > 0) {
      if (attackerPassives.some((p) => p.id === 'glimmering_arrows' || p.name === 'Glimmering Arrows')) {
        hitDmg += 2;
        notes = notes ? `${notes}, +2 Glimmering Arrows (vs armour)` : '+2 Glimmering Arrows (vs armour)';
      }
    }

    // 5. Behind-the-target conditions (Backstab, Opportunist, Inscribed Edge)
    const attackerHex = options?.attackerHex || attacker?.hexId;
    const targetHex = options?.targetHex || options?.target?.hexId;
    const targetOwner = options?.target?.owner || (attacker ? (attacker.owner === 'player1' ? 'player2' : 'player1') : null);
    const isBehind = isAttackFromBehind(attackerHex, targetHex, targetOwner, options?.ability);

    if (isBehind) {
      // Backstab (Shade Assassin): +4 on first hit
      if (hit.hitIndex === 1 && !hit.appliedBonuses?.includes('backstab')) {
        if (attackerPassives.some((p) => p.id === 'backstab' || p.name === 'Backstab')) {
          hitDmg += 4;
          notes = notes ? `${notes}, +4 Backstab (from behind)` : '+4 Backstab (from behind)';
        }
      }
      // Opportunist (Cutthroat Assassin): +1 per hit on melee
      if (isMelee && !hit.appliedBonuses?.includes('opportunist')) {
        if (attackerPassives.some((p) => p.id === 'opportunist' || p.name === 'Opportunist')) {
          hitDmg += 1;
          notes = notes ? `${notes}, +1 Opportunist (from behind)` : '+1 Opportunist (from behind)';
        }
      }
      // Inscribed Edge (Harsh Inquisitor): +floor(armour / 2) on first hit
      if (hit.hitIndex === 1 && !hit.appliedBonuses?.includes('inscribed_edge') && currentArmour > 1) {
        if (attackerPassives.some((p) => p.id === 'inscribed_edge' || p.name === 'Inscribed Edge')) {
          const alreadyUsed = (attacker?.usedTurnCounts?.['inscribed_edge'] || 0) > 0;
          if (!alreadyUsed) {
            const bonus = Math.floor(currentArmour / 2);
            if (bonus > 0) {
              hitDmg += bonus;
              notes = notes ? `${notes}, +${bonus} Inscribed Edge (from behind)` : `+${bonus} Inscribed Edge (from behind)`;
            }
          }
        }
      }
    }

    // Special: Hundred-Cut Crescendo: +1 damage if target has no armour at time of hit
    if (abilityId === 'hundred_cut_crescendo' && currentArmour === 0) {
      hitDmg += 1;
      notes = notes ? `${notes}, +1 unarmoured bonus` : '+1 unarmoured bonus';
    }

        const bypass = getArmourBypass(hit, options);
    const bypassed = bypass.all ? currentArmour : Math.min(bypass.upTo, currentArmour);
    const effectiveArmour = currentArmour - bypassed; // armour the hit "sees"

    const { finalDamage, reductionNotes } = calculateDamageReduction(
      hitDmg,
      hit.hitIndex,
      hitsToExecute.length,
      effectiveArmour,
      options
    );
    hitDmg = finalDamage;
    if (reductionNotes.length > 0) {
      notes = notes ? `${notes}, ${reductionNotes.join(', ')}` : reductionNotes.join(', ');
    }

    // Feeding Frenzy:
    // "This unit may attack friendly units. If damage would be dealt to a unit this way, prevent that damage, then that unit heals up to that much damage instead."
    const isFriendlyTarget = Boolean(
      options?.attacker &&
      options?.target &&
      options.attacker.owner === options.target.owner
    );
    const isFeedingFrenzyActive = isFriendlyTarget && hasFeedingFrenzy(options?.attacker);

    if (isFeedingFrenzyActive) {
      const prevCounters = currentCounters;
      currentCounters = Math.max(0, currentCounters - hitDmg);
      const healedThisHit = prevCounters - currentCounters;
      const frenzyNote = `Feeding Frenzy: converted ${hitDmg} damage to healing (healed ${healedThisHit})`;
      notes = notes ? `${notes}, ${frenzyNote}` : frenzyNote;

      hitResults.push({
        hitIndex: hit.hitIndex,
        damage: hitDmg,
        armourAbsorbed: 0,
        hpDamage: 0,
        targetDefeated: false,
        notes: notes || undefined
      });
      continue;
    }

    let armourAbsorbed = 0;
    let hpDamage = 0;

    if (bypass.all) {
      hpDamage = hitDmg;
      notes = notes ? `${notes}, bypassed armour` : 'bypassed armour';
    } else {
      armourAbsorbed = Math.min(effectiveArmour, hitDmg);
      hpDamage = hitDmg - armourAbsorbed;
      if (hit.blockWithoutDepleting) {
        notes = notes ? `${notes}, armour blocked without depleting` : 'armour blocked without depleting';
      } else {
        currentArmour -= armourAbsorbed;
      }
      if (bypassed > 0) {
        notes = notes ? `${notes}, bypassed ${bypassed} armour` : `bypassed ${bypassed} armour`;
      }
    }

    currentCounters += hpDamage;
    // "If this attack would kill a unit, it leaves that unit alive at 1HP instead" (e.g. Green Execution)
    const nonLethal = (options?.ability?.effects || []).some((e: any) => e.type === 'damage' && e.nonLethal);
    if (nonLethal && currentCounters >= targetHp) {
      currentCounters = Math.max(0, targetHp - 1);
      notes = notes ? `${notes}, left at 1HP` : 'left at 1HP';
    }
    const isDefeated = currentCounters >= targetHp;
    // "If this unit's armour is broken, armour up to N after taking the damage" (e.g. Shell Armour once per attack,
    // Regrowing Armour every time): an armour effect triggered by 'self.armourBroken' (on the passive or the effect)
    if (!isDefeated && armourAbsorbed > 0 && currentArmour === 0) {
      for (const p of getUnitPassives(options?.target)) {
        const eff: any = (p.effects || []).find(
          (e: any) =>
            e.type === 'armour' &&
            typeof e.upTo === 'number' &&
            (e.trigger === 'self.armourBroken' || (!e.trigger && p.trigger === 'self.armourBroken'))
        );
        if (!eff) continue;
        const oncePerAttack = Boolean(eff.limits?.oncePerAttack || (p.limits as any)?.oncePerAttack);
        if (oncePerAttack && shellArmourTriggered) continue;
        currentArmour = Math.max(currentArmour, eff.upTo);
        if (oncePerAttack) shellArmourTriggered = true;
        notes = notes ? `${notes}, ${p.name} re-armours to ${eff.upTo}` : `${p.name} re-armours to ${eff.upTo}`;
        break;
      }
    }
    hitResults.push({
      hitIndex: hit.hitIndex,
      damage: hitDmg,
      armourAbsorbed,
      hpDamage,
      targetDefeated: isDefeated,
      notes: notes || undefined
    });

    if (isDefeated) {
      break;
    }
  }

  return {
    finalArmour: currentArmour,
    finalDamageCounters: currentCounters,
    isDefeated: currentCounters >= targetHp,
    hitResults
  };
}
