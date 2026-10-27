import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';

/**
 * Returns true if an ability grants the use of a qualifying ability from promoted cards for free.
 */
export function isPromotedAbilityProvider(ability: CardAbility): boolean {
  if (
    ability.effects?.some(
      (e: any) =>
        e.type === 'useAbility' &&
        (e.source === 'promotedCards' || e.source === 'promotedCard' || e.from === 'promotedCards' || e.free === true)
    )
  ) {
    return true;
  }
  const text = (ability.text || '').toLowerCase();
  return text.includes('promoted card') && text.includes('free');
}

/**
 * Safely extracts the associated AP cost for an ability strictly as defined in the card files.
 * NEVER inserts or imagines any AP cost.
 */
export function getAbilityApCost(ability: CardAbility): number {
  if (typeof ability.selectedCost === 'number') {
    return ability.selectedCost;
  }
  if (Array.isArray(ability.cost)) {
    return ability.cost[0];
  }
  if (ability.cost !== undefined && ability.cost !== null) {
    return ability.cost;
  }
  // Default fallback if not defined in file
  return 1;
}

/**
 * The AP an ability resolves with for "per AP spent" amounts. A free ability used through a provider
 * resolves as the AP its provider specifies (e.g. Aetheric Channel: as though 2AP were spent) or else what was paid
 * for the provider; everything else uses its own cost.
 */
export function getApSpent(ability: CardAbility): number {
  return typeof ability.apSpentAs === 'number' ? ability.apSpentAs : getAbilityApCost(ability);
}

/** Every AP cost an ability can be used at (a variable-cost ability like [1, 2] has more than one). */
export function getCostOptions(ability: CardAbility): number[] {
  return Array.isArray(ability.cost) ? ability.cost : [getAbilityApCost(ability)];
}

/**
 * Expands an ability list so that abilities with a hyphenated/array cost (e.g. [1, 2])
 * appear once per possible cost option in the menu.
 */
export function expandVariableCostAbilities(abilities: CardAbility[]): CardAbility[] {
  const result: CardAbility[] = [];
  for (const ab of abilities) {
    if (Array.isArray(ab.cost) && ab.cost.length > 1) {
      for (const costOption of ab.cost) {
        result.push({
          ...ab,
          id: `${ab.id}__cost_${costOption}`,
          baseAbilityId: ab.id,
          selectedCost: costOption,
          cost: costOption
        });
      }
    } else {
      result.push(ab);
    }
  }
  return result;
}

const findUseAbilityIndex = (parent: CardAbility): number =>
  (parent.effects || []).findIndex((e: any) => e.type === 'useAbility');

/**
 * Effects a provider applies before its free ability (e.g. Paladin's Lance "This unit gains 1 armour. Then...",
 * Seer's Visions "Draw a card, then...").
 */
export function getProviderPreEffects(parent: CardAbility): any[] {
  const idx = findUseAbilityIndex(parent);
  return idx > 0 ? (parent.effects || []).slice(0, idx) : [];
}

/**
 * Builds the free ability a provider uses: the promoted ability, plus the provider's riders
 * (effects listed after its useAbility, e.g. Detain's cannotMove, Predictive Strike's reduceDamageDealt),
 * with any range override (e.g. Floating Weapon: "its range is still this ability's range (it is no longer melee)").
 * A provider's own free move afterwards (Shadow Cast) is not a rider: it is handled once the provider finishes.
 */
export function buildProviderExecutable(
  parent: CardAbility,
  promoted: CardAbility,
  opts: { cost: number; parentUsedBefore: boolean; extra?: Record<string, unknown> }
): CardAbility {
  const idx = findUseAbilityIndex(parent);
  const useEff: any = idx >= 0 ? (parent.effects || [])[idx] : undefined;
  const riders = (idx >= 0 ? (parent.effects || []).slice(idx + 1) : []).filter(
    (e: any) =>
      e.type !== 'move' &&
      // "The first unit hit by this attack each turn": only on the provider's first use this turn
      !(e.target === 'firstUnitHitByThisAbilityEachTurn' && opts.parentUsedBefore)
  );
  let tags = [...(parent.tags || []), ...(promoted.tags || [])];
  let range = promoted.range;
  let rangeText = promoted.rangeText;
  if (Array.isArray(useEff?.rangeOverride)) {
    range = useEff.rangeOverride;
    rangeText = useEff.rangeOverride.join('-');
  }
  if (useEff?.noLongerMelee) tags = tags.filter((t) => t !== 'melee');
  // A variable-cost ability used for free resolves as the AP the provider specifies (asAP), else what the provider cost
  // (a provider itself used for free, e.g. through Ready Spell, counts as its own AP: see getApSpent)
  const apSpentAs = Array.isArray(promoted.cost)
    ? typeof useEff?.asAP === 'number'
      ? useEff.asAP
      : getApSpent(parent)
    : undefined;
  return {
    ...promoted,
    ...(apSpentAs !== undefined ? { apSpentAs } : {}),
    id: `${parent.id}__${promoted.id}`,
    // The promoted ability itself, so its own once-per-turn limit holds across every provider
    promotedAbilityId: promoted.id,
    // A variable-cost provider is offered once per cost (e.g. gemstone_hammer__cost_2); point back at the real ability
    parentAbilityId: parent.baseAbilityId || parent.id,
    name: `${parent.name} (${promoted.name})`,
    cost: opts.cost,
    tags: Array.from(new Set(tags)),
    range,
    rangeText,
    effects: [...(promoted.effects || []), ...riders],
    ...(opts.extra || {})
  };
}

