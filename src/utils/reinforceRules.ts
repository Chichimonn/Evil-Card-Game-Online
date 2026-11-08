import { CardItem } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { getHexDistance } from './hexGridMath';
import { getUnitPassives } from './unitPassives';

/**
 * Tiles a player cannot Reinforce onto because of an enemy passive (e.g. Sealed Gate: "The enemy player cannot
 * Reinforce onto a tile within range 1 of this unit"). Read from { type: 'forbidReinforce', player: 'enemy',
 * tiles: 'withinRange:NOfSelf' }. "Reinforce onto a tile" means wherever the reinforced unit ends up.
 */
export function getSealedReinforceHexes(
  player: PlayerId,
  unitsOnBoard: Record<string, BattlefieldUnit>
): Set<string> {
  const sealed = new Set<string>();
  Object.entries(unitsOnBoard).forEach(([sealerHex, unit]) => {
    getUnitPassives(unit).forEach((p) => {
      (p.effects || []).forEach((e: any) => {
        if (e.type !== 'forbidReinforce') return;
        const appliesToPlayer = e.player === 'enemy' ? unit.owner !== player : e.player === 'self' ? unit.owner === player : true;
        if (!appliesToPlayer) return;
        const m = String(e.tiles || 'withinRange:1OfSelf').match(/withinRange:(\d+)OfSelf/);
        const range = m ? parseInt(m[1], 10) : 1;
        // Every board tile within range of the sealing unit
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col) => {
          for (let row = 1; row <= 6; row++) {
            const hex = `${col}${row}`;
            if (hex !== sealerHex && getHexDistance(sealerHex, hex) <= range) sealed.add(hex);
          }
        });
      });
    });
  });
  return sealed;
}

// Check if a unit matches a requirement string (e.g. "Knight", "Assassin", "Sage", "Fighter", "Plunderer")
export function unitMatchesRequirement(unit: BattlefieldUnit, reqString: string): boolean {
  if (!unit || !unit.card || !reqString) return false;
  const token = reqString.trim().toLowerCase();
  // Asterisk '*' or 'any' wildcard allows promoting ANY unit (e.g. Frenzied Burster)
  if (token === '*' || token === 'any' || token === 'all') return true;

  const name = unit.card.name.toLowerCase();
  const id = unit.card.id.toLowerCase();
  const type = unit.card.type ? unit.card.type.toLowerCase() : '';
  const hasClassTag = unit.card.classTags?.some((t) => t.toLowerCase() === token);

  return name.includes(token) || id.includes(token) || type.includes(token) || !!hasClassTag;
}

/**
 * Tribute class requirements (e.g. Burning Rager, requirement [["Flaming"]]): each requirement slot needs its own
 * sacrificed unit matching one of its options; the remaining sacrifices can be any basic unit. Returns how many slots
 * these units leave unmatched (0 = requirement met).
 */
export function countUnmetTributeSlots(card: CardItem, units: BattlefieldUnit[]): number {
  const slots = card.reinforce?.requirement || [];
  const used = new Set<number>();
  let unmet = 0;
  slots.forEach((options) => {
    const idx = units.findIndex((u, i) => !used.has(i) && options.some((req) => unitMatchesRequirement(u, req)));
    if (idx >= 0) used.add(idx);
    else unmet += 1;
  });
  return unmet;
}

// Extract flat requirement list from card's reinforce config
export function getRequirementsList(card: CardItem): string[] {
  if (!card.reinforce?.requirement) return [];
  const req = card.reinforce.requirement;
  const list: string[] = [];

  if (Array.isArray(req)) {
    req.forEach((item) => {
      if (Array.isArray(item)) {
        item.forEach((subItem) => {
          if (typeof subItem === 'string') list.push(subItem);
        });
      } else if (typeof item === 'string') {
        list.push(item);
      }
    });
  }
  return list;
}

// Check if a friendly unit on board is a valid Promote target for the given promote card
/**
 * "This unit may promote into any promote unit. If that unit does not promote an ooze, doing this deals 6 damage to
 * the new unit" (e.g. Forced Metamorphosis): { type: 'promotableByAnyPromoteUnit', damageIfRequirementIsNot, amount }.
 */
