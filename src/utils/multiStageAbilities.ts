import { CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import {
  getHexDistance,
  getSurroundingHexes,
  getHexesInRange,
  getHexBehind,
  getHexMovementDirection
} from './hexGridMath';
import { getPathSpec, getNextPathHexes, formatPath } from './paths';
import { hasFeedingFrenzy } from './unitPassives';
import { isFlowingStanceActive } from './flowingStance';
import {
  isChargeFlightAbility,
  getChargeFlightSpec,
  validateChargeFlightPath,
  getNextChargeFlightHexes,
  analyzePathTurns
} from './chargeFlightAbility';

export interface MultiStageState {
  ability: CardAbility;
  casterHex: string;
  stage: number;
  targets: string[]; // List of hexes chosen in previous stages
  metadata?: {
    carriedUnitHex?: string; // Spirit Away
    tiebreakEmptyHexes?: string[]; // Grappling Hook / Boarding Hook
    targetUnitHex?: string; // Grappling Hook / Boarding Hook / Umbral Flail
    primaryTargetHex?: string; // Anchor Smash
    promotedMeleeAbility?: CardAbility; // Anchor Smash
    flailTileBehind?: string; // Umbral Flail
    killCount?: number; // Coin Plink
    pulledTargetHex?: string; // Corsair Saboteur / Boarding Hook target
    movingCaster?: boolean; // Corsair Saboteur fallback
    splitHitCandidates?: string[]; // "The second hit may target a different unit" (Cloven Crash): where it can go
    // Move-then-strike (Leap Strike, Pouncing Ambush): the unit has moved; the units the strike can hit
    strikeCandidates?: string[];
    autoStrike?: boolean; // the strike needs no choice (Leap Strike: the unit in the direction moved)
    // Burst from Underneath: the target to push and where it can be pushed to
    pushTargetHex?: string;
    pushChoices?: string[];
  };
}

/**
 * Generic "pick all targets first, then resolve every hit at once" mode.
 * Driven by the card data field `targetCount` ({ max, distinct } or "any").
 * Anchor Smash has no targetCount in the data (it uses addTargets), so it is special-cased.
 */
export interface MultiTargetSpec {
  max: number | null; // null = any number
  minRange: number;
  maxRange: number;
  side?: 'friendly'; // default is enemy units
  min?: number; // minimum targets needed to confirm (default 1)
}

export function isAnchorSmash(ability: CardAbility | null | undefined): boolean {
  const id = ability?.id || '';
  return id === 'anchor_smash' || id.startsWith('anchor_smash__');
}

export function getMultiTargetSpec(ability: CardAbility | null | undefined): MultiTargetSpec | null {
  if (!ability) return null;
  if (isAnchorSmash(ability)) return { max: 3, minRange: 1, maxRange: 1 };
    // Optional "friendly unit surrounding this one" effect (e.g. Rally Stance)
  const friendEffect = ((ability as any).effects || []).find(
    (e: any) => e?.target === 'friendlySurroundingSelf' && e?.optional
  );
  if (friendEffect) {
    return { max: friendEffect.count ?? 1, minRange: 1, maxRange: 1, side: 'friendly', min: 0 };
  }
  const tc = (ability as any).targetCount;
  if (tc === undefined || tc === null) return null;
  let max: number | null;
  if (tc === 'any') max = null;
  else if (typeof tc === 'object' && typeof tc.max === 'number') max = tc.max;
  else return null;
  const range = (ability as any).range as number[] | undefined;
  if (Array.isArray(range) && range.length > 0) {
    return { max, minRange: range[0], maxRange: range[1] ?? range[0] };
  }
  const melee = ability.tags?.includes('melee') || (ability as any).target === 'surroundingEnemyUnits';
  return melee ? { max, minRange: 1, maxRange: 1 } : { max, minRange: 1, maxRange: 2 };
}

/**
 * Damage change applied to EVERY hit once the final target count is known.
 * Greatcleave: +1 per target beyond the first (1 target = 5 dmg, 2 targets = 6 dmg each, 3 targets = 7 dmg each).
 * Anchor Smash: -1 per target beyond the first.
 */
export function getPerHitAdjustment(ability: CardAbility, targetCount: number): number {
  if (isAnchorSmash(ability)) return -Math.max(0, targetCount - 1);
  if (ability.id === 'greatcleave' || (ability as any).name === 'Greatcleave') {
    return Math.max(0, targetCount - 1);
  }
  const effects: any[] = (ability as any).effects || [];
  for (const e of effects) {
    for (const m of e?.modifiers || []) {
      const per = m?.addAmount?.perTarget;
      if (typeof per === 'number') return per * Math.max(0, targetCount - 1);
    }
  }
  return 0;
}

/**
 * Returns true if an ability is one of the multi-stage or multi-target abilities
 */
export function isMultiStageAbility(ability: CardAbility | null | undefined): boolean {
  if (!ability) return false;
  if (ability.isMultiStage) return true;
  if (isChargeFlightAbility(ability)) return true;
  if (getPathSpec(ability)) return true;
  if (getMultiTargetSpec(ability)) return true;
  const multiStageIds = [
    'realm_warp',
    'tactical_swap',
    'nexus_displacement',
    'grappling_hook',
    'spirit_away',
    'multi_head_lash',
    'multishot',
    'umbral_flail',
    'anchor_smash',
    'boarding_hook',
    'buddy_tag',
    'coin_plink',
    'greatcleave',
    'lead_the_charge',
    'jab_and_backstep',
    'deft_swipe',
    'mounted_charge',
    'drakes_flight',
    'swooping_pounce',
    'vaulting_strike',
    'sidestepping_crush'
  ];
  return multiStageIds.includes(ability.id);
}

/**
 * Get the closest empty tiles surrounding centerHex relative to referenceHex
 */
export function getClosestEmptySurroundingHexes(
  centerHex: string,
  referenceHex: string,
  unitsOnBoard: Record<string, BattlefieldUnit>
): string[] {
  const surrounding = getSurroundingHexes(centerHex).filter((h) => !unitsOnBoard[h]);
  if (surrounding.length === 0) return [];
  let minDist = 999;
  surrounding.forEach((h) => {
    const d = getHexDistance(h, referenceHex);
    if (d < minDist) minDist = d;
  });
  return surrounding.filter((h) => getHexDistance(h, referenceHex) === minDist);
}

export interface MultiStageTargetInfo {
  validHexes: string[];
  promptMessage: string;
  isOptional?: boolean;
  finishButtonLabel?: string;
  isTileTarget?: boolean;
}

/**
 * Calculates valid hex targets and status prompts for each stage of a multi-stage ability
 */
export function getMultiStageTargetInfo(
  state: MultiStageState,
  unitsOnBoard: Record<string, BattlefieldUnit>,
  activePlayer: PlayerId
): MultiStageTargetInfo {
  const { ability, casterHex, stage, targets, metadata } = state;
  const abilityId = ability.id;
  const casterUnit = unitsOnBoard[casterHex];
  const bonusRange = casterUnit?.bonusRangeThisTurn || 0;

  // Move-then-strike (e.g. Pouncing Ambush): the unit has moved, now choose the enemy to strike
  if (metadata?.strikeCandidates) {
    return {
      validHexes: metadata.strikeCandidates,
      promptMessage: `${ability.name}: click an enemy in melee range to strike.`
    };
  }
  // Burst from Underneath: choose the direction to push the target (an empty tile around it)
  if (metadata?.pushChoices) {
    return {
      validHexes: metadata.pushChoices,
      promptMessage: `${ability.name}: click an empty tile around the target to push it there.`,
      isTileTarget: true
    };
  }
  // ... and first, the target: an enemy unit in the ability's range
  if (((ability as any).effects || []).some((e: any) => e.type === 'knockback' && e.direction === 'chosen')) {
    const range = (ability as any).range as number[] | undefined;
    const minR = range?.[0] ?? 1;
    const maxR = (range?.[1] ?? range?.[0] ?? 1) + bonusRange;
    return {
      validHexes: getHexesInRange(casterHex, minR, maxR).filter((h) => unitsOnBoard[h] && unitsOnBoard[h].owner !== activePlayer),
      promptMessage: `${ability.name}: click an enemy unit in range ${minR}-${maxR} to push.`
    };
  }

  // "The second hit may target a different unit" (e.g. Cloven Crash): the first target is chosen, pick the second
  if (metadata?.splitHitCandidates) {
    return {
      validHexes: metadata.splitHitCandidates,
      promptMessage: `${ability.name}: click the different unit the second hit targets.`
    };
  }

  // Charge / Flight path mode (Mounted Charge, Drake's Flight, and unified charge abilities)
  if (isChargeFlightAbility(ability)) {
    const spec = getChargeFlightSpec(ability);
    const nextHexes = getNextChargeFlightHexes(casterHex, targets, spec, unitsOnBoard);
    const check = validateChargeFlightPath(casterHex, targets, spec, unitsOnBoard);
    const lengthsStr = spec.possiblePathLengths.join(' or ');
    const turnAnalysis = analyzePathTurns(casterHex, targets);

    let promptMessage = '';
    if (targets.length === 0) {
      promptMessage = `${ability.name}: Click an adjacent tile to start drawing path (${lengthsStr} tiles, exactly 1 turn, no turning back).`;
    } else if (check.valid) {
      promptMessage = `${ability.name}: Legal path (${targets.length} tiles, 1 turn)! Deals ${spec.damage} damage to units moved over. Click '${ability.name}' button or final tile to execute.`;
    } else {
      promptMessage = `${ability.name}: Path: ${targets.join(' → ')} (${targets.length}/${lengthsStr} tiles, ${turnAnalysis.turnCount}/1 turn). Click next tile, or click a path tile to undo.`;
    }

    return {
      validHexes: [...new Set([...nextHexes, ...targets])],
      promptMessage,
      isOptional: check.valid,
      finishButtonLabel: `Confirm ${ability.name} (${targets.length} tiles)`,
      isTileTarget: true
    };
  }

  // Path mode (any ability with usesPath in its card data)
  const pathSpec = getPathSpec(ability);
  if (pathSpec) {
    const next = getNextPathHexes(casterHex, targets, pathSpec);
    const last = targets.length > 0 ? targets[targets.length - 1] : null;
    let promptMessage = '';
    if (targets.length === 0) {
      promptMessage = pathSpec.straight
        ? `${ability.name}: Click the end tile of a straight line (up to ${pathSpec.maxLength} tiles).`
        : pathSpec.minLength === pathSpec.maxLength
        ? `${ability.name}: Choose a path that is ${pathSpec.maxLength} tiles long (click first tile adjacent to this unit).`
        : `${ability.name}: Click the first tile of the path, next to this unit.`;
    } else if (targets.length >= pathSpec.minLength) {
      promptMessage = `${ability.name}: Path: ${formatPath(targets)} (${targets.length}/${pathSpec.maxLength} tiles). ${
        pathSpec.straight
          ? 'Click another end tile to change it, or confirm.'
          : "Click 'Confirm path' to fire, or click the last tile to undo."
      }`;
    } else {
      promptMessage = `${ability.name}: Path: ${formatPath(targets)} (${targets.length}/${pathSpec.maxLength} tiles). Click next connected tile, or click the last tile to undo.`;
    }

    // A move-then-strike may skip the move (e.g. Pouncing Ambush: "moves up to 2 tiles")
    const canStayPut =
      targets.length === 0 &&
      (ability.effects || []).some((e: any) => e.type === 'damage' && e.target === 'chosenEnemyInMeleeRange');
    return {
      validHexes: !pathSpec.straight && last ? [...next, last] : next,
      promptMessage: canStayPut ? `${promptMessage} Or strike from here without moving.` : promptMessage,
      isOptional: canStayPut || targets.length >= pathSpec.minLength,
      finishButtonLabel: canStayPut ? 'Strike from here' : `Confirm path (${targets.length})`,
      isTileTarget: true
    };
  }
  // Generic multi-target mode (Multi-Head Lash, Multishot, Anchor Smash, Greatcleave, Rally Stance, ...)
  const mtSpec = getMultiTargetSpec(ability);
  if (mtSpec) {
    const friendly = mtSpec.side === 'friendly';
    const canTargetFriendly = friendly || hasFeedingFrenzy(casterUnit);
    const effectiveMaxRange = mtSpec.maxRange + bonusRange;
    const candidates = getHexesInRange(casterHex, mtSpec.minRange, effectiveMaxRange).filter((hex) => {
      const u = unitsOnBoard[hex];
      if (!u || hex === casterHex) return false;
      return canTargetFriendly ? (friendly ? u.owner === activePlayer : true) : u.owner !== activePlayer;
    });
    const picked = targets.length;
    const atMax = mtSpec.max !== null && picked >= mtSpec.max;
    const countLabel = mtSpec.max === null ? `${picked}` : `${picked}/${mtSpec.max}`;
    const who = friendly ? 'friendly units' : 'enemy targets';
    return {
      // Selected targets stay clickable so they can be deselected
      validHexes: atMax ? [...targets] : candidates,
      promptMessage:
        picked === 0
          ? `${ability.name}: Click ${who} (${mtSpec.max === null ? 'any number' : `up to ${mtSpec.max}`})${
              friendly ? ', or just confirm to use it on yourself only' : ''
            }. It resolves when you confirm.`
          : `${ability.name}: ${countLabel} selected. Click more, click a selected target to remove it, or confirm.`,
      isOptional: picked >= (mtSpec.min ?? 1),
      finishButtonLabel: picked === 0 ? 'Confirm (self only)' : `Confirm (${picked})`
    };
  }
  
  // 1. Realm Warp (Fateweaver Sage)
  // Stage 1: Choose empty tile in range 1-3
  // Stage 2: Choose unit surrounding that chosen tile
  if (abilityId === 'realm_warp') {
    if (stage === 1) {
      const inRangeTiles = getHexesInRange(casterHex, 1, 3 + bonusRange);
      // Valid if empty and has at least 1 surrounding unit
      const validHexes = inRangeTiles.filter((hex) => {
        if (unitsOnBoard[hex]) return false;
        const surr = getSurroundingHexes(hex);
        return surr.some((s) => unitsOnBoard[s] !== undefined);
      });
      return {
        validHexes,
        promptMessage: `Realm Warp (Stage 1/2): Click a highlighted empty tile (range 1-${3 + bonusRange}) to warp a unit onto.`,
        isTileTarget: true
      };
    } else {
      const targetTile = targets[0];
      const surrounding = getSurroundingHexes(targetTile);
      const validHexes = surrounding.filter((hex) => unitsOnBoard[hex] !== undefined);
      return {
        validHexes,
        promptMessage: `Realm Warp (Stage 2/2): Click a unit surrounding ${targetTile} to place onto ${targetTile} (friendly units gain up to +3 armour).`
      };
    }
  }

  // 2. Tactical Swap (Vanguard Commander)
  // Stage 1: Target adjacent friendly unit (range 1) to swap with
  if (abilityId === 'tactical_swap') {
    const validTiles = bonusRange > 0 ? getHexesInRange(casterHex, 1, 1 + bonusRange) : getSurroundingHexes(casterHex);
    const validHexes = validTiles.filter((hex) => {
      const u = unitsOnBoard[hex];
      return u && u.owner === activePlayer && hex !== casterHex;
    });
    return {
      validHexes,
      promptMessage: 'Tactical Swap: Click an adjacent friendly unit to swap positions.'
    };
  }

  // 3. Nexus Displacement (Nexus Sorcerer)
  // Stage 1: Friendly unit in range 1-3
  // Stage 2: Enemy unit in range 1-3
  if (abilityId === 'nexus_displacement') {
    const inRange = getHexesInRange(casterHex, 1, 3 + bonusRange);
    if (stage === 1) {
      const validHexes = inRange.filter((hex) => {
        const u = unitsOnBoard[hex];
        return u && u.owner === activePlayer && hex !== casterHex;
      });
      return {
        validHexes,
        promptMessage: `Nexus Displacement (Stage 1/2): Click a friendly unit in range 1-${3 + bonusRange} to swap.`
      };
    } else {
      const validHexes = inRange.filter((hex) => {
        const u = unitsOnBoard[hex];
        return u && u.owner !== activePlayer;
      });
      const firstUnitName = unitsOnBoard[targets[0]]?.card.name || 'friendly unit';
      return {
        validHexes,
        promptMessage: `Nexus Displacement (Stage 2/2): Click an enemy unit in range 1-${3 + bonusRange} to swap with ${firstUnitName}.`
      };
    }
  }

  // 4. Grappling Hook (Corsair Saboteur)
  // Stage 1: Target unit in range 1-3
  // Stage 2: Tiebreak selection if multiple closest empty tiles exist
  if (abilityId === 'grappling_hook') {
    if (stage === 1) {
      const inRange = getHexesInRange(casterHex, 1, 3 + bonusRange);
      const validHexes = inRange.filter((hex) => unitsOnBoard[hex] && hex !== casterHex);
      return {
        validHexes,
        promptMessage: `Grappling Hook (Stage 1): Click a target unit in range 1-${3 + bonusRange}.`
      };
    } else {
      const tiebreakHexes = metadata?.tiebreakEmptyHexes || [];
      const movingCaster = metadata?.movingCaster;
      return {
        validHexes: tiebreakHexes,
        promptMessage: movingCaster
          ? 'Grappling Hook (Stage 2): Target cannot be moved! Choose which closest empty tile surrounding target to move Corsair Saboteur onto.'
          : 'Grappling Hook (Stage 2): Multiple closest empty tiles available. Choose which tile to pull the target onto.',
        isTileTarget: true
      };
    }
  }

  // 5. Spirit Away (Tempest Roc)
  // Stage 1: Choose adjacent unit in range 1 to carry, or click an empty tile in range 1-3 to fly alone
  // Stage 2: Click empty tile in range 1-3 to move Tempest Roc to (if carrying a unit)
  // Stage 3: Click an empty tile surrounding Tempest Roc's new position to place the carried unit
  if (abilityId === 'spirit_away') {
    if (stage === 1) {
      const surrUnits = getSurroundingHexes(casterHex).filter(
        (h) => unitsOnBoard[h] && h !== casterHex
      );
      const emptyInRange = getHexesInRange(casterHex, 1, 3 + bonusRange).filter((h) => !unitsOnBoard[h]);
      return {
        validHexes: [...surrUnits, ...emptyInRange],
        promptMessage: `Spirit Away (Stage 1): Click an adjacent unit to carry, or click an empty tile in range 1-${3 + bonusRange} to fly alone.`
      };
    } else if (stage === 2) {
      const emptyInRange = getHexesInRange(casterHex, 1, 3 + bonusRange).filter((h) => !unitsOnBoard[h]);
      const carriedName = metadata?.carriedUnitHex
        ? unitsOnBoard[metadata.carriedUnitHex]?.card.name || 'carried unit'
        : 'carried unit';
      return {
        validHexes: emptyInRange,
        promptMessage: `Spirit Away (Stage 2): Click an empty tile in range 1-${3 + bonusRange} to fly Tempest Roc with ${carriedName}.`,
        isTileTarget: true
      };
    } else {
      const destinationHex = targets[1];
      const surrEmpty = getSurroundingHexes(destinationHex).filter((h) => !unitsOnBoard[h]);
      const carriedName = metadata?.carriedUnitHex
        ? unitsOnBoard[metadata.carriedUnitHex]?.card.name || 'carried unit'
        : 'carried unit';
      return {
        validHexes: surrEmpty,
        promptMessage: `Spirit Away (Stage 3): Click an empty tile surrounding Tempest Roc to place ${carriedName}.`,
        isTileTarget: true
      };
    }
  }

  // 8. Umbral Flail (Shadowguard)
  // Deals 6 damage (Stage 1). If tile behind target is empty, move there (Stage 2)
  if (abilityId === 'umbral_flail') {
    if (stage === 1) {
      const inRange = getHexesInRange(casterHex, 1, 2 + bonusRange);
      const enemyHexes = inRange.filter((hex) => {
        const u = unitsOnBoard[hex];
        return u && (u.owner !== activePlayer || (hasFeedingFrenzy(unitsOnBoard[casterHex]) && hex !== casterHex));
      });
      return {
        validHexes: enemyHexes,
        promptMessage: `Umbral Flail (Stage 1/2): Click a target in range 1-${2 + bonusRange} (deals 6 damage).`
      };
    } else {
      const behindHex = metadata?.flailTileBehind;
      return {
        validHexes: behindHex ? [behindHex] : [],
        promptMessage: behindHex
          ? `Umbral Flail (Stage 2/2): Click tile ${behindHex} behind target to move Shadowguard there, or click 'Stay Here'.`
          : 'Umbral Flail: Tile behind target is blocked or off board.',
        isOptional: true,
        finishButtonLabel: 'Stay Here',
        isTileTarget: true
      };
    }
  }

  // 9. Boarding Hook (Dreadnought Privateer)
  // Stage 1: Target unit in range 1-3
  // Stage 2: Tiebreak selection if multiple closest empty tiles surrounding Dreadnought Privateer
  if (abilityId === 'boarding_hook') {
    if (stage === 1) {
      const inRange = getHexesInRange(casterHex, 1, 3 + bonusRange);
      const validHexes = inRange.filter((hex) => unitsOnBoard[hex] && hex !== casterHex);
      return {
        validHexes,
        promptMessage: `Boarding Hook (Stage 1): Click a target unit in range 1-${3 + bonusRange}.`
      };
    } else {
      const tiebreakHexes = metadata?.tiebreakEmptyHexes || [];
      return {
        validHexes: tiebreakHexes,
        promptMessage: 'Boarding Hook (Stage 2): Multiple closest empty tiles available. Choose which tile to pull target onto.',
        isTileTarget: true
      };
    }
  }

  // 10. Buddy Tag (Sparring Partners)
  // Switches positions with a surrounding friendly unit (range 1)
  if (abilityId === 'buddy_tag') {
    const validTiles = bonusRange > 0 ? getHexesInRange(casterHex, 1, 1 + bonusRange) : getSurroundingHexes(casterHex);
    const validHexes = validTiles.filter((hex) => {
      const u = unitsOnBoard[hex];
      return u && u.owner === activePlayer && hex !== casterHex;
    });
    return {
      validHexes,
      promptMessage: 'Buddy Tag: Click an adjacent friendly unit to switch positions.'
    };
  }

  // 11. Coin Plink (The Cyclotron)
  // Deals 2 damage. If kill, Stage 2 triggers for another enemy in range 1-4 for 0 AP
  if (abilityId === 'coin_plink') {
    const inRange = getHexesInRange(casterHex, 1, 4 + bonusRange);
    const enemyHexes = inRange.filter((hex) => {
      const u = unitsOnBoard[hex];
      return u && (u.owner !== activePlayer || (hasFeedingFrenzy(unitsOnBoard[casterHex]) && hex !== casterHex));
    });

    if (stage === 1) {
        return {
          validHexes: enemyHexes,
          promptMessage: `Coin Plink (Stage 1): Click a target in range 1-${4 + bonusRange} (deals 2 damage). If it kills, chains to another target!`
        };
      } else {
        return {
          validHexes: enemyHexes,
          promptMessage: `Coin Plink (Kill Chain ${metadata?.killCount || 1}!): Click another target in range 1-${4 + bonusRange} to repeat Coin Plink for free (0 AP), or finish.`,
          isOptional: true,
          finishButtonLabel: 'Finish Coin Plink'
        };
      }
    }

    // 12. Jab and Backstep (Crossbow Fighter)
    // Stage 1: Attack enemy in range 1 (deals 5 damage)
    // Stage 2: Move 1 tile for free after attacking
    if (abilityId === 'jab_and_backstep') {
      if (stage === 1) {
        const maxR = (isFlowingStanceActive(casterUnit) ? 2 : 1) + bonusRange;
        const inRange = getHexesInRange(casterHex, 1, maxR);
        const surrEnemies = inRange.filter((hex) => {
          const u = unitsOnBoard[hex];
          return u && (u.owner !== activePlayer || (hasFeedingFrenzy(unitsOnBoard[casterHex]) && hex !== casterHex));
        });
        return {
          validHexes: surrEnemies,
          promptMessage: `Jab and Backstep (Stage 1/2): Click a target in range 1-${maxR} to deal 5 damage.`
        };
      } else {
        const backstepHexes =
          metadata?.tiebreakEmptyHexes && metadata.tiebreakEmptyHexes.length > 0
            ? metadata.tiebreakEmptyHexes
            : getSurroundingHexes(casterHex).filter((h) => !unitsOnBoard[h]);
        return {
          validHexes: backstepHexes,
          promptMessage: 'Jab and Backstep (Stage 2/2): Click an empty surrounding tile to move 1 tile for free, or click \'Stay Here\'.',
          isOptional: true,
          finishButtonLabel: 'Stay Here',
          isTileTarget: true
        };
      }
    }

    // 13. Deft Swipe (Cutthroat Assassin)
    // Stage 1: Attack enemy in range 1 (deals 6 damage).
    // Stage 2: If from behind, move 1 tile for free after attacking.
    if (abilityId === 'deft_swipe') {
      if (stage === 1) {
        const maxR = (isFlowingStanceActive(casterUnit) ? 2 : 1) + bonusRange;
        const inRange = getHexesInRange(casterHex, 1, maxR);
        const surrEnemies = inRange.filter((hex) => {
          const u = unitsOnBoard[hex];
          return u && (u.owner !== activePlayer || (hasFeedingFrenzy(unitsOnBoard[casterHex]) && hex !== casterHex));
        });
        return {
          validHexes: surrEnemies,
          promptMessage: `Deft Swipe (Stage 1/2): Click a target in range 1-${maxR} to deal 6 damage (if from behind, grants a free 1-tile move afterward).`
        };
      } else {
        const backstepHexes =
          metadata?.tiebreakEmptyHexes && metadata.tiebreakEmptyHexes.length > 0
            ? metadata.tiebreakEmptyHexes
            : getSurroundingHexes(casterHex).filter((h) => !unitsOnBoard[h]);
        return {
          validHexes: backstepHexes,
          promptMessage: 'Deft Swipe (Stage 2/2): Attack made from behind! Click an empty surrounding tile to move 1 tile for free, or click \'Stay Here\'.',
          isOptional: true,
          finishButtonLabel: 'Stay Here',
          isTileTarget: true
        };
      }
    }

    // 14. Lead the Charge (Halberd Fighter)
    // Stage 1: Charge up to 2 tiles ignoring units (final tile unoccupied), moving through enemies deals 5 dmg. Or attack from here.
    // Stage 2: Attack enemy in range 1 (deals 5 damage).
    if (abilityId === 'lead_the_charge') {
      if (stage === 1) {
        let validHexes: string[] = [];
        if (targets.length === 0) {
          const surr = getSurroundingHexes(casterHex);
          const emptyDist2 = getHexesInRange(casterHex, 2, 2).filter((h) => !unitsOnBoard[h]);
          validHexes = [...surr, ...emptyDist2];
        } else if (targets.length === 1) {
          const step1 = targets[0];
          const nextSteps = getSurroundingHexes(step1).filter((h) => h !== casterHex && !unitsOnBoard[h]);
          validHexes = [step1, ...nextSteps];
        } else {
          validHexes = [targets[targets.length - 1]];
        }

        return {
          validHexes,
          promptMessage:
            targets.length === 0
              ? 'Lead the Charge (Stage 1/2): Click a tile to charge up to 2 tiles (ignoring units), or click \'Attack from Here\'.'
              : `Lead the Charge (Stage 1/2): Path: ${targets.join(' → ')}. Click next empty tile, click last to undo, or confirm.`,
          isOptional: true,
          finishButtonLabel: targets.length === 0 ? 'Attack from Here' : `Confirm Charge (${targets.length}) & Attack`,
          isTileTarget: true
        };
      } else {
        const currentHex = casterHex;
        const inRange = bonusRange > 0 ? getHexesInRange(currentHex, 1, 1 + bonusRange) : getSurroundingHexes(currentHex);
        const surrEnemies = inRange.filter((hex) => {
          const u = unitsOnBoard[currentHex];
          return u && (u.owner !== activePlayer || (hasFeedingFrenzy(unitsOnBoard[currentHex]) && hex !== currentHex));
        });
        return {
          validHexes: surrEnemies,
          promptMessage: `Lead the Charge (Stage 2/2): Click an adjacent target in range 1-${1 + bonusRange} to deal 5 damage.`
        };
      }
    }

    // Swooping Pounce (Corrosive Wyvern)
    // Stage 1: Target unit in range 1-2 (enemy or friendly)
    // Stage 2: Pick an empty tile surrounding the target to place the unit using it
    if (abilityId === 'swooping_pounce') {
      if (stage === 1) {
        const inRange = getHexesInRange(casterHex, 1, 2 + bonusRange);
        const validUnits = inRange.filter((hex) => {
          const u = unitsOnBoard[hex];
          return u && hex !== casterHex;
        });
        return {
          validHexes: validUnits,
          promptMessage: `Swooping Pounce (Stage 1/2): Click a target unit in range 1-${2 + bonusRange}.`
        };
      } else {
        const targetHex = targets[0];
        const targetUnit = unitsOnBoard[targetHex];
        const targetName = targetUnit?.card.name || 'target';
        const surrEmpty = getSurroundingHexes(targetHex).filter((h) => !unitsOnBoard[h] || h === casterHex);
        return {
          validHexes: surrEmpty,
          promptMessage: `Swooping Pounce (Stage 2/2): Click an empty tile surrounding ${targetName} to place ${casterUnit?.card.name || 'Corrosive Wyvern'} on that tile.`,
          isTileTarget: true
        };
      }
    }

    // Vaulting Strike (Skirmish Captain)
    // Works the same way as swooping pounce: it is still melee and still only deals 6 damage.
    // Stage 1: Target unit in melee range (range 1, or 2 with Flowing Stance)
    // Stage 2: Pick an empty tile surrounding the target to place the unit using it
    if (abilityId === 'vaulting_strike') {
      if (stage === 1) {
        const maxR = (isFlowingStanceActive(casterUnit) ? 2 : 1) + bonusRange;
        const inRange = getHexesInRange(casterHex, 1, maxR);
        const validUnits = inRange.filter((hex) => {
          const u = unitsOnBoard[hex];
          return u && hex !== casterHex;
        });
        return {
          validHexes: validUnits,
          promptMessage: `Vaulting Strike (Stage 1/2): Click a target unit in range 1-${maxR}.`
        };
      } else {
        const targetHex = targets[0];
        const targetUnit = unitsOnBoard[targetHex];
        const targetName = targetUnit?.card.name || 'target';
        const surrEmpty = getSurroundingHexes(targetHex).filter((h) => !unitsOnBoard[h] || h === casterHex);
        return {
          validHexes: surrEmpty,
          promptMessage: `Vaulting Strike (Stage 2/2): Click an empty tile surrounding ${targetName} to place ${casterUnit?.card.name || 'Skirmish Captain'} on that tile.`,
          isTileTarget: true
        };
      }
    }

    // Sidestepping Crush (Carapace Crusher)
    // Stage 1: Move 1 tile in a direction not yet moved this turn, then gain 2 armour
    // Stage 2: Deal 8 damage to a surrounding enemy unit
    if (abilityId === 'sidestepping_crush') {
      if (stage === 1) {
        const movedDirs = casterUnit?.movedDirectionsThisTurn || [];
        const surrHexes = getSurroundingHexes(casterHex);
        const validTiles = surrHexes.filter((hex) => {
          if (unitsOnBoard[hex]) return false;
          const dir = getHexMovementDirection(casterHex, hex);
          if (dir === null) return false;
          return !movedDirs.includes(dir);
        });
        return {
          validHexes: validTiles,
          promptMessage:
            validTiles.length === 0
              ? 'Sidestepping Crush: No legal empty tiles in a direction not yet moved this turn.'
              : 'Sidestepping Crush (Stage 1/2): Click an empty adjacent tile in an unused direction to move 1 tile and gain 2 armour.',
          isTileTarget: true
        };
      } else {
        const currentHex = casterHex;
        const surrEnemies = getSurroundingHexes(currentHex).filter((hex) => {
          const u = unitsOnBoard[hex];
          return u && (u.owner !== activePlayer || (hasFeedingFrenzy(unitsOnBoard[currentHex]) && hex !== currentHex));
        });
        return {
          validHexes: surrEnemies,
          promptMessage: 'Sidestepping Crush (Stage 2/2): Click a surrounding enemy unit to deal 8 damage.'
        };
      }
    }

  return {
    validHexes: [],
    promptMessage: 'Multi-stage targeting active.'
  };
}
