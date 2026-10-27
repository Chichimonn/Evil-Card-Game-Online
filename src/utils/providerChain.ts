import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { getAbilityApCost } from './promotedAbilities';

/**
 * Rules for a provider ability that uses more than one promoted ability
 * (e.g. Dual Casting, Overload, Fend Off, Villainous Combo, Grand Metamorphosis).
 */
export interface ProviderChainSpec {
  uses: number; // most promoted abilities this provider can use
  distinct: boolean; // the same promoted ability may not be chosen twice
  nonAttackDistinct: boolean; // only non-attack abilities must be different
  sameTargetForAttacks: boolean; // every attack must be made against the same target
  chooseFirst: boolean; // all choices are locked in before any of them is used
  upTo: boolean; // the player may stop choosing early ("choose up to ...")
  // The chosen abilities are not separate uses but extra hits of one attack (e.g. Gemstone Hammer), each repeat
  // led by the provider's own damage (leadDamage)
  combineIntoOneAttack?: boolean;
  leadDamage?: number;
  // The combined attack is one hit worth the chosen attacks' total damage (e.g. Ultra Blade)
  singleHit?: boolean;
  // Exactly one pick from each promoted card (e.g. Ultra Blade: "Choose a 1AP melee attack from each promoted card")
  onePerPromotedCard?: boolean;
  // One pick fills every use: the chosen attack is cast `uses` times at once (e.g. Overload)
  repeatFirstChoice?: boolean;
  // The repeats are separate uses of the attack, each fired at the first one's target with no new click
  // (e.g. Overload Gemstone: "twice ... both against the same target")
  autoTargetRepeats?: boolean;
  maxAttacks?: number;
  maxNonAttacks?: number;
  totalCostMax?: number;
}

export interface ProviderChainState {
  parent: CardAbility;
  unitInstanceId: string;
  spec: ProviderChainSpec;
  used: CardAbility[]; // promoted abilities used so far (including the one being targeted)
  queue: CardAbility[]; // chooseFirst: chosen but not yet used
  phase: 'choosing' | 'using';
  targetInstanceId?: string;
  targetName?: string;
  promotedCards?: CardItem[]; // the acting unit's promoted cards, for one-per-card picks
}

export function isAttackAbility(ab: CardAbility): boolean {
  return Boolean(
    ab.tags?.includes('melee') ||
      ab.tags?.includes('ranged') ||
      ab.tags?.includes('attack') ||
      ab.text.toLowerCase().includes('deal') ||
      ab.text.toLowerCase().includes('damage')
  );
}

const getUseAbilityEffect = (parent: CardAbility): any =>
  parent.effects?.find((e: any) => e.type === 'useAbility' && (e.source === 'promotedCards' || e.free === true));

/**
 * Reads the multi-use rules from a provider ability's useAbility effect.
 * Returns null for providers that use a single promoted ability.
 * `parentUsedBefore` is whether the provider was already used earlier this turn (Fend Off's setTimes modifier).
 */
export function getProviderChainSpec(
  parent: CardAbility,
  parentUsedBefore: boolean,
  promotedCardCount = 0
): ProviderChainSpec | null {
  const eff = getUseAbilityEffect(parent);
  if (!eff) return null;

  // One attack from each promoted card, summed into a single hit (e.g. Ultra Blade)
  if (eff.onePerPromotedCard) {
    return {
      uses: Math.max(1, promotedCardCount),
      distinct: false,
      nonAttackDistinct: false,
      sameTargetForAttacks: false,
      chooseFirst: true,
      upTo: false,
      combineIntoOneAttack: true,
      leadDamage: 0,
      singleHit: Boolean(eff.countsAsSingleHit),
      onePerPromotedCard: true
    };
  }

  // Repeats that count as additional hits (e.g. Gemstone Hammer: "For each AP spent, do this again"): all picks are
  // made first, then resolved as one attack
  if (eff.countsAsAdditionalHits) {
    const perAP = typeof eff.times?.perAP === 'number' ? eff.times.perAP : 0;
    const uses = perAP > 0 ? perAP * getAbilityApCost(parent) : typeof eff.times === 'number' ? eff.times : 1;
    const useIdx = (parent.effects || []).indexOf(eff);
    const leadDamageEff: any = (parent.effects || []).slice(0, useIdx).find((e: any) => e.type === 'damage');
    return {
      uses: Math.max(1, uses),
      distinct: Boolean(eff.distinct),
      nonAttackDistinct: false,
      sameTargetForAttacks: false,
      chooseFirst: true,
      upTo: false,
      combineIntoOneAttack: true,
      leadDamage: typeof leadDamageEff?.amount === 'number' ? leadDamageEff.amount : 0
    };
  }

  // One choice, cast several times against one target from a single target click. Either all as hits of one attack
  // (e.g. Overload: 3 times against its melee target) or, with repeatAsSeparateUses, as separate uses where each repeat
  // fires at the first one's target by itself (e.g. Overload Gemstone: twice against the same target)
  if (eff.repeatFirstChoice) {
    const separate = Boolean(eff.repeatAsSeparateUses);
    return {
      uses: typeof eff.times === 'number' ? eff.times : 1,
      distinct: false,
      nonAttackDistinct: false,
      sameTargetForAttacks: true,
      chooseFirst: true,
      upTo: false,
      combineIntoOneAttack: !separate,
      leadDamage: 0,
      repeatFirstChoice: true,
      autoTargetRepeats: separate
    };
  }

  // AP budget (e.g. Shadow Cast: "Use up to 2AP on attacks from among the promoted cards"): choose as you go,
  // stop whenever, as long as the chosen abilities' costs fit the budget
  if (typeof eff.apBudget === 'number') {
    return {
      uses: eff.apBudget,
      distinct: Boolean(eff.distinct),
      nonAttackDistinct: false,
      sameTargetForAttacks: false,
      chooseFirst: false,
      upTo: true,
      totalCostMax: eff.apBudget
    };
  }

  const choose = eff.choose;
  if (choose) {
    const maxAttacks = typeof choose.attacks?.max === 'number' ? choose.attacks.max : 0;
    const maxNonAttacks = typeof choose.nonAttackAbilities?.max === 'number' ? choose.nonAttackAbilities.max : 0;
    return {
      uses: maxAttacks + maxNonAttacks,
      distinct: false,
      nonAttackDistinct: Boolean(choose.nonAttackAbilities?.distinct),
      sameTargetForAttacks: false,
      chooseFirst: true,
      upTo: true,
      maxAttacks,
      maxNonAttacks,
      totalCostMax: typeof eff.totalCostMax === 'number' ? eff.totalCostMax : undefined
    };
  }

  let uses = typeof eff.times === 'number' ? eff.times : 1;
  (eff.modifiers || []).forEach((m: any) => {
    if (m.if === 'thisAbilityUsedEarlierThisTurn' && parentUsedBefore && typeof m.setTimes === 'number') uses = m.setTimes;
  });
  const sameTarget = Boolean(eff.sameTarget || eff.attacksMustBeLegalAgainstTarget);
  if (uses <= 1 && !sameTarget) return null;

  return {
    uses,
    distinct: Boolean(eff.distinct),
    nonAttackDistinct: false,
    sameTargetForAttacks: sameTarget,
    chooseFirst: Boolean(eff.chooseFirst),
    upTo: false
  };
}