/** An ability whose job is armouring (e.g. "Armour up to 4"), not an attack. */
export function isArmourAbility(ab: CardAbility): boolean {
  const text = (ab.text || '').toLowerCase();
  const isAttack =
    ab.tags?.includes('melee') || ab.tags?.includes('ranged') || ab.tags?.includes('attack') || text.includes('deal') || text.includes('damage');
  if (isAttack) return false;
  return (
    Boolean(ab.effects?.some((e: any) => e.type === 'armour')) ||
    /armours?\s+up\s+to\s+\d+/i.test(text) ||
    /gains?\s+\d+\s+armour/i.test(text)
  );
}

/** The usage key recorded when a provider uses a promoted ability (its free ability's id, e.g. "cycle_through__x"). */
export const providerUseKey = (parent: CardAbility, promoted: CardAbility) => `${parent.id}__${promoted.id}`;

/**
 * Filters the promoted cards' abilities to only those that qualify for the parent provider ability.
 * Pass the acting unit to also apply per-turn limits (e.g. Cycle Through: "has not yet been chosen this way this turn").
 */
export function getQualifyingPromotedAbilities(
  parentAbility: CardAbility,
  promotedCards?: CardItem[],
  unit?: BattlefieldUnit | null
): { cardName: string; ability: CardAbility; card: CardItem }[] {
  if (!promotedCards || promotedCards.length === 0) return [];

  const useAbilityEffect: any = parentAbility.effects?.find(
    (e: any) =>
      e.type === 'useAbility' &&
      (e.source === 'promotedCards' || e.source === 'promotedCard' || e.from === 'promotedCards' || e.free === true)
  );

  const filterCost = useAbilityEffect?.filter?.cost;
  const filterKind = useAbilityEffect?.filter?.kind;
  const filterMelee = useAbilityEffect?.filter?.melee;
  const filterRanged = useAbilityEffect?.filter?.ranged;
  // When the effect spells out a filter, it is the whole spec: the text is only a fallback for unspecced providers
  const hasFilterSpec = Boolean(useAbilityEffect?.filter);
  const textLower = hasFilterSpec ? '' : (parentAbility.text || '').toLowerCase();

  const results: { cardName: string; ability: CardAbility; card: CardItem }[] = [];

  // Only abilities of a promoted card of a class (e.g. Murderous Slices: "of the promoted Assassin")
  const filterFromCard = typeof useAbilityEffect?.filter?.fromCard === 'string' ? useAbilityEffect.filter.fromCard.toLowerCase() : null;
  const cardMatches = (card: CardItem) =>
    !filterFromCard ||
    card.name.toLowerCase().includes(filterFromCard) ||
    card.id.toLowerCase().includes(filterFromCard) ||
    Boolean(card.classTags?.some((t) => t.toLowerCase() === filterFromCard));

  promotedCards.forEach((card) => {
    if (!card.abilities || !cardMatches(card)) return;
    card.abilities.forEach((ab) => {
      // A variable-cost ability qualifies at any of its costs (e.g. [1, 2] counts as a 1AP and a 2AP attack)
      const abCosts = getCostOptions(ab);
      const isAttack =
        ab.tags?.includes('melee') ||
        ab.tags?.includes('ranged') ||
        ab.tags?.includes('attack') ||
        ab.text.toLowerCase().includes('deal') ||
        ab.text.toLowerCase().includes('damage');
      const isMelee = ab.tags?.includes('melee') || ab.text.toLowerCase().includes('melee');

      // Filter by cost (strictly as specified by effect or text)
      if (filterCost !== undefined) {
        if (!abCosts.includes(filterCost)) return;
      } else if (textLower.includes('1ap') && !abCosts.includes(1)) {
        return;
      } else if (textLower.includes('2ap') && !abCosts.includes(2)) {
        return;
      }

      // Filter by kind (attack vs non-attack, or armour ability e.g. Guard Break)
      if (filterKind === 'attack') {
        if (!isAttack) return;
      } else if (filterKind === 'armourAbility') {
        if (!isArmourAbility(ab)) return;
      } else if (
        textLower.includes('attack') &&
        !textLower.includes('non-attack') &&
        !isAttack
      ) {
        return;
      }

      // Filter by melee
      if (filterMelee && !isMelee) return;

      // Filter by ranged (tagged ranged, or a non-melee ability that reaches beyond range 1)
      const isRanged =
        ab.tags?.includes('ranged') || (!isMelee && Array.isArray(ab.range) && Math.max(...ab.range) > 1);
      if (filterRanged && !isRanged) return;

      // Not one already chosen with this provider this turn (e.g. Cycle Through)
      if (useAbilityEffect?.distinctPerTurn && unit?.usedTurnCounts) {
        const key = providerUseKey(parentAbility, ab);
        if ((unit.usedTurnCounts[key] || 0) > 0) return;
      }

      results.push({
        cardName: card.name,
        ability: ab,
        card
      });
    });
  });

  return results;
}