export function canPromoteIntoAny(unit: BattlefieldUnit): boolean {
  return [...(unit.card.passives || [])].some((p) => (p.effects || []).some((e: any) => e.type === 'promotableByAnyPromoteUnit'));
}

/** Damage the new unit takes when it promoted `unit` only through such a passive (0 if it qualified anyway). */
export function getForcedPromotionDamage(promoteCard: CardItem, unit: BattlefieldUnit): number {
  const reqList = getRequirementsList(promoteCard);
  if (reqList.some((req) => unitMatchesRequirement(unit, req))) return 0;
  for (const p of unit.card.passives || []) {
    const e: any = (p.effects || []).find((x: any) => x.type === 'promotableByAnyPromoteUnit');
    if (!e) continue;
    const needs = String(e.damageIfRequirementIsNot || '').toLowerCase();
    const promotesThat = reqList.some((r) => r.toLowerCase() === needs);
    return promotesThat ? 0 : typeof e.amount === 'number' ? e.amount : 0;
  }
  return 0;
}

export function getValidPromoteTargets(
  promoteCard: CardItem,
  unitsOnBoard: Record<string, BattlefieldUnit>,
  activePlayer: PlayerId
): string[] {
  if (!promoteCard || promoteCard.reinforce?.mode !== 'promote') return [];
  const reqList = getRequirementsList(promoteCard);
  if (reqList.length === 0) return [];

  const validHexes: string[] = [];

  Object.entries(unitsOnBoard).forEach(([hexId, unit]) => {
    if (unit.owner === activePlayer && !unit.card.isWall) {
      if (unit.statuses?.includes('cannot_promote_or_fuse')) {
        return;
      }
      // Must match at least one requirement in the list, or be able to promote into any promote unit (e.g. Forced
      // Metamorphosis)
      const matches = reqList.some((req) => unitMatchesRequirement(unit, req)) || canPromoteIntoAny(unit);
      if (matches) {
        validHexes.push(hexId);
      }
    }
  });

  return validHexes;
}

import { getSurroundingHexes } from './hexGridMath';

// Find if player has all required materials in play for a Fusion card
export interface FusionCombination {
  hexes: string[];
  totalDamage: number;
}

export interface FusionCheckResult {
  canFuse: boolean;
  requiredMaterials: string[];
  materialHexes: string[];
  validCombinations: FusionCombination[];
  reason?: string;
}

