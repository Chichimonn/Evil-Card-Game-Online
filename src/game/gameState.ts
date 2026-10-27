import { CardItem } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { checkVersionMatch } from '../version';

/** Bump when the shape below changes, so an old save (or an out-of-date opponent) is recognised. */
export const GAME_STATE_VERSION = 1;

/**
 * Everything a match needs to continue from where it is, as plain JSON. App.tsx builds it from its state
 * (captureGameState) and can load one back (loadGameState).
 *
 * It holds the lasting match state only. Choices in progress (targeting, popups, prompts) are not part of it:
 * capture the game when nothing is open (see isGameStateStable in App.tsx), e.g. between actions or at turn end.
 */
export interface GameState {
  version: number;
  // Which game made it (see src/version.ts): a state from a different game version can't be continued here
  gameVersion: string;
  buildId: string;

  // Deterministic randomness and ids (see utils/rng): the same state plus the same actions gives the same game
  rngState: number;
  nextInstanceId: number;
  turnStartKey: number;

  // Pregame setup (Rule 5)
  gamePhase: 'setup' | 'playing';
  initialFirstPlayer: PlayerId;
  setupConsecutiveStarts: number;
  hasCycled: Record<PlayerId, boolean>;

  // Turn
  activePlayer: PlayerId;
  turnCount: number;
  consecutivePasses: number;
  lastTurnUnitIds: Record<PlayerId, string | null>;
  activeTurnUnitHex: string | null;

  // Cards and board
  hands: Record<PlayerId, CardItem[]>;
  decks: Record<PlayerId, CardItem[]>;
  graveyards: Record<PlayerId, CardItem[]>;
  unitsOnBoard: Record<string, BattlefieldUnit>;
  scorchedTiles: Record<string, { expiresOnTurnEndFor: PlayerId; casterPlayer: PlayerId; skipTurnEnds?: number }>;
  hexColors: Record<string, string>;

  // Result
  winner: PlayerId | 'draw' | null;
  victoryReason: string;
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

/** Reads a saved game state. Throws if it isn't one, or was made by a different version of the game. */
export function parseGameState(json: string): GameState {
  const state = JSON.parse(json) as GameState;
  if (!state || typeof state !== 'object' || !state.unitsOnBoard || !state.hands) {
    throw new Error('Not a saved game state.');
  }
  if (state.version !== GAME_STATE_VERSION) {
    throw new Error(`Game state version ${state.version} does not match this game (version ${GAME_STATE_VERSION}).`);
  }
  const match = checkVersionMatch({ gameVersion: state.gameVersion, buildId: state.buildId });
  if (!match.ok) throw new Error(match.reason);
  return state;
}
