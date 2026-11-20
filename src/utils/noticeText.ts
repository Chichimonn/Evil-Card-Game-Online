/**
 * Sorting the game's notices (showNotification in App.tsx) so the match log only holds what actually happened, briefly:
 *   - an instruction (targeting, "click...", "choose...", "you may...") isn't logged at all;
 *   - a refusal (why a click didn't work: "cannot...", "not enough AP...", "out of range") isn't logged either: it shows
 *     for a moment over the battlefield instead, so the player still knows why;
 *   - anything else is a completed action: logged, with the instruction sentences taken out of it (e.g. "Umbral Flail
 *     dealt 6 damage! You may click tile E3...": "Umbral Flail dealt 6 damage!") and the bookkeeping trimmed (AP spent
 *     and remaining, rule numbers, stage numbers).
 */
export type NoticeKind = 'prompt' | 'refusal' | 'done';

// A sentence telling the player what to do next (or how a choice is going); tested after any leading label
// ("Realm Warp: Selected destination tile D4.")
const INSTRUCTION =
  /\b(click|choose|select|deselect|confirm|drag|now targeting|first hit targets)\b|\bselected \(|\bchose\b.*\(\d+\/\d+\)|^(now\b|you may\b|targeting\b|prompt\b|please\b|place unit\b|selected\b(?!.*\bnot\b)|deselected\b|pending\b|try\b|multiple\b|reinforce .* or click\b)|^\S+ AP spent\.?$/i;

// Why something wasn't done
const REFUSAL =
  /^(cannot|can't|not enough|invalid|you must|must\b|only\b|you can only|you have no|no (valid|target|legal|empty|friendly|enemy|qualifying|matching)\b|unit abilities and movement are inactive|locked in|finish\b|hex is already|target is out of range|that unit|it can't|this unit can't)|\b(cannot|can't|can only|may only|is out of range|not enough ap|is immune|already (used|drawn|acted|moved|been used)|must|needs|do not form|not a valid|first\.?$|isn't (in range|your)|has no (valid|matching|qualifying))\b/i;

// Something done: a sentence with one of these before any refusal wording stays a completed action (e.g. "...reflected
// the hit, but X can't be targeted by react effects")
const DONE_VERB =
  /\b(used|dealt|reflected|moved|healed|drew|placed|armoured|swapped|switched|gained|took|pulled|pushed|killed|defeated|destroyed|promoted|fused|summoned|sacrificed|reinforced|cleared|arrives|crushed|carried|flew|cycled|discarded|attached|created|prevented|returned|stole|won)\b/i;

// (a leading label: an ability's or unit's name and a colon, e.g. "Realm Warp:")
const withoutLabel = (s: string): string => s.replace(/^[^:.!?]{1,48}:\s*/, '');

const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean);

// The AP bookkeeping inside brackets: "2 AP spent", "1 AP remaining", "Free" (as a cost)
const AP_NOTE = /(?:,?\s*(?:and\s+)?(?:\d+\s*AP\s+(?:spent|remaining|left)|Free(?=\s*[,)])))/gi;

// The bookkeeping a log line can do without
const trimBookkeeping = (text: string): string =>
  text
    // AP spent and remaining, inside brackets: taken out, and the brackets too if nothing else was in them
    .replace(/\(([^()]*)\)/g, (whole, inner: string) => {
      if (!/\bAP\b/i.test(inner)) return whole;
      const rest = inner.replace(AP_NOTE, '').replace(/^[\s,!.]+|[\s,]+$/g, '');
      return rest ? `(${rest})` : '';
    })
    // "(Rule 5.3)", "(Stage 1/2)", "(Stage 2)"
    .replace(/\s*\(Rule [\d.]+\)/gi, '')
    .replace(/\s*\(Stage \d+(?:\/\d+)?\)/gi, '')
    // (tidy what's left: spaces before punctuation, doubled stops, doubled spaces)
    .replace(/\s+([.,!?:])/g, '$1')
    .replace(/([.!?])[.]+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Sorts one notice (see the module comment): what kind it is, and the text to show or log. */
export function sortNotice(message: string): { kind: NoticeKind; text: string } {
  const sentences = splitSentences(message);
  const kept = sentences.filter((s) => !INSTRUCTION.test(s) && !INSTRUCTION.test(withoutLabel(s)));
  const keptText = trimBookkeeping(kept.join(' '));
  // Nothing but instructions (a label left before them, e.g. "Realm Warp:", doesn't count)
  if (!keptText || /^[^.!?]*:$/.test(keptText)) return { kind: 'prompt', text: trimBookkeeping(message) };
  // A refusal: refusal wording in the first sentence, with no "done" verb before it
  // (with its label, or without: "Cannot promote X: ..." and "X: the move must end on an empty tile.")
  const first = REFUSAL.test(kept[0]) ? kept[0] : withoutLabel(kept[0]);
  const refusal = REFUSAL.exec(first);
  if (refusal) {
    const done = DONE_VERB.exec(first);
    if (!done || done.index > refusal.index) return { kind: 'refusal', text: trimBookkeeping(message) };
  }
  return { kind: 'done', text: keptText };
}
