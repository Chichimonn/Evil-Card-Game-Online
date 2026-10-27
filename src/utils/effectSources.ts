import { AbilityEffect, CardItem, CardsDataSchema } from '../types/card';

/**
 * Where an effect comes from. Every effect in the card data is tagged once at load (effect.origin),
 * so any rule can ask whether an effect is a passive, a react effect, an ability, or a universal action
 * (e.g. Silencing Strike ignores passives and react effects).
 */
export type EffectSource = 'passive' | 'ability' | 'react' | 'universalAction';

// Keys that hold nested effects (setReact.effects, conditional.then/else, replace.with, ...)
const NESTED_EFFECT_KEYS = ['effects', 'then', 'else', 'with'];

function tagEffects(effects: unknown, source: EffectSource) {
  const list = Array.isArray(effects) ? effects : effects && typeof effects === 'object' ? [effects] : [];
  list.forEach((e: any) => {
    if (!e || typeof e !== 'object') return;
    if (e.origin === undefined) e.origin = source;
    // Effects set up by a react (setReact) are react effects, whatever set them up
    const nestedSource: EffectSource = e.type === 'setReact' ? 'react' : source;
    NESTED_EFFECT_KEYS.forEach((key) => {
      if (e[key] !== undefined) tagEffects(e[key], nestedSource);
    });
  });
}

function tagCard(card: CardItem) {
  (card.passives || []).forEach((p) => tagEffects(p.effects, 'passive'));
  // A react ability's own effects are ability effects; only what it sets up to fire later (setReact) is a react effect
  (card.abilities || []).forEach((a) => tagEffects(a.effects, 'ability'));
}

/** Tags every effect in the card data with its source. Safe to call more than once. */
export function annotateEffectSources(data: CardsDataSchema): CardsDataSchema {
  (data.cards || []).forEach(tagCard);
  (data.tokens || []).forEach(tagCard);
  (data.universalActions || []).forEach((u) => tagEffects(u.effects, 'universalAction'));
  return data;
}

export const getEffectSource = (effect: AbilityEffect | null | undefined): EffectSource | undefined =>
  (effect?.origin as EffectSource | undefined) ?? undefined;

/** True if the effect comes from a passive. */
export const isPassiveEffect = (effect: AbilityEffect | null | undefined): boolean => getEffectSource(effect) === 'passive';

/** True if the effect is a react effect (set up by setReact to fire later). */
export const isReactEffect = (effect: AbilityEffect | null | undefined): boolean => getEffectSource(effect) === 'react';
