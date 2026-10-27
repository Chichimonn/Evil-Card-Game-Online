import { CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import {
  parseHexId,
  offsetToCube,
  getSurroundingHexes
} from './hexGridMath';

export interface ChargeFlightSpec {
  possiblePathLengths: number[];
  damage: number; // Configurable damage variable (defaults to 8)
  requireExactlyOneTurn: boolean;
  noReversal: boolean;
  finalTileMustBeEmpty: boolean;
  mayMoveOverUnits: boolean;
  // Every tile of the path stays in this unit's row (e.g. Log Roll: "moves up to 3 tiles within the same row")
  sameRowOnly?: boolean;
}

/**
 * Checks whether an ability is Mounted Charge, Drake's Flight, or any shared Charge/Flight variant.
 */
export function isChargeFlightAbility(ability?: CardAbility | null): boolean {
  if (!ability) return false;
  const id = ability.id?.toLowerCase() || '';
  const name = ability.name?.toLowerCase() || '';
  if (id === 'mounted_charge' || name.includes('mounted charge')) return true;
  if (id === 'drakes_flight' || name.includes("drake's flight") || name.includes('drakes flight')) return true;
  if ((ability as any).isChargeFlight === true) return true;
  return Boolean(
    ability.effects?.some(
      (e: any) => e.type === 'move' && ((e.path?.directionChanges === 1 && e.path?.noReversal) || e.path?.sameRow)
    )
  );
}

/**
 * Extracts configuration for Charge/Flight abilities.
 * Keeps damage as a configurable variable (defaults to 8 for existing abilities).
 */
export function getChargeFlightSpec(ability?: CardAbility | null): ChargeFlightSpec {
  const defaultDamage = 8;
  if (!ability) {
    return {
      possiblePathLengths: [3],
      damage: defaultDamage,
      requireExactlyOneTurn: true,
      noReversal: true,
      finalTileMustBeEmpty: true,
      mayMoveOverUnits: true
    };
  }

  const id = ability.id?.toLowerCase() || '';
  const name = ability.name?.toLowerCase() || '';
  const moveEffect = ability.effects?.find((e: any) => e.type === 'move') as any;

  // Damage variable: read from effect, ability property, or fallback to 8
  let damage = defaultDamage;
  if (typeof moveEffect?.damageToUnitsMovedOver === 'number') {
    damage = moveEffect.damageToUnitsMovedOver;
  } else if (typeof (ability as any).damage === 'number') {
    damage = (ability as any).damage;
  }

  // Path lengths: Mounted Charge is [3], Drake's Flight is [3, 4]
  let possiblePathLengths: number[] = [3];
  if (id === 'mounted_charge' || name.includes('mounted charge')) {
    possiblePathLengths = [3];
  } else if (id === 'drakes_flight' || name.includes("drake's flight") || name.includes('drakes flight')) {
    possiblePathLengths = [3, 4];
  } else if (moveEffect?.distance) {
    if (typeof moveEffect.distance === 'number') {
      possiblePathLengths = [moveEffect.distance];
    } else if (typeof moveEffect.distance.min === 'number' && typeof moveEffect.distance.max === 'number') {
      possiblePathLengths = [];
      for (let d = moveEffect.distance.min; d <= moveEffect.distance.max; d++) {
        possiblePathLengths.push(d);
      }
    } else if (Array.isArray(moveEffect.distance)) {
      possiblePathLengths = moveEffect.distance;
    }
  }

  return {
    possiblePathLengths,
    damage,
    requireExactlyOneTurn:
      moveEffect?.path?.directionChanges !== undefined
        ? moveEffect.path.directionChanges === 1
        : true,
    noReversal:
      moveEffect?.path?.noReversal !== undefined
        ? Boolean(moveEffect.path.noReversal)
        : true,
    finalTileMustBeEmpty:
      moveEffect?.finalTileMustBeEmpty !== undefined
        ? Boolean(moveEffect.finalTileMustBeEmpty)
        : true,
    mayMoveOverUnits:
      moveEffect?.mayMoveOverUnits !== undefined
        ? Boolean(moveEffect.mayMoveOverUnits)
        : true,
    sameRowOnly: Boolean(moveEffect?.path?.sameRow)
  };
}

/**
 * Returns the cube direction vector from hexA to hexB (must be adjacent).
 */
export function getStepDirection(
  hexA: string,
  hexB: string
): { dq: number; dr: number; ds: number } | null {
  const pA = parseHexId(hexA);
  const pB = parseHexId(hexB);
  if (!pA || !pB) return null;
  const a = offsetToCube(pA.col, pA.rowIdx);
  const b = offsetToCube(pB.col, pB.rowIdx);
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const ds = b.s - a.s;
  if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) !== 1) return null;
  return { dq, dr, ds };
}