export function checkFusionMaterials(
  fusionCard: CardItem,
  unitsOnBoard: Record<string, BattlefieldUnit>,
  activePlayer: PlayerId
): FusionCheckResult {
  if (!fusionCard || fusionCard.reinforce?.mode !== 'fusion') {
    return { canFuse: false, requiredMaterials: [], materialHexes: [], validCombinations: [] };
  }

  const rawReq = fusionCard.reinforce.requirement || [];
  const requiredCount = fusionCard.reinforce.count || (Array.isArray(rawReq) ? rawReq.length : 2);

  // Flatten requirements for display
  const requiredMaterials: string[] = [];
  if (Array.isArray(rawReq)) {
    rawReq.forEach((item) => {
      if (Array.isArray(item)) {
        item.forEach((sub) => {
          if (typeof sub === 'string') requiredMaterials.push(sub === '*' ? 'Any Basic Unit' : sub);
        });
      } else if (typeof item === 'string') {
        requiredMaterials.push(item === '*' ? 'Any Basic Unit' : item);
      }
    });
  }

  // Friendly units that are strictly Basic units on your side of the board
  // Player 1's side is Rows 1-3; Player 2's side is Rows 4-6
  const friendlyBasicUnits = Object.entries(unitsOnBoard)
    .filter(([hexId, u]) => {
      if (u.owner !== activePlayer || u.card.isWall) return false;
      if (u.statuses?.includes('cannot_promote_or_fuse')) return false;
      const isBasic = u.card.basic !== false && (u.card.basic || u.card.reinforce?.mode === 'basic' || !u.card.reinforce);
      if (!isBasic) return false;

      const rowNum = parseInt(hexId.slice(1), 10);
      const isOnPlayerSide = activePlayer === 'player1' ? rowNum <= 3 : rowNum >= 4;
      return isOnPlayerSide;
    })
    .map(([hexId, unit]) => ({ hexId, unit }));

  const playerSideDesc = activePlayer === 'player1' ? 'Rows 1-3' : 'Rows 4-6';

  if (friendlyBasicUnits.length < requiredCount) {
    return {
      canFuse: false,
      requiredMaterials,
      materialHexes: [],
      validCombinations: [],
      reason: `Requires ${requiredCount} friendly Basic units on your side of the board (${playerSideDesc}) matching (${requiredMaterials.join(', ')}).`
    };
  }

  // Helper to generate combinations of size k
  function getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const head = arr[0];
    const tail = arr.slice(1);
    const withHead = getCombinations(tail, k - 1).map((c) => [head, ...c]);
    const withoutHead = getCombinations(tail, k);
    return [...withHead, ...withoutHead];
  }

  // Check if a unit matches a requirement slot
  function unitMatchesSlot(u: BattlefieldUnit, slotReq: string | string[]): boolean {
    if (Array.isArray(slotReq)) {
      return slotReq.some((req) => unitMatchesRequirement(u, req));
    }
    return unitMatchesRequirement(u, slotReq);
  }

  // Check if candidate group matches requirements
  function matchesRequirements(group: typeof friendlyBasicUnits): boolean {
    if (!Array.isArray(rawReq) || rawReq.length === 0) return true;

    if (rawReq.length === 1) {
      // All units in group must match rawReq[0]
      const slotReq = rawReq[0];
      return group.every((item) => unitMatchesSlot(item.unit, slotReq));
    }

    // Multiple slots: find 1-to-1 matching
    const slots = rawReq.slice(0, group.length);
    function canMatch(unitIdx: number, usedSlots: Set<number>): boolean {
      if (unitIdx === group.length) return true;
      const currentUnit = group[unitIdx].unit;
      for (let s = 0; s < slots.length; s++) {
        if (!usedSlots.has(s) && unitMatchesSlot(currentUnit, slots[s])) {
          usedSlots.add(s);
          if (canMatch(unitIdx + 1, usedSlots)) return true;
          usedSlots.delete(s);
        }
      }
      return false;
    }

    return canMatch(0, new Set());
  }

  // Check position: "all beside at least one other" (adjacent tiles and connected component)
  function isBesideAtLeastOneOther(group: typeof friendlyBasicUnits): boolean {
    if (group.length <= 1) return true;
    for (const item of group) {
      const surrounding = getSurroundingHexes(item.hexId);
      const hasAdjacent = group.some((other) => other.hexId !== item.hexId && surrounding.includes(other.hexId));
      if (!hasAdjacent) return false;
    }

    // Connected cluster check
    const visited = new Set<string>();
    const queue = [group[0].hexId];
    visited.add(group[0].hexId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const surrounding = getSurroundingHexes(current);
      for (const item of group) {
        if (!visited.has(item.hexId) && surrounding.includes(item.hexId)) {
          visited.add(item.hexId);
          queue.push(item.hexId);
        }
      }
    }
    return visited.size === group.length;
  }

  const allCombinations = getCombinations(friendlyBasicUnits, requiredCount);
  const validCombinations: FusionCombination[] = [];
  const allValidHexes = new Set<string>();

  let adjacencyFailed = false;
  let damageFailed = false;

  for (const combo of allCombinations) {
    if (!matchesRequirements(combo)) continue;

    if (!isBesideAtLeastOneOther(combo)) {
      adjacencyFailed = true;
      continue;
    }

    const totalDamage = combo.reduce((sum, item) => sum + item.unit.damageCounters, 0);
    // Damage check: must have little enough damage not to kill the fusion unit
    if (totalDamage >= fusionCard.hp) {
      damageFailed = true;
      continue;
    }

    validCombinations.push({
      hexes: combo.map((item) => item.hexId),
      totalDamage
    });
    combo.forEach((item) => allValidHexes.add(item.hexId));
  }

  let failReason: string | undefined;
  if (validCombinations.length === 0) {
    if (damageFailed && !adjacencyFailed) {
      failReason = `Combined damage of material units is too high (would defeat ${fusionCard.name} with ${fusionCard.hp} HP).`;
    } else if (adjacencyFailed) {
      failReason = `Material basic units must be on your side of the board and all beside at least one other (adjacent).`;
    } else {
      failReason = `Requires ${requiredCount} friendly Basic units on your side of the board matching (${requiredMaterials.join(', ')}).`;
    }
  }

  return {
    canFuse: validCombinations.length > 0,
    requiredMaterials,
    materialHexes: Array.from(allValidHexes),
    validCombinations,
    reason: failReason
  };
}

