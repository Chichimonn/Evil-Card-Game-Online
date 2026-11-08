import { CardItem, CardAbility, CardPassive } from './card';

export type PlayerId = 'player1' | 'player2';

export interface ReflectStance {
  sourceAbilityName: string;
  triggerType: 'ranged' | 'range1' | 'all';
  once?: boolean;
  expiresOnTurnEndFor: PlayerId;
  preventUpTo?: number;
}

export interface BattlefieldUnit {
  instanceId: string;
  card: CardItem;
  owner: PlayerId;
  hexId: string;
  damageCounters: number;
  armour: number;
  currentAp: number;
  baseMaxHp?: number;
  usedUniversalDrawThisTurn?: boolean;
  promotedCards?: CardItem[];
  usedTurnCounts?: Record<string, number>;
  usedOnTargets?: Record<string, string[]>; // abilityId -> target instanceIds hit this turn
  grantedAbilities?: CardAbility[];
  chosenPassive?: CardPassive | null;
  reflectStance?: ReflectStance | null;
  statuses?: string[];
  tookDamageThisTurn?: boolean;
  movedThisTurn?: boolean;
  movedDirectionsThisTurn?: number[];
  movesThisTurn?: number; // how many times this unit has moved this turn (each move action or moving ability)
  tilesMovedThisTurn?: number; // tiles this unit has moved this turn, from any move source (path length, else distance)
  attacksUsedThisTurn?: number;
  readyStance?: { sourceAbilityName: string; preventUpTo: number; expiresOnTurnEndFor: PlayerId } | null;
  lockedIn?: boolean;
  bonusRangeThisTurn?: number;
  turnStartingAp?: number;
  lockedAbilities?: Record<string, { abilityId: string; sourceAbilityName?: string; lockedForPlayer: PlayerId; turnsRemaining: number }>;
  deathMark?: { casterInstanceId: string; casterOwner: PlayerId; bonusDamage: number } | null;
  // e.g. Perfect Form: buffs for this unit's next attack / next armour ability; cleared at the end of every turn
  // knockbackOnLastHit: e.g. Unstoppable Charge's next attack also inflicts knockback on its last hit
  nextAttackBonus?: { amount: number; scope: 'allHits' | 'firstHit'; source: string; knockbackOnLastHit?: number } | null;
  nextArmourAbilityBonus?: { amount: number; source: string } | null;
  killedEnemyThisTurn?: boolean; // e.g. Relentless Rage: this unit killed an enemy unit this turn; cleared at turn end
  turnStartKey?: number; // the turn whose turn-start passives this unit already resolved (they run once per turn)
  passiveTurnMarks?: Record<string, number>; // passive id -> turn number it last triggered (for "the first time each turn")
  // e.g. Target Acquired: the next attack that hits this unit this turn deals this much more per hit; cleared at turn end
  damageMark?: { bonusPerHit: number; sourceName: string };
  // e.g. Ready Spell: the own ability this unit may use for free to interrupt enemy abilities during expiresOnTurnEndFor's turn
  readySpell?: {
    abilityId: string;
    abilityName: string;
    sourceName: string;
    cost: number;
    expiresOnTurnEndFor: PlayerId;
    once?: boolean; // used up after one interrupt
    onAnyAction?: boolean; // interrupts moves and draws too, not only abilities
  } | null;
  damageOnTakingTurn?: number; // e.g. Flame Blast: takes this much damage if it takes its controller's next turn; cleared when that turn ends
  firstHitReduction?: number; // e.g. Predictive Strike: this unit's attacks deal this much less on the first hit; cleared when its owner's turn ends
  knockbackImmuneThisTurn?: boolean; // e.g. Hold the Gate chosen, Brace for Impact: cleared when a turn of its opponent ends
  knockedBackBy?: { instanceId: string; turn: number }; // the unit that last knocked it back, and on which turn (e.g. Crescent Blade)
  engulfedCard?: CardItem | null; // e.g. Engulf: the enemy unit placed under this one (out of play; counts as its promoted unit)
  engulfedOwner?: PlayerId; // who controls the engulfed unit when it takes this unit's place (on this unit's death)
  // e.g. Hidden Strings: the unit this one picked up by moving onto its tile (out of play while carried), and the last
  // empty tile this unit left, where the carried unit is put down when the turn ends (or when this unit leaves play)
  carriedUnit?: { unit: BattlefieldUnit; lastLeftHex?: string; sourceName: string };
  // The directions this unit has moved in on a turn, for "moves in a direction for the first time each turn" (e.g. Conductive Charge)
  moveDirectionLog?: { turn: number; dirs: number[] };
  forecastAbilityId?: string;
  // e.g. Parasitic Enzyme: the caster's attacks against this unit deal more per hit this turn, and it heals if this dies
  attackerMark?: { casterInstanceId: string; bonusPerHit: number; turn: number; sourceName: string; healCasterOnDeath?: number };
  // e.g. Ethereal Guard: takes this much less from each attack; cleared when a turn of its opponent ends
  attackDamageReduction?: { amount: number; sourceName: string; setOnTurnOf?: PlayerId };
  lockStepBy?: string; // e.g. Lock-Step: the unit that follows this one's moves; cleared when its owner's turn ends
  dealtDamageThisTurn?: boolean; // this unit dealt damage this turn (e.g. Combat Roll); cleared at the end of every turn // e.g. Critical Forecast: the 1AP ability chosen this turn, whose first use repeats for free
  cannotInflictKnockbackNextOwnTurn?: boolean; // e.g. Hold the Gate drawback: cleared when the owner's next turn ends
}

export type GamePhase = 'coin_flip' | 'setup' | 'playing' | 'game_over';

export interface CoinFlipState {
  isFlipping: boolean;
  caller: PlayerId;
  calledSide: 'heads' | 'tails' | null;
  flipResult: 'heads' | 'tails' | null;
  winner: PlayerId | null;
  firstPlayer: PlayerId | null;
}