export function areDirectionsEqual(
  v1: { dq: number; dr: number; ds: number },
  v2: { dq: number; dr: number; ds: number }
): boolean {
  return v1.dq === v2.dq && v1.dr === v2.dr && v1.ds === v2.ds;
}

export function areDirectionsOpposite(
  v1: { dq: number; dr: number; ds: number },
  v2: { dq: number; dr: number; ds: number }
): boolean {
  return v1.dq === -v2.dq && v1.dr === -v2.dr && v1.ds === -v2.ds;
}

/**
 * Analyzes a sequence of steps starting from casterHex through path.
 */
export function analyzePathTurns(
  casterHex: string,
  path: string[]
): {
  turnCount: number;
  hasReversal: boolean;
  hasDuplicate: boolean;
  isContinuous: boolean;
  directions: { dq: number; dr: number; ds: number }[];
} {
  const directions: { dq: number; dr: number; ds: number }[] = [];
  let hasReversal = false;
  let hasDuplicate = false;
  let isContinuous = true;
  let turnCount = 0;

  const seen = new Set<string>([casterHex]);

  for (let i = 0; i < path.length; i++) {
    const prev = i === 0 ? casterHex : path[i - 1];
    const curr = path[i];

    if (seen.has(curr)) {
      hasDuplicate = true;
    }
    seen.add(curr);

    const dir = getStepDirection(prev, curr);
    if (!dir) {
      isContinuous = false;
      continue;
    }
    directions.push(dir);

    if (directions.length > 1) {
      const prevDir = directions[directions.length - 2];
      if (areDirectionsOpposite(prevDir, dir)) {
        hasReversal = true;
      } else if (!areDirectionsEqual(prevDir, dir)) {
        turnCount++;
      }
    }
  }

  return {
    turnCount,
    hasReversal,
    hasDuplicate,
    isContinuous,
    directions
  };
}

/**
 * Validates whether a completed path is fully legal according to the spec:
 * - Length matches one of possiblePathLengths
 * - No turning back (no 180° reversal, no duplicate tiles)
 * - Exactly 1 turn (direction changes exactly once)
 * - Final destination tile must be empty (leaves unit alone on tile)
 */
export function validateChargeFlightPath(
  casterHex: string,
  path: string[],
  spec: ChargeFlightSpec,
  unitsOnBoard: Record<string, BattlefieldUnit>
): { valid: boolean; reason?: string } {
  if (path.length === 0) {
    return { valid: false, reason: 'Select sequential tiles to draw the path.' };
  }

  const lengthOk = spec.possiblePathLengths.includes(path.length);
  if (!lengthOk) {
    const lengthsStr = spec.possiblePathLengths.join(' or ');
    return {
      valid: false,
      reason: `Path length must be ${lengthsStr} tiles (currently ${path.length}).`
    };
  }

  const analysis = analyzePathTurns(casterHex, path);

  if (!analysis.isContinuous) {
    return { valid: false, reason: 'All path tiles must be directly adjacent in sequence.' };
  }

  if (analysis.hasDuplicate) {
    return { valid: false, reason: 'Path cannot revisit tiles or turn back onto previous tiles.' };
  }

  if (analysis.hasReversal && spec.noReversal) {
    return { valid: false, reason: 'Unit cannot turn back the way it came.' };
  }

  if (spec.requireExactlyOneTurn) {
    if (analysis.turnCount === 0) {
      return {
        valid: false,
        reason: 'Path must change direction exactly once (cannot move in a straight line).'
      };
    }
    if (analysis.turnCount > 1) {
      return {
        valid: false,
        reason: `Path must change direction exactly once (made ${analysis.turnCount} turns).`
      };
    }
  }

  const finalTile = path[path.length - 1];
  if (spec.finalTileMustBeEmpty && unitsOnBoard[finalTile]) {
    const occupant = unitsOnBoard[finalTile];
    return {
      valid: false,
      reason: `Destination tile ${finalTile} is occupied by ${occupant.card.name}. The final tile must be empty.`
    };
  }

  return { valid: true };
}

/**
 * Returns all valid next tiles that can legally extend the current path.
 */