const abilityKey = (ab: CardAbility) => ab.id || ab.name;

/**
 * Whether one more promoted ability may be added to the chain under its rules.
 */
export function canAddToChain(chain: ProviderChainState, candidate: CardAbility): { allowed: boolean; reason?: string } {
  const { spec } = chain;
  const picked = [...chain.used, ...chain.queue];
  if (picked.length >= spec.uses) return { allowed: false, reason: `${chain.parent.name} has no uses left.` };

  const isAtk = isAttackAbility(candidate);
  const alreadyPicked = picked.some((p) => abilityKey(p) === abilityKey(candidate));
  if (alreadyPicked && (spec.distinct || (spec.nonAttackDistinct && !isAtk))) {
    return { allowed: false, reason: `${chain.parent.name} needs different abilities: ${candidate.name} was already chosen.` };
  }
  if (spec.maxAttacks !== undefined && isAtk && picked.filter(isAttackAbility).length >= spec.maxAttacks) {
    return { allowed: false, reason: `${chain.parent.name} allows at most ${spec.maxAttacks} attack(s).` };
  }
  if (spec.maxNonAttacks !== undefined && !isAtk && picked.filter((p) => !isAttackAbility(p)).length >= spec.maxNonAttacks) {
    return { allowed: false, reason: `${chain.parent.name} allows at most ${spec.maxNonAttacks} non-attack abilit${spec.maxNonAttacks === 1 ? 'y' : 'ies'}.` };
  }
  if (spec.onePerPromotedCard && chain.promotedCards) {
    if (!fitsOnePerCard([...picked, candidate], chain.promotedCards)) {
      return { allowed: false, reason: `${chain.parent.name} needs one attack from each promoted card: that card already has a pick.` };
    }
  }
  if (spec.totalCostMax !== undefined) {
    const total = picked.reduce((sum, p) => sum + getAbilityApCost(p), 0) + getAbilityApCost(candidate);
    if (total > spec.totalCostMax) {
      return { allowed: false, reason: `${chain.parent.name} allows at most ${spec.totalCostMax} AP of abilities in total.` };
    }
  }
  return { allowed: true };
}

/**
 * Whether each pick can come from a different promoted card (two copies of a card can each give the same attack).
 * Small search: each card holds at most one pick.
 */
function fitsOnePerCard(picks: CardAbility[], cards: CardItem[]): boolean {
  const used = new Array(cards.length).fill(false);
  const place = (i: number): boolean => {
    if (i >= picks.length) return true;
    for (let c = 0; c < cards.length; c++) {
      if (used[c] || !(cards[c].abilities || []).some((a) => a.id === picks[i].id)) continue;
      used[c] = true;
      if (place(i + 1)) return true;
      used[c] = false;
    }
    return false;
  };
  return place(0);
}

/**
 * The qualifying promoted abilities that may still be added to the chain.
 */
export function getChainCandidates(
  chain: ProviderChainState,
  qualifying: { cardName: string; ability: CardAbility; card: CardItem }[]
): { cardName: string; ability: CardAbility; card: CardItem }[] {
  return qualifying.filter((q) => canAddToChain(chain, q.ability).allowed);
}

/**
 * Whether the chain's locked target (for same-target chains) is still on the board.
 */
export function isChainTargetGone(chain: ProviderChainState, unitsOnBoard: Record<string, BattlefieldUnit>): boolean {
  if (!chain.targetInstanceId) return false;
  return !Object.values(unitsOnBoard).some((u) => u.instanceId === chain.targetInstanceId);
}