/**
 * Formats fusion unit card requirements, clearly specifying which types of units are needed
 * and differentiating between separate slots (1 type + 1 other type) and flexible options (and/or).
 *
 * Examples:
 * - Gateway Guardians: "2 Knight"
 * - Blade Singer: "2 Mage and/or Fighter"
 * - Magnetic Marauder: "1 Mage + 1 Plunderer"
 * - Cannon Squadron: "3 Knight and/or Plunderer"
 * - The Cyclotron: "3 Cook, Engineer, Camper, and/or Correspondent"
 * - Faceless King: "3 Any Basic Unit"
 */
/**
 * A tribute's full requirement, e.g. "Tribute 2, at least 1 Flaming": the count of basic units sacrificed, plus
 * one "at least" per class slot (identical slots are counted together, e.g. "at least 2 Plant").
 */
export function formatTributeRequirements(card?: CardItem | null): string {
  if (!card || card.reinforce?.mode !== 'tribute') return '';
  const count = card.reinforce.count || 2;
  const slotCounts = new Map<string, number>();
  (card.reinforce.requirement || []).forEach((options) => {
    const label = options.map((o) => (o === '*' ? 'Any' : o)).join(' or ');
    slotCounts.set(label, (slotCounts.get(label) || 0) + 1);
  });
  const extras = Array.from(slotCounts, ([label, n]) => `at least ${n} ${label}`);
  return [`Tribute ${count}`, ...extras].join(', ');
}

export function formatFusionRequirements(card?: CardItem | null): string {
  if (!card || card.reinforce?.mode !== 'fusion') return '';
  const rawReq = card.reinforce.requirement || [];
  const count = card.reinforce.count || 2;

  // Case 1: Multiple slots in requirement array (e.g. [["Mage"], ["Plunderer"]])
  // Each slot is a distinct requirement, joined by " + "
  if (Array.isArray(rawReq) && rawReq.length > 1) {
    const parts = rawReq.map((slot) => {
      if (Array.isArray(slot)) {
        if (slot.length === 1) {
          const name = slot[0] === '*' ? 'Any Unit' : slot[0];
          return `1 ${name}`;
        } else {
          const names = slot.map((s) => (s === '*' ? 'Any Unit' : s)).join(' or ');
          return `1 (${names})`;
        }
      } else {
        const name = slot === '*' ? 'Any Unit' : String(slot);
        return `1 ${name}`;
      }
    });
    return parts.join(' + ');
  }

  // Case 2: Single slot in requirement array with count (e.g. [["Mage", "Fighter"]], count: 2)
  if (Array.isArray(rawReq) && rawReq.length === 1) {
    const slot = rawReq[0];
    if (Array.isArray(slot)) {
      if (slot.length === 1) {
        const name = slot[0] === '*' ? 'Any Basic Unit' : slot[0];
        return `${count} ${name}`;
      } else if (slot.length === 2) {
        return `${count} ${slot[0]} and/or ${slot[1]}`;
      } else {
        const last = slot[slot.length - 1];
        const rest = slot.slice(0, -1).join(', ');
        return `${count} ${rest}, and/or ${last}`;
      }
    } else {
      const name = slot === '*' ? 'Any Basic Unit' : String(slot);
      return `${count} ${name}`;
    }
  }

  return `${count} Materials`;
}
