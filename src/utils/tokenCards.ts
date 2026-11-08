import { CardItem } from '../types/card';

/** Whether any effect in this list (nested ones too) creates the given token. */
const createsToken = (effects: unknown, tokenId: string): boolean => {
  if (!effects || typeof effects !== 'object') return false;
  if (Array.isArray(effects)) return effects.some((e) => createsToken(e, tokenId));
  const e = effects as Record<string, unknown>;
  if (e.type === 'createToken' && e.token === tokenId) return true;
  return Object.values(e).some((v) => typeof v === 'object' && createsToken(v, tokenId));
};

/**
 * The tokens as cards for the gallery (and its pre-rendered images), listed after the real cards. Each shows in the set
 * of the first card in the card list that creates it (its art background), or none if no card does. They are only for
 * viewing: decks are built from the real cards, and tokens in play keep their own data.
 */
export function getTokenGalleryCards(data: { cards: CardItem[]; tokens?: CardItem[] }): CardItem[] {
  return (data.tokens || []).map((token) => {
    const creator = data.cards.find((c) =>
      [...(c.abilities || []), ...(c.passives || [])].some((item) => createsToken(item.effects, token.id))
    );
    return { ...token, type: 'token', set: token.set || creator?.set };
  });
}
