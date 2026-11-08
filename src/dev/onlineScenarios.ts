import { BattlefieldUnit, PlayerId } from '../types/game';
import { CardItem } from '../types/card';
import { GameState } from '../game/gameState';

/**
 * Online play, Phase 8: test boards for the situations online play has to get right (dev server only).
 *
 * In an online match, on either screen: window.__evilGame.scenario('name') puts this board on the table (Player 1 to
 * act, turn 2) and sends it to the other screen. Each scenario says what to do next and what should happen. The
 * hands, decks and graveyards of the match are kept.
 */

type UnitSpec = {
  id: string;
  owner: PlayerId;
  hex: string;
  armour?: number;
  damage?: number; // damage counters already on it
  hpLeft?: number; // or: leave it on this many HP
  readySpell?: { abilityId: string; abilityName: string; cost: number };
};

export interface OnlineScenario {
  description: string;
  units: UnitSpec[];
  // What to do on Player 1's screen, and what should happen
  steps: string;
}

export const ONLINE_SCENARIOS: Record<string, OnlineScenario> = {
  holdTheGate: {
    description: "A defender's knockback immunity choice (Hold the Gate), answered on the defender's screen.",
    units: [
      { id: 'imbued_knight', owner: 'player1', hex: 'C3' },
      { id: 'gateway_guardians', owner: 'player2', hex: 'C4' },
      { id: 'sentinel_knight', owner: 'player1', hex: 'A1' }
    ],
    steps: "P1: Imbued Knight (C3) uses Heave Foe on C4. P2's screen asks about Hold the Gate (3s); P1's screen waits."
  },
  readySpell: {
    description: "A readied interrupt (Ready Spell) offered to the other player, then their unit acting on their screen.",
    units: [
      { id: 'imbued_knight', owner: 'player1', hex: 'C3' },
      { id: 'sentinel_knight', owner: 'player1', hex: 'A1' },
      { id: 'polearm_knight', owner: 'player2', hex: 'C2', readySpell: { abilityId: 'rip_and_tear', abilityName: 'Rip and Tear', cost: 2 } }
    ],
    steps:
      "P1: Sentinel Knight (A1) moves. P2's screen offers the interrupt (3s): Yes, then P2's Polearm Knight uses Rip and Tear on C3 on P2's screen. P1's move then finishes."
  },
  reassemble: {
    description: "A card choice for the other player (Reassemble's discard, then its back-row tile).",
    units: [
      { id: 'imbued_knight', owner: 'player1', hex: 'C3' },
      { id: 'skeleton_fighter', owner: 'player2', hex: 'C4', hpLeft: 1 },
      { id: 'sentinel_knight', owner: 'player2', hex: 'F6' }
    ],
    steps: "P1: Imbued Knight (C3) attacks C4 and kills the Skeleton Fighter. P2's screen asks for a discard, then a tile on row 6."
  },
  defenderScry: {
    description: "A defender's scry (Blind Seer's Preemptive Counter), decided on the defender's screen.",
    units: [
      { id: 'imbued_knight', owner: 'player1', hex: 'C3' },
      { id: 'blind_seer', owner: 'player2', hex: 'C4' }
    ],
    steps: "P1: Imbued Knight (C3) uses Overhead Slam on C4. P2's screen shows the top card of P2's deck to keep or bottom."
  },
  defenderLoot: {
    description: "A defender's loot (Dreadnought Privateer's Iron Clout, when its armour is hit), on the defender's screen.",
    units: [
      { id: 'imbued_knight', owner: 'player1', hex: 'C3' },
      { id: 'dreadnought_privateer', owner: 'player2', hex: 'C4', armour: 4 }
    ],
    steps: "P1: Imbued Knight (C3) attacks C4's armour. P2's screen shows the loot (draw 1, put 1 back) with P2's own hand."
  },
  fieldNotes: {
    description: "Field Notes on the opponent's deck: decided by the player using it, and its card name private in the log.",
    units: [
      { id: 'conflict_correspondent', owner: 'player1', hex: 'C3' },
      { id: 'sentinel_knight', owner: 'player2', hex: 'C6' }
    ],
    steps:
      "P1: Conflict Correspondent (C3) uses Field Notes on Player 2's deck. The reveal shows on P1's screen only; P2's log says 'a card'."
  }
};

/** The match state with the scenario's board: Player 1 to act on turn 2 of play. */
export function applyOnlineScenario(state: GameState, scenario: OnlineScenario, cardById: (id: string) => CardItem | null): GameState {
  const board: Record<string, BattlefieldUnit> = {};
  let n = Math.max(state.nextInstanceId, 1);
  for (const u of scenario.units) {
    const card = cardById(u.id);
    if (!card) throw new Error(`No card with id ${u.id}`);
    const damage = typeof u.hpLeft === 'number' ? Math.max(0, card.hp - u.hpLeft) : u.damage ?? 0;
    board[u.hex] = {
      instanceId: `${u.id}_${n++}`,
      card,
      owner: u.owner,
      hexId: u.hex,
      damageCounters: damage,
      armour: u.armour ?? 0,
      currentAp: card.ap,
      promotedCards: [],
      ...(u.readySpell
        ? {
            readySpell: {
              ...u.readySpell,
              sourceName: 'Ready Spell',
              expiresOnTurnEndFor: u.owner === 'player1' ? 'player2' : 'player1',
              once: true,
              onAnyAction: true
            }
          }
        : {})
    } as BattlefieldUnit;
  }
  return {
    ...state,
    unitsOnBoard: board,
    nextInstanceId: n,
    gamePhase: 'playing',
    activePlayer: 'player1',
    turnCount: 2,
    setupConsecutiveStarts: 2,
    activeTurnUnitHex: null,
    consecutivePasses: 0,
    lastTurnUnitIds: { player1: null, player2: null },
    winner: null,
    victoryReason: ''
  };
}
