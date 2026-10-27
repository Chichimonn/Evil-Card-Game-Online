export interface AbilityModifier {
  if?: string;
  addAmount?:
    | number
    | { perTarget?: number; perExtraTarget?: number; perTileMovedThisTurn?: number; perPreviousUseThisTurn?: number };
  minAmount?: number;
  setAmount?: number;
  setHits?: number;
  setBypassArmour?: boolean;
  scope?: string;
  [key: string]: unknown;
}

export interface AbilityEffect {
  type: string;
  amount?: number | string | Record<string, unknown>;
  hits?: number | Record<string, unknown>;
  target?: string;
  tile?: string;
  area?: string;
  duration?: string;
  modifiers?: AbilityModifier[];
  // Where the effect comes from, tagged at load (see utils/effectSources). Not `source`: card data already uses
  // that key for other things (e.g. useAbility's source: 'promotedCards').
  origin?: 'passive' | 'ability' | 'react' | 'universalAction';
  [key: string]: unknown;
}

export interface CardAbility {
  id: string;
  name: string;
  cost: number | number[];
  selectedCost?: number;
  // AP a free ability resolves "as though spent" (per-AP amounts), while it costs nothing to use
  apSpentAs?: number;
  // On a provider's free ability: the promoted ability it uses (its once-per-turn limit is per ability, not provider)
  promotedAbilityId?: string;
  // A readied ability used for free as a react on the opponent's turn (e.g. Ready Spell): no "this turn" limits apply
  readiedReact?: boolean;
  baseAbilityId?: string;
  tags?: string[];
  range?: number[];
  rangeText?: string;
  target?: string;
  targetText?: string;
  targetCount?: string | number | Record<string, unknown>;
  straightLine?: boolean;
  isMultiStage?: boolean;
  usesPath?: boolean;
  pathRule?: 'straight' | 'any';
  requires?: string;
  limits?: {
    oncePerTurn?: boolean;
    maxPerTurn?: number;
    [key: string]: unknown;
  };
  text: string;
  allowEmptyTileTarget?: boolean;
  effects?: AbilityEffect[];
  [key: string]: unknown;
}

export interface CardPassive {
  id: string;
  name: string;
  trigger?: string;
  optional?: boolean;
  limits?: {
    oncePerTurn?: boolean;
    oncePerPlayerTurn?: boolean;
    firstAttackEachTurn?: boolean;
    firstTimeEachTurn?: boolean;
    [key: string]: unknown;
  };
  text: string;
  effects?: AbilityEffect[];
  [key: string]: unknown;
}

export interface ReinforceRequirement {
  mode: 'basic' | 'promote' | 'fusion' | 'tribute';
  count?: number;
  requirement?: string[][];
  timing?: string;
  [key: string]: unknown;
}

export interface CardItem {
  id: string;
  name: string;
  type?: string;
  // Card set it was released in, e.g. 'Realms of Man' or 'Wrath of the Elements'
  set?: string;
  basic?: boolean;
  classTags?: string[];
  reinforce?: ReinforceRequirement;
  hp: number;
  ap: number;
  art?: string;
  passives?: CardPassive[];
  abilities?: CardAbility[];
  isWall?: boolean;
  [key: string]: unknown;
}

export interface CardsDataSchema {
  schemaVersion: number;
  universalActions?: Array<{
    id: string;
    name: string;
    cost: number;
    text: string;
    limits?: Record<string, unknown>;
    effects?: AbilityEffect[];
    [key: string]: unknown;
  }>;
  tokens?: CardItem[];
  cards: CardItem[];
  [key: string]: unknown;
}