export function getNextChargeFlightHexes(
  casterHex: string,
  path: string[],
  spec: ChargeFlightSpec,
  unitsOnBoard: Record<string, BattlefieldUnit>
): string[] {
  const maxLength = Math.max(...spec.possiblePathLengths);
  if (path.length >= maxLength) return [];

  const currentTip = path.length === 0 ? casterHex : path[path.length - 1];
  const neighbors = getSurroundingHexes(currentTip);
  const seenTiles = new Set<string>([casterHex, ...path]);
  const currentAnalysis = analyzePathTurns(casterHex, path);

  const validNext: string[] = [];

  const casterRow = casterHex.slice(1);
  for (const cand of neighbors) {
    if (seenTiles.has(cand)) continue;
    if (spec.sameRowOnly && cand.slice(1) !== casterRow) continue;

    const candDir = getStepDirection(currentTip, cand);
    if (!candDir) continue;

    const nextLength = path.length + 1;

    // Check reversal
    if (currentAnalysis.directions.length > 0) {
      const lastDir = currentAnalysis.directions[currentAnalysis.directions.length - 1];
      if (areDirectionsOpposite(lastDir, candDir)) continue; // Reversal forbidden
    }

    const isTurn =
      currentAnalysis.directions.length > 0 &&
      !areDirectionsEqual(currentAnalysis.directions[currentAnalysis.directions.length - 1], candDir);

    const nextTurnCount = currentAnalysis.turnCount + (isTurn ? 1 : 0);

    // If it already turned once, it cannot turn again! (paths with free turns, e.g. along a row, don't count turns)
    if (spec.requireExactlyOneTurn && nextTurnCount > 1) continue;

    // If this candidate would be the maximum length of the path:
    if (nextLength === maxLength) {
      // Must have exactly 1 turn total!
      if (spec.requireExactlyOneTurn && nextTurnCount !== 1) continue;
      // Final tile must be unoccupied
      if (spec.finalTileMustBeEmpty && unitsOnBoard[cand]) continue;
    }

    // If this candidate reaches a possible completion length (e.g. 3 for Drake's Flight which can end at 3 or 4)
    // If it is occupied, it can only be chosen if the path can legally continue further!
    if (spec.possiblePathLengths.includes(nextLength)) {
      if (unitsOnBoard[cand]) {
        // Must be able to take at least one more step to reach a valid empty final tile
        if (nextLength >= maxLength) continue;
      }
    }

    validNext.push(cand);
  }

  return validNext;
}

/**
 * Handles extending or undoing a path step when a hex is clicked.
 */
export function extendChargeFlightPath(
  casterHex: string,
  path: string[],
  clickedHex: string,
  spec: ChargeFlightSpec,
  unitsOnBoard: Record<string, BattlefieldUnit>
): { newPath: string[]; error?: string; executed?: boolean } {
  // If clicking the current last tile, undo that step
  if (path.length > 0 && path[path.length - 1] === clickedHex) {
    return { newPath: path.slice(0, -1) };
  }

  // If clicking an earlier tile in the path, roll back to that tile
  const existingIdx = path.indexOf(clickedHex);
  if (existingIdx >= 0) {
    return { newPath: path.slice(0, existingIdx + 1) };
  }

  // Check if clickedHex is among the legal next hexes
  const validNext = getNextChargeFlightHexes(casterHex, path, spec, unitsOnBoard);
  if (!validNext.includes(clickedHex)) {
    // Provide a helpful explanation of why
    const currentTip = path.length === 0 ? casterHex : path[path.length - 1];
    const isAdjacent = getSurroundingHexes(currentTip).includes(clickedHex);
    if (!isAdjacent) {
      return { newPath: path, error: 'Next tile must be adjacent to the current path end.' };
    }
    if (clickedHex === casterHex || path.includes(clickedHex)) {
      return { newPath: path, error: 'Cannot revisit already selected tiles.' };
    }
    const currentAnalysis = analyzePathTurns(casterHex, path);
    if (currentAnalysis.turnCount >= 1) {
      return {
        newPath: path,
        error: 'Path has already changed direction once. All remaining steps must continue straight.'
      };
    }
    if (path.length + 1 === Math.max(...spec.possiblePathLengths) && unitsOnBoard[clickedHex]) {
      return { newPath: path, error: 'Destination tile must be empty (cannot end on a unit).' };
    }
    return { newPath: path, error: 'That tile is not a legal step for this path.' };
  }

  return { newPath: [...path, clickedHex] };
}
