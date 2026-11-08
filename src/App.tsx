import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { initialCardsData } from './data/cardsData';
import { CardItem, CardAbility, CardPassive } from './types/card';
import { BattlefieldUnit, PlayerId } from './types/game';
import { CardThumbnail } from './components/CardThumbnail';
import { CardPreview } from './components/CardPreview';
import { StandeePreview } from './components/StandeePreview';
import { CameraPanPad } from './components/CameraPanPad';
import { getSetBackgroundPath } from './components/CardView';
import { getTokenGalleryCards } from './utils/tokenCards';
import { Deckbuilder } from './components/Deckbuilder';
import { HexGridArena } from './components/HexGridArena';
import { DeckSelectModal, SelectableDeck, buildSelectableDecks } from './components/DeckSelectModal';
import { PlayModeModal } from './components/PlayModeModal';
import { GraveyardZone } from './components/GraveyardZone';
import { DeckPile } from './components/DeckPile';
import { CoinFlipModal } from './components/CoinFlipModal';
import { TurnActionPanel } from './components/TurnActionPanel';
import { VictoryModal } from './components/VictoryModal';
import { TurnTransitionOverlay } from './components/TurnTransitionOverlay';
import { CycleModal } from './components/CycleModal';
import { AssistModal } from './components/AssistModal';
import { FieldNotesModal } from './components/FieldNotesModal';
import { ScryModal } from './components/ScryModal';
import { ResearchModal } from './components/ResearchModal';
import { LootModal } from './components/LootModal';
import { isFieldNotesAbility } from './utils/fieldNotes';
import { isModifyRangeAbility, getModifyRangeAmount, getUnitBonusRange } from './utils/rangeModifiers';
import { FacelessKingPassiveChoiceModal } from './components/FacelessKingPassiveChoiceModal';
import { generateEarthyHexColors } from './utils/earthyColors';
import { playCardDrawSound } from './utils/audio';
import {
  getSurroundingHexes,
  getHexDistance,
  getHexesInRange,
  getAllStraightLinesFromHex,
  getStraightLineHexes,
  isStraightLineAbility,
  isAbilityTargetingEmptyTile,
  isAbilityTargetingAnyTile,
  isTargetedAbility,
  isTileScorched,
  getKnockbackDestination,
  parseHexId,
  offsetToCube,
  cubeToOffset,
  toHexId,
  getHexBehind,
  getTileBehindUnit,
  getTileBehindFor,
  isAttackFromBehind,
  getHexMovementDirection,
  CUBE_DIRECTIONS
} from './utils/hexGridMath';
import {
  getValidPromoteTargets,
  checkFusionMaterials,
  formatFusionRequirements,
  FusionCombination,
  getSealedReinforceHexes,
  countUnmetTributeSlots,
  getForcedPromotionDamage
} from './utils/reinforceRules';
import {
  isImmuneToKnockback,
  getOptionalKnockbackImmunityPassive,
  applyOptionalKnockbackImmunity,
  getAbilityKnockbackTiles,
  getAbilityOptionalKnockbackEffect,
  getProviderOptionalKnockback,
  getAttackerExtraKnockback
} from './utils/knockbackRules';
import { KnockbackChoiceModal } from './components/KnockbackChoiceModal';
import { ChoiceModal } from './components/ChoiceModal';
import {
  getAbilityApCost,
  getApSpent,
  isPromotedAbilityProvider,
  getQualifyingPromotedAbilities,
  getProviderPreEffects,
  isRevealGatedProvider,
  buildProviderExecutable,
  providerUseKey,
  isArmourAbility,
  isTargetAbilityBorrower,
  getBorrowableCards
} from './utils/promotedAbilities';
import {
  ProviderChainState,
  ProviderChainSpec,
  getProviderChainSpec,
  canAddToChain,
  getChainCandidates,
  isChainTargetGone,
  isAttackAbility
} from './utils/providerChain';
import { applyTurnStartPassives } from './utils/turnStartPassives';
import { canUseAbilityThisTurn, isOncePerTurn, canTriggerPassiveThisTurn, recordTurnUsage, recordAbilityUse, freeUseKey, getAttacksUsedThisTurn, hasAttackedUnitThisTurn, UNIVERSAL_MOVE_KEY } from './utils/turnLimits';
import {
  getTargetTileScorch,
  getSecondAttackScorch,
  getSecondMeleeAttackKnockback,
  getMeleeAttackHealPerHit,
  getFirstDamageHeal,
  getMeleeHitTrap
} from './utils/attackRiders';
import {
  getUnitPassives,
  isUnitMindless,
  hasFeedingFrenzy,
  checkAndTriggerEmbeddedPress,
  DamageEvent,
  isImmuneToReactEffects,
  suppressPassivesFor,
  clearPassiveSuppression,
  getTargetedRetaliation,
  isImmuneToNonDamageEffects,
  getDrawHeal,
  isImmuneToScorchDamage,
  getTargetedScryPassive,
  getOnAttackSelfArmour,
  getNextActionBuffPassives,
  getFirstAttackHealPerHit,
  PASSIVES_REMOVED_THIS_TURN
} from './utils/unitPassives';
import { syncLeaderOfTheBunch, hasLeaderOfTheBunch, getSurroundingFriendlyCount } from './utils/leaderOfTheBunch';
import { getAbilityHitStructure, executeSequentialHits, AttackExecutionOptions, AttackHit, getAbilitySelfDamage, applyAttackerBonusPassives, reduceNonAttackDamage, getFalloffDamageBase } from './utils/attackLogic';
import {
  MultiStageState,
  MultiStageTargetInfo,
  isMultiStageAbility,
  getMultiStageTargetInfo,
  getClosestEmptySurroundingHexes,
  getMultiTargetSpec,
  getPerHitAdjustment,
  isAnchorSmash
} from './utils/multiStageAbilities';
import {
  checkMomentumCharge,
  getSameDirectionNextHex,
  getIntermediateHexes,
  hasEsotericPathways,
  getEsotericPathwaysHexes,
  hasMagicalOmnipresence,
  canOmnipresenceUnitMove,
  getMagicalOmnipresenceHexes,
  getMoveScorchEffect,
  getMoveThroughPassive,
  getLandingTilesAround,
  applyMoveOntoUnit,
  getTramplingMove,
  getFirstMoveBonus,
  applyStraightLineMoveBuff
} from './utils/movementAbilities';
import {
  isChargeFlightAbility,
  getChargeFlightSpec,
  validateChargeFlightPath,
  extendChargeFlightPath
} from './utils/chargeFlightAbility';
import { useCardImages } from './context/CardImageContext';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Play,
  Volume2,
  VolumeX,
  Volume1,
  Lock,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { isAreaAttack, isSelfCentredArea, resolveAreaAttack } from './utils/areaAttacks';
import { withAttackStatuses, resolveSlowVenom, clearDamageMarks } from './utils/statusEffects';
import { applyDestroyBlast } from './utils/destroyPassives';
import { nextRandom, makeSeed, shuffleWith } from './utils/rng';
import { GameState, GAME_STATE_VERSION, serializeGameState, parseGameState } from './game/gameState';
import {
  LogEntry,
  LogKind,
  TurnHandoff,
  HandoffAck,
  buildHandoff,
  verifyHandoff,
  isAckFor,
  fingerprintState,
  canonicalJson,
  describeBoardChanges,
  describeCardChanges,
  boardLogSnapshot
} from './game/turnHandoff';
import GameLogPanel from './components/GameLogPanel';
import OnlineLobbyModal from './components/OnlineLobbyModal';
import { RoomConnection, RoomRole, RoomStatus, normalizeRoomCode } from './net/connection';
import { makeSecret, commitTo, checkReveal, combineSeed, seatsFromSeed } from './net/lobby';
import { ONLINE_SCENARIOS, applyOnlineScenario } from './dev/onlineScenarios';
import { NetMessage, DecisionKind } from './net/messages';
import { LOCAL_VERSION, formatVersion } from './version';
import { getReactAbilitySpec, getReactAbilityChoices, getReadiedAbility, buildReadiedUse } from './utils/readySpell';
import { TimedYesNoModal } from './components/TimedYesNoModal';
import { resolveEarthenShards } from './utils/passiveEffects';
import {
  applyAbilityStatuses,
  getUsableArmour,
  settleSharedArmour,
  applySelfArmourShare,
  applyCannotMoveThisTurn,
  canChooseUnitForTurn,
  expireTurnRestrictions,
  getUniversalMoveCost,
  MOVE_TAX,
  isUnitMovementDisabled,
  CANNOT_MOVE,
  CANT_MOVE_SELF,
  applySelfCannotMove,
  TURN_DENIED,
  DRAW_TAX,
  MINDLESS,
  SELF_TURN_DENIED_PENDING,
  cannotUseExactCostStatus,

  getMoveBlockedMessage,
  applyRemovePassives,
  ignoresReactEffects,
  ignoresPassives,
  applySelfReactImmunity,
  isSelfPlacementAbility,
  applySelfUntargetable,
  isUntargetableBy,
  applyActionTax
} from './utils/turnRestrictions';
import {
  hasNoxiousBurstPassive,
  hasNoxiousBurstEffect,
  applyNoxiousBurst,
  getStartingApForTurn,
  consumeNoxiousBurstStatus,
  NOXIOUS_BURST
} from './utils/noxiousBurst';
import { getPathSpec, extendPath, validatePath, getSelfStraightLineMove, getChargeLineMove, getChargeLineChoices } from './utils/paths';
import { setBoardContext } from './utils/boardContext';
import {
  dealPassiveDamage,
  PassiveDamage,
  getDamageTakenReactions,
  applyKillRewards,
  getDeathBlast,
  getKnockbackRiders,
  getMoveDamage,
  getMeleeHitSplash,
  getTurnStartAdjacencyDamage,
  getUnscorchedHexes,
  getPullDestination,
  knockBackUnits,
  rotateUnitsAround,
  getAttackerArmourStrip,
  getMeleeTargetedAttackerKnockback,
  getAttackFreeMovePassive,
  countAttacksOnUnitThisTurn,
  getAfterAttackMove,
  logMoveDirections
} from './utils/triggeredPassives';
import { evalAttackerCondition, markDamageCapUsed } from './utils/attackLogic';
import { getAuraAbilityBlock, getAbilitiesUsedThisTurn } from './utils/turnLimits';
import {
  applyUseLimitStatuses,
  addUseLimitStatus,
  applySelfKnockbackImmunity,
  canUseReactEffects,
  CANNOT_USE_RANGED,
  ACTION_TAX,
  isPlaceBehindTargetAbility
} from './utils/turnRestrictions';
import { getExtraSameDirectionMove } from './utils/movementAbilities';
import { getAbilityRangePassiveBonus } from './utils/flowingStance';
import { getGrantedAllyAttack, getAllyAttackChoices } from './utils/multiStageAbilities';
import {
  hasFlowingStancePassive,
  isFlowingStanceActive,
  hasCephalopodReach,
  getEffectiveAbilityRange,
  isMeleeAttackAbility
} from './utils/flowingStance';

// The newest set: the set of the last card in the card list (it names the current update, e.g. "Fury of the Skies")
const LATEST_SET = [...initialCardsData.cards].reverse().find((c) => c.set)?.set;

const DEFAULT_PITCH = 35; // 35 degrees viewing angle
const DEFAULT_YAW = 0;    // Default yaw
const BASELINE_ZOOM = 100; // Baseline zoom is 100%

// Standee & Hand Hover Card Preview Component
const HoveredStandeeCardPreview: React.FC<{
  card: CardItem;
  customArtUrl?: string;
  preloadedCardImage?: string;
}> = ({ card, customArtUrl }) => {
  return (
    <CardPreview
      card={card}
      customArtUrl={customArtUrl}
    />
  );
};

export default function App() {
  const { cardImages } = useCardImages();
  const [cardsData, setCardsData] = useState(initialCardsData);
  const [selectedCardId, setSelectedCardId] = useState<string>('sentinel_knight');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'basic' | 'promote' | 'fusion' | 'tribute' | 'token'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // The gallery's title, search and filter bar (stays at the top while scrolling; the arrow hides or shows it)
  // (hidden when the page loads, for a clean first look)
  const [isGalleryBarOpen, setIsGalleryBarOpen] = useState(false);
  // The version and set next to the title, behind a small arrow on their left (hidden at first, like the gallery bar)
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [customArtMap, setCustomArtMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'gallery' | 'deckbuilder' | 'play'>('gallery');
  const [hoveredCard, setHoveredCard] = useState<CardItem | null>(null);
  // The board unit being hovered, with its owner (an enemy's preview is outlined in red)
  const [hoveredBoardUnit, setHoveredBoardUnit] = useState<{ card: CardItem; owner: PlayerId } | null>(null);
  const hoveredStandeeCard = hoveredCard;
  const setHoveredStandeeCard = setHoveredCard;
  // The other way round: hovering a full card (in the hand or the gallery) shows its standee in the preview area
  const [previewStandee, setPreviewStandee] = useState<{ card: CardItem; owner?: PlayerId } | null>(null);
  useEffect(() => setPreviewStandee(null), [activeTab]);

  // Deck Selection & Play Match State
  // The Play button first asks how to play (Hot Seat / Online), then Hot Seat goes on to deck selection
  const [isPlayModeOpen, setIsPlayModeOpen] = useState(false);
  const [isDeckSelectOpen, setIsDeckSelectOpen] = useState(false);
  const [activePlayDecks, setActivePlayDecks] = useState<{ player1: SelectableDeck; player2: SelectableDeck } | null>(null);

  // Coin Flip State (Rule 4)
  const [isCoinFlipOpen, setIsCoinFlipOpen] = useState(false);

  // Game Phase: 'setup' (Pregame Reinforcement Phase, Rule 5) vs 'playing' (Gameplay Turns, Rule 6)
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing'>('setup');
  const [initialFirstPlayer, setInitialFirstPlayer] = useState<PlayerId>('player1');
  const [setupConsecutiveStarts, setSetupConsecutiveStarts] = useState(0);

  // Cycle tracking (Rule 5.2: Once per game during setup)
  const [p1HasCycled, setP1HasCycled] = useState(false);
  const [p2HasCycled, setP2HasCycled] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);

  // Turn System & Players State (Rule 6)
  const [activePlayer, setActivePlayer] = useState<PlayerId>('player1');
  const [turnCount, setTurnCount] = useState(1);
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [lastTurnUnitIds, setLastTurnUnitIds] = useState<Record<PlayerId, string | null>>({ player1: null, player2: null });
  const [isTurnTransitioning, setIsTurnTransitioning] = useState(false);
  const [transitionPlayer, setTransitionPlayer] = useState<PlayerId>('player1');

  // Active unit taking the turn
  const [activeTurnUnitHex, setActiveTurnUnitHex] = useState<string | null>(null);
  const [draggedUnitHex, setDraggedUnitHex] = useState<string | null>(null);
  const [activeAbility, setActiveAbility] = useState<CardAbility | null>(null);
  const [multiStageState, setMultiStageState] = useState<MultiStageState | null>(null);
  const [isMovingMode, setIsMovingMode] = useState<boolean>(false);
  const [pendingMomentumCharge, setPendingMomentumCharge] = useState<{
    unitHex: string;
    nextHex: string;
    unit: BattlefieldUnit;
    apRemaining: number;
    sourceName?: string; // the passive offering it, when not Momentum Charge (e.g. Extreme Momentum)
  } | null>(null);
  // 8x6 Hexagonal Grid Earthy Terrain Colors
  const [hexColors, setHexColors] = useState<Record<string, string>>(() => generateEarthyHexColors());
  const [selectedHex, setSelectedHex] = useState<string | null>(null);

  // Board 3D Isometric View & Zoom State (Pitch locked to 35°, 45° step yaw)
  // Baseline zoom is 60%
  const boardPitch = DEFAULT_PITCH;
  const [boardYaw, setBoardYawState] = useState(DEFAULT_YAW);
  const [boardZoom, setBoardZoom] = useState(BASELINE_ZOOM);
  // Camera pan (screen pixels): the battlefield is drawn shifted the opposite way, so the view seems to move
  const [cameraPan, setCameraPan] = useState({ x: 0, y: 0 });
  // A camera a player set up themselves on their turn (rotate, zoom, pan) is theirs: their later turns start with it
  // instead of the default view, until they press Reset. markCameraChange is called by the camera controls only, so the
  // game's own camera turns are never saved.
  type SavedCamera = { yaw: number; zoom: number; pan: { x: number; y: number } };
  const savedCamerasRef = useRef<Partial<Record<PlayerId, SavedCamera>>>({});
  const manualCameraChangeRef = useRef(false);
  const markCameraChange = () => {
    manualCameraChangeRef.current = true;
  };
  // The camera controls can be tucked away behind a small arrow, like the gallery bar and the version
  // (hidden at first)
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const MAX_CAMERA_PAN = 900;
  const panCamera = (dx: number, dy: number) => {
    markCameraChange();
    setCameraPan((p) => ({
      x: Math.max(-MAX_CAMERA_PAN, Math.min(MAX_CAMERA_PAN, p.x + dx)),
      y: Math.max(-MAX_CAMERA_PAN, Math.min(MAX_CAMERA_PAN, p.y + dy))
    }));
  };
  // Which player this screen is: null in hot seat (both players), or 'player1'/'player2' online
  const [localPlayer, setLocalPlayer] = useState<PlayerId | null>(null);
  // The game's own camera turns (to the player whose turn it is, or to a defender deciding something). Online the
  // camera stays on this screen's side, so these do nothing; the rotate buttons still work.
  const setBoardYaw = (yaw: number) => {
    if (localPlayer) return;
    setBoardYawState(yaw);
  };
  const homeSide: PlayerId = localPlayer ?? activePlayer;
  useEffect(() => {
    if (localPlayer) setBoardYawState(localPlayer === 'player1' ? 0 : 180);
  }, [localPlayer]);
  const currentDefaultYaw = homeSide === 'player1' ? 0 : 180;
  useEffect(() => {
    if (!manualCameraChangeRef.current) return;
    manualCameraChangeRef.current = false;
    if (localPlayer) return;
    savedCamerasRef.current[activePlayer] = { yaw: boardYaw, zoom: boardZoom, pan: cameraPan };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardYaw, boardZoom, cameraPan]);
  const isRotated = boardYaw !== currentDefaultYaw || boardZoom !== BASELINE_ZOOM || cameraPan.x !== 0 || cameraPan.y !== 0;

  // Battlefield background image, which the player cycles through (green arrows by the camera controls): the default
  // public/assets/art/background.png, then each set's background (its name as a file there, as on the cards), then no
  // image (black). One that can't be loaded shows as black. Only how it looks: each screen has its own.
  const BOARD_BACKGROUND_SRC = '/assets/art/background.png';
  const [bgImageSrc, setBgImageSrc] = useState<string | null>(null);
  const boardBackgroundChoices = useMemo(() => {
    const sets = Array.from(new Set(initialCardsData.cards.map((c) => c.set).filter((s): s is string => Boolean(s))));
    return [
      BOARD_BACKGROUND_SRC,
      ...sets.map((set) => getSetBackgroundPath({ set } as CardItem)).filter((p): p is string => Boolean(p)),
      null
    ];
  }, []);
  const [boardBackgroundIndex, setBoardBackgroundIndex] = useState(0);
  const cycleBoardBackground = (step: number) =>
    setBoardBackgroundIndex((i) => (i + step + boardBackgroundChoices.length) % boardBackgroundChoices.length);

  // Increases once per turn; turn-start passives are marked with it so they resolve only once in a turn
  const turnStartKeyRef = useRef(0);

  // Deterministic match randomness and ids (part of the saved game state): the same seed and the same actions always
  // give the same game, which online play relies on. Never use Math.random or Date.now for game results.
  const rngStateRef = useRef<number>(makeSeed());
  const nextInstanceIdRef = useRef(1);
  const matchRandom = (): number => {
    const r = nextRandom(rngStateRef.current);
    rngStateRef.current = r.state;
    return r.value;
  };
  // A unit or token id that is the same on every client replaying the same actions
  const newInstanceId = (prefix: string): string => {
    const n = nextInstanceIdRef.current;
    nextInstanceIdRef.current += 1;
    return `${prefix}_${n}`;
  };

  useEffect(() => {
    const src = boardBackgroundChoices[boardBackgroundIndex];
    if (!src) {
      setBgImageSrc(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setBgImageSrc(src);
    img.onerror = () => !cancelled && setBgImageSrc(null);
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [boardBackgroundIndex, boardBackgroundChoices]);
  const boardBackgroundName = (() => {
    const src = boardBackgroundChoices[boardBackgroundIndex];
    if (!src) return 'No image';
    if (src === BOARD_BACKGROUND_SRC) return 'Default';
    return src.replace(/^.*\//, '').replace(/\.png$/, '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  })();

  // Player 1 & Player 2 Deck, Hand, Graveyard
  const [player1Hand, setPlayer1Hand] = useState<CardItem[]>([]);
  const [player1Deck, setPlayer1Deck] = useState<CardItem[]>([]);
  const [player1Graveyard, setPlayer1Graveyard] = useState<CardItem[]>([]);

  const [player2Hand, setPlayer2Hand] = useState<CardItem[]>([]);
  const [player2Deck, setPlayer2Deck] = useState<CardItem[]>([]);
  const [player2Graveyard, setPlayer2Graveyard] = useState<CardItem[]>([]);

  // Selected hand card index for deployment
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [draggedHandIndex, setDraggedHandIndex] = useState<number | null>(null);
  const [tributeSacrificeHexes, setTributeSacrificeHexes] = useState<string[]>([]);
  const [fusionSelectedHexes, setFusionSelectedHexes] = useState<string[]>([]);

  // Assist Ability State
  const [isAssistModalOpen, setIsAssistModalOpen] = useState(false);
  // While an Assist resolves, the deployed assist unit acts as the turn's unit for that one ability (through the
  // normal ability/attack code), then goes to the Graveyard and the turn returns to returnUnitHex.
  const [lockedAssist, setLockedAssist] = useState<{
    unitHex: string;
    unitInstanceId: string;
    card: CardItem;
    ability: CardAbility;
    returnUnitHex: string;
    returnUnitInstanceId: string;
    started: boolean; // the ability has been activated
  } | null>(null);
  const [pendingAssistDeployment, setPendingAssistDeployment] = useState<{
    card: CardItem;
    handIndex: number;
    ability: CardAbility;
  } | null>(null);

  // Field Notes State
  const [fieldNotesPending, setFieldNotesPending] = useState<{
    unitName: string;
    afterAp?: number;
  } | null>(null);

  // Units currently on the battlefield
  const [unitsOnBoard, setUnitsOnBoard] = useState<Record<string, BattlefieldUnit>>({});

  // Scorched Tiles (e.g. from Volatile Hexes or Echoing Incantation)
  const [scorchedTiles, setScorchedTiles] = useState<Record<string, { expiresOnTurnEndFor: PlayerId; casterPlayer: PlayerId; skipTurnEnds?: number }>>({});

  // Game End & Victory State (Rule 8)
  const [winner, setWinner] = useState<PlayerId | 'draw' | null>(null);
  const [victoryReason, setVictoryReason] = useState<string>('');
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);

  // Feedback Notification Message
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // ---- Match log (online play, Phase 2): the readable record of the match, numbered without gaps. The turn handoff
  // carries the entries made since the last handoff; the snapshot, not the log, is what the game continues from.
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const gameLogRef = useRef<LogEntry[]>([]);
  const nextLogSeqRef = useRef(1);
  // (hidden: the text names cards only privateTo may see; others read publicText)
  type HiddenText = { privateTo: PlayerId; publicText: string };
  const appendLog = (kind: LogKind, text: string, player: PlayerId = activePlayer, turn: number = turnCount, hidden?: HiddenText) => {
    const entry: LogEntry = { seq: nextLogSeqRef.current, turn, player, kind, text, ...(hidden || {}) };
    nextLogSeqRef.current += 1;
    gameLogRef.current = [...gameLogRef.current, entry];
    setGameLog(gameLogRef.current);
  };
  const resetGameLog = () => {
    gameLogRef.current = [];
    nextLogSeqRef.current = 1;
    setGameLog([]);
  };

  // (hidden: online, a message naming cards only one player may see shows its public wording on the other screen)
  const showNotification = (msg: string, hidden?: HiddenText) => {
    setFeedbackMessage(hidden && localPlayer && hidden.privateTo !== localPlayer ? hidden.publicText : msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
    if (gamePhase === 'setup' || gamePhase === 'playing') appendLog('note', msg, activePlayer, turnCount, hidden);
  };

  // Who decides a scry: its deck's owner, except Field Notes (whoever uses it, on either player's deck: player is then
  // the deck's owner)
  const scryDecider = (s: { player: PlayerId; isFieldNotes?: boolean }): PlayerId => (s.isFieldNotes ? activePlayer : s.player);

  // Audio state
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [showVolumeDropdown, setShowVolumeDropdown] = useState(false);
  const [scryPending, setScryPending] = useState<{
    card: CardItem;
    player: PlayerId;
    unitName: string;
    isFieldNotes?: boolean;
    sourceTitle?: string;
    abilityName?: string;
    targetPlayer?: PlayerId;
    afterAp?: number;
  } | null>(null);
  const [researchPending, setResearchPending] = useState<{
    cards: CardItem[];
    player: PlayerId;
    sourceTitle: string;
    unitName: string;
    afterAp?: number;
    restOnTop?: boolean;
    offerReinforce?: boolean;
    unitHex?: string;
    drawsCard?: boolean; // the card is "drawn" (e.g. Foretell: "Draw one of them")
  } | null>(null);
  // Optional knockback immunity choice for the defending player (e.g. Hold the Gate)
  const [knockbackChoicePending, setKnockbackChoicePending] = useState<{
    hexId: string;
    defender: PlayerId;
    unitName: string;
    passive: CardPassive;
    attackerName: string;
    abilityName: string;
    tiles: number;
  } | null>(null);
  // The defender's answer, read when the attack click is replayed
  const knockbackDecisionRef = useRef<{ hexId: string; useImmunity: boolean } | null>(null);
  // In a multi-step attack the hit has already landed when the defender is asked: their answer runs this instead
  const knockbackChoiceCallbackRef = useRef<((useImmunity: boolean) => void) | null>(null);
  // Attacker's optional knockback (e.g. Deny Entry, Repulsion Spell): asked when the target is clicked
  const [attackKnockbackPrompt, setAttackKnockbackPrompt] = useState<{
    hexId: string;
    abilityName: string;
    targetName: string;
    message: string;
    options: { label: string; tiles: number }[]; // tiles 0 = no knockback
  } | null>(null);
  // Ready Spell (and any "ready an ability to interrupt with" react). A use of an ability is "committed" by its target
  // click, by activating an untargeted ability, or by choosing a non-attack promoted ability.
  type AbilityCommit =
    | { kind: 'hex'; hexId: string; abilityId: string; targetInstanceId?: string }
    | { kind: 'ability'; ability: CardAbility }
    | { kind: 'promoted'; promoted: CardAbility; parent: CardAbility }
    | { kind: 'move'; fromHex: string; toHex: string }
    | { kind: 'draw' };
  // Choosing which own ability to ready, as the ready ability is used
  const [readySpellChoice, setReadySpellChoice] = useState<{
    ability: CardAbility;
    cost: number;
    once: boolean;
    onAnyAction: boolean;
    options: CardAbility[];
  } | null>(null);
  // "Have [unit] use [ability]?" for an enemy with a readied ability, when the active player commits an ability
  const [readySpellPrompt, setReadySpellPrompt] = useState<{
    reactorHex: string;
    reactorInstanceId: string;
    reactorName: string;
    decider: PlayerId;
    abilityName: string;
    commit: AbilityCommit;
  } | null>(null);
  // Enemies already asked about the ability use being committed now (each is asked once per use)
  const readySpellAskedRef = useRef<{ key: string; asked: string[] } | null>(null);
  // While a readied ability interrupts: the reacting unit is the acting unit (as with an Assist), then the turn and the
  // interrupted ability's use are handed back
  const [readySpellReact, setReadySpellReact] = useState<{
    reactorHex: string;
    reactorInstanceId: string;
    reactorOwner: PlayerId;
    ability: CardAbility;
    started: boolean;
    returnPlayer: PlayerId;
    returnUnitInstanceId: string | null;
    savedAbility: CardAbility | null;
    savedMultiStage: MultiStageState | null;
    commit: AbilityCommit;
  } | null>(null);
  // The interrupted use, resumed once the turn is handed back
  const [readySpellResume, setReadySpellResume] = useState<{ commit: AbilityCommit; returnUnitInstanceId: string; player: PlayerId } | null>(null);
  // "The second hit may target a different unit" (e.g. Cloven Crash): asked when the first target is clicked.
  // Choosing the same target replays the click as a normal attack; a different one goes to a target pick.
  const [splitHitPrompt, setSplitHitPrompt] = useState<{ hexId: string; abilityName: string; targetName: string; candidates: string[] } | null>(null);
  // A choice a card asks for mid-ability (e.g. which attack Roar of the Pride's unit uses, Critical Forecast's ability)
  const [cardChoicePrompt, setCardChoicePrompt] = useState<{ title: string; message: string; options: { label: string; value: string }[]; player?: PlayerId } | null>(null);
  const cardChoiceCallbackRef = useRef<((value: string) => void) | null>(null);
  // (a choice asked while another is open waits its turn, e.g. several Reassembles, or Spirits' Protection after a loot)
  // (player: who answers it, when that isn't the player taking the turn, e.g. Reassemble on the opponent's turn)
  const cardChoiceQueueRef = useRef<{ prompt: { title: string; message: string; options: { label: string; value: string }[]; player?: PlayerId }; onChoose: (value: string) => void }[]>([]);
  // Choices scheduled to be asked shortly (e.g. Spirits' Protection once the attack's damage has rendered)
  const deferredChoicesRef = useRef(0);
  const askCardChoice = (
    prompt: { title: string; message: string; options: { label: string; value: string }[]; player?: PlayerId },
    onChoose: (value: string) => void
  ) => {
    if (cardChoiceCallbackRef.current) {
      cardChoiceQueueRef.current.push({ prompt, onChoose });
      return;
    }
    cardChoiceCallbackRef.current = onChoose;
    setCardChoicePrompt(prompt);
  };
  // The open card choice is answered (by a click here, or by the other player's answer online)
  const answerCardChoice = (value: string) => {
    const cb = cardChoiceCallbackRef.current;
    const answered = cardChoicePrompt;
    cardChoiceCallbackRef.current = null;
    setCardChoicePrompt(null);
    if (answered) appendLog('choice', `${answered.title}: ${answered.options.find((o) => o.value === value)?.label ?? value}`, answered.player ?? activePlayer);
    cb?.(value);
    // Then the next waiting choice (after any follow-up choice this one asks for)
    setTimeout(() => {
      if (cardChoiceCallbackRef.current) return;
      const waiting = cardChoiceQueueRef.current.shift();
      if (waiting) askCardChoice(waiting.prompt, waiting.onChoose);
    });
  };
  const splitHitDecisionRef = useRef<{ abilityId: string; hexId: string } | null>(null);
  // The attacker's answer; kept until the attack resolves (a Hold the Gate prompt may replay the click again).
  // originHex is the tile the knockback pushes away from (the last path step for a ranged attack).
  const attackKnockbackDecisionRef = useRef<{
    abilityId: string;
    hexId: string;
    apply: boolean;
    tiles: number;
    originHex?: string;
  } | null>(null);
  // An attack click to replay after the next render (once path drawing state has cleared)
  const [pendingAttackReplayHex, setPendingAttackReplayHex] = useState<string | null>(null);
  // Bumped when an attack switches passives off (e.g. Silencing Strike); they come back on after that render commits,
  // so passive checks inside the attack's queued board updates also see them off
  const [passiveSuppressionTick, setPassiveSuppressionTick] = useState(0);
  useEffect(() => {
    if (passiveSuppressionTick > 0) clearPassiveSuppression();
  }, [passiveSuppressionTick]);
  // Reveal the top cards of your deck, then put each back on top or on the bottom in any order (e.g. Scroll-Bound Strike).
  // Each card is decided with the scry popup; if several go to the same place, their order is picked with the card-choice popup.
  type DeckArrangeState = {
    player: PlayerId;
    unitName: string;
    abilityName: string;
    afterAp?: number;
    cards: CardItem[]; // revealed cards, top first
    index: number; // next card to decide top/bottom for
    // The lists below hold positions in `cards` (two copies of a card can be the same object)
    tops: number[];
    bottoms: number[];
    orderedTops: number[]; // picked from the top down
    orderedBottoms: number[]; // picked from the very bottom up
  };
  const [deckArrangePending, setDeckArrangePending] = useState<DeckArrangeState | null>(null);
  // A provider ability that uses several promoted abilities in a row (e.g. Dual Casting, Overload, Villainous Combo)
  const [providerChain, setProviderChain] = useState<ProviderChainState | null>(null);
  // A move-through passive's extra move (e.g. Rabble Rouse). mustMove: the unit is passing through an enemy on
  // throughHex and has to land on one of the choices; otherwise it's optional and times out after 4 seconds.
  const [pendingRabbleMove, setPendingRabbleMove] = useState<{
    unitInstanceId: string;
    unitHex: string; // where the unit actually is on the board
    throughHex?: string; // the enemy's tile it is passing through
    choices: string[];
    mustMove: boolean;
    apRemaining: number;
    passiveName: string;
    // Night-Adder's Path: a unit on the chosen tile is knocked back 1 first, then it moves there if the tile is empty
    knockbackOccupant?: boolean;
    // "...then move this unit to an empty surrounding tile for free, then you loot 2" (e.g. Pirate's Curse)
    lootAfterLanding?: number;
    // More free tiles to offer after this one (e.g. Burning Trail: 2 additional tiles), and whether scorched tiles
    // hurt it while doing so
    moreTiles?: number;
    scorchImmune?: boolean;
  } | null>(null);
  const [rabbleSecondsLeft, setRabbleSecondsLeft] = useState(4);
  // A free Move granted by an ability (e.g. Shadow Cast: "Then, this unit may move 1 tile for free")
  const [pendingFreeMove, setPendingFreeMove] = useState<{ unitInstanceId: string; sourceName: string } | null>(null);
  // A provider chain's instant (untargeted) step, resolved once the provider's payment has rendered
  const [pendingChainInstant, setPendingChainInstant] = useState<CardAbility | null>(null);
  // A free ability to target once the pending free move is made or skipped (e.g. Shifting Strike: move, then attack)
  const abilityAfterFreeMoveRef = useRef<CardAbility | null>(null);
  // Mid-turn Reinforce granted by an ability (e.g. Foretell). The acting unit keeps its turn.
  const [abilityReinforcePending, setAbilityReinforcePending] = useState<{
    card: CardItem;
    unitHex: string;
    afterAp?: number;
    sourceTitle: string;
  } | null>(null);
  type LootPendingState = {
    player: PlayerId;
    count: number;
    sourceTitle: string;
    unitName: string;
    unitHex?: string;
    drawnCards: CardItem[];
    afterAp?: number;
    postLootCallback?: () => void;
  };
  type QueuedLoot = {
    player: PlayerId;
    amount: number;
    sourceTitle: string;
    unitName: string;
    opts?: {
      unitHex?: string;
      afterAp?: number;
      postLootCallback?: () => void;
    };
  };
  const [lootPending, setLootPending] = useState<LootPendingState | null>(null);
  const activeLootRef = useRef<LootPendingState | null>(null);
  const lootQueueRef = useRef<QueuedLoot[]>([]);
  // Popups triggered at the same moment (a loot, a reveal, a defender's scry, ...) wait here so only one shows at a time.
  // The player taking the turn resolves theirs first; when one player has several, they choose the order.
  type PopupContext = { p1Deck: CardItem[]; p2Deck: CardItem[]; p1Hand: CardItem[]; p2Hand: CardItem[] };
  type QueuedPopup = {
    key: number;
    decider: PlayerId; // the player who makes this popup's choice
    turnPlayer: PlayerId; // whose turn it was when it triggered
    label: string; // shown when the decider chooses the order
    // Builds and opens the popup from the decks and hands as they are when it opens (an earlier popup may have changed them)
    open: (ctx: PopupContext) => void;
  };
  const [popupQueue, setPopupQueue] = useState<QueuedPopup[]>([]);
  const popupKeyRef = useRef(0);
  const [popupOrderChoice, setPopupOrderChoice] = useState<{ decider: PlayerId; options: QueuedPopup[] } | null>(null);
  // A popup that ends the turn when it closes asks for it here; the turn ends once every queued popup is done
  const turnEndAfterPopupsRef = useRef(false);
  const [turnEndRequestTick, setTurnEndRequestTick] = useState(0);
  // The camera was turned to a non-turn player for their popups; it turns back once the queue is empty
  const popupYawChangedRef = useRef(false);
  const [facelessKingPendingChoice, setFacelessKingPendingChoice] = useState<{
    unitHex: string;
    unitName: string;
    promotedCards: CardItem[];
    nextAction: () => void;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio('/assets/music/music.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (volumeDropdownRef.current && !volumeDropdownRef.current.contains(e.target as HTMLElement)) {
        setShowVolumeDropdown(false);
      }
    };
    if (showVolumeDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showVolumeDropdown]);

  const handleVolumeButtonClick = () => {
    if (isMuted) {
      setIsMuted(false);
      setShowVolumeDropdown(true);
      if (audioRef.current) {
        audioRef.current.volume = volume > 0 ? volume : 0.5;
        audioRef.current.play().catch((err) => {
          console.warn('Audio playback error:', err);
        });
      }
    } else {
      setShowVolumeDropdown((prev) => !prev);
    }
  };

  const handleSliderChange = (newVal: number) => {
    setVolume(newVal);
    if (newVal === 0) {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.volume = newVal;
        if (audioRef.current.paused) audioRef.current.play().catch(() => {});
      }
    }
  };

  const toggleMuteOnly = () => {
    if (isMuted) {
      setIsMuted(false);
      const effectiveVol = volume === 0 ? 0.5 : volume;
      setVolume(effectiveVol);
      if (audioRef.current) {
        audioRef.current.volume = effectiveVol;
        audioRef.current.play().catch(() => {});
      }
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  // All valid cards
  const allCardList = useMemo(() => {
    const list: CardItem[] = [];
    const seenIds = new Set<string>();

    const addUnique = (c: CardItem) => {
      if (c && c.id && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        list.push(c);
      }
    };

    if (cardsData.cards && Array.isArray(cardsData.cards)) {
      cardsData.cards.forEach(addUnique);
    }
    return list;
  }, [cardsData]);

  // Active Hand depending on active player
  const activeHand = activePlayer === 'player1' ? player1Hand : player2Hand;
  // The hand on show (online: always this screen's own; hot seat: the player taking the turn), and the other one
  const shownHandPlayer: PlayerId = localPlayer ?? activePlayer;
  const shownHand = shownHandPlayer === 'player1' ? player1Hand : player2Hand;
  const hiddenHandPlayer: PlayerId = shownHandPlayer === 'player1' ? 'player2' : 'player1';
  const hiddenHandCount = (hiddenHandPlayer === 'player1' ? player1Hand : player2Hand).length;
  const activeDeck = activePlayer === 'player1' ? player1Deck : player2Deck;

  // Filtered cards for Gallery
  // The gallery lists the tokens after the real cards (for viewing only: decks use allCardList)
  const galleryCards = useMemo(() => [...allCardList, ...getTokenGalleryCards(cardsData)], [allCardList, cardsData]);
  const filteredCards = useMemo(() => {
    return galleryCards.filter((card) => {
      if (categoryFilter === 'token' && card.type !== 'token') return false;
      if (categoryFilter === 'basic' && !card.basic) return false;
      if (categoryFilter === 'promote' && card.reinforce?.mode !== 'promote') return false;
      if (categoryFilter === 'fusion' && card.reinforce?.mode !== 'fusion') return false;
      if (categoryFilter === 'tribute' && card.reinforce?.mode !== 'tribute') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesId = card.id.toLowerCase().includes(query);
        const matchesAbility = card.abilities?.some((a) =>
          a.name.toLowerCase().includes(query) || a.text.toLowerCase().includes(query)
        );
        const matchesPassive = card.passives?.some((p) =>
          p.name.toLowerCase().includes(query) || p.text.toLowerCase().includes(query)
        );
        return matchesName || matchesId || matchesAbility || matchesPassive;
      }
      return true;
    });
  }, [galleryCards, categoryFilter, searchQuery]);

  // Setup match once both players' decks are chosen -> Triggers Coin Flip (Rule 4)
  // (seed: online, the seed both players agreed on in the lobby; hot seat makes its own)
  const handleDecksSelected = (decks: { player1: SelectableDeck; player2: SelectableDeck }, seed?: number) => {
    setActivePlayDecks(decks);
    setIsDeckSelectOpen(false);

    // A new match starts its own random sequence and id counter (online, from the seed both players agreed on)
    rngStateRef.current = seed ?? makeSeed();
    nextInstanceIdRef.current = 1;
    turnStartKeyRef.current = 0;

    // Shuffle each player's chosen deck and deal their opening hand
    const p1Cards = shuffleWith(decks.player1.cardList, matchRandom);
    setPlayer1Hand(p1Cards.slice(0, 7));
    setPlayer1Deck(p1Cards.slice(7));
    setPlayer1Graveyard([]);

    const p2Cards = shuffleWith(decks.player2.cardList, matchRandom);
    setPlayer2Hand(p2Cards.slice(0, 7));
    setPlayer2Deck(p2Cards.slice(7));
    setPlayer2Graveyard([]);

    resetMatchRecord();
    setUnitsOnBoard({});
    setSelectedHandIndex(null);
    setDraggedHandIndex(null);
    setSelectedHex(null);
    setActiveTurnUnitHex(null);
    setDraggedUnitHex(null);
    setActiveAbility(null);
    setConsecutivePasses(0);
    setLastTurnUnitIds({ player1: null, player2: null });
    setWinner(null);
    setIsVictoryOpen(false);
    setLockedAssist(null);
    setPendingAssistDeployment(null);
    setPendingMomentumCharge(null);
    setFieldNotesPending(null);
    setScryPending(null);
    setPopupQueue([]);
    setPopupOrderChoice(null);
    turnEndAfterPopupsRef.current = false;
    popupYawChangedRef.current = false;
    setIsAssistModalOpen(false);

    // Reset setup states
    setGamePhase('setup');
    setSetupConsecutiveStarts(0);
    setP1HasCycled(false);
    setP2HasCycled(false);

    setHexColors(generateEarthyHexColors(matchRandom));
    setBoardYaw(DEFAULT_YAW);
    setBoardZoom(BASELINE_ZOOM);
    setCameraPan({ x: 0, y: 0 });
    savedCamerasRef.current = {};

    setActiveTab('play');
    // Open Coin Flip per Rule 4
    setIsCoinFlipOpen(true);
  };

  // Complete Coin Flip (Rule 4) -> Enter Pregame Reinforcement Phase (Rule 5)
  const handleCoinFlipComplete = (firstPlayer: PlayerId) => {
    // (both screens resolve the flip themselves: the first player taking over isn't a handoff)
    lastSetupPlayerRef.current = firstPlayer;
    setIsCoinFlipOpen(false);
    setInitialFirstPlayer(firstPlayer);
    setActivePlayer(firstPlayer);
    // Start camera at player 2 perspective if they are moving first (Rule 4/5)
    setBoardYaw(firstPlayer === 'player1' ? 0 : 180);
    setGamePhase('setup');
    setSetupConsecutiveStarts(0);
    setP1HasCycled(false);
    setP2HasCycled(false);
    setTurnCount(1);
    showNotification(`${firstPlayer === 'player1' ? 'Player 1' : 'Player 2'} won the coin flip and chose to go first! Pregame Reinforcement Phase begins (Rule 5).`);
  };

  // Handle "Start Game" action during pregame reinforcement setup (Rule 5)
  const handleSetupStartClick = () => {
    const nextStarts = setupConsecutiveStarts + 1;
    setSetupConsecutiveStarts(nextStarts);

    if (nextStarts >= 2) {
      // Both players agreed to start in a row!
      setGamePhase('playing');
      setActivePlayer(initialFirstPlayer);
      setBoardYaw(initialFirstPlayer === 'player1' ? 0 : 180);
      setTurnCount(1);
      setTransitionPlayer(initialFirstPlayer);
      setIsTurnTransitioning(true);

      // Pre-apply turn-start passives for Turn 1 immediately so units have their armour/heals ready
      turnStartKeyRef.current += 1;
      const firstTurnKey = turnStartKeyRef.current;
      setUnitsOnBoard((prevUnits) => {
        const { updatedUnits, logMessages } = applyTurnStartPassives(prevUnits, initialFirstPlayer, firstTurnKey);
        showNotification(
          logMessages.length > 0
            ? `Both players agreed to start! Gameplay begins! ${logMessages.join(' • ')}`
            : "Both players agreed to start! Pregame setup ends and gameplay begins!"
        );
        return updatedUnits;
      });
    } else {
      const next: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      setActivePlayer(next);
      setBoardYaw(next === 'player1' ? 0 : 180);
      showNotification(`${activePlayer === 'player1' ? 'Player 1' : 'Player 2'} chose Start! If ${next === 'player1' ? 'Player 1' : 'Player 2'} also chooses Start in a row, the game will begin.`);
    }
  };

  // Handle Cycle action during setup (Rule 5.2: Put chosen cards on bottom of deck, draw that many)
  const handleConfirmCycle = (selectedIndices: number[]) => {
    setIsCycleModalOpen(false);
    if (selectedIndices.length === 0) return;

    playCardDrawSound();

    // Draw exactly as many cards as were actually put back (a stale index past the end of the hand puts back nothing)
    if (activePlayer === 'player1') {
      const cycledCards: CardItem[] = [];
      const remainingHand: CardItem[] = [];
      player1Hand.forEach((card, idx) => {
        if (selectedIndices.includes(idx)) {
          cycledCards.push(card);
        } else {
          remainingHand.push(card);
        }
      });

      const count = cycledCards.length;
      // Draw new cards from the top of the current deck
      const drawnCards = player1Deck.slice(0, count);
      // Place all cycled cards onto the bottom of the deck
      const finalDeck = [...player1Deck.slice(count), ...cycledCards];

      setPlayer1Hand([...remainingHand, ...drawnCards]);
      setPlayer1Deck(finalDeck);
      setP1HasCycled(true);
    } else {
      const cycledCards: CardItem[] = [];
      const remainingHand: CardItem[] = [];
      player2Hand.forEach((card, idx) => {
        if (selectedIndices.includes(idx)) {
          cycledCards.push(card);
        } else {
          remainingHand.push(card);
        }
      });

      const count = cycledCards.length;
      // Draw new cards from the top of the current deck
      const drawnCards = player2Deck.slice(0, count);
      // Place all cycled cards onto the bottom of the deck
      const finalDeck = [...player2Deck.slice(count), ...cycledCards];

      setPlayer2Hand([...remainingHand, ...drawnCards]);
      setPlayer2Deck(finalDeck);
      setP2HasCycled(true);
    }

    setSetupConsecutiveStarts(0);
    const next: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
    setActivePlayer(next);
    setBoardYaw(next === 'player1' ? 0 : 180);
    showNotification(`Cycled ${selectedIndices.length} card(s) to the bottom of the deck and drew ${selectedIndices.length} new card(s) from the top! It is now ${next === 'player1' ? 'Player 1' : 'Player 2'}'s setup turn.`);
  };

  const resetToOriginalPerspective = () => {
    setBoardYawState(currentDefaultYaw);
    setBoardZoom(BASELINE_ZOOM);
    setCameraPan({ x: 0, y: 0 });
    delete savedCamerasRef.current[activePlayer];
  };

  // Check victory condition (Rule 8)
  const checkVictory = (currentUnits: Record<string, BattlefieldUnit>) => {
    // (a unit being carried, e.g. by Hidden Strings, is still its owner's)
    const units = Object.values(currentUnits).flatMap((u) => (u.carriedUnit ? [u, u.carriedUnit.unit] : [u]));
    const p1Units = units.filter((u) => u.owner === 'player1' && !u.card.isWall && u.card.type !== 'token');
    const p2Units = units.filter((u) => u.owner === 'player2' && !u.card.isWall && u.card.type !== 'token');

    // Only trigger if game has started with units
    if (turnCount > 1 || units.length >= 2) {
      if (p1Units.length === 0 && p2Units.length > 0) {
        setWinner('player2');
        setVictoryReason('Player 1 has no non-token units left on the board.');
        setIsVictoryOpen(true);
        return;
      }
      if (p2Units.length === 0 && p1Units.length > 0) {
        setWinner('player1');
        setVictoryReason('Player 2 has no non-token units left on the board.');
        setIsVictoryOpen(true);
        return;
      }
      if (p1Units.length === 0 && p2Units.length === 0 && units.length > 0) {
        setWinner('draw');
        setVictoryReason('Both players have no non-token units left on the board.');
        setIsVictoryOpen(true);
        return;
      }
    }
  };

  // Leader of the Bunch passive dynamic HP sync
  // Dynamically checks the number of friendly units surrounding the unit with the passive every time a unit moves or board changes.
  // The unit with the passive has an updating HP increase of 1 per surrounding friendly unit (goes back down if the unit moves away from surrounding tiles).
  useEffect(() => {
    let hasChange = false;
    for (const [hex, unit] of Object.entries(unitsOnBoard)) {
      if (hasLeaderOfTheBunch(unit)) {
        const baseHp = unit.baseMaxHp ?? allCardList.find((c) => c.id === unit.card.id)?.hp ?? unit.card.hp;
        const surroundingCount = getSurroundingFriendlyCount(hex, unit.owner, unitsOnBoard, unit.instanceId);
        const expectedHp = baseHp + surroundingCount;
        if (unit.card.hp !== expectedHp || unit.baseMaxHp !== baseHp) {
          hasChange = true;
          break;
        }
      }
    }
    if (hasChange) {
      setUnitsOnBoard((prev) => {
        const syncRes = syncLeaderOfTheBunch(prev, allCardList);
        syncRes.logMessages.forEach((msg) => showNotification(msg));
        syncRes.defeatedUnits.forEach((defUnit) => {
          delete syncRes.updatedBoard[defUnit.hexId];
          if (defUnit.card.type !== 'token') {
            if (defUnit.owner === 'player1') {
              setPlayer1Graveyard((g) => [...g, defUnit.card]);
            } else {
              setPlayer2Graveyard((g) => [...g, defUnit.card]);
            }
          }
          showNotification(`👑 ${defUnit.card.name} lost surrounding allies and succumbed to its wounds!`);
        });
        checkVictory(syncRes.updatedBoard);
        return syncRes.updatedBoard;
      });
    }
  }, [unitsOnBoard, allCardList]);

  // Helper to draw a card for a player (handles Sanguine Offering, Loot, etc.)
  // "Whenever this unit draws a card, this unit heals N damage" (e.g. Tapestry of Fate). Queued and applied once the
  // current action's own board update has rendered (it may set this unit's damage outright). This depends only on
  // the order of state updates, never on a timer, so a replayed game heals at the same point.
  const [pendingDrawHeals, setPendingDrawHeals] = useState<{ instanceId: string; heal: number; name: string }[]>([]);
  const healOnDraw = (unit: BattlefieldUnit | null | undefined, cards: number) => {
    const heal = getDrawHeal(unit, cards);
    if (!unit || heal <= 0) return;
    setPendingDrawHeals((q) => [...q, { instanceId: unit.instanceId, heal, name: unit.card.name }]);
  };
  useEffect(() => {
    if (pendingDrawHeals.length === 0) return;
    const heals = pendingDrawHeals;
    setPendingDrawHeals([]);
    setUnitsOnBoard((prev) => {
      let next = prev;
      heals.forEach(({ instanceId, heal }) => {
        const entry = Object.entries(next).find(([, u]) => u.instanceId === instanceId);
        if (!entry || entry[1].damageCounters <= 0) return;
        const [hex, u] = entry;
        next = { ...next, [hex]: { ...u, damageCounters: Math.max(0, u.damageCounters - heal) } };
      });
      return next;
    });
    heals.forEach(({ name, heal }) => showNotification(`${name} drew and healed up to ${heal} damage.`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDrawHeals]);

  const drawCardForPlayer = (playerId: PlayerId) => {
    if (playerId === 'player1') {
      setPlayer1Deck((prevDeck) => {
        if (prevDeck.length === 0) return prevDeck;
        const [drawn, ...rest] = prevDeck;
        setPlayer1Hand((h) => [...h, drawn]);
        return rest;
      });
    } else {
      setPlayer2Deck((prevDeck) => {
        if (prevDeck.length === 0) return prevDeck;
        const [drawn, ...rest] = prevDeck;
        setPlayer2Hand((h) => [...h, drawn]);
        return rest;
      });
    }
  };

  // Helper to process damage events and trigger passives like Embedded Press
  // "Up to once per turn, when this unit becomes the target of a melee attack, create an Apparition token on an empty
  // surrounding tile" (e.g. Spirits' Protection): { trigger: 'self.targetedByMeleeAttack', limits: { oncePerTurn },
  // effects: [{ type: 'createToken', token, tile: 'emptySurroundingSelf' }] }. It triggers when targeted; once the
  // attack's damage is done, the unit's owner chooses the empty tile around it (around the tile it was on, if it died).
  const offerMeleeTargetedTokens = (targetInstanceId: string) => {
    const hex = Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === targetInstanceId);
    if (!hex) return;
    const unit = unitsOnBoard[hex];
    getUnitPassives(unit).forEach((p) => {
      if (p.trigger !== 'self.targetedByMeleeAttack') return;
      const eff: any = (p.effects || []).find((e: any) => e.type === 'createToken' && e.tile === 'emptySurroundingSelf');
      if (!eff) return;
      const key = p.id || p.name;
      if ((p as any).limits?.oncePerTurn && unit.passiveTurnMarks?.[key] === turnCount) return;
      const tokenDef = (cardsData.tokens || []).find((t) => t.id === eff.token);
      if (!tokenDef) return;
      setUnitsOnBoard((prev) => {
        const h = Object.keys(prev).find((k) => prev[k].instanceId === targetInstanceId);
        if (!h) return prev;
        return { ...prev, [h]: { ...prev[h], passiveTurnMarks: { ...(prev[h].passiveTurnMarks || {}), [key]: turnCount } } };
      });
      const ask = () => {
        deferredChoicesRef.current -= 1;
        const board = unitsOnBoardRef.current;
        const centre = Object.keys(board).find((k) => board[k].instanceId === targetInstanceId) || hex;
        const tiles = getSurroundingHexes(centre).filter((t) => !board[t]);
        if (tiles.length === 0) {
          showNotification(`👻 ${p.name}: there's no empty tile around ${unit.card.name} for ${tokenDef.name}.`);
          return;
        }
        askCardChoice(
          {
            title: `${p.name} (${unit.owner === 'player1' ? 'Player 1' : 'Player 2'})`,
            message: `${unit.card.name} was targeted by a melee attack. Choose the empty tile around it to create ${tokenDef.name} on.`,
            player: unit.owner,
            options: tiles.map((t) => ({ label: t, value: t }))
          },
          (spot) => {
            if (unitsOnBoardRef.current[spot]) {
              deferredChoicesRef.current += 1;
              setTimeout(ask);
              return;
            }
            setUnitsOnBoard((prev) =>
              prev[spot]
                ? prev
                : {
                    ...prev,
                    [spot]: {
                      instanceId: newInstanceId(`token_${tokenDef.id}`),
                      card: { ...tokenDef, type: 'token' },
                      owner: unit.owner,
                      hexId: spot,
                      damageCounters: 0,
                      armour: 0,
                      currentAp: 0,
                      promotedCards: []
                    }
                  }
            );
            showNotification(`👻 ${p.name}: ${unit.card.name} created ${tokenDef.name} on ${spot}.`);
          }
        );
      };
      // (after the attack's damage has rendered)
      deferredChoicesRef.current += 1;
      setTimeout(ask, 50);
    });
  };

  // Puts down the unit the unit on carrierHex is carrying (e.g. Hidden Strings): on the last empty tile it left, else an
  // empty tile around it. With no empty tile, it stays carried.
  const putDownCarriedUnit = (board: Record<string, BattlefieldUnit>, carrierHex: string): Record<string, BattlefieldUnit> => {
    const carrier = board[carrierHex];
    const c = carrier?.carriedUnit;
    if (!c) return board;
    const spot = [c.lastLeftHex, ...getSurroundingHexes(carrierHex)].find((h): h is string => Boolean(h) && h !== carrierHex && !board[h!]);
    if (!spot) return board;
    showNotification(`🎭 ${c.sourceName}: ${carrier.card.name} put ${c.unit.card.name} down on ${spot}.`);
    return { ...board, [carrierHex]: { ...carrier, carriedUnit: undefined }, [spot]: { ...c.unit, hexId: spot } };
  };

  // The unit taking the turn dealt the damage in these events: it "has dealt damage this turn" (e.g. Combat Roll), and
  // its "whenever an enemy unit is damaged by this one" passives apply to the enemies hit (e.g. Ear Ringer:
  // { trigger: 'self.damagesEnemyUnit', effects: [{ type: 'increaseDrawCost', target: 'damagedUnit' }] })
  const markDamageDealtByActiveUnit = (
    events: DamageEvent[],
    board: Record<string, BattlefieldUnit>
  ): Record<string, BattlefieldUnit> => {
    if (!activeTurnUnit) return board;
    const dealerHex = Object.keys(board).find((h) => board[h].instanceId === activeTurnUnit.instanceId);
    const hitHexes = events
      .filter((ev) => (ev.damageAmount === undefined || ev.damageAmount > 0) && ev.hexId !== dealerHex)
      .map((ev) => ev.hexId);
    if (hitHexes.length === 0) return board;
    let next = board;
    if (dealerHex && !next[dealerHex].dealtDamageThisTurn) {
      next = { ...next, [dealerHex]: { ...next[dealerHex], dealtDamageThisTurn: true } };
    }
    const dealer = dealerHex ? next[dealerHex] : activeTurnUnit;
    const drawTax = getUnitPassives(dealer).some(
      (p) => p.trigger === 'self.damagesEnemyUnit' && (p.effects || []).some((e: any) => e.type === 'increaseDrawCost')
    );
    if (drawTax) {
      hitHexes.forEach((h) => {
        const u = next[h];
        if (!u || u.owner === dealer.owner || isImmuneToNonDamageEffects(u, true) || u.statuses?.includes(DRAW_TAX)) return;
        next = { ...next, [h]: { ...u, statuses: [...(u.statuses || []), DRAW_TAX] } };
      });
    }
    return next;
  };

  const applyDamageEventsAndPassives = (
    events: DamageEvent[],
    board: Record<string, BattlefieldUnit>
  ): Record<string, BattlefieldUnit> => {
    if (!events || events.length === 0) return board;
    const { updatedUnits: pressed, triggeredMessages } = checkAndTriggerEmbeddedPress(
      events,
      board,
      drawCardForPlayer
    );
    const updatedUnits = markDamageDealtByActiveUnit(events, pressed);
    triggeredMessages.forEach((msg) => showNotification(msg));
    // "Whenever this unit takes damage (from an attack)" reactions of the damaged units that are still in play
    // (e.g. Reactive Splatter, Conductive Sludge: damage to the enemies around it; Adaptive Mucus: armour up to 3).
    // The damage they deal is passive damage: it reaches Embedded Press but sets off no further reactions.
    let next = updatedUnits;
    const splash: PassiveDamage[] = [];
    const notes: string[] = [];
    events.forEach((ev) => {
      if (ev.damageAmount !== undefined && ev.damageAmount <= 0) return;
      const u = next[ev.hexId];
      if (!u) return;
      const r = getDamageTakenReactions(u, ev.hexId, next, !ev.nonAttack);
      splash.push(...r.damage);
      if (r.armourUpTo > u.armour) {
        next = { ...next, [ev.hexId]: { ...u, armour: r.armourUpTo } };
        notes.push(`${r.armourSource}: ${u.card.name} armoured up to ${r.armourUpTo}`);
      }
    });
    if (splash.length > 0) {
      const res = dealPassiveDamage(next, splash);
      next = checkAndTriggerEmbeddedPress(res.events, res.board, drawCardForPlayer).updatedUnits;
      sendToGraveyard(res.defeated);
      notes.push(...res.log);
    }
    if (notes.length > 0) showNotification(`⚡ ${notes.join(' • ')}`);
    return next;
  };

  // Puts defeated units' cards in their owner's graveyard (tokens just leave play)
  const sendToGraveyard = (units: BattlefieldUnit[]) => {
    units.forEach((u) => {
      if (u.card.type === 'token') return;
      if (u.owner === 'player1') setPlayer1Graveyard((g) => [...g, u.card]);
      else setPlayer2Graveyard((g) => [...g, u.card]);
    });
  };

  // Damage from passives (moving, knockback riders, splashes, ...) resolved on a board: graveyard, Embedded Press and
  // "takes damage" reactions included. Use inside a setUnitsOnBoard updater.
  const resolvePassiveDamage = (board: Record<string, BattlefieldUnit>, requests: PassiveDamage[]) => {
    if (requests.length === 0) return board;
    const res = dealPassiveDamage(board, requests);
    sendToGraveyard(res.defeated);
    if (res.log.length > 0) showNotification(`⚡ ${res.log.join(' • ')}`);
    const after = applyDamageEventsAndPassives(res.events, res.board);
    checkVictory(after);
    return after;
  };

  // "When this unit applies knockback to an enemy unit" (e.g. Heavy Air, Fanning the Flames), and who knocked it back
  // this turn (e.g. Crescent Blade). Call with the board after the knockback; attacker is the unit that applied it.
  const applyKnockbackRiders = (
    board: Record<string, BattlefieldUnit>,
    attacker: BattlefieldUnit | null | undefined,
    knockedInstanceId: string
  ): Record<string, BattlefieldUnit> => {
    if (!attacker) return board;
    const hex = Object.keys(board).find((h) => board[h].instanceId === knockedInstanceId);
    if (!hex || board[hex].owner === attacker.owner) return board;
    let next: Record<string, BattlefieldUnit> = {
      ...board,
      [hex]: { ...board[hex], knockedBackBy: { instanceId: attacker.instanceId, turn: turnCount } }
    };
    const riders = getKnockbackRiders(attacker);
    if (riders.actionTax) {
      const u = next[hex];
      if (!u.statuses?.includes(ACTION_TAX)) next = { ...next, [hex]: { ...u, statuses: [...(u.statuses || []), ACTION_TAX] } };
    }
    if (riders.scorchLanding) {
      const opponent: PlayerId = attacker.owner === 'player1' ? 'player2' : 'player1';
      setScorchedTiles((prev) => ({ ...prev, [hex]: { expiresOnTurnEndFor: opponent, casterPlayer: attacker.owner } }));
    }
    if (riders.names.length > 0) {
      showNotification(
        `🌬️ ${attacker.card.name}'s ${riders.names.join(' & ')}: ${next[hex].card.name}${
          riders.actionTax ? ' must spend 1 more AP on its first action if it takes the next turn' : ''
        }${riders.scorchLanding ? `; ${hex} is scorched` : ''}.`
      );
    }
    if (riders.damage > 0) next = resolvePassiveDamage(next, [{ hex, amount: riders.damage, source: riders.names.join(' & ') }]);
    return next;
  };

  // Damage from a move (e.g. Static Discharge, Living Squall, Static Fur) for the unit that moved along `path`
  // (fromHex: where the move started, for the directions it went in, e.g. Conductive Charge)
  const applyMoveTriggers = (
    board: Record<string, BattlefieldUnit>,
    moverInstanceId: string,
    path: string[],
    fromHex?: string,
    followed = false
  ): Record<string, BattlefieldUnit> => {
    const hex = Object.keys(board).find((h) => board[h].instanceId === moverInstanceId);
    if (!hex || path.length === 0) return board;
    const { newDirections, log } = logMoveDirections(board[hex], fromHex, path, turnCount);
    let mover = { ...board[hex], moveDirectionLog: log };
    // A unit carrying another (e.g. Hidden Strings) remembers the last empty tile it left, to put that unit down there
    if (mover.carriedUnit && fromHex) {
      const left = [fromHex, ...path.slice(0, -1)].filter((h) => h !== hex && !board[h]);
      if (left.length > 0) mover = { ...mover, carriedUnit: { ...mover.carriedUnit, lastLeftHex: left[left.length - 1] } };
    }
    let next = resolvePassiveDamage({ ...board, [hex]: mover }, getMoveDamage(mover, path, { ...board, [hex]: mover }, mover.owner === activePlayer, newDirections));
    // Lock-Step on the mover: the unit that put it there follows, step for step in the same directions, stopping at
    // the first occupied (or off-board) tile
    const lockerId = mover.lockStepBy;
    const lockerHex = lockerId && !followed ? Object.keys(next).find((h) => next[h].instanceId === lockerId) : undefined;
    if (lockerHex && fromHex && next[hex]) {
      const steps: string[] = [];
      let cur = lockerHex;
      let prev = fromHex;
      for (const h of path) {
        const dir = getHexMovementDirection(prev, h);
        prev = h;
        if (dir === null) break;
        const p = parseHexId(cur);
        if (!p) break;
        const c = offsetToCube(p.col, p.rowIdx);
        const o = cubeToOffset(c.q + CUBE_DIRECTIONS[dir].dq, c.r + CUBE_DIRECTIONS[dir].dr);
        if (o.col < 0 || o.col > 7 || o.rowNum < 1 || o.rowNum > 6) break;
        const to = toHexId(o.col, o.rowNum);
        if (next[to]) break;
        steps.push(to);
        cur = to;
      }
      if (steps.length > 0) {
        const locker = next[lockerHex];
        next = { ...next };
        delete next[lockerHex];
        next[cur] = { ...locker, hexId: cur };
        showNotification(`🔗 Lock-Step: ${locker.card.name} followed ${mover.card.name} to ${cur}.`);
        next = applyMoveTriggers(next, locker.instanceId, steps, lockerHex, true);
      }
    }
    return next;
  };

  // Switch Turn to Other Player (Rule 6) with pause and overlap transition
  const switchTurn = (isPass = false) => {
    // An Assist is free: running out of the assist unit's own AP (or it being defeated) never ends the real turn.
    // The assist finishes on its own and hands the turn back.
    if (lockedAssist) return;
    // A readied ability interrupting (e.g. Ready Spell) never ends the real turn: it hands the turn back when done
    if (readySpellReact) return;
    if (pendingAssistDeployment) {
      showNotification("Pending Assist deployment: Place unit on back row or click Cancel Assist.");
      return;
    }
  const unitThatTookTurn = activeTurnUnitHex ? unitsOnBoard[activeTurnUnitHex] : null;
    setLastTurnUnitIds((prev) => ({ ...prev, [activePlayer]: unitThatTookTurn ? unitThatTookTurn.instanceId : null }));
    setActiveTurnUnitHex(null);
    setDraggedUnitHex(null);
    setActiveAbility(null);
    setMultiStageState(null);
    setSelectedHandIndex(null);
    setSelectedHex(null);
    setIsMovingMode(false);
    setPendingMomentumCharge(null);
    setPendingAssistDeployment(null);
    setFieldNotesPending(null);
    setTributeSacrificeHexes([]);
    setAbilityReinforcePending(null);
    setProviderChain(null);
    setPendingFreeMove(null);
    setPendingRabbleMove(null);
    multiStepAttackRef.current = null;

    const nextPasses = isPass ? consecutivePasses + 1 : 0;
    setConsecutivePasses(nextPasses);

    if (nextPasses >= 10) {
      setWinner('draw');
      setVictoryReason('Both players passed 10 consecutive times (Rule 6.2.8).');
      setIsVictoryOpen(true);
      return;
    }

    const nextPlayer: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
    setTransitionPlayer(nextPlayer);
    appendLog('turn', isPass ? 'passed' : `ended the turn${unitThatTookTurn ? ` (${unitThatTookTurn.card.name})` : ''}`);

    // Expire scorched tiles that ended on active player's turn
    setScorchedTiles((prev) => {
      const next: Record<string, { expiresOnTurnEndFor: PlayerId; casterPlayer: PlayerId; skipTurnEnds?: number }> = {};
      Object.entries(prev).forEach(([hex, s]) => {
        if (s.expiresOnTurnEndFor !== activePlayer) {
          next[hex] = s;
        } else if (s.skipTurnEnds && s.skipTurnEnds > 0) {
          // "Until the end of your next turn": this turn's end doesn't count yet
          next[hex] = { ...s, skipTurnEnds: s.skipTurnEnds - 1 };
        }
      });
      return next;
    });

    // Apply Turn Start Passives for EACH turn start (Rule: Turn Start passives on their player's and opponent's turns).
    // The new turn gets a new key, so each unit's turn-start passives resolve once in it.
    turnStartKeyRef.current += 1;
    const nextTurnKey = turnStartKeyRef.current;
    setUnitsOnBoard((prevUnits) => {
      // A unit carrying another (e.g. Hidden Strings) puts it down on the last empty tile it left
      Object.keys(prevUnits).forEach((h) => {
        if (prevUnits[h]?.carriedUnit) prevUnits = putDownCarriedUnit(prevUnits, h);
      });
      // Clear inspiring grantedAbilities, reset tookDamageThisTurn, and expire finished reflect stances at end of turn
      const cleanedUnits: Record<string, BattlefieldUnit> = {};
      Object.entries(prevUnits).forEach(([hex, u]) => {
        let unitToUpdate = u;
        // "At the end of this unit's turn, if it used N abilities this turn, it armours up to M" (e.g. Waxing Momentum):
        // trigger 'self.endOfOwnTurn', { type: 'armour', target: 'self', upTo, if: 'self.abilitiesUsedThisTurn>=N' }
        if (unitThatTookTurn && u.instanceId === unitThatTookTurn.instanceId) {
          getUnitPassives(u).forEach((p) => {
            if (p.trigger !== 'self.endOfOwnTurn') return;
            const eff: any = (p.effects || []).find((e: any) => e.type === 'armour' && typeof e.upTo === 'number');
            const need = typeof eff?.if === 'string' ? eff.if.match(/^self\.abilitiesUsedThisTurn>=(\d+)$/) : null;
            if (!eff || (need && getAbilitiesUsedThisTurn(u) < parseInt(need[1], 10)) || unitToUpdate.armour >= eff.upTo) return;
            unitToUpdate = { ...unitToUpdate, armour: eff.upTo };
            showNotification(`${u.card.name}'s ${p.name}: armoured up to ${eff.upTo}.`);
          });
        }
        if (unitToUpdate.tookDamageThisTurn || unitToUpdate.movedThisTurn || unitToUpdate.movedDirectionsThisTurn) {
          unitToUpdate = { ...unitToUpdate, tookDamageThisTurn: false, movedThisTurn: false, movedDirectionsThisTurn: undefined, movesThisTurn: undefined };
        }
        if (unitToUpdate.tilesMovedThisTurn) {
          unitToUpdate = { ...unitToUpdate, tilesMovedThisTurn: undefined };
        }
        // "On a turn when it has killed an enemy unit" (e.g. Relentless Rage) is over
        if (unitToUpdate.killedEnemyThisTurn) {
          unitToUpdate = { ...unitToUpdate, killedEnemyThisTurn: undefined };
        }
        if (unitToUpdate.bonusRangeThisTurn) {
          unitToUpdate = { ...unitToUpdate, bonusRangeThisTurn: undefined };
        }
        // "That unit's passives have no effect this turn" (e.g. Posthumous Prerogative) and "this turn" ability bars
        if (unitToUpdate.statuses?.includes(PASSIVES_REMOVED_THIS_TURN)) {
          unitToUpdate = { ...unitToUpdate, statuses: unitToUpdate.statuses.filter((s) => s !== PASSIVES_REMOVED_THIS_TURN) };
        }
        // "If this unit has dealt damage this turn" (e.g. Combat Roll) and "until the end of the turn" marks on a target
        // (e.g. Parasitic Enzyme) are over
        if (unitToUpdate.dealtDamageThisTurn || unitToUpdate.attackerMark) {
          unitToUpdate = { ...unitToUpdate, dealtDamageThisTurn: undefined, attackerMark: undefined };
        }
        // "...until the end of your opponent's next turn" (e.g. Ethereal Guard): lapses when that opponent's turn ends
        if (unitToUpdate.attackDamageReduction && unitToUpdate.attackDamageReduction.setOnTurnOf !== activePlayer) {
          unitToUpdate = { ...unitToUpdate, attackDamageReduction: undefined };
        }
        // Lock-Step on this unit lasts through its controller's next turn
        if (unitToUpdate.lockStepBy && unitToUpdate.owner === activePlayer) {
          unitToUpdate = { ...unitToUpdate, lockStepBy: undefined };
        }
        // Knockback immunity (Hold the Gate on the opponent's turn, Brace for Impact on its own) lasts through a turn of
        // its opponent: it lapses when that turn ends
        if (unitToUpdate.knockbackImmuneThisTurn && unitToUpdate.owner !== activePlayer) {
          unitToUpdate = { ...unitToUpdate, knockbackImmuneThisTurn: undefined };
        }
        // "...this turn" buffs for the next attack / armour ability (e.g. Perfect Form) lapse
        if (unitToUpdate.nextAttackBonus || unitToUpdate.nextArmourAbilityBonus) {
          unitToUpdate = { ...unitToUpdate, nextAttackBonus: null, nextArmourAbilityBonus: null };
        }
        if (unitToUpdate.cannotInflictKnockbackNextOwnTurn && unitToUpdate.owner === activePlayer) {
          unitToUpdate = { ...unitToUpdate, cannotInflictKnockbackNextOwnTurn: undefined };
        }
        // A readied ability (e.g. Ready Spell) lapses at the end of the opponent's turn it was readied for
        if (unitToUpdate.readySpell && unitToUpdate.readySpell.expiresOnTurnEndFor === activePlayer) {
          unitToUpdate = { ...unitToUpdate, readySpell: null };
        }
        if (unitToUpdate.reflectStance && unitToUpdate.reflectStance.expiresOnTurnEndFor === activePlayer) {
          unitToUpdate = { ...unitToUpdate, reflectStance: null };
        }
        if (unitToUpdate.readyStance && unitToUpdate.readyStance.expiresOnTurnEndFor === activePlayer) {
          unitToUpdate = { ...unitToUpdate, readyStance: null };
        }
        if (unitToUpdate.deathMark || unitToUpdate.statuses?.includes('death_mark')) {
          unitToUpdate = {
            ...unitToUpdate,
            deathMark: undefined,
            statuses: unitToUpdate.statuses?.filter((s) => s !== 'death_mark')
          };
        }
        if (unitToUpdate.grantedAbilities && unitToUpdate.grantedAbilities.length > 0) {
          cleanedUnits[hex] = { ...unitToUpdate, grantedAbilities: undefined };
        } else {
          cleanedUnits[hex] = unitToUpdate;
        }
      });
      // "This turn" damage marks (Target Acquired) lapse with the turn
      const venom = resolveSlowVenom(clearDamageMarks(expireTurnRestrictions(cleanedUnits, activePlayer)), nextPlayer);
      venom.defeated.forEach((u) => {
        if (u.card.type === 'token') return;
        if (u.owner === 'player1') setPlayer1Graveyard((g) => [...g, u.card]);
        else setPlayer2Graveyard((g) => [...g, u.card]);
      });
      const { updatedUnits, logMessages } = applyTurnStartPassives(venom.updatedUnits, nextPlayer, nextTurnKey);
      const allLogs = [...venom.logMessages, ...logMessages];
      if (allLogs.length > 0) {
        showNotification(`Turn Start (${nextPlayer === 'player1' ? 'P1' : 'P2'}): ${allLogs.join(' • ')}`);
      }
      if (venom.defeated.length > 0) checkVictory(updatedUnits);
      return updatedUnits;
    });

    setIsTurnTransitioning(true);
  };

  const handleTurnTransitionComplete = () => {
    appendLog('turn', 'turn starts', transitionPlayer, gamePhase === 'playing' ? turnCount + 1 : 1);
    // Once the new turn has settled, its state is handed over (see the turn handoff below)
    handoffPendingRef.current = true;
    setActivePlayer(transitionPlayer);
    setTurnCount((prev) => (gamePhase === 'playing' ? prev + 1 : 1));
    setIsTurnTransitioning(false);
    playCardDrawSound();

    // Automatically shift perspective so that player's back row is closest to camera
    // Player 1 back row is Row 1 (closest at 0deg)
    // Player 2 back row is Row 6 (closest at 180deg)
    // (a player who set up their own camera gets it back instead, until they press Reset)
    const targetYaw = transitionPlayer === 'player1' ? 0 : 180;
    const savedCamera = localPlayer ? undefined : savedCamerasRef.current[transitionPlayer];
    if (savedCamera) {
      setBoardYawState(savedCamera.yaw);
      setBoardZoom(savedCamera.zoom);
      setCameraPan(savedCamera.pan);
    } else {
      setBoardYaw(targetYaw);
      if (!localPlayer) {
        setBoardZoom(BASELINE_ZOOM);
        setCameraPan({ x: 0, y: 0 });
      }
    }

    // Re-verify Turn Start Passives: only units not yet resolved this turn (same turn key) are affected
    const currentTurnKey = turnStartKeyRef.current;
    setUnitsOnBoard((prevUnits) => {
      const { updatedUnits, logMessages } = applyTurnStartPassives(prevUnits, transitionPlayer, currentTurnKey);
      if (logMessages.length > 0) {
        showNotification(`Turn Start (${transitionPlayer === 'player1' ? 'P1' : 'P2'}): ${logMessages.join(' • ')}`);
      }
      return updatedUnits;
    });
  };

  // Active unit taking a turn (Rule 6.2)
  const activeTurnUnit = activeTurnUnitHex ? unitsOnBoard[activeTurnUnitHex] || null : null;

  // Board-wide state the damage rules read (scorched tiles, this turn's number)
  setBoardContext({ scorchedTiles, unitsOnBoard, turnNumber: turnCount });

  // The unit taking the turn can be moved (e.g. Bouncy Membrane's knockback) or defeated (e.g. a splash passive) by
  // another unit's passive: follow it to its new tile, or end the turn if it is gone
  const activeTurnUnitIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeTurnUnit) {
      activeTurnUnitIdRef.current = activeTurnUnit.instanceId;
      return;
    }
    if (!activeTurnUnitHex || gamePhase !== 'playing' || isTurnTransitioning) return;
    const id = activeTurnUnitIdRef.current;
    const movedTo = id ? Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === id) : undefined;
    if (movedTo) {
      setActiveTurnUnitHex(movedTo);
      setSelectedHex(movedTo);
      return;
    }
    setActiveTurnUnitHex(null);
    setSelectedHex(null);
    switchTurn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsOnBoard, activeTurnUnitHex]);

  // "When this unit dies, you may discard a card. If you do, reinforce it again immediately from your graveyard for
  // free. When this unit is reinforced this way, place N damage on it" (e.g. Reassemble): { trigger: 'self.dies',
  // effects: [{ type: 'reassemble', discard: 1, damage: N }] }. Its owner picks a card to discard (or declines), then an
  // empty tile on their back row.
  // (the board as last rendered, for choices answered later)
  const unitsOnBoardRef = useRef(unitsOnBoard);
  unitsOnBoardRef.current = unitsOnBoard;
  const handsRef = useRef({ player1: player1Hand, player2: player2Hand });
  handsRef.current = { player1: player1Hand, player2: player2Hand };
  const getReassembleDamage = (unit: BattlefieldUnit): number | null => {
    for (const p of getUnitPassives(unit)) {
      if (p.trigger !== 'self.dies') continue;
      const e: any = (p.effects || []).find((x: any) => x.type === 'reassemble');
      if (e) return typeof e.damage === 'number' ? e.damage : 0;
    }
    return null;
  };
  // (several at once are offered one after another, each with the hand and board as they are by then)
  const offerReassemble = (queue: BattlefieldUnit[]) => {
    const [dead, ...rest] = queue;
    if (!dead) return;
    const next = () => {
      deferredChoicesRef.current += 1;
      setTimeout(() => {
        deferredChoicesRef.current -= 1;
        offerReassemble(rest);
      });
    };
    const owner = dead.owner;
    const damage = getReassembleDamage(dead) ?? 0;
    const hand = handsRef.current[owner];
    const backRow = owner === 'player1' ? 1 : 6;
    const card = dead.card;
    if (hand.length === 0) {
      showNotification(`Reassemble: ${card.name} died, but its owner has no card to discard.`);
      next();
      return;
    }
    const DECLINE = '__decline__';
    askCardChoice(
      {
        title: `Reassemble: ${card.name}`,
        player: owner,
        message: `${card.name} died. Discard a card to reinforce it again from your graveyard for free, with ${damage} damage on it?`,
        options: [...hand.map((c, i) => ({ label: `Discard ${c.name}`, value: String(i) })), { label: "Don't discard", value: DECLINE }]
      },
      (v) => {
        const discarded = v === DECLINE ? undefined : hand[parseInt(v, 10)];
        if (!discarded) {
          next();
          return;
        }
        const board = unitsOnBoardRef.current;
        const tiles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((c) => `${c}${backRow}`).filter((h) => !board[h]);
        if (tiles.length === 0) {
          showNotification(`Reassemble: there's no empty tile on your back row, so ${card.name} stays in the graveyard.`);
          next();
          return;
        }
        const setHand = owner === 'player1' ? setPlayer1Hand : setPlayer2Hand;
        const setGrave = owner === 'player1' ? setPlayer1Graveyard : setPlayer2Graveyard;
        setHand((h) => {
          const at = h.indexOf(discarded);
          return at < 0 ? h : [...h.slice(0, at), ...h.slice(at + 1)];
        });
        setGrave((g) => [...g, discarded]);
        const place = (tile: string) => {
          setGrave((g) => {
            const at = g.findIndex((c) => c.id === card.id);
            return at < 0 ? g : [...g.slice(0, at), ...g.slice(at + 1)];
          });
          setUnitsOnBoard((b) => {
            if (b[tile]) return b;
            const next = {
              ...b,
              [tile]: {
                instanceId: newInstanceId('unit'),
                card,
                owner,
                hexId: tile,
                damageCounters: damage,
                armour: 0,
                currentAp: card.ap,
                promotedCards: []
              } as BattlefieldUnit
            };
            return next;
          });
          playCardDrawSound();
          showNotification(`Reassemble: discarded ${discarded.name}; ${card.name} is reinforced on ${tile} with ${damage} damage.`);
          next();
        };
        if (tiles.length === 1) place(tiles[0]);
        else
          setTimeout(() =>
            askCardChoice(
              { title: `Reassemble: ${card.name}`, message: 'Choose an empty tile on your back row.', options: tiles.map((t) => ({ label: t, value: t })), player: owner },
              place
            )
          );
      }
    );
  };

  // "When this unit dies" (e.g. Firebird's Death Knell): a unit with such a passive that left the board (and wasn't
  // moved, or engulfed) died; its blast goes off around the tile it was on
  const lastBoardRef = useRef<Record<string, { unit: BattlefieldUnit; hex: string }>>({});
  const leftPlayAliveRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = lastBoardRef.current;
    const now: Record<string, { unit: BattlefieldUnit; hex: string }> = {};
    Object.entries(unitsOnBoard).forEach(([h, u]) => (now[u.instanceId] = { unit: u, hex: h }));
    lastBoardRef.current = now;
    if (gamePhase !== 'playing') return;
    // (and "When this unit dies, the enemy unit under it takes its place" (e.g. Engulf): under its owner's control, at
    // full HP)
    const blasts: { hex: string; unit: BattlefieldUnit }[] = [];
    const released: { hex: string; unit: BattlefieldUnit }[] = [];
    const reassembling: BattlefieldUnit[] = [];
    const dropped: { hex: string; unit: BattlefieldUnit }[] = [];
    Object.entries(prev).forEach(([id, p]) => {
      // (a unit carrying another that leaves play, e.g. Hidden Strings, puts it down where it was)
      if (!now[id] && p.unit.carriedUnit) dropped.push(p);
      if (now[id] || leftPlayAliveRef.current.has(id)) return;
      if (getDeathBlast(p.unit, p.hex, unitsOnBoard).length > 0) blasts.push(p);
      if (p.unit.engulfedCard && p.unit.engulfedOwner) released.push(p);
      if (p.unit.card.type !== 'token' && getReassembleDamage(p.unit) !== null) reassembling.push(p.unit);
    });
    leftPlayAliveRef.current.clear();
    if (reassembling.length > 0) offerReassemble(reassembling);
    if (blasts.length === 0 && released.length === 0 && dropped.length === 0) return;
    setUnitsOnBoard((b) => {
      let next = b;
      dropped.forEach((d) => {
        const c = d.unit.carriedUnit!;
        const spot = [d.hex, c.lastLeftHex, ...getSurroundingHexes(d.hex)].find((h): h is string => Boolean(h) && !next[h!]);
        if (!spot) {
          showNotification(`${c.unit.card.name} had nowhere to be put down when ${d.unit.card.name} left play, and is lost.`);
          return;
        }
        next = { ...next, [spot]: { ...c.unit, hexId: spot } };
        showNotification(`🎭 ${c.sourceName}: ${c.unit.card.name} was put down on ${spot}.`);
      });
      released.forEach((d) => {
        if (next[d.hex]) return;
        const card = d.unit.engulfedCard!;
        next = {
          ...next,
          [d.hex]: {
            instanceId: newInstanceId(card.id),
            card,
            owner: d.unit.engulfedOwner!,
            hexId: d.hex,
            damageCounters: 0,
            armour: 0,
            currentAp: 0,
            promotedCards: []
          }
        };
        showNotification(`${card.name} breaks free from ${d.unit.card.name} and takes its place on ${d.hex}.`);
      });
      blasts.forEach((d) => (next = resolvePassiveDamage(next, getDeathBlast(d.unit, d.hex, next))));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsOnBoard]);

  // Passives that follow what the unit taking the turn has done so far this turn:
  //   'self.usesThirdAbilityOfTurn' armour (e.g. Midnight Calm: armours up to 3 once it has used 3 abilities),
  //   Critical Forecast's chosen ability: once used, a free copy is granted for the rest of the turn,
  //   'self.gainsArmourFirstTimeEachTurn' useAbility (e.g. Self-Contained Formation: the first armour it gains on its
  //   turn grants a free use of a 1AP promoted ability, as a granted provider for this turn)
  const lastArmourRef = useRef<{ id: string; armour: number } | null>(null);
  useEffect(() => {
    if (!activeTurnUnit || !activeTurnUnitHex || activeTurnUnit.owner !== activePlayer || gamePhase !== 'playing') {
      lastArmourRef.current = activeTurnUnit ? { id: activeTurnUnit.instanceId, armour: activeTurnUnit.armour } : null;
      return;
    }
    const u = activeTurnUnit;
    const hex = activeTurnUnitHex;
    const marks = u.passiveTurnMarks || {};
    const patch: Partial<BattlefieldUnit> = {};
    const notes: string[] = [];
    getUnitPassives(u).forEach((p) => {
      const key = p.id || p.name;
      if (p.trigger === 'self.usesThirdAbilityOfTurn' && marks[key] !== turnCount && getAbilitiesUsedThisTurn(u) >= 3) {
        const eff: any = (p.effects || []).find((e: any) => e.type === 'armour' && typeof e.upTo === 'number');
        patch.passiveTurnMarks = { ...(patch.passiveTurnMarks || marks), [key]: turnCount };
        if (eff && u.armour < eff.upTo) {
          patch.armour = eff.upTo;
          notes.push(`${p.name}: armoured up to ${eff.upTo}`);
        }
      }
      const prevArmour = lastArmourRef.current?.id === u.instanceId ? lastArmourRef.current.armour : u.armour;
      if (p.trigger === 'self.gainsArmourFirstTimeEachTurn' && marks[key] !== turnCount && u.armour > prevArmour) {
        const use: any = (p.effects || []).find((e: any) => e.type === 'useAbility');
        patch.passiveTurnMarks = { ...(patch.passiveTurnMarks || marks), [key]: turnCount };
        if (use) {
          const provider: CardAbility = {
            id: `${key}_free_use`,
            name: p.name,
            cost: 0,
            text: p.text,
            limits: { oncePerTurn: true },
            effects: [{ ...use, free: true }]
          } as CardAbility;
          patch.grantedAbilities = [...(patch.grantedAbilities || u.grantedAbilities || []), provider];
          notes.push(`${p.name}: you may use a ${use.filter?.cost ?? 1}AP promoted ability for free (in the action menu)`);
        }
      }
    });
    // Critical Forecast: the chosen ability was just used for the first time this turn
    const forecastId = u.forecastAbilityId;
    if (forecastId && marks.forecast === turnCount && marks.forecastGranted !== turnCount && (u.usedTurnCounts?.[forecastId] || 0) >= 1) {
      const original = u.card.abilities?.find((a) => a.id === forecastId);
      patch.passiveTurnMarks = { ...(patch.passiveTurnMarks || marks), forecastGranted: turnCount };
      if (original) {
        const copy: CardAbility = {
          ...original,
          id: `forecast_${original.id}`,
          name: `${original.name} (Forecast)`,
          cost: 0,
          limits: { oncePerTurn: true }
        };
        patch.grantedAbilities = [...(patch.grantedAbilities || u.grantedAbilities || []), copy];
        notes.push(`Critical Forecast: use ${original.name} an additional time for free (in the action menu)`);
      }
    }
    lastArmourRef.current = { id: u.instanceId, armour: patch.armour ?? u.armour };
    if (Object.keys(patch).length === 0) return;
    setUnitsOnBoard((prev) => (prev[hex]?.instanceId === u.instanceId ? { ...prev, [hex]: { ...prev[hex], ...patch } } : prev));
    if (notes.length > 0) showNotification(`✨ ${u.card.name}: ${notes.join(' • ')}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurnUnit, activeTurnUnitHex, turnCount]);

  // "As soon as a scorched tile is surrounding this unit, it is no longer scorched" (e.g. Deep Freeze)
  useEffect(() => {
    const frozen = getUnscorchedHexes(unitsOnBoard);
    if (frozen.size === 0 || !Object.keys(scorchedTiles).some((h) => frozen.has(h))) return;
    setScorchedTiles((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((h) => frozen.has(h) && delete next[h]);
      return next;
    });
  }, [unitsOnBoard, scorchedTiles]);

  // Legal Hex Targets for Moving (Rule 6.2.2) - strictly surrounding tiles (range 1), or Range 2 for Magical Omnipresence, plus Esoteric Pathways wraparound tiles
  const validMoveHexes = useMemo(() => {
    // A pending move-through extra move (Rabble Rouse) shows its landing tiles as the move targets
    if (pendingRabbleMove) return pendingRabbleMove.choices;
    if (!isMovingMode || !activeTurnUnitHex) return [];
    const unit = unitsOnBoard[activeTurnUnitHex];
    if (!unit || unit.owner !== activePlayer || isUnitMovementDisabled(unit)) return [];
    // Magical Omnipresence: 1 move per turn limit
    if (!canOmnipresenceUnitMove(unit)) return [];
    if (unit.currentAp < getUniversalMoveCost(unit, unitsOnBoard)) return [];
    if (activeAbility) return []; // Suppress movement tiles while targeting an ability

    let moveHexes: string[] = [];
    if (hasMagicalOmnipresence(unit)) {
      // Moves at range 2 instead of 1 (any unoccupied tile within Range 2, ignoring units in the way)
      moveHexes = getMagicalOmnipresenceHexes(activeTurnUnitHex, unitsOnBoard);
    } else {
      moveHexes = getSurroundingHexes(activeTurnUnitHex).filter((hexId) => !unitsOnBoard[hexId]);
    }

    if (hasEsotericPathways(unit)) {
      const esotericHexes = getEsotericPathwaysHexes(activeTurnUnitHex, unitsOnBoard);
      for (const hex of esotericHexes) {
        if (!moveHexes.includes(hex)) {
          moveHexes.push(hex);
        }
      }
    }

    // Trampling Path: an adjacent enemy's tile can be chosen
    if (getTramplingMove(unit)) {
      getSurroundingHexes(activeTurnUnitHex).forEach((h) => {
        const o = unitsOnBoard[h];
        if (o && o.owner !== unit.owner && !moveHexes.includes(h)) moveHexes.push(h);
      });
    }
    // Move-through passive (Rabble Rouse): on the first move of the turn, an adjacent enemy can be moved into
    // if there is an empty tile around it to land on
    // (a flying passive, e.g. Aerial Apex, works on every move and over any unit or obstacle)
    const moveThrough = getMoveThroughPassive(unit, turnCount);
    if (moveThrough?.throughUnits && (moveThrough.everyMove || !unit.movedThisTurn)) {
      getSurroundingHexes(activeTurnUnitHex).forEach((h) => {
        const occupant = unitsOnBoard[h];
        if (!occupant || (!moveThrough.anyUnit && occupant.owner === unit.owner) || moveHexes.includes(h)) return;
        if (getLandingTilesAround(h, activeTurnUnitHex, unitsOnBoard).length > 0) moveHexes.push(h);
      });
    }
    return moveHexes;
  }, [isMovingMode, activeTurnUnitHex, unitsOnBoard, activePlayer, activeAbility, pendingRabbleMove, turnCount]);

  const handleUniversalMoveClick = () => {
    // (an interrupting readied ability, e.g. Ready Spell, is the only thing the reacting unit may do)
    if (lockedAssist || pendingAssistDeployment || providerChain || readySpellReact) {
      showNotification("Please resolve your active choice first.");
      return;
    }
    if (!activeTurnUnit) return;
    if (isUnitMovementDisabled(activeTurnUnit)) {
      showNotification(getMoveBlockedMessage(activeTurnUnit));
      return;
    }
    if (!canOmnipresenceUnitMove(activeTurnUnit)) {
      showNotification("Magical Omnipresence: This unit may only move once per turn (already moved this turn).");
      return;
    }
    const moveCost = getUniversalMoveCost(activeTurnUnit, unitsOnBoard);
    if (activeTurnUnit.currentAp < moveCost) {
      showNotification(`Not enough AP to move (Requires ${moveCost} AP).`);
      return;
    }
    setActiveAbility(null);
    // Turning move mode on starts a run of moves (see the effect below); turning it off ends the run
    moveRunRef.current = isMovingMode ? null : { unitId: activeTurnUnit.instanceId, hex: activeTurnUnitHex };
    setIsMovingMode((prev) => {
      const next = !prev;
      if (next) {
        const hasOmni = hasMagicalOmnipresence(activeTurnUnit);
        const hasEsoteric = hasEsotericPathways(activeTurnUnit);
        let msg = `Move Mode: Click any highlighted surrounding tile to move (${moveCost} AP).`;
        if (hasOmni) {
          msg = `Move Mode (Magical Omnipresence): Click any highlighted tile within Range 2 to move (${moveCost} AP, 1/Turn).`;
        } else if (hasEsoteric) {
          msg = `Move Mode: Click any highlighted tile to move (${moveCost} AP). Wraparound movement active via Esoteric Pathways.`;
        }
        showNotification(msg);
      }
      return next;
    });
  };

  // After a move made with the Move button, move mode comes back on by itself, as if Move were pressed again, for as
  // long as the unit can still move and nothing else has been chosen. Choosing anything else ends the run: an ability,
  // Draw, a card from hand, an Assist, or Move again (to cancel).
  const moveRunRef = useRef<{ unitId: string; hex: string | null } | null>(null);
  useEffect(() => {
    const run = moveRunRef.current;
    if (!run) return;
    if (!activeTurnUnit || activeTurnUnit.instanceId !== run.unitId || activeAbility || multiStageState || providerChain || selectedHandIndex !== null || isAssistModalOpen || lockedAssist) {
      moveRunRef.current = null;
      return;
    }
    // (only once a move has actually happened, and once it and anything it set off are done)
    if (isMovingMode || activeTurnUnitHex === run.hex) return;
    if (pendingFreeMove || pendingRabbleMove || pendingMomentumCharge || anyPopupOpen || popupQueue.length > 0 || cardChoicePrompt || isTurnTransitioning || readySpellReact) return;
    run.hex = activeTurnUnitHex;
    const canMoveAgain =
      gamePhase === 'playing' &&
      !isUnitMovementDisabled(activeTurnUnit) &&
      canOmnipresenceUnitMove(activeTurnUnit) &&
      activeTurnUnit.currentAp >= getUniversalMoveCost(activeTurnUnit, unitsOnBoard);
    if (!canMoveAgain) {
      moveRunRef.current = null;
      return;
    }
    setIsMovingMode(true);
  });

  // Multi-Stage Target Information (prompts and legal hexes for current stage)
  const multiStageTargetInfo = useMemo(() => {
    if (!multiStageState) return null;
    return getMultiStageTargetInfo(multiStageState, unitsOnBoard, activePlayer);
  }, [multiStageState, unitsOnBoard, activePlayer]);

  // Tiles an ability reaches from a hex (the range indicator), outside of any multi-stage step
  const getAbilityRangeHexesFrom = (ability: CardAbility, sourceHex: string, attackerUnit: BattlefieldUnit | null): string[] => {
    // Reckless Leap: show a line of 2 tiles in each straight line direction
    if (ability.id === 'reckless_leap') {
      const lines = getAllStraightLinesFromHex(sourceHex);
      return lines.map((line) => line.slice(0, 2)).flat();
    }

    // Straight-line abilities show range indicators in the 6 straight lines of hexes in each direction
    if (isStraightLineAbility(ability)) {
      const lineMax = Array.isArray(ability.range) && ability.range.length > 1 ? ability.range[1] : undefined;
      return getAllStraightLinesFromHex(sourceHex).map((line) => (lineMax ? line.slice(0, lineMax) : line)).flat();
    }

    if (isChargeFlightAbility(ability)) {
      const spec = getChargeFlightSpec(ability);
      const maxL = Math.max(...spec.possiblePathLengths);
      return getHexesInRange(sourceHex, 1, maxL);
    }

    const pathSpec = getPathSpec(ability);
    if (pathSpec) {
      return getHexesInRange(sourceHex, 1, pathSpec.maxLength);
    }

    const bonusRange = getUnitBonusRange(attackerUnit);

    if (
      ability.id === 'build_structure' ||
      ability.id === 'pitch_camp' ||
      (!ability.effects?.some((e) => e.type === 'damage') &&
        ability.effects?.some((e) => e.tile === 'chosenEmptySurrounding' || e.tile === 'chosenEmptySurroundingSelf'))
    ) {
      if (bonusRange > 0) {
        return getHexesInRange(sourceHex, 1, 1 + bonusRange);
      }
      return getSurroundingHexes(sourceHex);
    }

    const { minRange, maxRange } = getEffectiveAbilityRange(ability, attackerUnit);
    const inRange = getHexesInRange(sourceHex, minRange, maxRange);
    // "If this unit has moved this turn, its melee attacks have an additional 1 range against targets in the direction
    // moved and the 2 other directions on either side of it" (e.g. Nine Eyes): { type: 'modifyRange', appliesTo:
    // 'meleeAttacks', amount, if: 'self.movedThisTurn', directions: 'lastMovedAndEitherSide' }. Read as the straight
    // lines in those 3 directions.
    const dirs = attackerUnit?.movedDirectionsThisTurn || [];
    if (attackerUnit?.movedThisTurn && dirs.length > 0 && isMeleeAttackAbility(ability)) {
      const lastDir = dirs[dirs.length - 1];
      getUnitPassives(attackerUnit).forEach((p) =>
        (p.effects || []).forEach((e: any) => {
          if (e.type !== 'modifyRange' || e.appliesTo !== 'meleeAttacks' || e.directions !== 'lastMovedAndEitherSide') return;
          const extra = typeof e.amount === 'number' ? e.amount : 1;
          const src = parseHexId(sourceHex);
          if (!src) return;
          const c = offsetToCube(src.col, src.rowIdx);
          [lastDir - 1, lastDir, lastDir + 1].forEach((d) => {
            const v = CUBE_DIRECTIONS[(d + 6) % 6];
            for (let k = maxRange + 1; k <= maxRange + extra; k++) {
              const o = cubeToOffset(c.q + v.dq * k, c.r + v.dr * k);
              if (o.col < 0 || o.col > 7 || o.rowNum < 1 || o.rowNum > 6) break;
              const h = toHexId(o.col, o.rowNum);
              if (!inRange.includes(h)) inRange.push(h);
            }
          });
        })
      );
    }
    return inRange;
  };

  // Ability Range Hexes (Range indicator showing reachable tiles for the ability)
  const abilityRangeHexes = useMemo(() => {
    if (!activeAbility) return [];
    const sourceHex = lockedAssist ? lockedAssist.unitHex : activeTurnUnitHex;
    if (!sourceHex) return [];

    // For multi-stage abilities, range highlighting adapts to the active stage
    if (multiStageState) {
      if (multiStageState.ability.id === 'realm_warp' && multiStageState.stage === 2 && multiStageState.targets[0]) {
        return getSurroundingHexes(multiStageState.targets[0]);
      }
      if (multiStageState.ability.id === 'spirit_away' && multiStageState.stage === 3 && multiStageState.targets[1]) {
        return getSurroundingHexes(multiStageState.targets[1]);
      }
      if (
        multiStageState.ability.id === 'swooping_pounce' &&
        multiStageState.stage === 2 &&
        multiStageState.targets[0]
      ) {
        return getSurroundingHexes(multiStageState.targets[0]);
      }
      if (multiStageState.ability.id === 'sidestepping_crush') {
        if (multiStageState.stage === 1) {
          return getSurroundingHexes(sourceHex);
        } else if (multiStageState.stage === 2 && multiStageState.casterHex) {
          return getSurroundingHexes(multiStageState.casterHex);
        }
      }
      if (multiStageState.metadata?.tiebreakEmptyHexes && multiStageState.metadata.tiebreakEmptyHexes.length > 0) {
        return multiStageState.metadata.tiebreakEmptyHexes;
      }
      if (multiStageState.metadata?.flailTileBehind) {
        return [multiStageState.metadata.flailTileBehind];
      }
      if (multiStageState.metadata?.vaultTiles) {
        return multiStageState.metadata.vaultTiles;
      }
    }

    const attackerUnit = lockedAssist
      ? unitsOnBoard[lockedAssist.unitHex]
      : (activeTurnUnitHex ? unitsOnBoard[activeTurnUnitHex] : null);
    return getAbilityRangeHexesFrom(activeAbility, sourceHex, attackerUnit);
  }, [activeAbility, activeTurnUnitHex, lockedAssist, unitsOnBoard]);

  // Hovering an ability in the action menu previews its range (only abilities that have one; nothing otherwise).
  // Only drawn on the board: targeting always uses abilityRangeHexes.
  const [hoveredActionAbility, setHoveredActionAbility] = useState<CardAbility | null>(null);
  // The menu can go away under the mouse (e.g. the turn ends), so a new acting unit starts with no preview
  useEffect(() => {
    setHoveredActionAbility(null);
  }, [activeTurnUnitHex]);
  const previewRangeHexes = useMemo(() => {
    if (activeAbility || !hoveredActionAbility || !activeTurnUnitHex) return [];
    const hasRange =
      (Array.isArray(hoveredActionAbility.range) && hoveredActionAbility.range.length > 0) ||
      isStraightLineAbility(hoveredActionAbility) ||
      isChargeFlightAbility(hoveredActionAbility) ||
      Boolean(getPathSpec(hoveredActionAbility));
    if (!hasRange) return [];
    return getAbilityRangeHexesFrom(hoveredActionAbility, activeTurnUnitHex, unitsOnBoard[activeTurnUnitHex] || null);
  }, [activeAbility, hoveredActionAbility, activeTurnUnitHex, unitsOnBoard]);

  // Legal Hex Targets for Active Ability (Units or Tiles)
  const rawValidAttackHexes = useMemo(() => {
    if (!activeAbility) return [];
    const sourceHex = lockedAssist ? lockedAssist.unitHex : activeTurnUnitHex;
    if (!sourceHex) return [];

    const attackerUnit = lockedAssist
      ? unitsOnBoard[lockedAssist.unitHex]
      : (activeTurnUnitHex ? unitsOnBoard[activeTurnUnitHex] : null);
    const canTargetFriendly = hasFeedingFrenzy(attackerUnit);

    // 0. Multi-stage abilities: return valid targets for the current stage
    if (multiStageTargetInfo) {
      return multiStageTargetInfo.validHexes;
    }

    const allowEmpty =
      Boolean((activeAbility as any).allowEmptyTileTarget) ||
      activeAbility.parentAbilityId === 'echoing_incantation' ||
      activeAbility.id?.startsWith('echoing_incantation__');

    const isReactEffect =
      activeAbility.tags?.includes('react') ||
      Boolean((activeAbility as any).isReactEffect);

    // Reckless Leap: empty tiles within a line of 2 tiles in each straight line direction
    if (activeAbility.id === 'reckless_leap') {
      const lines = getAllStraightLinesFromHex(sourceHex);
      const legalHexes: string[] = [];
      lines.forEach((line) => {
        const twoTiles = line.slice(0, 2);
        twoTiles.forEach((hexId) => {
          if (!unitsOnBoard[hexId]) {
            legalHexes.push(hexId);
          }
        });
      });
      return legalHexes;
    }

    // 1. Straight-line abilities: First unit on each of the 6 lines (or empty hexes if allowEmpty)
    if (isStraightLineAbility(activeAbility)) {
      // A range on a straight-line ability caps how far each line reaches (e.g. Belch Flames: first unit within 3)
      // (plus range from passives, e.g. Root Conduction). A minimum range (e.g. Barbed Tether: 2-3) means a first unit
      // closer than that blocks the line.
      const lineMax =
        Array.isArray(activeAbility.range) && activeAbility.range.length > 1
          ? activeAbility.range[1] + getAbilityRangePassiveBonus(attackerUnit)
          : undefined;
      const lineMin = Array.isArray(activeAbility.range) && activeAbility.range.length > 1 ? activeAbility.range[0] : 1;
      const lines = getAllStraightLinesFromHex(sourceHex).map((line) => (lineMax ? line.slice(0, lineMax) : line));
      const enemyTargets: string[] = [];
      lines.forEach((line) => {
        for (const [lineIdx, hexId] of line.entries()) {
          const u = unitsOnBoard[hexId];
          if (u) {
            if (isReactEffect && isImmuneToReactEffects(u)) {
              break;
            }
            if (lineIdx + 1 < lineMin) break;
            if (u.owner !== activePlayer || (canTargetFriendly && hexId !== sourceHex)) {
              enemyTargets.push(hexId);
            }
            break;
          } else if (allowEmpty) {
            enemyTargets.push(hexId);
          }
        }
      });
      return enemyTargets;
    }

    // 2. Abilities targeting an empty tile (e.g. Stone Wall, Build Structure, Pitch Camp, Shade Step, Vanish)
    if (isAbilityTargetingEmptyTile(activeAbility)) {
      return abilityRangeHexes.filter((hexId) => !unitsOnBoard[hexId]);
    }

    // 3. Abilities targeting a specific unit type (e.g. Reinforce Structure targeting Obstructing Wall)
    if (activeAbility.target === 'obstructingWall') {
      return abilityRangeHexes.filter((hexId) => {
        const u = unitsOnBoard[hexId];
        return u && (u.card.id === 'obstructing_wall' || u.card.name === 'Obstructing Wall');
      });
    }

    // "Place this unit on the tile behind the target" (e.g. Shadow Emergence): any other unit with an empty tile behind
    // it (from its opponent's perspective)
    if (isPlaceBehindTargetAbility(activeAbility)) {
      return abilityRangeHexes.filter((hexId) => {
        const u = unitsOnBoard[hexId];
        if (!u || hexId === sourceHex) return false;
        // "Targets empty tile behind an enemy unit", behind as the player using it sees it
        if (u.owner === activePlayer) return false;
        const behind = getTileBehindFor(hexId, activePlayer);
        return Boolean(behind && !unitsOnBoard[behind]);
      });
    }

    // Friendly Unit targeting (e.g. Broaden Search, Soothing Sap)
    if (activeAbility.target === 'friendlyUnit') {
      return abilityRangeHexes.filter((hexId) => {
        const u = unitsOnBoard[hexId];
        return u && u.owner === activePlayer && hexId !== sourceHex;
      });
    }
    // Friendly or enemy unit targeting (e.g. Tree's Bounty: damages an enemy, heals a friendly)
    if (activeAbility.target === 'anyUnit' && !activeAbility.isMultiStage) {
      return abilityRangeHexes.filter((hexId) => Boolean(unitsOnBoard[hexId]) && hexId !== sourceHex);
    }

    // 4. Abilities targeting ANY tile (e.g. Exploding Fireball, Powder Charge, Rain of Arrows, Acidic Bile, Starburst, Human Cannonball)
    if (isAbilityTargetingAnyTile(activeAbility)) {
      return abilityRangeHexes;
    }

    // 5. Standard unit attack abilities: Enemy units within ability range (plus friendly units if Feeding Frenzy)
    // If ability only targets self (e.g. self-damage like Profane Insight), valid target is self
    if (
      getAbilitySelfDamage(activeAbility) > 0 &&
      !activeAbility.tags?.includes('melee') &&
      !activeAbility.tags?.includes('ranged') &&
      !isAreaAttack(activeAbility)
    ) {
      return [sourceHex];
    }

    const hexesWithTargets: string[] = [];
    abilityRangeHexes.forEach((hexId) => {
      const unit = unitsOnBoard[hexId];
      if (unit) {
        if (isReactEffect && isImmuneToReactEffects(unit)) {
          return;
        }
        if (unit.owner !== activePlayer) {
          hexesWithTargets.push(hexId);
        } else if (canTargetFriendly && hexId !== sourceHex) {
          hexesWithTargets.push(hexId);
        }
      } else if (allowEmpty) {
        hexesWithTargets.push(hexId);
      }
    });
    return hexesWithTargets;
  }, [activeAbility, activeTurnUnitHex, lockedAssist, abilityRangeHexes, unitsOnBoard, activePlayer, multiStageTargetInfo]);

  // A unit that can't be targeted right now (e.g. after Vanish) can't be picked by an enemy's ability. Abilities aimed
  // at a tile still hit whatever is on it.
  const validAttackHexes = useMemo(() => {
    const targetsTile = isAbilityTargetingAnyTile(activeAbility) || Boolean(multiStageTargetInfo?.isTileTarget);
    if (targetsTile) return rawValidAttackHexes;
    const attacker = activeTurnUnitHex ? unitsOnBoard[activeTurnUnitHex] : null;
    return rawValidAttackHexes.filter((h) => {
      if (isUntargetableBy(unitsOnBoard[h], activePlayer)) return false;
      // "Use only against targets that this unit has already attacked this turn" (e.g. Chew Up)
      if (!multiStageTargetInfo && activeAbility?.requires === 'target.attackedBySelfThisTurn') {
        return Boolean(unitsOnBoard[h] && hasAttackedUnitThisTurn(attacker, unitsOnBoard[h].instanceId));
      }
      // "A unit surrounding a Toadstool" (e.g. Spray of Spores): next to one of your tokens of that kind
      const tokenReq = !multiStageTargetInfo && activeAbility?.requires?.match(/^target\.surroundingFriendlyToken:(.+)$/);
      if (tokenReq) {
        return getSurroundingHexes(h).some(
          (s) => unitsOnBoard[s] && unitsOnBoard[s].owner === activePlayer && unitsOnBoard[s].card.id === tokenReq[1]
        );
      }
      return true;
    });
  }, [rawValidAttackHexes, activeAbility, multiStageTargetInfo, unitsOnBoard, activePlayer, activeTurnUnitHex]);

  // Promote and Fusion Target Calculations
  const selectedCardForReinforce = selectedHandIndex !== null ? activeHand[selectedHandIndex] : null;

  // Tiles the active player can't Reinforce onto (e.g. an enemy Sealed Gate's range 1)
  const sealedReinforceHexes = useMemo(
    () => getSealedReinforceHexes(activePlayer, unitsOnBoard),
    [activePlayer, unitsOnBoard]
  );

  const validPromoteHexes = useMemo(() => {
    if (activeTurnUnitHex && !abilityReinforcePending) return [];
    if (!selectedCardForReinforce || selectedCardForReinforce.reinforce?.mode !== 'promote') return [];
    // Promoting puts the new unit on the promoted unit's tile
    return getValidPromoteTargets(selectedCardForReinforce, unitsOnBoard, activePlayer).filter(
      (h) => !sealedReinforceHexes.has(h)
    );
  }, [activeTurnUnitHex, abilityReinforcePending, selectedCardForReinforce, unitsOnBoard, activePlayer, sealedReinforceHexes]);

  const fusionCheck = useMemo(() => {
    if (activeTurnUnitHex && !abilityReinforcePending) return null;
    if (!selectedCardForReinforce || selectedCardForReinforce.reinforce?.mode !== 'fusion') return null;
    return checkFusionMaterials(selectedCardForReinforce, unitsOnBoard, activePlayer);
  }, [activeTurnUnitHex, abilityReinforcePending, selectedCardForReinforce, unitsOnBoard, activePlayer]);

  const validFusionHexes = useMemo(() => {
    if (!fusionCheck || !fusionCheck.canFuse) return [];
    if (fusionCheck.validCombinations.length > 1 && fusionSelectedHexes.length > 0) {
      // Find candidate hexes that can form a valid combination with all currently selected hexes
      const matchingCombos = fusionCheck.validCombinations.filter((c) =>
        fusionSelectedHexes.every((h) => c.hexes.includes(h))
      );
      const candidates = new Set<string>();
      matchingCombos.forEach((c) => c.hexes.forEach((h) => candidates.add(h)));
      return Array.from(candidates);
    }
    return fusionCheck.materialHexes;
  }, [fusionCheck, fusionSelectedHexes]);

  // Tribute Target Calculations: 2 basic units on your side of the board to sacrifice to the Graveyard
  const validTributeHexes = useMemo(() => {
    if (activeTurnUnitHex && !abilityReinforcePending) return [];
    if (!selectedCardForReinforce || selectedCardForReinforce.reinforce?.mode !== 'tribute') return [];
    return Object.entries(unitsOnBoard)
      .filter(([hexId, u]) => {
        if (u.owner !== activePlayer || u.card.isWall) return false;
        const isBasic = u.card.basic !== false && (u.card.basic || u.card.reinforce?.mode === 'basic' || !u.card.reinforce);
        if (!isBasic) return false;
        const rowNum = parseInt(hexId.slice(1), 10);
        return activePlayer === 'player1' ? (rowNum >= 1 && rowNum <= 3) : (rowNum >= 4 && rowNum <= 6);
      })
      .map(([hexId]) => hexId);
  }, [activeTurnUnitHex, abilityReinforcePending, selectedCardForReinforce, unitsOnBoard, activePlayer]);

  // Assist Deployment Hexes: Unoccupied tiles on active player's back row (Row 1 for P1, Row 6 for P2)
  const assistDeployHexes = useMemo(() => {
    if (!pendingAssistDeployment) return [];
    const isP1 = activePlayer === 'player1';
    const backRowHexes = isP1
      ? ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1']
      : ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6'];
    return backRowHexes.filter((h) => !unitsOnBoard[h] && !sealedReinforceHexes.has(h));
  }, [pendingAssistDeployment, activePlayer, unitsOnBoard, sealedReinforceHexes]);

  // Scorches the tile a unit just left if a passive says so for this move number (e.g. Elemental Wake on moves 2 and 3).
  // Returns a note for the move notification.
  const scorchTileLeftByMove = (unit: BattlefieldUnit, fromHex: string, moveNumber: number): string => {
    const scorch = getMoveScorchEffect(unit, moveNumber);
    if (!scorch) return '';
    const opponent: PlayerId = unit.owner === 'player1' ? 'player2' : 'player1';
    setScorchedTiles((prev) => ({
      ...prev,
      [fromHex]: {
        expiresOnTurnEndFor: scorch.duration === 'untilEndOfTurn' ? unit.owner : opponent,
        casterPlayer: unit.owner
      }
    }));
    return ` ${scorch.passiveName}: ${fromHex} is scorched!`;
  };

  // Whether a card in hand could be reinforced right now (basic, promote, fusion or tribute)
  const canReinforceCardNow = (card: CardItem, player: PlayerId): boolean => {
    const mode = card.reinforce?.mode;
    const sealed = getSealedReinforceHexes(player, unitsOnBoard);
    if (mode === 'promote') return getValidPromoteTargets(card, unitsOnBoard, player).some((h) => !sealed.has(h));
    if (mode === 'fusion') {
      const check = checkFusionMaterials(card, unitsOnBoard, player);
      return check.canFuse && check.validCombinations.some((c) => c.hexes.some((h: string) => !sealed.has(h)));
    }
    if (mode === 'tribute') {
      const requiredTributeCount = card.reinforce?.count || 2;
      const friendlyBasics = Object.entries(unitsOnBoard).filter(([hexId, u]) => {
        if (u.owner !== player || u.card.isWall) return false;
        const isB = u.card.basic !== false && (u.card.basic || u.card.reinforce?.mode === 'basic' || !u.card.reinforce);
        if (!isB) return false;
        const rowNum = parseInt(hexId.slice(1), 10);
        return player === 'player1' ? rowNum >= 1 && rowNum <= 3 : rowNum >= 4 && rowNum <= 6;
      });
      return friendlyBasics.length >= requiredTributeCount && countUnmetTributeSlots(card, friendlyBasics.map(([, u]) => u)) === 0;
    }
    const backRow = player === 'player1' ? '1' : '6';
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].some(
      (col) => !unitsOnBoard[`${col}${backRow}`] && !sealed.has(`${col}${backRow}`)
    );
  };

  // Ability-granted Reinforce (e.g. Foretell): select the card in hand and let the normal reinforce flow place it
  const startAbilityReinforce = (
    card: CardItem,
    handIdx: number,
    player: PlayerId,
    unitHex: string,
    afterAp: number | undefined,
    sourceTitle: string
  ) => {
    if (!canReinforceCardNow(card, player)) {
      showNotification(`${sourceTitle}: ${card.name} cannot be reinforced right now, so it stays in your hand.`, {
        privateTo: player,
        publicText: `${sourceTitle}: the card can't be reinforced right now, so it stays in hand.`
      });
      if (afterAp !== undefined && afterAp <= 0) endTurnAfterPopups();
      return;
    }
    const mode = card.reinforce?.mode || 'basic';
    const hint =
      mode === 'promote'
        ? 'click a highlighted friendly unit to promote'
        : mode === 'fusion'
        ? 'click your fusion material units'
        : mode === 'tribute'
        ? `click ${card.reinforce?.count || 2} basic units on your side to sacrifice`
        : 'click an empty tile on your back row';
    setActiveAbility(null);
    setMultiStageState(null);
    setIsMovingMode(false);
    setFusionSelectedHexes([]);
    setTributeSacrificeHexes([]);
    setSelectedHandIndex(handIdx);
    setAbilityReinforcePending({ card, unitHex, afterAp, sourceTitle });
    showNotification(`${sourceTitle}: You may Reinforce ${card.name} now (${hint}), or click Skip.`);
  };

  // Ends an ability-granted Reinforce and hands control back to the unit taking the turn.
  // If that unit was used up by the reinforce (promoted or fused), its turn ends.
  const finishAbilityReinforce = (consumedHexes: string[] = []) => {
    const pending = abilityReinforcePending;
    setAbilityReinforcePending(null);
    setSelectedHandIndex(null);
    setDraggedHandIndex(null);
    setFusionSelectedHexes([]);
    setTributeSacrificeHexes([]);
    if (!pending) return;
    if (consumedHexes.includes(pending.unitHex)) {
      showNotification(`The unit that used ${pending.sourceTitle} was used to reinforce, so its turn ends.`);
      switchTurn(false);
      return;
    }
    setSelectedHex(pending.unitHex);
    if (pending.afterAp !== undefined && pending.afterAp <= 0) endTurnAfterPopups();
  };

  // "When you reinforce this card / when this card promotes a unit with damage on it, discard a card. If you can't, this
  // card goes to the graveyard (the units stay)" (e.g. Solid Ribcage, Heartless Gestalt): { type: 'discardOrFail',
  // trigger }. The source passive's name, if the card has one for this trigger.
  const getDiscardCost = (card: CardItem, trigger: string): string | null =>
    (card.passives || []).find((p) => (p.effects || []).some((e: any) => e.type === 'discardOrFail' && e.trigger === trigger))?.name || null;
  // Asks the player to discard one of these cards (the cost is already known to be payable)
  const askDiscard = (owner: PlayerId, cards: CardItem[], title: string, why: string) => {
    askCardChoice(
      { title, message: `${why}: discard a card.`, options: cards.map((c, i) => ({ label: c.name, value: String(i) })), player: owner },
      (v) => {
        const card = cards[parseInt(v, 10)];
        if (!card) return;
        const setHand = owner === 'player1' ? setPlayer1Hand : setPlayer2Hand;
        setHand((h) => {
          const at = h.indexOf(card);
          return at < 0 ? h : [...h.slice(0, at), ...h.slice(at + 1)];
        });
        (owner === 'player1' ? setPlayer1Graveyard : setPlayer2Graveyard)((g) => [...g, card]);
        showNotification(`${title}: discarded ${card.name}.`);
      }
    );
  };

  // Reinforce Card from Hand (Basic to Back Row, Promote onto Target Unit, Fusion with Materials)
  const handleDeployCardToHex = (hexId: string, handIdx: number) => {
    if (activeTurnUnitHex && !abilityReinforcePending) {
      showNotification("Cannot reinforce while a unit is taking a turn. Finish or pass turn first.");
      return;
    }
    // An ability-granted Reinforce returns to the acting unit instead of ending the turn
    const finishIfAbilityReinforce = (consumedHexes: string[]): boolean => {
      if (!abilityReinforcePending) return false;
      finishAbilityReinforce(consumedHexes);
      return true;
    };

    const isP1 = activePlayer === 'player1';
    const cardToPlace = activeHand[handIdx];
    if (!cardToPlace) return;

    // Special Case 1: PROMOTE (Rule / Glossary)
    if (cardToPlace.reinforce?.mode === 'promote') {
      const promoteTargets = getValidPromoteTargets(cardToPlace, unitsOnBoard, activePlayer);
      const rawReq = cardToPlace.reinforce.requirement?.[0]?.join(', ') || 'required unit';
      const reqStr = rawReq === '*' ? 'any friendly unit' : rawReq;

      if (promoteTargets.length === 0) {
        showNotification(`Cannot promote ${cardToPlace.name}: You have no friendly unit on the board matching (${reqStr}).`);
        return;
      }

      if (!promoteTargets.includes(hexId)) {
        if (unitsOnBoard[hexId]?.statuses?.includes('cannot_promote_or_fuse')) {
          showNotification(`Cannot promote ${unitsOnBoard[hexId]?.card.name}: Frozen by Ice Lance (cannot be promoted or fused during this turn).`);
          return;
        }
        showNotification(`Invalid target for promote. Click a friendly unit matching (${reqStr}) to promote it into ${cardToPlace.name}.`);
        return;
      }

      const targetUnit = unitsOnBoard[hexId];
      if (!targetUnit) return;
      if (sealedReinforceHexes.has(hexId)) {
        showNotification(`Cannot promote ${targetUnit.card.name}: ${hexId} is sealed (an enemy Sealed Gate stops reinforcing within range 1).`);
        return;
      }
      // Promoting a damaged unit may cost a discard (e.g. Heartless Gestalt); without one, the card is lost
      const promoteDiscard = targetUnit.damageCounters > 0 ? getDiscardCost(cardToPlace, 'self.promotesDamagedUnit') : null;
      const otherHandCards = activeHand.filter((_, i) => i !== handIdx);
      if (promoteDiscard && otherHandCards.length === 0) {
        (isP1 ? setPlayer1Hand : setPlayer2Hand)((prev) => prev.filter((_, idx) => idx !== handIdx));
        (isP1 ? setPlayer1Graveyard : setPlayer2Graveyard)((g) => [...g, cardToPlace]);
        setSelectedHandIndex(null);
        setDraggedHandIndex(null);
        showNotification(`${promoteDiscard}: you had no card to discard, so ${cardToPlace.name} goes to the graveyard (${targetUnit.card.name} stays).`);
        if (!finishIfAbilityReinforce([])) switchTurn(false);
        return;
      }
      // Promoting through Forced Metamorphosis into a card that doesn't promote an Ooze
      const forcedDamage = getForcedPromotionDamage(cardToPlace, targetUnit);
      // (the unit it promoted leaves play alive: no "when this unit dies" passives)
      leftPlayAliveRef.current.add(targetUnit.instanceId);

      playCardDrawSound();

      // Promotion does NOT send units to the graveyard!
      if (isP1) {
        setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
      } else {
        setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
      }

      // Promote unit takes the previous unit's hex, keeping promoted cards information
      const promotedUnit: BattlefieldUnit = {
        instanceId: newInstanceId('unit'),
        card: cardToPlace,
        owner: activePlayer,
        hexId,
        damageCounters: forcedDamage,
        armour: 0,
        currentAp: cardToPlace.ap,
        promotedCards: [...(targetUnit.promotedCards || []), targetUnit.card]
      };

      setUnitsOnBoard((prev) => {
        const next = { ...prev, [hexId]: promotedUnit };
        if (forcedDamage >= cardToPlace.hp) {
          delete next[hexId];
          sendToGraveyard([promotedUnit]);
          checkVictory(next);
        }
        return next;
      });

      setSelectedHandIndex(null);
      setDraggedHandIndex(null);
      showNotification(
        `${targetUnit.card.name} was promoted into ${cardToPlace.name}!${forcedDamage > 0 ? ` Forced Metamorphosis deals it ${forcedDamage} damage.` : ''}`
      );
      if (promoteDiscard) askDiscard(activePlayer, otherHandCards, promoteDiscard, `${cardToPlace.name} promoted a damaged unit`);

      const proceedTurn = () => {
        if (finishIfAbilityReinforce([hexId])) return;
        if (gamePhase === 'setup') {
          setSetupConsecutiveStarts(0);
          const next = activePlayer === 'player1' ? 'player2' : 'player1';
          setActivePlayer(next);
          setBoardYaw(next === 'player1' ? 0 : 180);
        } else {
          switchTurn(false);
        }
      };

      // Perfect Synthesis for Faceless King: choose 1 passive from promoted cards
      if (cardToPlace.id === 'faceless_king' || cardToPlace.name === 'Faceless King') {
        const promoCards = promotedUnit.promotedCards || [];
        const hasPassives = promoCards.some((c) => c.passives && c.passives.length > 0);
        if (hasPassives) {
          setFacelessKingPendingChoice({
            unitHex: hexId,
            unitName: cardToPlace.name,
            promotedCards: promoCards,
            nextAction: proceedTurn
          });
          return;
        }
      }

      proceedTurn();
      return;
    }

    // Special Case 3: FUSION (Rule / Glossary)
    if (cardToPlace.reinforce?.mode === 'fusion') {
      const fCheck = checkFusionMaterials(cardToPlace, unitsOnBoard, activePlayer);
      if (!fCheck.canFuse) {
        showNotification(fCheck.reason || `Cannot fuse ${cardToPlace.name}: You must control (${fCheck.requiredMaterials.join(' + ')}) in play on your side.`);
        return;
      }

      if (!validFusionHexes.includes(hexId)) {
        if (unitsOnBoard[hexId]?.statuses?.includes('cannot_promote_or_fuse')) {
          showNotification(`Cannot use ${unitsOnBoard[hexId]?.card.name} as fusion material: Frozen by Ice Lance (cannot be promoted or fused during this turn).`);
          return;
        }
        showNotification(`Click one of your valid fusion material units (${fCheck.requiredMaterials.join(', ')}) to summon ${cardToPlace.name}.`);
        return;
      }

      const requiredFusionCount = cardToPlace.reinforce?.count || (Array.isArray(cardToPlace.reinforce?.requirement) ? cardToPlace.reinforce.requirement.length : 2);

      // Deselect if already clicked in multi-select mode
      if (fusionSelectedHexes.includes(hexId)) {
        setFusionSelectedHexes((prev) => prev.filter((h) => h !== hexId));
        showNotification(`Deselected fusion material on ${hexId}. Click a material unit to fuse.`);
        return;
      }

      let combo: FusionCombination | undefined;

      // If there is ONLY 1 possible combination, fuse immediately into the clicked hex
      if (fCheck.validCombinations.length === 1) {
        combo = fCheck.validCombinations[0];
      } else {
        // If there is MORE THAN ONE possible set of units to fuse it, prompt player to decide which 2/3 (modeled after tribute)
        if (fusionSelectedHexes.length < requiredFusionCount - 1) {
          const nextSelected = [...fusionSelectedHexes, hexId];
          setFusionSelectedHexes(nextSelected);
          showNotification(
            `Selected ${nextSelected.length}/${requiredFusionCount} fusion materials (${unitsOnBoard[hexId]?.card.name || 'material'}). Click ${
              requiredFusionCount - nextSelected.length
            } more material unit(s) to fuse for ${cardToPlace.name}!`
          );
          return;
        }

        const allSelected = [...fusionSelectedHexes, hexId];
        combo = fCheck.validCombinations.find((c) =>
          allSelected.every((h) => c.hexes.includes(h))
        );

        if (!combo) {
          showNotification("Selected units do not form a valid adjacent fusion combination. Try selecting an adjacent material unit.");
          return;
        }
      }

      if (!combo) return;
      // The fused unit is placed on the material clicked last: that tile must not be sealed
      if (sealedReinforceHexes.has(hexId)) {
        const openMaterial = combo.hexes.find((h: string) => !sealedReinforceHexes.has(h));
        showNotification(
          openMaterial
            ? `${hexId} is sealed (enemy Sealed Gate): finish the fusion by clicking a material outside its range, e.g. ${openMaterial}.`
            : `Cannot fuse here: every material tile is sealed by an enemy Sealed Gate.`
        );
        return;
      }

      // Reinforcing it may cost a discard (e.g. Solid Ribcage, Posthumous Prerogative); without one, the card is lost
      const fuseDiscard = getDiscardCost(cardToPlace, 'self.reinforced');
      const otherHandCards = activeHand.filter((_, i) => i !== handIdx);
      if (fuseDiscard && otherHandCards.length === 0) {
        (isP1 ? setPlayer1Hand : setPlayer2Hand)((prev) => prev.filter((_, idx) => idx !== handIdx));
        (isP1 ? setPlayer1Graveyard : setPlayer2Graveyard)((g) => [...g, cardToPlace]);
        setFusionSelectedHexes([]);
        setSelectedHandIndex(null);
        setDraggedHandIndex(null);
        showNotification(`${fuseDiscard}: you had no card to discard, so ${cardToPlace.name} goes to the graveyard (the units stay).`);
        if (!finishIfAbilityReinforce([])) switchTurn(false);
        return;
      }
      // (the fused units leave play alive)
      combo.hexes.forEach((h: string) => unitsOnBoard[h] && leftPlayAliveRef.current.add(unitsOnBoard[h].instanceId));

      playCardDrawSound();

      // Collect all cards from the fused units to keep associated information for abilities (Rule: promoted cards)
      // Fusion does NOT send cards to the graveyard
      const allPromotedCards: CardItem[] = [];
      combo.hexes.forEach((mHex: string) => {
        const u = unitsOnBoard[mHex];
        if (u) {
          if (u.promotedCards && u.promotedCards.length > 0) {
            allPromotedCards.push(...u.promotedCards);
          }
          allPromotedCards.push(u.card);
        }
      });

      // Remove fused card from hand (materials are NOT sent to graveyard)
      if (isP1) {
        setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
      } else {
        setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
      }

      // Fused unit placed at hexId with carried-over combined damage and kept promoted cards
      const fusedUnit: BattlefieldUnit = {
        instanceId: newInstanceId('unit'),
        card: cardToPlace,
        owner: activePlayer,
        hexId,
        damageCounters: combo.totalDamage,
        armour: 0,
        currentAp: cardToPlace.ap,
        promotedCards: allPromotedCards
      };

      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        combo.hexes.forEach((mHex: string) => {
          delete next[mHex];
        });
        next[hexId] = fusedUnit;
        return next;
      });

      setFusionSelectedHexes([]);
      setSelectedHandIndex(null);
      setDraggedHandIndex(null);
      showNotification(`Fused ${allPromotedCards.map((c) => c.name).join(' and ')} to summon ${cardToPlace.name} (carried over ${combo.totalDamage} damage, ${allPromotedCards.length} promoted cards kept)!`);
      if (fuseDiscard) askDiscard(activePlayer, otherHandCards, fuseDiscard, `You reinforced ${cardToPlace.name}`);

      const consumedFusionHexes = [...combo.hexes, hexId];
      const proceedTurn = () => {
        if (finishIfAbilityReinforce(consumedFusionHexes)) return;
        if (gamePhase === 'setup') {
          setSetupConsecutiveStarts(0);
          const next = activePlayer === 'player1' ? 'player2' : 'player1';
          setActivePlayer(next);
          setBoardYaw(next === 'player1' ? 0 : 180);
        } else {
          switchTurn(false);
        }
      };

      // Perfect Synthesis for Faceless King: choose 1 passive from promoted cards
      if (cardToPlace.id === 'faceless_king' || cardToPlace.name === 'Faceless King') {
        const hasPassives = allPromotedCards.some((c) => c.passives && c.passives.length > 0);
        if (hasPassives) {
          setFacelessKingPendingChoice({
            unitHex: hexId,
            unitName: cardToPlace.name,
            promotedCards: allPromotedCards,
            nextAction: proceedTurn
          });
          return;
        }
      }

      proceedTurn();
      return;
    }

    // Special Case 4: TRIBUTE (Rule / Glossary)
    // Selecting a tribute unit prompts sending required basic units (3 for Simian Sovereign, 2 for others) from your side of the board to your graveyard
    if (cardToPlace.reinforce?.mode === 'tribute') {
      const requiredTributeCount = cardToPlace.reinforce?.count || 2;
      const tributeReqText = (cardToPlace.reinforce?.requirement || []).map((opts) => opts.join('/')).join(', ');
      if (validTributeHexes.length < requiredTributeCount || countUnmetTributeSlots(cardToPlace, validTributeHexes.map((h) => unitsOnBoard[h]).filter(Boolean)) > 0) {
        showNotification(
          `Cannot reinforce ${cardToPlace.name}: You must control at least ${requiredTributeCount} friendly Basic units on your side of the board (${isP1 ? 'Rows 1-3' : 'Rows 4-6'}) to sacrifice to your Graveyard${tributeReqText ? ` (including ${tributeReqText})` : ''}.`
        );
        return;
      }

      if (!validTributeHexes.includes(hexId)) {
        showNotification(
          `Must click a friendly Basic unit on your side of the board (${isP1 ? 'Rows 1-3' : 'Rows 4-6'}) to sacrifice.`
        );
        return;
      }

      if (tributeSacrificeHexes.includes(hexId)) {
        setTributeSacrificeHexes((prev) => prev.filter((h) => h !== hexId));
        showNotification(`Deselected sacrifice unit on ${hexId}. Click a basic unit on your side to sacrifice.`);
        return;
      }

      // The picks left must still be able to cover the class requirement (e.g. "at least one must be Flaming")
      {
        const picked = [...tributeSacrificeHexes, hexId].map((h) => unitsOnBoard[h]).filter(Boolean);
        if (countUnmetTributeSlots(cardToPlace, picked) > requiredTributeCount - picked.length) {
          showNotification(`${cardToPlace.name} needs ${tributeReqText} among its sacrifices. Choose a unit that matches.`);
          return;
        }
      }

      if (tributeSacrificeHexes.length < requiredTributeCount - 1) {
        const nextSacrifices = [...tributeSacrificeHexes, hexId];
        setTributeSacrificeHexes(nextSacrifices);
        showNotification(
          `Selected ${nextSacrifices.length}/${requiredTributeCount} basic units to sacrifice (${unitsOnBoard[hexId].card.name}). Click another basic unit on your side to sacrifice to Graveyard.`
        );
        return;
      }

      if (tributeSacrificeHexes.length === requiredTributeCount - 1) {
        // The Tribute unit is placed on the last sacrifice's tile: that tile must not be sealed
        if (sealedReinforceHexes.has(hexId)) {
          showNotification(
            `${hexId} is sealed (enemy Sealed Gate). The Tribute unit lands on your last sacrifice, so choose a last sacrifice outside its range (click a selected unit to deselect it and reorder).`
          );
          return;
        }
        const allSacrificeHexes = [...tributeSacrificeHexes, hexId];
        const sacrificedUnits = allSacrificeHexes.map((h) => unitsOnBoard[h]).filter(Boolean);
        if (sacrificedUnits.length < requiredTributeCount) return;

        playCardDrawSound();

        const sacrificedCards = sacrificedUnits.flatMap((u) => [
          u.card,
          ...(u.promotedCards || [])
        ]);

        // Send required basic units from your side of the board to your graveyard
        if (isP1) {
          setPlayer1Graveyard((g) => [...g, ...sacrificedCards]);
          setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
        } else {
          setPlayer2Graveyard((g) => [...g, ...sacrificedCards]);
          setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
        }

        // Place tribute unit onto the final sacrifice hex
        const deployHex = hexId;
        const tributeUnit: BattlefieldUnit = {
          instanceId: newInstanceId('unit'),
          card: cardToPlace,
          owner: activePlayer,
          hexId: deployHex,
          damageCounters: 0,
          armour: 0,
          currentAp: cardToPlace.ap
        };

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          allSacrificeHexes.forEach((h) => {
            delete next[h];
          });
          next[deployHex] = tributeUnit;
          return next;
        });

        setSelectedHandIndex(null);
        setTributeSacrificeHexes([]);
        setSelectedHex(deployHex);
        showNotification(
          `Sacrificed ${sacrificedUnits.map((u) => u.card.name).join(' and ')} to the Graveyard to summon Tribute unit ${cardToPlace.name} onto ${deployHex}!`
        );

        // Complete reinforcement turn
        if (finishIfAbilityReinforce(allSacrificeHexes)) return;
        if (gamePhase === 'setup') {
          setSetupConsecutiveStarts(0);
          const next = activePlayer === 'player1' ? 'player2' : 'player1';
          setActivePlayer(next);
          setBoardYaw(next === 'player1' ? 0 : 180);
        } else {
          switchTurn(false);
        }
        return;
      }
    }

    // Case 5: BASIC REINFORCE ONLY
    const isBasic = cardToPlace.basic || cardToPlace.reinforce?.mode === 'basic' || !cardToPlace.reinforce;
    if (!isBasic) {
      showNotification(
        `${cardToPlace.name} is a ${cardToPlace.reinforce?.mode || 'non-basic'} unit and cannot be reinforced directly onto the back row. Only Basic units can be reinforced to the back row.`
      );
      return;
    }

    // Must be placed on empty tile on player's back row
    const isBackRow = isP1 ? hexId.endsWith('1') : hexId.endsWith('6');
    if (!isBackRow) {
      showNotification(`Basic units must be reinforced onto your back row (${isP1 ? 'Row 1' : 'Row 6'}).`);
      return;
    }

    if (unitsOnBoard[hexId]) {
      showNotification('Hex is already occupied by a unit.');
      return;
    }
    if (sealedReinforceHexes.has(hexId)) {
      showNotification(`Cannot reinforce onto ${hexId}: it is sealed by an enemy Sealed Gate (range 1).`);
      return;
    }

    // Normal Reinforce during Setup Phase (Rule 5)
    if (gamePhase === 'setup') {
      playCardDrawSound();

      const newUnit: BattlefieldUnit = {
        instanceId: newInstanceId('unit'),
        card: cardToPlace,
        owner: activePlayer,
        hexId,
        damageCounters: 0,
        armour: 0,
        currentAp: cardToPlace.ap
      };

      setUnitsOnBoard((prev) => ({
        ...prev,
        [hexId]: newUnit
      }));

      if (isP1) {
        setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
      } else {
        setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
      }

      setSelectedHandIndex(null);
      setDraggedHandIndex(null);
      setSelectedHex(null);
      setActiveTurnUnitHex(null);
      setDraggedUnitHex(null);
      setActiveAbility(null);
      setSetupConsecutiveStarts(0);

      const next = activePlayer === 'player1' ? 'player2' : 'player1';
      setActivePlayer(next);
      setBoardYaw(next === 'player1' ? 0 : 180);
      showNotification(`Reinforced ${cardToPlace.name}! Now ${next === 'player1' ? 'Player 1' : 'Player 2'}'s setup turn.`);
      return;
    }

    // Normal Reinforce during Gameplay Phase (Rule 6)
    playCardDrawSound();

    const newUnit: BattlefieldUnit = {
      instanceId: newInstanceId('unit'),
      card: cardToPlace,
      owner: activePlayer,
      hexId,
      damageCounters: 0,
      armour: 0,
      currentAp: cardToPlace.ap
    };

    setUnitsOnBoard((prev) => ({
      ...prev,
      [hexId]: newUnit
    }));

    if (isP1) {
      setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
    } else {
      setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIdx));
    }

    if (abilityReinforcePending) {
      showNotification(`${abilityReinforcePending.sourceTitle}: Reinforced ${cardToPlace.name} onto ${hexId}!`);
      finishAbilityReinforce([]);
      return;
    }

    setSelectedHandIndex(null);
    setDraggedHandIndex(null);
    setSelectedHex(null);
    setActiveTurnUnitHex(null);
    setDraggedUnitHex(null);
    setActiveAbility(null);
    showNotification(`Reinforced ${cardToPlace.name} onto ${hexId}!`);

    // Reinforcing completes the player's gameplay turn (Rule 6)
    switchTurn(false);
  };

  // ---- Main attack rules for multi-step attacks ----
  // Filled in as a multi-step attack hits, read once when it finishes (Steal Plate, Perfect Form, turn end)
  const multiStepAttackRef = useRef<{ attacked: boolean; anyTargetArmoured: boolean; attackerDefeated: boolean; defenderScryOpened: boolean } | null>(null);
  const noteMultiStepAttack = (patch: { anyTargetArmoured?: boolean; attackerDefeated?: boolean; defenderScryOpened?: boolean }) => {
    const cur = multiStepAttackRef.current || { attacked: true, anyTargetArmoured: false, attackerDefeated: false, defenderScryOpened: false };
    multiStepAttackRef.current = {
      attacked: true,
      anyTargetArmoured: cur.anyTargetArmoured || Boolean(patch.anyTargetArmoured),
      attackerDefeated: cur.attackerDefeated || Boolean(patch.attackerDefeated),
      defenderScryOpened: cur.defenderScryOpened || Boolean(patch.defenderScryOpened)
    };
  };

  // A targeted defender's scry (e.g. Preemptive Counter) during a multi-step attack: once per attack, camera to the defender
  const openDefenderScryForMultiStep = (tgt: BattlefieldUnit, scryName: string) => {
    if (multiStepAttackRef.current?.defenderScryOpened) return;
    const deck = tgt.owner === 'player1' ? player1Deck : player2Deck;
    if (deck.length === 0) return;
    enqueuePopup(tgt.owner, `${scryName}: Scry 1`, (ctx) => {
      const d = tgt.owner === 'player1' ? ctx.p1Deck : ctx.p2Deck;
      if (d.length === 0) return;
      setScryPending({ card: d[0], player: tgt.owner, unitName: tgt.card.name, sourceTitle: `${scryName}: Scry 1`, abilityName: scryName });
    });
    noteMultiStepAttack({ defenderScryOpened: true });
  };

  // Damage dealt back to the acting unit by a multi-step attack's target (Ready Stance, Reflective Armour)
  const applyRecoilToActiveUnit = (amount: number) => {
    if (!activeTurnUnit || amount <= 0) return;
    let armour = activeTurnUnit.armour;
    let counters = activeTurnUnit.damageCounters;
    const absorbed = Math.min(armour, amount);
    armour -= absorbed;
    counters += amount - absorbed;
    const defeated = counters >= activeTurnUnit.card.hp;
    if (defeated) noteMultiStepAttack({ attackerDefeated: true });
    const id = activeTurnUnit.instanceId;
    setUnitsOnBoard((prev) => {
      const hex = Object.keys(prev).find((h) => prev[h].instanceId === id);
      if (!hex) return prev;
      const cur = prev[hex];
      let next = { ...prev };
      const curAbsorbed = Math.min(cur.armour, amount);
      const curCounters = cur.damageCounters + amount - curAbsorbed;
      if (curCounters >= cur.card.hp) {
        delete next[hex];
        if (cur.card.type !== 'token') {
          if (cur.owner === 'player1') setPlayer1Graveyard((g) => [...g, cur.card]);
          else setPlayer2Graveyard((g) => [...g, cur.card]);
        }
      } else {
        next[hex] = { ...cur, armour: cur.armour - curAbsorbed, damageCounters: curCounters, tookDamageThisTurn: true };
      }
      next = applyDamageEventsAndPassives([{ hexId: hex, damagedUnitOwner: cur.owner, damageAmount: amount, nonAttack: true }], next);
      checkVictory(next);
      return next;
    });
  };

  // Once per multi-step attack, as it finishes: the attacker's "when this unit attacks" rules (Steal Plate) and its
  // next-action buffs (Perfect Form). Returns what happened during the attack.
  const applyMultiStepAttackerHooks = (unit: BattlefieldUnit) => {
    const info = multiStepAttackRef.current;
    multiStepAttackRef.current = null;
    if (!info?.attacked || info.attackerDefeated) return info;
    const onAttack = getOnAttackSelfArmour(unit, info.anyTargetArmoured);
    if (onAttack.upTo > 0) {
      setUnitsOnBoard((prev) => {
        const hex = Object.keys(prev).find((h) => prev[h].instanceId === unit.instanceId);
        if (!hex) return prev;
        return { ...prev, [hex]: { ...prev[hex], armour: Math.max(prev[hex].armour, onAttack.upTo) } };
      });
    }
    afterAttackUsed(unit);
    return info;
  };

  // Pushes a unit `tiles` tiles away from originHex on the current board (multi-step attacks' knockback)
  const knockBackUnit = (instanceId: string, originHex: string, tiles: number, attacker?: BattlefieldUnit | null) => {
    setUnitsOnBoard((prev) => {
      const hex = Object.keys(prev).find((h) => prev[h].instanceId === instanceId);
      if (!hex) return prev;
      const dest = getKnockbackDestination(originHex, hex, tiles, prev);
      let next = { ...prev };
      if (dest.tilesMoved > 0 && dest.finalHex !== hex) {
        const u = next[hex];
        delete next[hex];
        next[dest.finalHex] = { ...u, hexId: dest.finalHex };
      }
      // "When this unit applies knockback to an enemy" riders (e.g. Heavy Air), even when it couldn't move
      return applyKnockbackRiders(next, attacker ?? activeTurnUnit, instanceId);
    });
  };

  // Damage application helper for multi-stage abilities.
  // targeted: false for units merely passed over (charges, flights), which don't trigger "when targeted" rules.
  const applyAttackDamageToHex = (
    tgtHex: string,
    rawDmg: number,
    ab: CardAbility,
    opts?: { customArmourReduction?: number; targetUnitOverride?: BattlefieldUnit; previousHex?: string; targeted?: boolean; hits?: number }
  ): { isDefeated: boolean; damageDealt: number; newArmour: number; newDamageCounters: number; armourRemoved: number } => {
    const tgt = opts?.targetUnitOverride || unitsOnBoard[tgtHex];
    if (!tgt || !activeTurnUnitHex || !activeTurnUnit) {
      return { isDefeated: false, damageDealt: 0, newArmour: 0, newDamageCounters: 0, armourRemoved: 0 };
    }
    const targeted = opts?.targeted !== false;
    const isOtherUnit = tgt.instanceId !== activeTurnUnit.instanceId;
    const isFriendly = tgt.owner === activeTurnUnit.owner;
    const isHealingHit = isFriendly && hasFeedingFrenzy(activeTurnUnit);
    const isMeleeHit = isMeleeAttackAbility(ab) && getHexDistance(activeTurnUnitHex, tgtHex) <= 1;
    // Immune to non-damage effects (Machine Heart): armour removal before the damage is blocked
    const immuneBeforeHit = isOtherUnit && isImmuneToNonDamageEffects(tgt);
    // "When targeted" armour + scry (e.g. Preemptive Counter)
    const scry = targeted && !isFriendly ? getTargetedScryPassive(tgt, isMeleeHit, turnCount) : null;

    let initialArmour = tgt.armour + (scry?.armour || 0);
    let armourRemoved = 0;
    if (opts?.customArmourReduction && !immuneBeforeHit) {
      armourRemoved = Math.min(initialArmour, opts.customArmourReduction);
      initialArmour = Math.max(0, initialArmour - opts.customArmourReduction);
    }

    const attackOptions: AttackExecutionOptions = {
      attacker: activeTurnUnit,
      target: { ...tgt, armour: initialArmour },
      ability: ab,
      attackerHex: activeTurnUnitHex,
      targetHex: tgtHex,
      unitsOnBoard
    };

    // The attacker's "its attacks deal more" bonuses (Twinsoul, Drakescale, Perfect Form, Predictive Strike, ...)
    // (opts.hits: an attack that hits several times, each for rawDmg, e.g. Coin Plink)
    let hits: AttackHit[] = Array.from({ length: Math.max(1, opts?.hits || 1) }, (_, i) => ({ hitIndex: i + 1, damage: rawDmg }));
    applyAttackerBonusPassives(hits, ab, activeTurnUnit, tgt, attackOptions);
    // Ready Stance against a melee hit: prevent up to N and deal that much back
    let readyStanceReturn = 0;
    let usedReadyStance = false;
    // (a target that can't use react effects right now, e.g. after Jolting Bite, can't use its stances)
    const tgtCanReact = canUseReactEffects(tgt);
    if (targeted && !isFriendly && tgt.readyStance && isMeleeHit && !ignoresReactEffects(ab) && tgtCanReact) {
      let left = tgt.readyStance.preventUpTo;
      hits = hits.map((h) => {
        const cut = Math.min(left, h.damage);
        left -= cut;
        return { ...h, damage: h.damage - cut };
      });
      const prevented = tgt.readyStance.preventUpTo - left;
      usedReadyStance = true;
      readyStanceReturn = isImmuneToReactEffects(activeTurnUnit) ? 0 : prevented;
    }
    // Reflect stances against a targeted hit, as in a single-target attack. Only this hit is affected: the rest of a
    // multi-step attack goes on. Flawless Parry (preventUpTo) prevents up to N, then reflects the hit if the attacker
    // is within range 1; Fortress Stance / Gird for Battle reflect the whole hit (the target takes none of it).
    let reflectReturn = 0;
    let usedReflectStance = false;
    const stance = tgt.reflectStance;
    if (targeted && !isFriendly && stance && !ignoresReactEffects(ab) && tgtCanReact) {
      const dist = getHexDistance(activeTurnUnitHex, tgtHex);
      const isRangedHit = Boolean(ab.tags?.includes('ranged')) || dist > 1;
      const attackerImmune = isImmuneToReactEffects(activeTurnUnit);
      const hitTotal = hits.reduce((s, h) => s + h.damage, 0);
      if (stance.preventUpTo !== undefined) {
        let left = stance.preventUpTo;
        hits = hits.map((h) => {
          const cut = Math.min(left, h.damage);
          left -= cut;
          return { ...h, damage: h.damage - cut };
        });
        usedReflectStance = true;
        if (dist <= 1 && !attackerImmune) reflectReturn = hitTotal;
        showNotification(
          `⚔️ ${tgt.card.name}'s ${stance.sourceAbilityName} prevented ${stance.preventUpTo - left} damage${
            reflectReturn > 0 ? ` and reflected the hit back for ${reflectReturn}` : ''
          }!`
        );
      } else if (
        stance.triggerType === 'all' ||
        (stance.triggerType === 'ranged' && isRangedHit) ||
        (stance.triggerType === 'range1' && dist === 1)
      ) {
        usedReflectStance = Boolean(stance.once);
        hits = hits.map((h) => ({ ...h, damage: 0 }));
        if (!attackerImmune) reflectReturn = hitTotal;
        showNotification(
          attackerImmune
            ? `🪞 ${tgt.card.name}'s ${stance.sourceAbilityName} reflected the hit, but ${activeTurnUnit.card.name} can't be targeted by react effects.`
            : `🪞 ${tgt.card.name}'s ${stance.sourceAbilityName} reflected the hit back at ${activeTurnUnit.card.name} for ${hitTotal}!`
        );
      }
    }
    // Armour a surrounding friendly unit shares with the target (e.g. Battered Shield): used after its own
    const sharedUsable =
      isFriendly || isHealingHit || ab.effects?.some((e: any) => e.type === 'damage' && e.bypassArmour)
        ? null
        : getUsableArmour({ ...unitsOnBoard, [tgtHex]: tgt }, tgtHex);
    const sharedAmount = sharedUsable ? sharedUsable.total - sharedUsable.own : 0;
    const exec = executeSequentialHits(
      hits,
      initialArmour + sharedAmount,
      tgt.damageCounters,
      tgt.card.hp,
      ab.id,
      attackOptions
    );
    // The target's own armour goes first; the rest comes off the sharing unit
    const totalArmourLost = Math.max(0, initialArmour + sharedAmount - exec.finalArmour);
    const ownArmourLost = Math.min(initialArmour, totalArmourLost);
    const sharedArmourLost = Math.min(sharedAmount, totalArmourLost - ownArmourLost);
    const tgtFinalArmour = sharedAmount > 0 ? initialArmour - ownArmourLost : exec.finalArmour;

    const damageDealt = exec.hitResults.reduce((s, h) => s + h.damage, 0);
    const armourDealt = totalArmourLost;
    // Statuses from the hit (Clamped, Slow Venom, Silenced, ...), unless the target is immune and took no damage
    const blockStatuses = isHealingHit || isFriendly || (immuneBeforeHit && damageDealt === 0);
    const silences = damageDealt > 0 && Boolean(ab.effects?.some((e: any) => e.type === 'removePassives'));
    const tgtWithMarks: BattlefieldUnit = {
      ...tgt,
      readyStance: usedReadyStance ? null : tgt.readyStance,
      reflectStance: usedReflectStance ? null : tgt.reflectStance,
      passiveTurnMarks: scry ? { ...(tgt.passiveTurnMarks || {}), [scry.key]: turnCount } : tgt.passiveTurnMarks
    };
    const tgtAfterStatuses = blockStatuses
      ? tgtWithMarks
      : applyRemovePassives(
          applyAbilityStatuses(withAttackStatuses(tgtWithMarks, activeTurnUnit, exec.hitResults), ab, lastTurnUnitIds, activeTurnUnit),
          ab,
          silences
        );
    const tgtLimited = markDamageCapUsed(
      blockStatuses ? tgtAfterStatuses : applyUseLimitStatuses(tgtAfterStatuses, ab, damageDealt > 0),
      exec.damageCapKey
    );
    // Damage back to the attacker: Ready Stance, and "when targeted" retaliation (e.g. Reflective Armour)
    const retaliation =
      targeted && !isFriendly
        ? getTargetedRetaliation(tgt, !isMeleeHit, damageDealt > 0, {
            distance: getHexDistance(activeTurnUnitHex, tgtHex),
            attacker: activeTurnUnit,
            rawFirstHit: hits[0]?.damage,
            armourLost: ownArmourLost
          }).amount
        : 0;
    // Armour the target's passive strips from a melee attacker (e.g. Corrosive Sludge)
    const armourStrip = targeted && !isFriendly ? getAttackerArmourStrip(tgt, isMeleeHit, damageDealt) : null;
    // Melee splash around the target (e.g. Conductive Strikes) and a melee-targeted knockback on the attacker (e.g. Bouncy Membrane)
    const hitSplash =
      targeted && isOtherUnit && !isFriendly && isMeleeHit && exec.hitResults.length > 0
        ? getMeleeHitSplash(
            activeTurnUnit,
            tgtHex,
            tgt.owner,
            isAttackFromBehind(activeTurnUnitHex, tgtHex, tgt.owner, ab),
            unitsOnBoard
          ).filter((r) => r.hex !== tgtHex)
        : [];
    const bounce = targeted && !isFriendly && isMeleeHit && damageDealt > 0 ? getMeleeTargetedAttackerKnockback(tgt) : null;
    if (isOtherUnit) noteMultiStepAttack({ anyTargetArmoured: tgt.armour > 0 });
    if (scry) openDefenderScryForMultiStep(tgt, scry.name);
    if (targeted && !isFriendly && isMeleeHit) offerMeleeTargetedTokens(tgt.instanceId);

    setUnitsOnBoard((prev) => {
      let next = { ...prev };
      if (opts?.previousHex && opts.previousHex !== tgtHex) {
        delete next[opts.previousHex];
      }
      if (exec.isDefeated) {
        delete next[tgtHex];
        if (tgt.card.type !== 'token') {
          if (tgt.owner === 'player1') {
            setPlayer1Graveyard((g) => [...g, tgt.card]);
          } else {
            setPlayer2Graveyard((g) => [...g, tgt.card]);
          }
        }
        next = applyDestroyTriggers(activeTurnUnit, tgt, tgtHex, next);
        if (activeTurnUnit && hasNoxiousBurstPassive(activeTurnUnit) && tgt.owner !== activeTurnUnit.owner) {
          const nb = applyNoxiousBurst(activeTurnUnit, tgt, tgtHex, next);
          next = nb.updatedBoard;
          if (nb.affectedUnits.length > 0) {
            showNotification(
              `☠️ Noxious Burst triggered! ${tgt.card.name} was slain under Death Mark; surrounding units (${nb.affectedUnits.map((u) => u.card.name).join(', ')}) lose 1AP if they take the next turn!`
            );
          }
        }
      } else {
        next[tgtHex] = {
          ...tgtLimited,
          hexId: tgtHex,
          armour: tgtFinalArmour,
          damageCounters: exec.finalDamageCounters,
          tookDamageThisTurn: tgt.tookDamageThisTurn || damageDealt > 0
        };
      }
      if (sharedArmourLost > 0 && sharedUsable?.sharerHex && next[sharedUsable.sharerHex]) {
        const sharer = next[sharedUsable.sharerHex];
        next[sharedUsable.sharerHex] = { ...sharer, armour: Math.max(0, sharer.armour - sharedArmourLost) };
      }
      const isHealing = tgt.owner === activePlayer && hasFeedingFrenzy(activeTurnUnit);
      if (!isHealing && (damageDealt > 0 || armourDealt > 0)) {
        next = applyDamageEventsAndPassives(
          [{ hexId: tgtHex, damagedUnitOwner: tgt.owner, damageAmount: damageDealt + armourDealt }],
          next
        );
      }
      checkVictory(next);
      return next;
    });

    // The target's "when its armour takes damage" loot (e.g. Iron Clout)
    if (armourDealt > 0 && isOtherUnit && !isFriendly) lootOnArmourDamaged([{ unit: tgt, armourLost: armourDealt }]);

    if (damageDealt > 0 && activeTurnUnit) {
      const aPassives = getUnitPassives(activeTurnUnit);
      let msLootAmount = 0;
      let msLootTitle = '';
      const sf = aPassives.find((p) => p.id === 'short_fuse' || p.name === 'Short Fuse');
      if (sf && canTriggerPassiveThisTurn(activeTurnUnit, sf)) {
        recordTurnUsage(activeTurnUnit, sf.id || sf.name);
        msLootAmount = Math.max(msLootAmount, 2);
        msLootTitle = 'Short Fuse';
      }
      const sp = aPassives.find((p) => p.id === 'spoils' || p.name === 'Spoils');
      if (sp && canTriggerPassiveThisTurn(activeTurnUnit, sp)) {
        recordTurnUsage(activeTurnUnit, sp.id || sp.name);
        msLootAmount = Math.max(msLootAmount, 2);
        msLootTitle = 'Spoils';
      }
      const tf = aPassives.find((p) => p.id === 'twin_fury' || p.name === 'Twin Fury');
      if (tf && canTriggerPassiveThisTurn(activeTurnUnit, tf)) {
        recordTurnUsage(activeTurnUnit, tf.id || tf.name);
        msLootAmount = Math.max(msLootAmount, 1);
        msLootTitle = 'Twin Fury';
      }
      const ic = aPassives.find((p) => p.id === 'iron_clout' || p.name === 'Iron Clout');
      if (ic && armourDealt > 0 && canTriggerPassiveThisTurn(activeTurnUnit, ic)) {
        recordTurnUsage(activeTurnUnit, ic.id || ic.name);
        msLootAmount = Math.max(msLootAmount, 1);
        msLootTitle = 'Iron Clout';
      }
      if (msLootAmount > 0) {
        triggerLoot(activePlayer, msLootAmount, msLootTitle, activeTurnUnit.card.name, {
          unitHex: activeTurnUnitHex
        });
      }
    }

    // First-attack heal per hit (e.g. Bloodrush): the attack counter only advances when the multi-step attack
    // finishes, so every hit of this attack counts. Heals come before any damage dealt back.
    // Also a melee attack's per-hit heal (e.g. Draining Touch) and the first damage dealt each turn (e.g. Burn Fuel).
    const firstHeal = isOtherUnit ? getFirstAttackHealPerHit(activeTurnUnit) : null;
    const drainHeal = isOtherUnit && !isHealingHit && isMeleeHit ? getMeleeAttackHealPerHit(activeTurnUnit) : null;
    const fuelHeal = isOtherUnit && !isHealingHit && damageDealt > 0 ? getFirstDamageHeal(activeTurnUnit, turnCount) : null;
    const healAmount =
      (firstHeal ? firstHeal.perHit * exec.hitResults.length : 0) +
      (drainHeal ? drainHeal.perHit * exec.hitResults.length : 0) +
      (fuelHeal ? fuelHeal.amount : 0);
    if (healAmount > 0 || fuelHeal) {
      const attackerId = activeTurnUnit.instanceId;
      setUnitsOnBoard((prev) => {
        const hex = Object.keys(prev).find((h) => prev[h].instanceId === attackerId);
        if (!hex) return prev;
        return {
          ...prev,
          [hex]: {
            ...prev[hex],
            damageCounters: Math.max(0, prev[hex].damageCounters - healAmount),
            ...(fuelHeal ? { passiveTurnMarks: { ...(prev[hex].passiveTurnMarks || {}), [fuelHeal.markKey]: turnCount } } : {})
          }
        };
      });
    }
    // "When this unit is hit by a melee attack, the attacker cannot move during your opponent's next turn" (e.g. Trapping Teeth)
    const hitTrap = targeted && isOtherUnit && !isFriendly && isMeleeHit && exec.hitResults.length > 0 ? getMeleeHitTrap(tgt) : null;
    if (hitTrap) {
      const trappedId = activeTurnUnit.instanceId;
      setUnitsOnBoard((prev) => {
        const hex = Object.keys(prev).find((h) => prev[h].instanceId === trappedId);
        return hex ? { ...prev, [hex]: applyCannotMoveThisTurn(prev[hex]) } : prev;
      });
      showNotification(`🪤 ${tgt.card.name}'s ${hitTrap}: ${activeTurnUnit.card.name} can't move for the rest of this turn.`);
    }

    const recoil = readyStanceReturn + retaliation + reflectReturn;
    if (recoil > 0) {
      applyRecoilToActiveUnit(recoil);
      showNotification(`${tgt.card.name} dealt ${recoil} damage back to ${activeTurnUnit.card.name}.`);
    }
    if (armourStrip || hitSplash.length > 0 || bounce) {
      const attackerId = activeTurnUnit.instanceId;
      setUnitsOnBoard((prev) => {
        let next = prev;
        const cHex = Object.keys(next).find((h) => next[h].instanceId === attackerId);
        if (armourStrip && cHex) next = { ...next, [cHex]: { ...next[cHex], armour: Math.max(0, next[cHex].armour - armourStrip.amount) } };
        next = resolvePassiveDamage(next, hitSplash);
        const aHex = Object.keys(next).find((h) => next[h].instanceId === attackerId);
        if (bounce && aHex && !isImmuneToKnockback(next[aHex])) {
          const dest = getKnockbackDestination(next[tgtHex] ? tgtHex : tgtHex, aHex, bounce.tiles, next);
          if (dest.tilesMoved > 0 && dest.finalHex !== aHex) {
            const u = next[aHex];
            next = { ...next };
            delete next[aHex];
            next[dest.finalHex] = { ...u, hexId: dest.finalHex };
            showNotification(`${tgt.card.name}'s ${bounce.name} knocked ${u.card.name} back to ${dest.finalHex}.`);
          }
        }
        return next;
      });
    }

    // Knockback on a targeted hit, as in a single-target attack: the attack's own knockback (plus the attacker's
    // automatic extra tiles, e.g. Sendoff) and a waiting next-attack knockback (e.g. Unstoppable Charge). A defender
    // with an optional immunity (e.g. Hold the Gate) is asked first. Later steps target the unit where it lands.
    const immuneAfterHit = immuneBeforeHit && damageDealt === 0;
    if (targeted && isOtherUnit && !isFriendly && !exec.isDefeated && !immuneAfterHit && !activeTurnUnit.cannotInflictKnockbackNextOwnTurn) {
      const ownKb = getAbilityKnockbackTiles(ab);
      const kbTiles = Math.max(
        ownKb > 0 ? ownKb + getAttackerExtraKnockback(activeTurnUnit).automatic : 0,
        activeTurnUnit.nextAttackBonus?.knockbackOnLastHit || 0
      );
      const meleeOrAdjacent = isMeleeAttackAbility(ab) || getHexDistance(activeTurnUnitHex, tgtHex) === 1;
      if (kbTiles > 0 && meleeOrAdjacent && !isImmuneToKnockback(tgt)) {
        const originHex = activeTurnUnitHex;
        const holdPassive = getOptionalKnockbackImmunityPassive(tgt, activePlayer);
        if (holdPassive) {
          knockbackChoiceCallbackRef.current = (useImmunity: boolean) => {
            if (useImmunity) {
              setUnitsOnBoard((prev) => {
                const h = Object.keys(prev).find((k) => prev[k].instanceId === tgt.instanceId);
                return h ? { ...prev, [h]: applyOptionalKnockbackImmunity(prev[h], holdPassive) } : prev;
              });
              showNotification(`${tgt.card.name} used ${holdPassive.name}: immune to knockback until the end of this turn.`);
            } else {
              knockBackUnit(tgt.instanceId, originHex, kbTiles);
            }
          };
          setKnockbackChoicePending({
            hexId: tgtHex,
            defender: tgt.owner,
            unitName: tgt.card.name,
            passive: holdPassive,
            attackerName: activeTurnUnit.card.name,
            abilityName: ab.name,
            tiles: kbTiles
          });
          setBoardYaw(tgt.owner === 'player1' ? 0 : 180);
        } else {
          knockBackUnit(tgt.instanceId, originHex, kbTiles);
        }
      }
    }

    return {
      isDefeated: exec.isDefeated,
      damageDealt,
      newArmour: tgtFinalArmour,
      newDamageCounters: exec.finalDamageCounters,
      armourRemoved
    };
  };

  // Finishes multi-stage ability execution: spends AP, records 1/turn limit, checks turn end
  // An attack made by a friendly unit that isn't taking the turn (e.g. Roar of the Pride's free 1AP melee attack): its own
  // damage, bonuses, statuses and knockback against the target, resolved on the board. The attacking unit spends nothing.
  const resolveAllyAttack = (allyHex: string, allyAbilityId: string, targetHex: string) => {
    const ally = unitsOnBoard[allyHex];
    const target = unitsOnBoard[targetHex];
    const ab = ally?.card.abilities?.find((a) => a.id === allyAbilityId);
    if (!ally || !target || !ab) return;
    const options: AttackExecutionOptions = {
      attacker: ally,
      target,
      ability: ab,
      attackerHex: allyHex,
      targetHex,
      unitsOnBoard,
      scorchedTiles
    };
    const structure = getAbilityHitStructure(ab, ally, target, options);
    const hits = structure.hits.length > 0 ? structure.hits : [{ hitIndex: 1, damage: 0 }];
    const exec = executeSequentialHits(hits, target.armour, target.damageCounters, target.card.hp, ab.id, options);
    const dealt = exec.hitResults.reduce((sum, h) => sum + h.damage, 0);
    const kbTiles = getAbilityKnockbackTiles(ab);
    setUnitsOnBoard((prev) => {
      let next = { ...prev };
      if (exec.isDefeated) {
        delete next[targetHex];
        sendToGraveyard([target]);
        next = applyDestroyTriggers(ally, target, targetHex, next, ab);
      } else {
        next[targetHex] = markDamageCapUsed(
          applyUseLimitStatuses(
            applyAbilityStatuses(withAttackStatuses(target, ally, exec.hitResults), ab, lastTurnUnitIds, ally),
            ab,
            dealt > 0
          ),
          exec.damageCapKey
        );
        next[targetHex] = {
          ...next[targetHex],
          armour: exec.finalArmour,
          damageCounters: exec.finalDamageCounters,
          tookDamageThisTurn: target.tookDamageThisTurn || dealt > 0
        };
        if (kbTiles > 0 && !isImmuneToKnockback(target)) {
          const dest = getKnockbackDestination(allyHex, targetHex, kbTiles, next);
          if (dest.tilesMoved > 0 && dest.finalHex !== targetHex) {
            const u = next[targetHex];
            delete next[targetHex];
            next[dest.finalHex] = { ...u, hexId: dest.finalHex };
          }
          next = applyKnockbackRiders(next, ally, target.instanceId);
        }
      }
      if (dealt > 0) next = applyDamageEventsAndPassives([{ hexId: targetHex, damagedUnitOwner: target.owner, damageAmount: dealt }], next);
      checkVictory(next);
      return next;
    });
    playCardDrawSound();
    showNotification(
      `${ally.card.name} used ${ab.name} for free on ${target.card.name}: ${dealt} damage${exec.isDefeated ? ' (defeated!)' : ''}.`
    );
  };

  const finishMultiStageAbility = (overrideCasterHex?: string) => {
    if (!multiStageState || !activeTurnUnit) {
      setActiveAbility(null);
      setMultiStageState(null);
      return;
    }
    const cHex = overrideCasterHex || activeTurnUnitHex;
    const cost = getAbilityApCost(multiStageState.ability);
    const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
    const currentCounts = activeTurnUnit.usedTurnCounts || {};
    const nextCounts = recordAbilityUse(currentCounts, multiStageState.ability);

    if (cHex) {
      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        if (next[cHex]) {
          next[cHex] = {
            ...next[cHex],
            currentAp: newAp,
            usedTurnCounts: nextCounts
          };
        }
        return next;
      });
    }

    playCardDrawSound();
    setActiveAbility(null);
    setMultiStageState(null);

    // Once-per-attack rules for multi-step attacks (Steal Plate, Perfect Form), then turn end
    const attackInfo = applyMultiStepAttackerHooks(activeTurnUnit);
    if (attackInfo?.attackerDefeated) {
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
      switchTurn(false);
      return;
    }
    if (cost > 0 && newAp <= 0) {
      // A defender's scry may still be open or queued (e.g. Preemptive Counter): the turn ends once they choose
      if (attackInfo?.defenderScryOpened) endTurnAfterPopups();
      else switchTurn(false);
    }
  };

  // Generic multi-target resolution: every chosen target is hit at once, with damage
  // adjusted for the final target count (e.g. Greatcleave, Anchor Smash: -1 per extra target).
  const resolveMultiTargetAttack = () => {
    if (!multiStageState || !activeTurnUnit || !activeTurnUnitHex) return;
    const { ability, targets, metadata } = multiStageState;
    
    // Support abilities (Rally Stance): armour self, plus the optionally chosen friendly unit(s)
    if (getMultiTargetSpec(ability)?.side === 'friendly') {
      const armourEffects = ((ability.effects as any[]) || []).filter(
        (e: any) => e.type === 'armour' && typeof e.upTo === 'number'
      );
      const selfUp = armourEffects.find((e: any) => e.target === 'self')?.upTo ?? 0;
      const friendUp = armourEffects.find((e: any) => e.target === 'friendlySurroundingSelf')?.upTo ?? 0;
      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        if (next[activeTurnUnitHex]) {
          next[activeTurnUnitHex] = { ...next[activeTurnUnitHex], armour: Math.max(next[activeTurnUnitHex].armour, selfUp) };
        }
        targets.forEach((h) => {
          if (next[h]) next[h] = { ...next[h], armour: Math.max(next[h].armour, friendUp) };
        });
        return next;
      });
      finishMultiStageAbility();
      showNotification(
        `${activeTurnUnit.card.name} used ${ability.name}: armour up to ${selfUp}${
          targets.length ? `, and ${targets.map((h) => unitsOnBoard[h]?.card.name).join(', ')} armour up to ${friendUp}` : ''
        }.`
      );
      return;
    }
    if (targets.length === 0) {
      showNotification('Select at least one target first.');
      return;
    }
    // Tile targets (e.g. Colossal Hedgehog: "Deals 3 damage to units on all target tiles. Hits 3 times." on 3 tiles each
    // surrounding another): every unit on a chosen tile takes the hits
    const tileSpec = getMultiTargetSpec(ability);
    if (tileSpec?.tiles) {
      if (tileSpec.min && targets.length < tileSpec.min) {
        showNotification(`${ability.name}: choose ${tileSpec.min} tiles.`);
        return;
      }
      if (tileSpec.eachSurroundingAnother && targets.some((t) => !targets.some((o) => o !== t && getHexDistance(o, t) === 1))) {
        showNotification(`${ability.name}: each tile must surround at least one other chosen tile.`);
        return;
      }
      if (tileSpec.noneSurroundingAnother && targets.some((t) => targets.some((o) => o !== t && getHexDistance(o, t) === 1))) {
        showNotification(`${ability.name}: no chosen tile may surround another.`);
        return;
      }
      // Damage read by the area rules on every chosen tile (e.g. Laser Artillery: 4, then hits again for 3)
      if (targets.length > 0 && ability.effects?.some((e: any) => e.type === 'damage' && e.area === 'targetTiles')) {
        setMultiStageState(null);
        executeAreaAbility(ability, targets[0], { targetHexes: targets });
        return;
      }
      const dmgEff: any = ability.effects?.find((e: any) => e.type === 'damage');
      const perHit = typeof dmgEff?.amount === 'number' ? dmgEff.amount : 0;
      const hits = typeof dmgEff?.hits === 'number' ? dmgEff.hits : 1;
      const hitNames: string[] = [];
      targets.forEach((h) => {
        if (!unitsOnBoard[h] || h === activeTurnUnitHex) return;
        hitNames.push(unitsOnBoard[h].card.name);
        applyAttackDamageToHex(h, perHit, ability, { hits });
      });
      showNotification(
        `${activeTurnUnit.card.name} used ${ability.name} on ${targets.join(', ')}: ${
          hitNames.length > 0 ? `${hits} hits of ${perHit} on ${hitNames.join(', ')}` : 'no units there'
        }.`
      );
      finishMultiStageAbility();
      return;
    }
    const adjust = getPerHitAdjustment(ability, targets.length);
    const hitSource: CardAbility = (isAnchorSmash(ability) && metadata?.promotedMeleeAbility) || ability;

    let nextBoard: Record<string, BattlefieldUnit> = { ...unitsOnBoard };
    const defeated: BattlefieldUnit[] = [];
    const summaries: string[] = [];
    const multiDamageEvents: DamageEvent[] = [];
    // Damage the targets deal back (Ready Stance, Reflective Armour), applied to the attacker after all hits
    let multiRecoil = 0;
    // Hits landed across all targets (for "per hit" effects like Bloodrush)
    let multiHitsLanded = 0;
    const multiFirstHeal = getFirstAttackHealPerHit(activeTurnUnit);

    targets.forEach((hex) => {
      const tgt = unitsOnBoard[hex];
      if (!tgt) return;

      const targetDist = getHexDistance(activeTurnUnitHex, hex);
      const isRanged = ability.tags?.includes('ranged') || targetDist > 1 || ability.text?.toLowerCase().includes('ranged');
      const isFriendlyTarget = tgt.owner === activePlayer;

      // Check Flawless Parry (prevent up to 4 damage, reflect if attacker within range 1)
      if (!isFriendlyTarget && tgt.reflectStance?.preventUpTo !== undefined) {
        const parryMax = tgt.reflectStance.preventUpTo;
        const structure = getAbilityHitStructure(hitSource, activeTurnUnit, tgt);
        let leftP = parryMax;
        const reducedHits = structure.hits.map((h) => {
          const cut = Math.min(leftP, h.damage + adjust);
          leftP -= cut;
          return { ...h, damage: Math.max(0, h.damage + adjust - cut) };
        });
        const parryPrevented = parryMax - leftP;
        const updatedTgtNoStance = { ...tgt, reflectStance: null };

        if (targetDist <= 1 && !isImmuneToReactEffects(activeTurnUnit)) {
          // Attacker is in range 1: reflect back at attacker, and target takes reduced hits
          const hitStructure = getAbilityHitStructure(hitSource, tgt, activeTurnUnit);
          const reflectedHits: AttackHit[] = hitStructure.hits.map((h) => ({
            ...h,
            damage: Math.max(1, h.damage + adjust)
          }));
          const reflectedExec = executeSequentialHits(reflectedHits, activeTurnUnit.armour, activeTurnUnit.damageCounters, activeTurnUnit.card.hp, ability.id, {
            attacker: tgt,
            target: activeTurnUnit,
            ability,
            attackerHex: hex,
            targetHex: activeTurnUnitHex,
            unitsOnBoard
          });
          const dealtBack = reflectedExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
          if (dealtBack > 0) {
            multiDamageEvents.push({
              hexId: activeTurnUnitHex,
              damagedUnitOwner: activeTurnUnit.owner,
              damageAmount: dealtBack
            });
          }
          if (reflectedExec.isDefeated) {
            delete nextBoard[activeTurnUnitHex];
            defeated.push(activeTurnUnit);
          } else {
            nextBoard[activeTurnUnitHex] = {
              ...activeTurnUnit,
              armour: reflectedExec.finalArmour,
              damageCounters: reflectedExec.finalDamageCounters
            };
          }

          // Target takes reduced damage
          const targetExec = executeSequentialHits(reducedHits, tgt.armour, tgt.damageCounters, tgt.card.hp, ability.id, {
            attacker: activeTurnUnit,
            target: tgt,
            ability,
            attackerHex: activeTurnUnitHex,
            targetHex: hex,
            unitsOnBoard
          });
          const targetDmg = targetExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
          if (targetDmg > 0) {
            multiDamageEvents.push({
              hexId: hex,
              damagedUnitOwner: tgt.owner,
              damageAmount: targetDmg
            });
          }
          if (targetExec.isDefeated) {
            delete nextBoard[hex];
            defeated.push(tgt);
          } else {
            nextBoard[hex] = {
              ...updatedTgtNoStance,
              armour: targetExec.finalArmour,
              damageCounters: targetExec.finalDamageCounters
            };
          }
          summaries.push(`⚔️ FLAWLESS PARRY! ${tgt.card.name} prevented ${parryPrevented} damage and reflected ${ability.name} back at attacker for ${dealtBack} damage!${reflectedExec.isDefeated ? ' (Attacker Defeated!)' : ''}`);
          return;
        } else {
          // Attacker is outside Range 1 or Nightbound (cannot be targeted by react effects): target takes reduced damage, no reflect
          const targetExec = executeSequentialHits(reducedHits, tgt.armour, tgt.damageCounters, tgt.card.hp, ability.id, {
            attacker: activeTurnUnit,
            target: tgt,
            ability,
            attackerHex: activeTurnUnitHex,
            targetHex: hex,
            unitsOnBoard
          });
          const targetDmg = targetExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
          if (targetDmg > 0) {
            multiDamageEvents.push({
              hexId: hex,
              damagedUnitOwner: tgt.owner,
              damageAmount: targetDmg
            });
          }
          if (targetExec.isDefeated) {
            delete nextBoard[hex];
            defeated.push(tgt);
          } else {
            nextBoard[hex] = {
              ...updatedTgtNoStance,
              armour: targetExec.finalArmour,
              damageCounters: targetExec.finalDamageCounters
            };
          }
          const reason = isImmuneToReactEffects(activeTurnUnit)
            ? `(${activeTurnUnit.card.name} is Nightbound: cannot be targeted by react effects so attack was not reflected).`
            : `(Attacker was outside Range 1).`;
          summaries.push(`🛡️ ${tgt.card.name}'s Flawless Parry prevented ${parryPrevented} damage! ${reason}`);
          return;
        }
      }

      const triggersReflect =
        Boolean(!isFriendlyTarget &&
        tgt.reflectStance &&
        tgt.reflectStance.preventUpTo === undefined &&
        (tgt.reflectStance.triggerType === 'all' ||
          (tgt.reflectStance.triggerType === 'ranged' && isRanged) ||
          (tgt.reflectStance.triggerType === 'range1' && targetDist === 1)));

      if (triggersReflect) {
        nextBoard[hex] = { ...tgt, reflectStance: tgt.reflectStance?.once ? null : tgt.reflectStance };
        if (isImmuneToReactEffects(activeTurnUnit)) {
          summaries.push(`🪞 REFLECT! ${tgt.card.name}'s reflect triggered, but ${activeTurnUnit.card.name} is Nightbound (cannot be targeted by react effects)! No damage dealt.`);
          return;
        }
        // Target reflects ability back at activeTurnUnit!
        const hitStructure = getAbilityHitStructure(hitSource, tgt, activeTurnUnit);
        const hits: AttackHit[] = hitStructure.hits.map((h) => ({
          ...h,
          damage: Math.max(1, h.damage + adjust)
        }));
        const reflectedExec = executeSequentialHits(hits, activeTurnUnit.armour, activeTurnUnit.damageCounters, activeTurnUnit.card.hp, ability.id, {
          attacker: tgt,
          target: activeTurnUnit,
          ability,
          attackerHex: hex,
          targetHex: activeTurnUnitHex,
          unitsOnBoard
        });
        const dealtBack = reflectedExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
        if (dealtBack > 0) {
          multiDamageEvents.push({
            hexId: activeTurnUnitHex,
            damagedUnitOwner: activeTurnUnit.owner,
            damageAmount: dealtBack
          });
        }
        nextBoard[hex] = { ...tgt, reflectStance: tgt.reflectStance?.once ? null : tgt.reflectStance };
        if (reflectedExec.isDefeated) {
          delete nextBoard[activeTurnUnitHex];
          defeated.push(activeTurnUnit);
        } else {
          nextBoard[activeTurnUnitHex] = {
            ...activeTurnUnit,
            armour: reflectedExec.finalArmour,
            damageCounters: reflectedExec.finalDamageCounters
          };
        }
        summaries.push(`🪞 REFLECT! ${tgt.card.name} reflected ${ability.name} back at attacker for ${dealtBack} damage!${reflectedExec.isDefeated ? ' (Attacker Defeated!)' : ''}`);
        return;
      }

      // Main attack rules per target (as in a single-target attack)
      const isMeleeHit = isMeleeAttackAbility(hitSource) && targetDist <= 1;
      const immuneBeforeHit = isImmuneToNonDamageEffects(tgt);
      const scry = !isFriendlyTarget ? getTargetedScryPassive(tgt, isMeleeHit, turnCount) : null;
      const startArmour = tgt.armour + (scry?.armour || 0);
      const structure = getAbilityHitStructure(hitSource, activeTurnUnit, tgt);
      let hits: AttackHit[] = structure.hits.map((h) => ({
        ...h,
        damage: Math.max(1, h.damage + adjust)
      }));
      let usedReadyStance = false;
      if (!isFriendlyTarget && tgt.readyStance && isMeleeHit && !ignoresReactEffects(ability)) {
        let left = tgt.readyStance.preventUpTo;
        hits = hits.map((h) => {
          const cut = Math.min(left, h.damage);
          left -= cut;
          return { ...h, damage: h.damage - cut };
        });
        usedReadyStance = true;
        if (!isImmuneToReactEffects(activeTurnUnit)) multiRecoil += tgt.readyStance.preventUpTo - left;
      }
      // Armour a surrounding friendly unit shares with the target (e.g. Battered Shield): used after its own
      const usable = isFriendlyTarget || ability.effects?.some((e: any) => e.type === 'damage' && e.bypassArmour)
        ? { own: startArmour, total: startArmour, sharerHex: null }
        : { ...getUsableArmour(nextBoard, hex), own: startArmour };
      usable.total = startArmour + (usable.sharerHex ? nextBoard[usable.sharerHex].armour : 0);
      const exec = executeSequentialHits(hits, usable.total, tgt.damageCounters, tgt.card.hp, ability.id, {
        attacker: activeTurnUnit,
        target: { ...tgt, armour: usable.total },
        ability,
        attackerHex: activeTurnUnitHex,
        targetHex: hex,
        unitsOnBoard
      });
      const settled = settleSharedArmour(nextBoard, usable, exec.finalArmour);
      Object.assign(nextBoard, settled.units);
      const dealt = exec.hitResults.reduce((sum, h) => sum + h.damage, 0);
      multiHitsLanded += exec.hitResults.length;
      if (!isFriendlyTarget) {
        multiRecoil += getTargetedRetaliation(tgt, !isMeleeHit, dealt > 0).amount;
        noteMultiStepAttack({ anyTargetArmoured: tgt.armour > 0 });
        if (scry) openDefenderScryForMultiStep(tgt, scry.name);
      }
      if (exec.isDefeated) {
        delete nextBoard[hex];
        defeated.push(tgt);
      } else {
        const marked: BattlefieldUnit = {
          ...tgt,
          readyStance: usedReadyStance ? null : tgt.readyStance,
          passiveTurnMarks: scry ? { ...(tgt.passiveTurnMarks || {}), [scry.key]: turnCount } : tgt.passiveTurnMarks
        };
        const blockStatuses = isFriendlyTarget || (immuneBeforeHit && dealt === 0);
        const withStatuses = blockStatuses
          ? marked
          : applyRemovePassives(
              applyAbilityStatuses(withAttackStatuses(marked, activeTurnUnit, exec.hitResults), ability, lastTurnUnitIds, activeTurnUnit),
              ability,
              dealt > 0 && Boolean(ability.effects?.some((e: any) => e.type === 'removePassives'))
            );
        nextBoard[hex] = {
          ...withStatuses,
          armour: settled.ownArmour,
          damageCounters: exec.finalDamageCounters,
          tookDamageThisTurn: tgt.tookDamageThisTurn || dealt > 0
        };
      }
      if (tgt.owner === activePlayer && hasFeedingFrenzy(activeTurnUnit)) {
        const healed = Math.max(0, tgt.damageCounters - exec.finalDamageCounters);
        summaries.push(`${tgt.card.name} healed ${healed} damage via Feeding Frenzy (now 💥${exec.finalDamageCounters}/${tgt.card.hp} counters)`);
      } else {
        if (dealt > 0) {
          multiDamageEvents.push({
            hexId: hex,
            damagedUnitOwner: tgt.owner,
            damageAmount: dealt
          });
        }
        summaries.push(`${tgt.card.name} ${exec.isDefeated ? `took ${dealt} (defeated)` : `took ${dealt}`}`);
      }
    });

    // First-attack heal per hit (e.g. Bloodrush), before any damage dealt back
    const multiHeal = multiFirstHeal ? multiFirstHeal.perHit * multiHitsLanded : 0;
    if (multiHeal > 0 && nextBoard[activeTurnUnitHex]) {
      const c = nextBoard[activeTurnUnitHex];
      nextBoard[activeTurnUnitHex] = { ...c, damageCounters: Math.max(0, c.damageCounters - multiHeal) };
      summaries.push(`${multiFirstHeal!.name} healed ${Math.min(multiHeal, c.damageCounters)}`);
    }
    const multiSelfDmg = getAbilitySelfDamage(ability) + multiRecoil;
    if (multiRecoil > 0) summaries.push(`${multiRecoil} damage dealt back to ${activeTurnUnit.card.name}`);
    if (multiSelfDmg > 0 && nextBoard[activeTurnUnitHex]) {
      multiDamageEvents.push({
        hexId: activeTurnUnitHex,
        damagedUnitOwner: activeTurnUnit.owner,
        damageAmount: multiSelfDmg
      });
      const caster = nextBoard[activeTurnUnitHex];
      let casterArmour = caster.armour;
      let casterCounters = caster.damageCounters;
      let rem = multiSelfDmg;
      if (casterArmour > 0) {
        const abs = Math.min(casterArmour, rem);
        casterArmour -= abs;
        rem -= abs;
      }
      casterCounters += rem;
      const casterDef = casterCounters >= caster.card.hp;
      if (casterDef) {
        delete nextBoard[activeTurnUnitHex];
        defeated.push(caster);
      } else {
        nextBoard[activeTurnUnitHex] = {
          ...caster,
          armour: casterArmour,
          damageCounters: casterCounters,
          tookDamageThisTurn: true
        };
      }
      summaries.push(`${caster.card.name} took ${multiSelfDmg} self-damage${casterDef ? ' (defeated)' : ''}`);
    }

    if (multiDamageEvents.length > 0) {
      nextBoard = applyDamageEventsAndPassives(multiDamageEvents, nextBoard);
    }

    setUnitsOnBoard(nextBoard);
    defeated.forEach((u) => {
      if (u.card.type === 'token') return;
      if (u.owner === 'player1') setPlayer1Graveyard((g) => [...g, u.card]);
      else setPlayer2Graveyard((g) => [...g, u.card]);
    });
    checkVictory(nextBoard);

    finishMultiStageAbility();
    if (defeated.some((u) => u.instanceId === activeTurnUnit.instanceId)) {
      setActiveTurnUnitHex(null);
      switchTurn(false);
    }
    showNotification(
      `${activeTurnUnit.card.name} used ${ability.name} on ${targets.length} target(s)${
        adjust !== 0 ? ` (${adjust > 0 ? '+' : ''}${adjust} damage per hit)` : ''
      }: ${summaries.join(', ')}.`
    );
  };

  const resolveLeadTheChargeMove = () => {
    if (!multiStageState || !activeTurnUnit || !activeTurnUnitHex) return;
    const { ability, targets, casterHex } = multiStageState;
    const chargePath = targets;
    const finalHex = chargePath.length > 0 ? chargePath[chargePath.length - 1] : casterHex;

    if (finalHex !== casterHex && unitsOnBoard[finalHex]) {
      showNotification(`Final tile ${finalHex} must be unoccupied.`);
      return;
    }

    const intermediateTiles = chargePath.slice(0, -1);
    let movedThroughUnit = false;
    const passThroughLogs: string[] = [];

    for (const midHex of intermediateTiles) {
      const unitOnTile = unitsOnBoard[midHex];
      if (unitOnTile) {
        movedThroughUnit = true;
        if (unitOnTile.owner !== activePlayer) {
          // Charged through, not targeted
          const res = applyAttackDamageToHex(midHex, 5, ability, { targeted: false });
          passThroughLogs.push(
            `charged through ${unitOnTile.card.name} for 5 damage${res.isDefeated ? ' (Defeated!)' : ''}`
          );
        }
      }
    }

    const passives = getUnitPassives(activeTurnUnit);
    const hasBreakTheLine = passives.some((p) => p.id === 'break_the_line' || p.name === 'Break the Line');
    const bonusArmour = movedThroughUnit && hasBreakTheLine ? 2 : 0;

    let currentArmour = activeTurnUnit.armour + bonusArmour;
    let currentDamageCounters = activeTurnUnit.damageCounters;
    let isDefeatedByScorch = false;

    let boardAfterMove: Record<string, BattlefieldUnit> = { ...unitsOnBoard };

    if (finalHex !== casterHex) {
      const isImmuneToScorch =
        isImmuneToScorchDamage(activeTurnUnit);
      const wasScorched = isTileScorched(finalHex, unitsOnBoard, scorchedTiles);
      if (!isImmuneToScorch && wasScorched) {
        const scorchDmg = reduceNonAttackDamage(activeTurnUnit, 4);
        if (currentArmour >= scorchDmg) {
          currentArmour -= scorchDmg;
        } else {
          currentDamageCounters += scorchDmg - currentArmour;
          currentArmour = 0;
        }
        isDefeatedByScorch = currentDamageCounters >= activeTurnUnit.card.hp;
      }

      delete boardAfterMove[casterHex];
      if (isDefeatedByScorch) {
        if (activeTurnUnit.card.type !== 'token') {
          if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
          else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
        }
      } else {
        boardAfterMove[finalHex] = {
          ...activeTurnUnit,
          hexId: finalHex,
          armour: currentArmour,
          damageCounters: currentDamageCounters
        };
      }
      setUnitsOnBoard(boardAfterMove);

      if (isDefeatedByScorch) {
        setActiveTurnUnitHex(null);
        setSelectedHex(null);
        setActiveAbility(null);
        setMultiStageState(null);
        showNotification(`${activeTurnUnit.card.name} charged onto a scorched tile, took 4 damage, and was defeated!`);
        switchTurn(false);
        return;
      }

      setActiveTurnUnitHex(finalHex);
      setSelectedHex(finalHex);
    } else if (bonusArmour > 0) {
      boardAfterMove[casterHex] = {
        ...activeTurnUnit,
        armour: currentArmour
      };
      setUnitsOnBoard(boardAfterMove);
    }

    const surrEnemies = getSurroundingHexes(finalHex).filter((h) => {
      const u = boardAfterMove[h];
      return u && u.owner !== activePlayer;
    });

    if (surrEnemies.length > 0) {
      setMultiStageState({
        ability,
        casterHex: finalHex,
        stage: 2,
        targets: []
      });
      showNotification(
        `Lead the Charge: ${finalHex !== casterHex ? `Charged to ${finalHex}! ` : ''}${
          passThroughLogs.length ? passThroughLogs.join(', ') + '. ' : ''
        }${bonusArmour > 0 ? 'Break the Line: +2 armour! ' : ''}Now click an adjacent enemy to deal 5 damage.`
      );
    } else {
      finishMultiStageAbility(finalHex);
      showNotification(
        `Lead the Charge: ${finalHex !== casterHex ? `Charged to ${finalHex}! ` : ''}${
          passThroughLogs.length ? passThroughLogs.join(', ') + '. ' : ''
        }${bonusArmour > 0 ? 'Break the Line: +2 armour! ' : ''}(No adjacent enemy to attack).`
      );
    }
  };

  const resolveChargeFlightExecution = () => {
    if (!multiStageState || !activeTurnUnit || !activeTurnUnitHex) return;
    const { ability, targets, casterHex } = multiStageState;
    const spec = getChargeFlightSpec(ability);

    // Validate path legality
    const check = validateChargeFlightPath(casterHex, targets, spec, unitsOnBoard);
    if (!check.valid) {
      showNotification(check.reason || `Invalid path for ${ability.name}.`);
      return;
    }

    const cost = getAbilityApCost(ability);
    if (activeTurnUnit.currentAp < cost) {
      showNotification(`Not enough AP to use ${ability.name} (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`);
      return;
    }

    // A path move that then strikes the unit in the last direction travelled (e.g. Lightning Joust): the move-then-strike
    // rules take it from here
    if (ability.effects?.some((e: any) => e.type === 'damage' && e.target === 'unitInLastDirectionMoved')) {
      setMultiStageState(null);
      startMoveThenStrike(ability, targets, 'direction', { anyUnit: true });
      return;
    }

    const finalHex = targets[targets.length - 1];
    const intermediateTiles = targets.slice(0, -1);
    const damageAmount = spec.damage; // Configurable variable (default 8)

    // Damage all units moved over
    const passThroughLogs: string[] = [];
    const damageEvents: DamageEvent[] = [];

    // (only enemies, when the move says so, e.g. Sky Slither; they may also leave their tile scorched, e.g. Twisting
    // Dragontrail: until your next turn)
    const scorchedOver: string[] = [];
    // A status for each enemy moved over (e.g. Haunting Dive's move tax), unless it ignores non-damage effects
    const statusedOver: string[] = [];
    for (const midHex of intermediateTiles) {
      const unitOnTile = unitsOnBoard[midHex];
      // Scorching the tile of a unit moved over doesn't need the move to deal damage (e.g. Blue Flare Dragontrail)
      if (unitOnTile && (spec.scorchAllMovedOver || (spec.scorchTilesMovedOver && unitOnTile.owner !== activePlayer))) {
        scorchedOver.push(midHex);
      }
      if (unitOnTile && spec.statusOnEnemiesMovedOver && unitOnTile.owner !== activePlayer) statusedOver.push(unitOnTile.instanceId);
      if (unitOnTile && damageAmount > 0 && (!spec.damageEnemiesOnly || unitOnTile.owner !== activePlayer)) {
        // Moved over, not targeted
        const res = applyAttackDamageToHex(midHex, damageAmount, ability, { targeted: false });
        passThroughLogs.push(
          `charged through ${unitOnTile.card.name} for ${damageAmount} damage${res.isDefeated ? ' (Defeated!)' : ''}`
        );
        damageEvents.push({
          hexId: midHex,
          damagedUnitOwner: unitOnTile.owner,
          damageAmount: res.damageDealt
        });
      }
    }

    if (scorchedOver.length > 0) {
      const scorchOpponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      setScorchedTiles((prev) => {
        const next = { ...prev };
        scorchedOver.forEach((h) => (next[h] = { expiresOnTurnEndFor: scorchOpponent, casterPlayer: activePlayer }));
        return next;
      });
      passThroughLogs.push(`scorched ${scorchedOver.join(', ')}`);
    }
    if (statusedOver.length > 0 && spec.statusOnEnemiesMovedOver) {
      const status = spec.statusOnEnemiesMovedOver;
      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((h) => {
          const u = next[h];
          if (!statusedOver.includes(u.instanceId) || isImmuneToNonDamageEffects(u, true)) return;
          if (!(u.statuses || []).includes(status)) next[h] = { ...u, statuses: [...(u.statuses || []), status] };
        });
        return next;
      });
    }
    // Self armour with the move (e.g. Prowl: "Move exactly 2 tiles. Armour up to 2.")
    const pathArmour: any = ability.effects?.find((e: any) => e.type === 'armour' && e.target === 'self' && typeof e.upTo === 'number');

    // Move the active unit to finalHex
    const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
    const currentCounts = activeTurnUnit.usedTurnCounts || {};
    const newCounts = recordAbilityUse(currentCounts, ability);

    // Check scorch on destination
    const passives = getUnitPassives(activeTurnUnit);
    const isImmuneToScorch =
      isImmuneToScorchDamage(activeTurnUnit);
    const wasScorched = isTileScorched(finalHex, unitsOnBoard, scorchedTiles);

    let currentArmour = activeTurnUnit.armour;
    let currentDamageCounters = activeTurnUnit.damageCounters;
    let isDefeatedByScorch = false;

    if (!isImmuneToScorch && wasScorched) {
      const scorchDmg = reduceNonAttackDamage(activeTurnUnit, 4);
      if (currentArmour >= scorchDmg) {
        currentArmour -= scorchDmg;
      } else {
        currentDamageCounters += scorchDmg - currentArmour;
        currentArmour = 0;
      }
      isDefeatedByScorch = currentDamageCounters >= activeTurnUnit.card.hp;
    }

    setUnitsOnBoard((prev) => {
      const next = { ...prev };
      delete next[casterHex];

      if (isDefeatedByScorch) {
        if (activeTurnUnit.card.type !== 'token') {
          if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
          else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
        }
      } else {
        next[finalHex] = {
          ...activeTurnUnit,
          hexId: finalHex,
          currentAp: newAp,
          usedTurnCounts: newCounts,
          armour: pathArmour ? Math.max(currentArmour, pathArmour.upTo) : currentArmour,
          damageCounters: currentDamageCounters,
          movedThisTurn: true,
          movesThisTurn: (activeTurnUnit.movesThisTurn || 0) + 1,
          tilesMovedThisTurn: (activeTurnUnit.tilesMovedThisTurn || 0) + targets.length,
          ...(wasScorched && !isImmuneToScorch ? { tookDamageThisTurn: true } : {})
        };
      }
      return isDefeatedByScorch ? next : applyMoveTriggers(next, activeTurnUnit.instanceId, targets, casterHex);
    });

    playCardDrawSound();
    setActiveAbility(null);
    setMultiStageState(null);

    if (isDefeatedByScorch) {
      multiStepAttackRef.current = null;
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
      showNotification(
        `${activeTurnUnit.card.name} used ${ability.name} to move to scorched tile ${finalHex}, took 4 damage, and was defeated!`
      );
      switchTurn(false);
      return;
    }

    setActiveTurnUnitHex(finalHex);
    setSelectedHex(finalHex);

    const logSummary = passThroughLogs.length > 0 ? passThroughLogs.join(', ') : 'No units moved over';
    showNotification(
      `🏇 ${activeTurnUnit.card.name} executed ${ability.name}! Path: ${targets.join(' → ')} (${targets.length} tiles). ${logSummary}.`
    );

    // Once-per-attack rules if it hit anything (Steal Plate, Perfect Form)
    applyMultiStepAttackerHooks(activeTurnUnit);

    if (newAp <= 0) {
      switchTurn(false);
    }
  };

  const handleFinishMultiStage = () => {
    if (multiStageState) {
      // Knockback path for a ranged optional knockback (e.g. Repulsion Spell): the path must end on the target
      const kbPath = (multiStageState.ability as any).knockbackPathFor as
        | { hexId: string; tiles: number; attackAbilityId: string }
        | undefined;
      if (kbPath) {
        const path = multiStageState.targets;
        const spec = getPathSpec(multiStageState.ability);
        const check = spec ? validatePath(multiStageState.casterHex, path, spec) : { valid: false, reason: 'Invalid path.' };
        if (!check.valid) {
          showNotification(check.reason || 'Invalid path.');
          return;
        }
        if (path[path.length - 1] !== kbPath.hexId) {
          showNotification('The path must end on the target.');
          return;
        }
        const originHex = path.length > 1 ? path[path.length - 2] : multiStageState.casterHex;
        attackKnockbackDecisionRef.current = {
          abilityId: kbPath.attackAbilityId,
          hexId: kbPath.hexId,
          apply: true,
          tiles: kbPath.tiles,
          originHex
        };
        setMultiStageState(null);
        setPendingAttackReplayHex(kbPath.hexId);
        return;
      }
      if (isChargeFlightAbility(multiStageState.ability)) {
        resolveChargeFlightExecution();
        return;
      }
      if (multiStageState.ability.id === 'lead_the_charge' && multiStageState.stage === 1) {
        resolveLeadTheChargeMove();
        return;
      }
      if (
        (multiStageState.ability.id === 'jab_and_backstep' || multiStageState.ability.id === 'deft_swipe') &&
        multiStageState.stage === 2
      ) {
        finishMultiStageAbility();
        showNotification(`${activeTurnUnit?.card.name || 'Unit'} chose to stay in place.`);
        return;
      }
      const pathSpecForFinish = getPathSpec(multiStageState.ability);
      // A move-then-strike that may move 0 tiles (e.g. Pouncing Ambush): finishing with no path strikes from here
      const strikesFromHere =
        multiStageState.targets.length === 0 &&
        multiStageState.ability.effects?.some((e: any) => e.type === 'damage' && e.target === 'chosenEnemyInMeleeRange');
      if (pathSpecForFinish && strikesFromHere) {
        const pathAbility = multiStageState.ability;
        setMultiStageState(null);
        startMoveThenStrike(pathAbility, [], 'choose');
        return;
      }
      if (pathSpecForFinish) {
        const check = validatePath(multiStageState.casterHex, multiStageState.targets, pathSpecForFinish);
        if (!check.valid) {
          showNotification(check.reason || 'Invalid path.');
          return;
        }
        const chosenPath = multiStageState.targets;
        const pathAbility = multiStageState.ability;
        setMultiStageState(null);
        // A straight-line move followed by a chosen melee strike (e.g. Pouncing Ambush)
        if (pathAbility.effects?.some((e: any) => e.type === 'damage' && e.target === 'chosenEnemyInMeleeRange')) {
          startMoveThenStrike(pathAbility, chosenPath, 'choose');
          return;
        }
        executeAreaAbility(pathAbility, chosenPath[chosenPath.length - 1], { path: chosenPath });
        return;
      }
    }
    if (multiStageState && getMultiTargetSpec(multiStageState.ability)) {
      resolveMultiTargetAttack();
      return;
    }
    finishMultiStageAbility();
    showNotification('Targeting completed.');
  };

  const handleCancelMultiStage = () => {
    // A chain that has already hit (e.g. Arc Lightning): stopping early still uses the ability and spends its AP
    if (
      multiStageState &&
      multiStageState.targets.length > 0 &&
      multiStageState.ability.effects?.some((e: any) => e.type === 'damage' && e.chain) &&
      activeTurnUnit
    ) {
      const hitIds = multiStageState.metadata?.chainHitIds || [];
      const casterId = activeTurnUnit.instanceId;
      const abilityKey = String(multiStageState.ability.baseAbilityId || multiStageState.ability.id);
      const name = multiStageState.ability.name;
      finishMultiStageAbility(multiStageState.casterHex);
      setUnitsOnBoard((prev) => {
        const h = Object.keys(prev).find((k) => prev[k].instanceId === casterId);
        if (!h) return prev;
        const used = prev[h].usedOnTargets || {};
        return { ...prev, [h]: { ...prev[h], usedOnTargets: { ...used, [abilityKey]: [...(used[abilityKey] || []), ...hitIds] } } };
      });
      showNotification(`${name}: the chain stops after ${hitIds.length} unit(s); the ability is used.`);
      return;
    }
    // A move-then-strike has already moved: cancelling skips the strike, but the ability is still used
    if (multiStageState?.metadata?.strikeCandidates) {
      finishMultiStageAbility(multiStageState.casterHex);
      showNotification(`${multiStageState.ability.name}: strike skipped.`);
      return;
    }
    if (multiStageState?.ability.id === 'sidestepping_crush' && multiStageState.stage === 2) {
      finishMultiStageAbility(multiStageState.casterHex);
      showNotification('Sidestepping Crush: Finished after move and armour gain (attack skipped).');
      return;
    }
    attackKnockbackDecisionRef.current = null;
    setActiveAbility(null);
    setMultiStageState(null);
    showNotification('Targeting cancelled.');
  };

  // ---- Move-then-strike: this unit moves (along `path`), then strikes. mode 'direction': the enemy on the next tile in
  // the direction moved, if any (e.g. Leap Strike); 'choose': an enemy in melee range of where it lands (e.g. Pouncing
  // Ambush). The strike resolves through the multi-step attack rules once the move has rendered; the ability's AP is
  // spent when it finishes, whether or not anything was hit.
  const getStrikeDamage = (ability: CardAbility): number => {
    const eff: any = ability.effects?.find(
      (e: any) =>
        e.type === 'damage' &&
        (e.target === 'enemyInDirectionMoved' || e.target === 'chosenEnemyInMeleeRange' || e.if === 'targetMoved')
    );
    return typeof eff?.amount === 'number' ? eff.amount : 0;
  };

  const startMoveThenStrike = (
    ability: CardAbility,
    path: string[],
    mode: 'direction' | 'choose',
    opts?: { strikeHex?: string; anyUnit?: boolean }
  ) => {
    // "Moves up to N tiles" may be 0 tiles (e.g. Pouncing Ambush strikes from where it stands; Silver Charge into an
    // adjacent enemy, given as strikeHex)
    if (!activeTurnUnit || !activeTurnUnitHex || (path.length === 0 && mode !== 'choose' && !opts?.strikeHex)) return;
    const from = activeTurnUnitHex;
    const dest = path.length > 0 ? path[path.length - 1] : from;
    const moveEff: any = ability.effects?.find((e: any) => e.type === 'move' && e.target === 'self');
    // Units in the way are only passed over when the move ignores them (e.g. Rift Leap)
    const passedOver = path.slice(0, -1).filter((h) => unitsOnBoard[h]);
    const canPass = () => Boolean(moveEff?.ignoreUnitsInWay);
    if (unitsOnBoard[dest] && dest !== from) {
      showNotification(`${ability.name}: the move must end on an empty tile.`);
      return;
    }
    if (passedOver.length > 0 && !canPass()) {
      showNotification(`${ability.name}: the move must be onto empty tiles, with no units in the way.`);
      return;
    }
    if (path.length > 0 && isUnitMovementDisabled(activeTurnUnit)) {
      showNotification(getMoveBlockedMessage(activeTurnUnit));
      return;
    }
    const lastFrom = path.length > 1 ? path[path.length - 2] : from;
    // (anyUnit: friendly units are struck too, e.g. Lightning Joust's "the unit in the last direction travelled")
    const isEnemyAt = (h: string | null) =>
      Boolean(
        h &&
          unitsOnBoard[h] &&
          (opts?.anyUnit || unitsOnBoard[h].owner !== activePlayer) &&
          !isUntargetableBy(unitsOnBoard[h], activePlayer)
      );
    const candidates =
      opts?.strikeHex
        ? [opts.strikeHex].filter((h) => isEnemyAt(h))
        : mode === 'direction'
        ? [getSameDirectionNextHex(lastFrom, dest)].filter((h): h is string => isEnemyAt(h))
        : getSurroundingHexes(dest).filter((h) => h !== from && isEnemyAt(h));
    const tilesMoved = path.length;
    // Armour that comes before the move (e.g. Skillful Joust: "Armour up to 2, then move ...")
    const preArmour: any =
      ability.effects && ability.effects.findIndex((e: any) => e.type === 'armour') < ability.effects.findIndex((e: any) => e.type === 'move')
        ? ability.effects.find((e: any) => e.type === 'armour' && e.target === 'self' && typeof e.upTo === 'number')
        : null;
    if (tilesMoved > 0 || preArmour) {
      const moverId = activeTurnUnit.instanceId;
      setUnitsOnBoard((prev) => {
        const u = prev[from];
        if (!u) return prev;
        let next = { ...prev };
        delete next[from];
        next[dest] = {
          ...u,
          hexId: dest,
          armour: preArmour ? Math.max(u.armour, preArmour.upTo) : u.armour,
          ...(tilesMoved > 0
            ? {
                movedThisTurn: true,
                movesThisTurn: (u.movesThisTurn || 0) + 1,
                tilesMovedThisTurn: (u.tilesMovedThisTurn || 0) + tilesMoved
              }
            : {})
        };
        return tilesMoved > 0 ? applyMoveTriggers(next, moverId, path, from) : next;
      });
    }
    setActiveTurnUnitHex(dest);
    setSelectedHex(dest);
    setMultiStageState({
      ability,
      casterHex: dest,
      stage: 2,
      targets: path,
      metadata: { strikeCandidates: candidates, autoStrike: mode === 'direction' }
    });
    if (mode === 'choose' && candidates.length > 0) {
      showNotification(`${ability.name}: ${tilesMoved > 0 ? `moved to ${dest}` : 'stayed in place'}. Click an enemy in melee range to strike.`);
    }
  };

  // Resolves a move-then-strike that needs no choice (nothing to hit, or the one unit in the direction moved)
  useEffect(() => {
    const m = multiStageState?.metadata;
    if (!multiStageState || !m?.strikeCandidates || activeTurnUnitHex !== multiStageState.casterHex) return;
    const ability = multiStageState.ability;
    if (m.strikeCandidates.length === 0) {
      finishMultiStageAbility(multiStageState.casterHex);
      showNotification(`${ability.name}: no enemy to strike.`);
      return;
    }
    if (m.autoStrike) {
      // "For each tile moved this way, deals N damage" (e.g. Skillful Joust): one hit per tile moved
      // ...or "deal N damage per tile moved" (e.g. Lightning Joust): one hit of N per tile
      const strikeEff: any = ability.effects?.find(
        (e: any) => e.type === 'damage' && (e.target === 'enemyInDirectionMoved' || e.target === 'unitInLastDirectionMoved')
      );
      const tiles = multiStageState.targets.length;
      const perTile = typeof strikeEff?.hits?.perTileMoved === 'number' ? strikeEff.hits.perTileMoved * tiles : null;
      const perTileAmount = typeof strikeEff?.amount?.perTileMoved === 'number' ? strikeEff.amount.perTileMoved * tiles : null;
      if (perTile === 0 || perTileAmount === 0) showNotification(`${ability.name}: it didn't move, so no damage is dealt.`);
      else
        applyAttackDamageToHex(
          m.strikeCandidates[0],
          perTileAmount ?? getStrikeDamage(ability),
          ability,
          perTile ? { hits: perTile } : undefined
        );
      finishMultiStageAbility(multiStageState.casterHex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiStageState, activeTurnUnitHex]);

  // Tiles moved this turn from any move source (e.g. Lance Thrust's "for each tile this unit has moved"): a turn player's unit that
  // changed tile adds the distance, unless the move already counted its own path length (curved paths, e.g. Spitfire)
  const lastUnitTilesRef = useRef<Record<string, { hex: string; cardId: string; tiles: number }>>({});
  useEffect(() => {
    const prevSnap = lastUnitTilesRef.current;
    const added: Record<string, number> = {};
    const snap: Record<string, { hex: string; cardId: string; tiles: number }> = {};
    Object.entries(unitsOnBoard).forEach(([hex, u]) => {
      const p = prevSnap[u.instanceId];
      const tiles = u.tilesMovedThisTurn || 0;
      if (p && p.hex !== hex && p.cardId === u.card.id && u.owner === activePlayer && tiles === p.tiles) {
        added[u.instanceId] = getHexDistance(p.hex, hex);
      }
      snap[u.instanceId] = { hex, cardId: u.card.id, tiles: tiles + (added[u.instanceId] || 0) };
    });
    lastUnitTilesRef.current = snap;
    if (Object.keys(added).length === 0) return;
    setUnitsOnBoard((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((h) => {
        const extra = added[next[h].instanceId];
        if (extra) next[h] = { ...next[h], tilesMovedThisTurn: (next[h].tilesMovedThisTurn || 0) + extra };
      });
      return next;
    });
  }, [unitsOnBoard, activePlayer]);

  // Answer to "the second hit may target a different unit" (e.g. Cloven Crash)
  const handleSplitHitChoice = (value: string) => {
    const prompt = splitHitPrompt;
    setSplitHitPrompt(null);
    if (!prompt || !activeAbility || !activeTurnUnitHex) return;
    if (value === 'same') {
      // Both hits on the first target: a normal attack
      splitHitDecisionRef.current = { abilityId: activeAbility.id, hexId: prompt.hexId };
      setPendingAttackReplayHex(prompt.hexId);
      return;
    }
    setMultiStageState({
      ability: activeAbility,
      casterHex: activeTurnUnitHex,
      stage: 2,
      targets: [prompt.hexId],
      metadata: { splitHitCandidates: prompt.candidates }
    });
    showNotification(`${activeAbility.name}: the first hit targets ${prompt.targetName}. Click the unit the second hit targets.`);
  };

  // Multi-Stage Ability Step Handler
  const handleMultiStageStep = (hexId: string) => {
    if (!multiStageState || !activeTurnUnitHex || !activeTurnUnit) return;
    const { ability, stage, targets, metadata } = multiStageState;

    // Move-then-strike (e.g. Pouncing Ambush): strike the chosen enemy in melee range, then finish
    if (metadata?.strikeCandidates) {
      if (metadata.autoStrike) return;
      if (!metadata.strikeCandidates.includes(hexId)) {
        showNotification(`${ability.name}: click a highlighted enemy in melee range.`);
        return;
      }
      applyAttackDamageToHex(hexId, getStrikeDamage(ability), ability);
      // "...and N damage to all other enemy units surrounding this unit" (e.g. Pouncing Arc)
      const othersEff: any = ability.effects?.find(
        (e: any) => e.type === 'damage' && e.area === 'otherEnemyUnitsSurroundingSelf' && typeof e.amount === 'number'
      );
      if (othersEff) {
        getSurroundingHexes(multiStageState.casterHex)
          .filter((h) => h !== hexId && unitsOnBoard[h] && unitsOnBoard[h].owner !== activePlayer)
          .forEach((h) => applyAttackDamageToHex(h, othersEff.amount, ability, { targeted: false }));
      }
      finishMultiStageAbility(multiStageState.casterHex);
      return;
    }

    // A chain (e.g. Arc Lightning): hit the clicked unit, then choose another enemy surrounding it for 1 damage less,
    // until it would deal no damage or there's no new unit to choose; each unit only once per turn
    const chainEff: any = ability.effects?.find((e: any) => e.type === 'damage' && e.chain);
    if (chainEff) {
      const valid = getMultiStageTargetInfo(multiStageState, unitsOnBoard, activePlayer).validHexes;
      const hitUnitHere = unitsOnBoard[hexId];
      if (!valid.includes(hexId) || !hitUnitHere) {
        showNotification(`${ability.name}: click a highlighted enemy unit.`);
        return;
      }
      const base = typeof chainEff.amount === 'number' ? chainEff.amount : 0;
      const step = typeof chainEff.chain.decreaseBy === 'number' ? chainEff.chain.decreaseBy : 1;
      const amount = base - targets.length * step;
      applyAttackDamageToHex(hexId, amount, ability, { targeted: targets.length === 0 });
      const abilityKey = String(ability.baseAbilityId || ability.id);
      const hitBefore = activeTurnUnit.usedOnTargets?.[abilityKey] || [];
      const hitIds = [...(metadata?.chainHitIds || []), hitUnitHere.instanceId];
      const nextAmount = amount - step;
      const candidates =
        nextAmount > 0
          ? getSurroundingHexes(hexId).filter((h) => {
              const u = unitsOnBoard[h];
              return (
                u &&
                u.owner !== activePlayer &&
                !hitIds.includes(u.instanceId) &&
                !(chainEff.chain.eachUnitOncePerTurn && hitBefore.includes(u.instanceId))
              );
            })
          : [];
      if (candidates.length === 0) {
        const casterId = activeTurnUnit.instanceId;
        finishMultiStageAbility(multiStageState.casterHex);
        setUnitsOnBoard((prev) => {
          const h = Object.keys(prev).find((k) => prev[k].instanceId === casterId);
          if (!h) return prev;
          const used = prev[h].usedOnTargets || {};
          return { ...prev, [h]: { ...prev[h], usedOnTargets: { ...used, [abilityKey]: [...(used[abilityKey] || []), ...hitIds] } } };
        });
        showNotification(`${ability.name}: hit ${hitIds.length} unit(s); the chain ends (${nextAmount <= 0 ? 'no damage left' : 'no new unit to choose'}).`);
        return;
      }
      setMultiStageState({
        ...multiStageState,
        targets: [...targets, hexId],
        metadata: { ...(metadata || {}), chainCandidates: candidates, chainHitIds: hitIds }
      });
      showNotification(`${ability.name}: dealt ${amount} to ${hitUnitHere.card.name}. Choose another enemy surrounding it (${nextAmount} damage).`);
      return;
    }

    // Charge line (e.g. Silver Charge): the tile to stop on, or an enemy further along the line to charge
    const chargeLine = getChargeLineMove(ability);
    if (chargeLine && targets.length === 0) {
      const choice = getChargeLineChoices(multiStageState.casterHex, chargeLine.maxTiles, unitsOnBoard, activePlayer).get(hexId);
      if (!choice) {
        showNotification(`${ability.name}: click a highlighted tile or enemy in a straight line.`);
        return;
      }
      setMultiStageState(null);
      startMoveThenStrike(ability, choice.path, 'direction', choice.strike ? { strikeHex: hexId } : undefined);
      return;
    }

    // A friendly basic unit's free attack (e.g. Roar of the Pride): the unit, its attack (asked if it has several), then
    // the target
    const allySpec = getGrantedAllyAttack(ability);
    if (allySpec) {
      if (!metadata?.allyHex || !metadata.allyAbilityId) {
        const ally = unitsOnBoard[hexId];
        const choices = ally ? getAllyAttackChoices(ally, allySpec) : [];
        if (!ally || choices.length === 0) {
          showNotification(`${ability.name}: click a highlighted friendly basic unit.`);
          return;
        }
        const pick = (abilityId: string) =>
          setMultiStageState((st) => (st ? { ...st, stage: 2, metadata: { ...(st.metadata || {}), allyHex: hexId, allyAbilityId: abilityId } } : st));
        if (choices.length === 1) pick(choices[0].id);
        else {
          askCardChoice(
            {
              title: ability.name,
              message: `Which attack does ${ally.card.name} use?`,
              options: choices.map((a) => ({ label: a.name, value: a.id }))
            },
            pick
          );
        }
        return;
      }
      resolveAllyAttack(metadata.allyHex, metadata.allyAbilityId, hexId);
      finishMultiStageAbility();
      return;
    }

    // Burst from Underneath: push the target onto the chosen tile, take its old tile, then strike it
    if (metadata?.pushChoices && metadata.pushTargetHex) {
      if (!metadata.pushChoices.includes(hexId)) {
        showNotification(`${ability.name}: click a highlighted empty tile around the target.`);
        return;
      }
      const targetHex = metadata.pushTargetHex;
      const target = unitsOnBoard[targetHex];
      const casterFrom = activeTurnUnitHex;
      if (!target) {
        finishMultiStageAbility();
        return;
      }
      // "Deals N damage. Apply knockback 1 to the target in a chosen direction" (e.g. Overpowering Gust): the hit, then
      // the push onto the chosen tile if it survived
      if (!ability.effects?.some((e: any) => e.type === 'place')) {
        const dmgEff: any = ability.effects?.find((e: any) => e.type === 'damage');
        const res = applyAttackDamageToHex(targetHex, typeof dmgEff?.amount === 'number' ? dmgEff.amount : 0, ability);
        if (!res.isDefeated) {
          const pusher = activeTurnUnit;
          setUnitsOnBoard((prev) => {
            const t = prev[targetHex];
            if (!t || t.instanceId !== target.instanceId || prev[hexId]) return prev;
            const next = { ...prev };
            delete next[targetHex];
            next[hexId] = { ...t, hexId };
            return applyKnockbackRiders(next, pusher, t.instanceId);
          });
          showNotification(`${ability.name}: dealt ${res.damageDealt} damage and pushed ${target.card.name} to ${hexId}.`);
        }
        finishMultiStageAbility();
        return;
      }
      setUnitsOnBoard((prev) => {
        const t = prev[targetHex];
        const c = prev[casterFrom];
        if (!t || !c) return prev;
        const next = { ...prev };
        delete next[casterFrom];
        next[hexId] = { ...t, hexId };
        next[targetHex] = { ...c, hexId: targetHex };
        return next;
      });
      setActiveTurnUnitHex(targetHex);
      setSelectedHex(targetHex);
      setMultiStageState({
        ...multiStageState,
        casterHex: targetHex,
        stage: 3,
        metadata: { strikeCandidates: [hexId], autoStrike: true }
      });
      showNotification(`${ability.name}: pushed ${target.card.name} to ${hexId} and burst up from ${targetHex}!`);
      return;
    }
    // Burst from Underneath, first click: the target (an enemy in range). If it can't be pushed, nothing happens.
    if (ability.effects?.some((e: any) => e.type === 'knockback' && e.direction === 'chosen')) {
      const target = unitsOnBoard[hexId];
      if (!target || target.owner === activePlayer) {
        showNotification(`${ability.name}: click an enemy unit in range.`);
        return;
      }
      const choices = isImmuneToKnockback(target) ? [] : getSurroundingHexes(hexId).filter((h) => !unitsOnBoard[h]);
      if (choices.length === 0) {
        // A hit that pushes after it still lands (e.g. Overpowering Gust); a push that comes first does nothing
        const dmgEff: any = ability.effects?.find((e: any) => e.type === 'damage' && !e.if);
        if (dmgEff && !ability.effects?.some((e: any) => e.type === 'place')) {
          applyAttackDamageToHex(hexId, typeof dmgEff.amount === 'number' ? dmgEff.amount : 0, ability);
          finishMultiStageAbility();
          showNotification(`${ability.name}: ${target.card.name} can't be pushed.`);
          return;
        }
        finishMultiStageAbility();
        showNotification(`${ability.name}: ${target.card.name} can't be pushed, so nothing happens.`);
        return;
      }
      setMultiStageState({ ...multiStageState, stage: 2, targets: [hexId], metadata: { pushTargetHex: hexId, pushChoices: choices } });
      return;
    }

    // Split hits (e.g. Cloven Crash): one hit on the first target, one on this different unit, each through the
    // main attack rules, then the attack finishes like any multi-step attack
    if (metadata?.splitHitCandidates) {
      if (!metadata.splitHitCandidates.includes(hexId)) {
        showNotification(`${ability.name}: click a highlighted unit for the second hit.`);
        return;
      }
      const dmgEff: any = ability.effects?.find((e: any) => e.type === 'damage');
      const perHit = typeof dmgEff?.amount === 'number' ? dmgEff.amount : 0;
      applyAttackDamageToHex(targets[0], perHit, ability);
      applyAttackDamageToHex(hexId, perHit, ability);
      finishMultiStageAbility();
      return;
    }

    // Charge / Flight path mode: sequential path selection with turn and legality checking
    if (isChargeFlightAbility(ability)) {
      const spec = getChargeFlightSpec(ability);
      // If path is complete & valid, and player clicked the destination tile again, confirm and execute
      const currentCheck = validateChargeFlightPath(multiStageState.casterHex, targets, spec, unitsOnBoard);
      if (currentCheck.valid && targets.length > 0 && targets[targets.length - 1] === hexId) {
        resolveChargeFlightExecution();
        return;
      }

      const res = extendChargeFlightPath(multiStageState.casterHex, targets, hexId, spec, unitsOnBoard);
      if (res.error) {
        showNotification(res.error);
        return;
      }

      setMultiStageState({
        ...multiStageState,
        stage: res.newPath.length + 1,
        targets: res.newPath
      });
      return;
    }

    // Path abilities: each click builds the path
    const pathSpecForStep = getPathSpec(ability);
    if (pathSpecForStep) {
      const newPath = extendPath(multiStageState.casterHex, multiStageState.targets, hexId, pathSpecForStep);
      const nextState: MultiStageState = { ...multiStageState, stage: newPath.length + 1, targets: newPath };
      setMultiStageState(nextState);
      const nextInfo = getMultiStageTargetInfo(nextState, unitsOnBoard, activePlayer);
      showNotification(nextInfo.promptMessage);
      return;
    }
    const abilityId = ability.id || '';
    const cost = getAbilityApCost(ability);

    // Abilities whose only effect on the clicked unit is non-damage (swaps, placements, armour gifts) can't pick another
    // unit, friendly or enemy, that is immune to non-damage effects (Machine Heart)
    const NON_DAMAGE_ON_CLICKED_UNIT = ['tactical_swap', 'nexus_displacement', 'spirit_away', 'realm_warp', 'buddy_tag', 'rally_stance'];
    const clickedUnit = unitsOnBoard[hexId];
    if (
      NON_DAMAGE_ON_CLICKED_UNIT.includes(abilityId) &&
      clickedUnit &&
      clickedUnit.instanceId !== activeTurnUnit.instanceId &&
      isImmuneToNonDamageEffects(clickedUnit)
    ) {
      showNotification(`${clickedUnit.card.name} is immune to non-damage effects right now, so ${ability.name} can't affect it.`);
      return;
    }

    // 0. Rally Stance special resolution: resolve immediately upon clicking an adjacent ally
    if (ability.id === 'rally_stance') {
      const friendUnit = unitsOnBoard[hexId];
      if (!friendUnit || friendUnit.owner !== activePlayer) return;
      const selfUp = 4;
      const friendUp = 3;
      const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const nextCounts = recordAbilityUse(currentCounts, ability);

      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        if (next[activeTurnUnitHex]) {
          next[activeTurnUnitHex] = {
            ...next[activeTurnUnitHex],
            armour: Math.max(next[activeTurnUnitHex].armour, selfUp),
            currentAp: newAp,
            usedTurnCounts: nextCounts
          };
        }
        if (next[hexId]) {
          next[hexId] = {
            ...next[hexId],
            armour: Math.max(next[hexId].armour, friendUp)
          };
        }
        return next;
      });

      playCardDrawSound();
      setActiveAbility(null);
      setMultiStageState(null);
      showNotification(
        `${activeTurnUnit.card.name} used Rally Stance! (Armoured up to 4, and ${friendUnit.card.name} armoured up to 3! ${cost} AP spent, ${newAp} AP remaining).`
      );
      if (!afterArmourAbilityUsed(activeTurnUnit, ability, newAp) && cost > 0 && newAp <= 0) {
        switchTurn(false);
      }
      return;
    }

    // Generic multi-target abilities: only collect targets here; damage resolves on Confirm
    const multiSpec = getMultiTargetSpec(ability);
    if (multiSpec) {
      if (targets.includes(hexId)) {
        setMultiStageState({ ...multiStageState, targets: targets.filter((h) => h !== hexId) });
        return;
      }
      if (multiSpec.max !== null && targets.length >= multiSpec.max) {
        showNotification(`${ability.name} can only target up to ${multiSpec.max} units. Deselect one or confirm.`);
        return;
      }
      setMultiStageState({ ...multiStageState, targets: [...targets, hexId] });
      return;
    }

    // 1. Realm Warp (Fateweaver Sage)
    if (abilityId === 'realm_warp') {
      if (stage === 1) {
        setMultiStageState({
          ...multiStageState,
          stage: 2,
          targets: [hexId]
        });
        showNotification(`Realm Warp (Stage 1/2): Selected destination tile ${hexId}. Now click a surrounding unit to place onto ${hexId}.`);
        return;
      }
      if (stage === 2) {
        const destHex = targets[0];
        const unitToWarp = unitsOnBoard[hexId];
        if (!unitToWarp) return;
        const isFriendly = unitToWarp.owner === activePlayer;
        const newArmour = isFriendly ? Math.max(unitToWarp.armour, 3) : unitToWarp.armour;
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);
        const isWarpingSelf = hexId === activeTurnUnitHex;
        const casterHex = activeTurnUnitHex;

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[hexId];
          if (isWarpingSelf) {
            next[destHex] = {
              ...unitToWarp,
              hexId: destHex,
              armour: newArmour,
              currentAp: newAp,
              usedTurnCounts: nextCounts
            };
          } else {
            next[destHex] = {
              ...unitToWarp,
              hexId: destHex,
              armour: newArmour
            };
            if (next[casterHex]) {
              next[casterHex] = {
                ...next[casterHex],
                currentAp: newAp,
                usedTurnCounts: nextCounts
              };
            }
          }
          return next;
        });

        if (isWarpingSelf) {
          setActiveTurnUnitHex(destHex);
          setSelectedHex(destHex);
        }

        playCardDrawSound();
        showNotification(
          `Fateweaver Sage used Realm Warp! Placed ${unitToWarp.card.name} onto ${destHex}${
            isFriendly ? ' and granted armour up to 3!' : '!'
          } (${cost} AP spent, ${newAp} AP remaining).`
        );
        setActiveAbility(null);
        setMultiStageState(null);
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }
    }

    // 1.5. Swooping Pounce (Corrosive Wyvern) & Vaulting Strike (Skirmish Captain)
    // Stage 1: Choose target unit in range
    // Stage 2: Choose empty tile surrounding target; caster placed on tile. If target is enemy, deals damage (10 for Swooping Pounce, 6 for Vaulting Strike)!
    // Vaulting Strike: the attack, then you may place this unit on an empty tile surrounding the target
    if (abilityId === 'vaulting_strike') {
      if (stage === 1) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit) return;
        const amount = (ability.effects?.find((e: any) => e.type === 'damage') as any)?.amount ?? 6;
        const res = applyAttackDamageToHex(hexId, amount, ability);
        const vaultTiles = getSurroundingHexes(hexId).filter((h) => !unitsOnBoard[h]);
        const dealtNote = `Vaulting Strike dealt ${res.damageDealt} damage to ${targetUnit.card.name}${res.isDefeated ? ' (defeated!)' : ''}.`;
        if (vaultTiles.length === 0) {
          showNotification(`${dealtNote} No empty tile surrounding the target to land on.`);
          finishMultiStageAbility();
          return;
        }
        setMultiStageState({ ...multiStageState, stage: 2, targets: [hexId], metadata: { vaultTiles } });
        showNotification(`${dealtNote} You may click an empty tile surrounding the target to land there, or click 'Stay Here'.`);
        return;
      }
      if (stage === 2) {
        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          const cur = next[activeTurnUnitHex] || activeTurnUnit;
          delete next[activeTurnUnitHex];
          next[hexId] = { ...cur, hexId };
          return next;
        });
        setActiveTurnUnitHex(hexId);
        setSelectedHex(hexId);
        showNotification(`${activeTurnUnit.card.name} vaulted to ${hexId}.`);
        finishMultiStageAbility(hexId);
        return;
      }
    }

    if (abilityId === 'swooping_pounce') {
      const dmgAmount = 10;
      const verb = 'pounce';
      const pastVerb = 'swooped';
      const emoji = '🦅';

      if (stage === 1) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit) return;
        const surrEmpty = getSurroundingHexes(hexId).filter((h) => !unitsOnBoard[h] || h === activeTurnUnitHex);
        if (surrEmpty.length === 0) {
          showNotification(`No empty surrounding tiles around ${targetUnit.card.name} to ${verb} onto!`);
          return;
        }
        setMultiStageState({
          ...multiStageState,
          stage: 2,
          targets: [hexId],
          metadata: { targetUnitHex: hexId }
        });
        showNotification(
          `${ability.name} (Stage 2/2): Selected ${targetUnit.card.name}. Now click an empty tile surrounding ${targetUnit.card.name} to place ${activeTurnUnit.card.name}.`
        );
        return;
      }
      if (stage === 2) {
        const targetHex = targets[0];
        const targetUnit = unitsOnBoard[targetHex];
        const destHex = hexId;
        const fromHex = activeTurnUnitHex;

        // Move active turn unit to destHex
        const passives = getUnitPassives(activeTurnUnit);
        const wasScorched = isTileScorched(destHex, unitsOnBoard, scorchedTiles);
        const isImmuneToScorch = isImmuneToScorchDamage(activeTurnUnit);

        let scorchDmg = (!isImmuneToScorch && wasScorched && destHex !== fromHex) ? 4 : 0;
        let finalArmour = activeTurnUnit.armour;
        let finalDamageCounters = activeTurnUnit.damageCounters;

        if (scorchDmg > 0) {
          if (finalArmour >= scorchDmg) {
            finalArmour -= scorchDmg;
          } else {
            finalDamageCounters += (scorchDmg - finalArmour);
            finalArmour = 0;
          }
        }
        const isCasterDefeated = scorchDmg > 0 && finalDamageCounters >= activeTurnUnit.card.hp;

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          if (destHex !== fromHex) {
            delete next[fromHex];
          }
          if (isCasterDefeated) {
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
            }
          } else {
            const moveDir = getHexMovementDirection(fromHex, destHex);
            const nextMovedDirections =
              moveDir !== null
                ? [...(activeTurnUnit.movedDirectionsThisTurn || []), moveDir]
                : activeTurnUnit.movedDirectionsThisTurn || [];
            next[destHex] = {
              ...activeTurnUnit,
              hexId: destHex,
              armour: finalArmour,
              damageCounters: finalDamageCounters,
              movedThisTurn: true,
              movedDirectionsThisTurn: nextMovedDirections,
              movesThisTurn: (activeTurnUnit.movesThisTurn || 0) + 1
            };
          }
          return next;
        });

        if (isCasterDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          finishMultiStageAbility();
          showNotification(`${activeTurnUnit.card.name} landed on a scorched tile, took 4 damage, and was defeated!`);
          switchTurn(false);
          return;
        }

        if (destHex !== fromHex) scorchTileLeftByMove(activeTurnUnit, fromHex, (activeTurnUnit.movesThisTurn || 0) + 1);
        setActiveTurnUnitHex(destHex);
        setSelectedHex(destHex);

        // Then, if the target is an enemy, deals 10 damage
        let damageMsg = '';
        if (targetUnit && targetUnit.owner !== activePlayer) {
          const res = applyAttackDamageToHex(targetHex, dmgAmount, ability);
          damageMsg = ` and dealt ${res.damageDealt} damage to ${targetUnit.card.name}${res.isDefeated ? ' (Defeated!)' : ''}`;
        }

        finishMultiStageAbility(destHex);
        showNotification(
          `${emoji} ${activeTurnUnit.card.name} ${pastVerb} onto ${destHex} surrounding ${targetUnit?.card.name || 'target'}${damageMsg}! (${cost} AP spent).`
        );
        return;
      }
    }

    // 1.6. Sidestepping Crush (Carapace Crusher)
    // Stage 1: Move 1 tile in an unused direction, gain 2 armour.
    // If surrounding enemies exist, advance to Stage 2 to deal 8 damage. Otherwise, finish.
    if (abilityId === 'sidestepping_crush') {
      if (stage === 1) {
        const destHex = hexId;
        const fromHex = activeTurnUnitHex;
        const moveDir = getHexMovementDirection(fromHex, destHex);

        const passives = getUnitPassives(activeTurnUnit);
        const wasScorched = isTileScorched(destHex, unitsOnBoard, scorchedTiles);
        const isImmuneToScorch =
          isImmuneToScorchDamage(activeTurnUnit);

        let scorchDmg = !isImmuneToScorch && wasScorched && destHex !== fromHex ? 4 : 0;
        let finalArmour = activeTurnUnit.armour;
        let finalDamageCounters = activeTurnUnit.damageCounters;

        if (scorchDmg > 0) {
          if (finalArmour >= scorchDmg) {
            finalArmour -= scorchDmg;
          } else {
            finalDamageCounters += scorchDmg - finalArmour;
            finalArmour = 0;
          }
        }
        const isCasterDefeated = scorchDmg > 0 && finalDamageCounters >= activeTurnUnit.card.hp;

        // Gain 2 armour
        if (!isCasterDefeated) {
          finalArmour += 2;
        }

        const nextMovedDirections =
          moveDir !== null
            ? [...(activeTurnUnit.movedDirectionsThisTurn || []), moveDir]
            : activeTurnUnit.movedDirectionsThisTurn || [];

        const updatedCaster: BattlefieldUnit = {
          ...activeTurnUnit,
          hexId: destHex,
          armour: finalArmour,
          damageCounters: finalDamageCounters,
          movedThisTurn: true,
          movedDirectionsThisTurn: nextMovedDirections,
          movesThisTurn: (activeTurnUnit.movesThisTurn || 0) + 1
        };

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          if (destHex !== fromHex) {
            delete next[fromHex];
          }
          if (isCasterDefeated) {
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
            }
          } else {
            next[destHex] = updatedCaster;
          }
          return next;
        });

        if (isCasterDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          finishMultiStageAbility();
          showNotification(`${activeTurnUnit.card.name} landed on a scorched tile, took 4 damage, and was defeated!`);
          switchTurn(false);
          return;
        }

        if (destHex !== fromHex) scorchTileLeftByMove(activeTurnUnit, fromHex, updatedCaster.movesThisTurn!);
        setActiveTurnUnitHex(destHex);
        setSelectedHex(destHex);

        // Check if any surrounding enemies exist from destHex
        const surrHexes = getSurroundingHexes(destHex);
        const surrEnemies = surrHexes.filter((h) => {
          const u = unitsOnBoard[h];
          return u && (u.owner !== activePlayer || (hasFeedingFrenzy(updatedCaster) && h !== destHex));
        });

        if (surrEnemies.length > 0) {
          setMultiStageState({
            ...multiStageState,
            casterHex: destHex,
            stage: 2,
            targets: [destHex]
          });
          showNotification(
            `🦀 Sidestepping Crush (Stage 2/2): Moved to ${destHex} and gained 2 armour (now 🛡️${finalArmour}). Now click a surrounding enemy unit to deal 8 damage!`
          );
          return;
        } else {
          // No surrounding enemies, finish ability
          finishMultiStageAbility(destHex);
          showNotification(
            `🦀 ${activeTurnUnit.card.name} used Sidestepping Crush: Moved to ${destHex} and gained 2 armour (now 🛡️${finalArmour}), but no enemies are surrounding to crush. (${cost} AP spent).`
          );
          return;
        }
      }

      if (stage === 2) {
        const targetHex = hexId;
        const targetUnit = unitsOnBoard[targetHex];
        if (!targetUnit) return;

        const res = applyAttackDamageToHex(targetHex, 8, ability);
        finishMultiStageAbility(multiStageState.casterHex);
        showNotification(
          `🦀 ${activeTurnUnit.card.name} crushed ${targetUnit.card.name} for ${res.damageDealt} damage${res.isDefeated ? ' (Defeated!)' : ''}! (${cost} AP spent).`
        );
        return;
      }
    }

    // 2. Tactical Swap (Vanguard Commander)
    if (abilityId === 'tactical_swap') {
      const targetUnit = unitsOnBoard[hexId];
      if (!targetUnit) return;
      const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
      const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);

      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        next[activeTurnUnitHex] = {
          ...targetUnit,
          hexId: activeTurnUnitHex
        };
        next[hexId] = {
          ...activeTurnUnit,
          hexId,
          currentAp: newAp,
          usedTurnCounts: nextCounts
        };
        return next;
      });

      setActiveTurnUnitHex(hexId);
      setSelectedHex(hexId);
      playCardDrawSound();
      showNotification(`Vanguard Commander swapped positions with ${targetUnit.card.name} via Tactical Swap! (${cost} AP spent).`);
      setActiveAbility(null);
      setMultiStageState(null);
      if (cost > 0 && newAp <= 0) switchTurn(false);
      return;
    }

    // 3. Nexus Displacement (Nexus Sorcerer)
    if (abilityId === 'nexus_displacement') {
      if (stage === 1) {
        setMultiStageState({
          ...multiStageState,
          stage: 2,
          targets: [hexId]
        });
        showNotification(
          `Nexus Displacement (Stage 1/2): Selected ${unitsOnBoard[hexId]?.card.name}. Now click an enemy unit in range 1-3 to swap positions.`
        );
        return;
      }
      if (stage === 2) {
        const hex1 = targets[0];
        const hex2 = hexId;
        const unit1 = unitsOnBoard[hex1];
        const unit2 = unitsOnBoard[hex2];
        if (!unit1 || !unit2) return;
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          next[hex1] = { ...unit2, hexId: hex1 };
          next[hex2] = { ...unit1, hexId: hex2 };
          if (next[activeTurnUnitHex]) {
            next[activeTurnUnitHex] = {
              ...next[activeTurnUnitHex],
              currentAp: newAp,
              usedTurnCounts: nextCounts
            };
          }
          return next;
        });

        playCardDrawSound();
        showNotification(
          `Nexus Sorcerer used Nexus Displacement! Swapped positions of ${unit1.card.name} and ${unit2.card.name} (ignoring units in the way)! (${cost} AP spent).`
        );
        setActiveAbility(null);
        setMultiStageState(null);
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }
    }

    // 4. Grappling Hook (Corsair Saboteur)
    if (abilityId === 'grappling_hook') {
      if (stage === 1) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit) return;
        // A unit immune to non-damage effects (Machine Heart) "cannot be moved": this unit moves to it instead
        const pullBlocked = targetUnit.instanceId !== activeTurnUnit.instanceId && isImmuneToNonDamageEffects(targetUnit);
        const closestEmpty = pullBlocked ? [] : getClosestEmptySurroundingHexes(activeTurnUnitHex, hexId, unitsOnBoard);

        if (closestEmpty.length > 1) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [hexId],
            metadata: { tiebreakEmptyHexes: closestEmpty, targetUnitHex: hexId }
          });
          showNotification(`Grappling Hook (Stage 2): Multiple closest empty tiles available. Choose which tile to pull ${targetUnit.card.name} onto.`);
          return;
        }

        if (closestEmpty.length === 1) {
          const destHex = closestEmpty[0];
          setUnitsOnBoard((prev) => {
            const next = { ...prev };
            delete next[hexId];
            next[destHex] = { ...targetUnit, hexId: destHex };
            return next;
          });
          applyAttackDamageToHex(destHex, 5, ability);
          finishMultiStageAbility();
          return;
        }

        const targetClosest = getClosestEmptySurroundingHexes(hexId, activeTurnUnitHex, unitsOnBoard);
        if (targetClosest.length > 1) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [hexId],
            metadata: { tiebreakEmptyHexes: targetClosest, targetUnitHex: hexId, movingCaster: true }
          });
          showNotification(`Grappling Hook (Stage 2): Target cannot be moved! Choose which tile surrounding target Corsair Saboteur moves onto.`);
          return;
        }
        if (targetClosest.length === 1) {
          const casterDest = targetClosest[0];
          setUnitsOnBoard((prev) => {
            const next = { ...prev };
            delete next[activeTurnUnitHex];
            next[casterDest] = { ...activeTurnUnit, hexId: casterDest };
            return next;
          });
          setActiveTurnUnitHex(casterDest);
          setSelectedHex(casterDest);
          applyAttackDamageToHex(hexId, 5, ability);
          finishMultiStageAbility(casterDest);
          return;
        }

        applyAttackDamageToHex(hexId, 5, ability);
        finishMultiStageAbility();
        return;
      }

      if (stage === 2) {
        const destHex = hexId;
        const targetHex = metadata?.targetUnitHex!;
        const targetUnit = unitsOnBoard[targetHex];

        if (metadata?.movingCaster) {
          setUnitsOnBoard((prev) => {
            const next = { ...prev };
            delete next[activeTurnUnitHex];
            next[destHex] = { ...activeTurnUnit, hexId: destHex };
            return next;
          });
          setActiveTurnUnitHex(destHex);
          setSelectedHex(destHex);
          applyAttackDamageToHex(targetHex, 5, ability);
          finishMultiStageAbility(destHex);
        } else if (targetUnit) {
          setUnitsOnBoard((prev) => {
            const next = { ...prev };
            delete next[targetHex];
            next[destHex] = { ...targetUnit, hexId: destHex };
            return next;
          });
          applyAttackDamageToHex(destHex, 5, ability);
          finishMultiStageAbility();
        }
        return;
      }
    }

    // 5. Spirit Away (Tempest Roc)
    if (abilityId === 'spirit_away') {
      if (stage === 1) {
        const clickedUnit = unitsOnBoard[hexId];
        if (clickedUnit && hexId !== activeTurnUnitHex) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [hexId],
            metadata: { carriedUnitHex: hexId }
          });
          showNotification(`Spirit Away (Stage 2): Carried ${clickedUnit.card.name}. Now click an empty tile in range 1-3 to fly to.`);
          return;
        }
        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[activeTurnUnitHex];
          next[hexId] = { ...activeTurnUnit, hexId };
          return next;
        });
        setActiveTurnUnitHex(hexId);
        setSelectedHex(hexId);
        showNotification(`Tempest Roc flew to ${hexId} via Spirit Away!`);
        finishMultiStageAbility(hexId);
        return;
      }

      if (stage === 2) {
        const destHex = hexId;
        const carriedHex = metadata?.carriedUnitHex!;
        const carriedUnit = unitsOnBoard[carriedHex];

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[activeTurnUnitHex];
          next[destHex] = { ...activeTurnUnit, hexId: destHex };
          return next;
        });
        setActiveTurnUnitHex(destHex);
        setSelectedHex(destHex);

        const surrEmpty = getSurroundingHexes(destHex).filter((h) => !unitsOnBoard[h] && h !== carriedHex);
        if (surrEmpty.length > 0 && carriedUnit) {
          setMultiStageState({
            ...multiStageState,
            stage: 3,
            targets: [carriedHex, destHex],
            metadata: { carriedUnitHex: carriedHex }
          });
          showNotification(`Spirit Away (Stage 3): Flew to ${destHex}. Now click an empty tile surrounding Tempest Roc to place ${carriedUnit.card.name}.`);
          return;
        }
        finishMultiStageAbility(destHex);
        return;
      }

      if (stage === 3) {
        const placeHex = hexId;
        const carriedHex = metadata?.carriedUnitHex!;
        const carriedUnit = unitsOnBoard[carriedHex];
        const destHex = targets[1];
        if (carriedUnit) {
          setUnitsOnBoard((prev) => {
            const next = { ...prev };
            delete next[carriedHex];
            next[placeHex] = { ...carriedUnit, hexId: placeHex };
            return next;
          });
        }
        showNotification(`Tempest Roc completed Spirit Away! Flew to ${destHex} and placed ${carriedUnit?.card.name || 'unit'} on ${placeHex}!`);
        finishMultiStageAbility(destHex);
        return;
      }
    }

    // 8. Umbral Flail (Shadowguard)
    if (abilityId === 'umbral_flail') {
      if (stage === 1) {
        applyAttackDamageToHex(hexId, 6, ability);
        const tgtUnit = unitsOnBoard[hexId];
        const behindHex = tgtUnit ? getTileBehindFor(hexId, activePlayer) : getHexBehind(activeTurnUnitHex, hexId);
        if (behindHex && !unitsOnBoard[behindHex]) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [hexId],
            metadata: { flailTileBehind: behindHex }
          });
          showNotification(`Umbral Flail dealt 6 damage! You may click tile ${behindHex} behind target to move Shadowguard there, or click 'Stay Here'.`);
          return;
        }
        finishMultiStageAbility();
        return;
      }
      if (stage === 2) {
        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[activeTurnUnitHex];
          next[hexId] = { ...activeTurnUnit, hexId };
          return next;
        });
        setActiveTurnUnitHex(hexId);
        setSelectedHex(hexId);
        showNotification(`Shadowguard moved to ${hexId} behind the target via Umbral Flail!`);
        finishMultiStageAbility(hexId);
        return;
      }
    }

    // 9. Boarding Hook (Dreadnought Privateer)
    if (abilityId === 'boarding_hook') {
      if (stage === 1) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit) return;
        // A unit immune to non-damage effects (Machine Heart) is neither pulled nor has armour removed; the 6 damage still lands
        const hookBlocked = targetUnit.instanceId !== activeTurnUnit.instanceId && isImmuneToNonDamageEffects(targetUnit);
        const closestEmpty = hookBlocked ? [] : getClosestEmptySurroundingHexes(activeTurnUnitHex, hexId, unitsOnBoard);

        if (closestEmpty.length > 1) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [hexId],
            metadata: { tiebreakEmptyHexes: closestEmpty, targetUnitHex: hexId }
          });
          showNotification(`Boarding Hook (Stage 2): Multiple closest empty tiles available. Choose which tile to pull ${targetUnit.card.name} onto.`);
          return;
        }

        const destHex = closestEmpty[0] || hexId;
        const res = applyAttackDamageToHex(destHex, 6, ability, {
          customArmourReduction: hookBlocked ? 0 : 2,
          targetUnitOverride: { ...targetUnit, hexId: destHex },
          previousHex: hexId
        });
        const rmNote = res.armourRemoved > 0 ? `Removed ${res.armourRemoved} armour. ` : '';
        const movedNote = destHex !== hexId ? `pulled ${targetUnit.card.name} to ${destHex} and ` : '';
        showNotification(
          `Boarding Hook ${movedNote}dealt ${res.damageDealt} damage! ${rmNote}${
            res.isDefeated ? `${targetUnit.card.name} defeated!` : `(💥${res.newDamageCounters}/${targetUnit.card.hp} counters placed)`
          }`
        );
        finishMultiStageAbility();
        return;
      }

      if (stage === 2) {
        const destHex = hexId;
        const targetHex = metadata?.targetUnitHex!;
        const targetUnit = unitsOnBoard[targetHex];
        if (targetUnit) {
          const res = applyAttackDamageToHex(destHex, 6, ability, {
            customArmourReduction: 2,
            targetUnitOverride: { ...targetUnit, hexId: destHex },
            previousHex: targetHex
          });
          const rmNote = res.armourRemoved > 0 ? `Removed ${res.armourRemoved} armour. ` : '';
          showNotification(
            `Boarding Hook pulled ${targetUnit.card.name} to chosen tile ${destHex} and dealt ${res.damageDealt} damage! ${rmNote}${
              res.isDefeated ? `${targetUnit.card.name} defeated!` : `(💥${res.newDamageCounters}/${targetUnit.card.hp} counters placed)`
            }`
          );
        }
        finishMultiStageAbility();
        return;
      }
    }

    // 10. Buddy Tag (Sparring Partners)
    if (abilityId === 'buddy_tag') {
      const targetUnit = unitsOnBoard[hexId];
      if (!targetUnit) return;
      const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
      const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);

      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        next[activeTurnUnitHex] = { ...targetUnit, hexId: activeTurnUnitHex };
        next[hexId] = { ...activeTurnUnit, hexId, currentAp: newAp, usedTurnCounts: nextCounts };
        return next;
      });

      setActiveTurnUnitHex(hexId);
      setSelectedHex(hexId);
      playCardDrawSound();
      showNotification(`Sparring Partners switched positions with ${targetUnit.card.name} via Buddy Tag! (${cost} AP spent).`);
      setActiveAbility(null);
      setMultiStageState(null);
      if (cost > 0 && newAp <= 0) switchTurn(false);
      return;
    }

    // 11. Coin Plink (The Cyclotron)
    if (abilityId === 'coin_plink') {
      // Its damage and hits come from its data (1 damage, 3 hits)
      const plinkEff: any = ability.effects?.find((e: any) => e.type === 'damage');
      const res = applyAttackDamageToHex(hexId, plinkEff?.amount ?? 1, ability, { hits: plinkEff?.hits ?? 1 });
      if (res.isDefeated) {
        const chain = (metadata?.killCount || 0) + 1;
        const remainingEnemies = getHexesInRange(activeTurnUnitHex, 1, 4).filter(
          (h) => unitsOnBoard[h] && unitsOnBoard[h].owner !== activePlayer && h !== hexId
        );
        if (remainingEnemies.length > 0) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [...targets, hexId],
            metadata: { killCount: chain }
          });
          showNotification(`Coin Plink killed target (Chain ${chain})! Target another enemy in range 1-4 for free (0 AP), or finish.`);
          return;
        }
      }
      finishMultiStageAbility();
      return;
    }

    // 12. Jab and Backstep (Crossbow Fighter)
    if (abilityId === 'jab_and_backstep') {
      if (stage === 1) {
        const res = applyAttackDamageToHex(hexId, 5, ability);
        playCardDrawSound();

        const currentHex = activeTurnUnitHex;
        const surrEmpty = getSurroundingHexes(currentHex).filter((h) => {
          if (res.isDefeated && h === hexId) return true;
          return !unitsOnBoard[h];
        });

        if (surrEmpty.length > 0) {
          setMultiStageState({
            ...multiStageState,
            stage: 2,
            targets: [hexId],
            metadata: { tiebreakEmptyHexes: surrEmpty }
          });
          showNotification(
            `Jab and Backstep dealt ${res.damageDealt} damage! Click an empty surrounding tile to move 1 tile for free, or click 'Stay Here'.`
          );
          return;
        }

        finishMultiStageAbility();
        showNotification(`Jab and Backstep dealt ${res.damageDealt} damage! (No empty surrounding tiles to backstep into).`);
        return;
      }

      if (stage === 2) {
        const fromHex = activeTurnUnitHex;
        const toHex = hexId;

        const passives = getUnitPassives(activeTurnUnit);
        const wasScorched = isTileScorched(toHex, unitsOnBoard, scorchedTiles);
        const isImmuneToScorch = isImmuneToScorchDamage(activeTurnUnit);

        let scorchDmg = (!isImmuneToScorch && wasScorched) ? 4 : 0;
        let finalArmour = activeTurnUnit.armour;
        let finalDamageCounters = activeTurnUnit.damageCounters;

        if (scorchDmg > 0) {
          if (finalArmour >= scorchDmg) {
            finalArmour -= scorchDmg;
          } else {
            finalDamageCounters += (scorchDmg - finalArmour);
            finalArmour = 0;
          }
        }
        const isDefeated = scorchDmg > 0 && finalDamageCounters >= activeTurnUnit.card.hp;

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[fromHex];
          if (isDefeated) {
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
            }
          } else {
            next[toHex] = {
              ...activeTurnUnit,
              hexId: toHex,
              armour: finalArmour,
              damageCounters: finalDamageCounters
            };
          }
          checkVictory(next);
          return next;
        });

        if (isDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          setActiveAbility(null);
          setMultiStageState(null);
          showNotification(`${activeTurnUnit.card.name} moved onto a scorched tile, took 4 damage, and was defeated!`);
          switchTurn(false);
          return;
        }

        setActiveTurnUnitHex(toHex);
        setSelectedHex(toHex);
        playCardDrawSound();
        showNotification(`${activeTurnUnit.card.name} moved 1 tile to ${toHex} for free via Jab and Backstep!`);
        finishMultiStageAbility(toHex);
        return;
      }
    }

    // 13. Deft Swipe (Cutthroat Assassin)
    if (abilityId === 'deft_swipe') {
      if (stage === 1) {
        const targetUnit = unitsOnBoard[hexId];
        const wasFromBehind = isAttackFromBehind(activeTurnUnitHex, hexId, targetUnit?.owner, ability);
        const res = applyAttackDamageToHex(hexId, 6, ability);
        playCardDrawSound();

        if (wasFromBehind) {
          const currentHex = activeTurnUnitHex;
          const surrEmpty = getSurroundingHexes(currentHex).filter((h) => {
            if (res.isDefeated && h === hexId) return true;
            return !unitsOnBoard[h];
          });

          if (surrEmpty.length > 0) {
            setMultiStageState({
              ...multiStageState,
              stage: 2,
              targets: [hexId],
              metadata: { tiebreakEmptyHexes: surrEmpty }
            });
            showNotification(
              `Deft Swipe dealt ${res.damageDealt} damage from behind! Click an empty surrounding tile to move 1 tile for free, or click 'Stay Here'.`
            );
            return;
          }
        }

        finishMultiStageAbility();
        showNotification(
          `Deft Swipe dealt ${res.damageDealt} damage!${
            wasFromBehind ? ' (From behind, but no empty surrounding tiles to move into).' : ''
          }`
        );
        return;
      }

      if (stage === 2) {
        const fromHex = activeTurnUnitHex;
        const toHex = hexId;

        const passives = getUnitPassives(activeTurnUnit);
        const wasScorched = isTileScorched(toHex, unitsOnBoard, scorchedTiles);
        const isImmuneToScorch = isImmuneToScorchDamage(activeTurnUnit);

        let scorchDmg = (!isImmuneToScorch && wasScorched) ? 4 : 0;
        let finalArmour = activeTurnUnit.armour;
        let finalDamageCounters = activeTurnUnit.damageCounters;

        if (scorchDmg > 0) {
          if (finalArmour >= scorchDmg) {
            finalArmour -= scorchDmg;
          } else {
            finalDamageCounters += (scorchDmg - finalArmour);
            finalArmour = 0;
          }
        }
        const isDefeated = scorchDmg > 0 && finalDamageCounters >= activeTurnUnit.card.hp;

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[fromHex];
          if (isDefeated) {
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
            }
          } else {
            next[toHex] = {
              ...activeTurnUnit,
              hexId: toHex,
              armour: finalArmour,
              damageCounters: finalDamageCounters
            };
          }
          checkVictory(next);
          return next;
        });

        if (isDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          setActiveAbility(null);
          setMultiStageState(null);
          showNotification(`${activeTurnUnit.card.name} moved onto a scorched tile, took 4 damage, and was defeated!`);
          switchTurn(false);
          return;
        }

        setActiveTurnUnitHex(toHex);
        setSelectedHex(toHex);
        playCardDrawSound();
        showNotification(`${activeTurnUnit.card.name} moved 1 tile to ${toHex} for free via Deft Swipe!`);
        finishMultiStageAbility(toHex);
        return;
      }
    }

    // 14. Lead the Charge (Halberd Fighter)
    if (abilityId === 'lead_the_charge') {
      if (stage === 1) {
        if (targets.length > 0 && targets[targets.length - 1] === hexId) {
          setMultiStageState({
            ...multiStageState,
            targets: targets.slice(0, -1)
          });
          return;
        }

        if (targets.length === 0) {
          const dist = getHexDistance(activeTurnUnitHex, hexId);
          if (dist === 2 && !unitsOnBoard[hexId]) {
            const inters = getIntermediateHexes(activeTurnUnitHex, hexId);
            const enemyInter = inters.find((h) => unitsOnBoard[h] && unitsOnBoard[h].owner !== activePlayer);
            const bestInter = enemyInter || inters[0];
            if (bestInter) {
              setMultiStageState({
                ...multiStageState,
                targets: [bestInter, hexId]
              });
              return;
            }
          }
          setMultiStageState({
            ...multiStageState,
            targets: [hexId]
          });
          return;
        }

        if (targets.length === 1) {
          setMultiStageState({
            ...multiStageState,
            targets: [...targets, hexId]
          });
          return;
        }
        return;
      }

      if (stage === 2) {
        const res = applyAttackDamageToHex(hexId, 5, ability);
        playCardDrawSound();
        showNotification(`Lead the Charge dealt ${res.damageDealt} damage to ${unitsOnBoard[hexId]?.card.name || 'enemy'}!`);
        finishMultiStageAbility(activeTurnUnitHex);
        return;
      }
    }

  };

  // Handle clicking hexes on the board
  const handleHexClick = (hexId: string) => {
    if (attackKnockbackPrompt) {
      showNotification(`Choose whether ${attackKnockbackPrompt.abilityName} applies knockback first.`);
      return;
    }
    // Waiting on the defending player's knockback immunity choice (the replayed attack click passes through)
    if (knockbackChoicePending && !knockbackDecisionRef.current) {
      showNotification(`Waiting for ${knockbackChoicePending.defender === 'player1' ? 'Player 1' : 'Player 2'} to decide on ${knockbackChoicePending.passive.name}.`);
      return;
    }

    // Case 0.1: Momentum Charge pending
    if (pendingMomentumCharge) {
      if (hexId === pendingMomentumCharge.nextHex) {
        handleExecuteMomentumCharge(hexId);
        return;
      }
      if (hexId === pendingMomentumCharge.unitHex) {
        handleDeclineMomentumCharge();
        return;
      }
      showNotification(
        `⚡ Momentum Charge active: Click ${pendingMomentumCharge.nextHex} to surge for free, or click 'Stay Here'.`
      );
      return;
    }

    // Case 0.15: Move-through passive's extra move pending (Rabble Rouse)
    if (pendingRabbleMove) {
      if (pendingRabbleMove.choices.includes(hexId)) {
        handleExecuteRabbleMove(hexId);
        return;
      }
      if (!pendingRabbleMove.mustMove && hexId === pendingRabbleMove.unitHex) {
        handleDeclineRabbleMove('skip');
        return;
      }
      showNotification(
        pendingRabbleMove.mustMove
          ? `${pendingRabbleMove.passiveName}: choose a highlighted empty tile around ${pendingRabbleMove.throughHex} to land on.`
          : `${pendingRabbleMove.passiveName}: click a highlighted tile to move again, or click Skip.`
      );
      return;
    }

    // Case 0.2: Pending Assist Deployment tile selection
    if (pendingAssistDeployment) {
      const isP1 = activePlayer === 'player1';
      const backRowHexes = isP1
        ? ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1']
        : ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6'];
      const validTiles = backRowHexes.filter((h) => !unitsOnBoard[h] && !sealedReinforceHexes.has(h));

      if (!validTiles.includes(hexId)) {
        showNotification(
          `Assist: Click an unoccupied tile on your back row (${isP1 ? 'Row 1' : 'Row 6'}) to place ${pendingAssistDeployment.card.name}, or click Cancel Assist.`
        );
        return;
      }

      handleDeployAssistToHex(hexId);
      return;
    }

    // Case 0.3: Ability-granted Reinforce pending (e.g. Foretell) but its card is no longer selected
    if (abilityReinforcePending && selectedHandIndex === null) {
      showNotification(`${abilityReinforcePending.sourceTitle}: Reinforce ${abilityReinforcePending.card.name} or click Skip first.`);
      return;
    }

    const isP1 = activePlayer === 'player1';
    const isBackRow = isP1 ? hexId.endsWith('1') : hexId.endsWith('6');

    // In the middle of something else (targeting an ability, a multi-step choice, moving): a click is for that,
    // never a reinforce, even on an empty back-row tile
    const isMidAction = Boolean(activeAbility || multiStageState || isMovingMode || pendingFreeMove);

    // Case 1: Deploying card from hand (an ability-granted reinforce, e.g. Foretell, still places its card)
    if (selectedHandIndex !== null && activeHand[selectedHandIndex] && (abilityReinforcePending || !isMidAction)) {
      if (activeTurnUnitHex && !abilityReinforcePending) {
        showNotification("Cannot reinforce while a unit is taking a turn. Finish or pass turn first.");
        setSelectedHandIndex(null);
        return;
      }
      handleDeployCardToHex(hexId, selectedHandIndex);
      return;
    }

    // Direct click on unoccupied back row tile: auto-select first basic card or prompt. Only when you could reinforce
    // right now (no unit taking a turn, nothing in progress); otherwise the click goes on to whatever you're doing.
    if (isBackRow && !unitsOnBoard[hexId] && !activeTurnUnitHex && !isMidAction) {
      if (sealedReinforceHexes.has(hexId)) {
        showNotification(`${hexId} is sealed by an enemy Sealed Gate (range 1): you can't reinforce onto it.`);
        setSelectedHex(hexId);
        return;
      }
      const basicIdx = activeHand.findIndex(
        (c) => c.basic || c.reinforce?.mode === 'basic' || !c.reinforce
      );
      if (basicIdx !== -1) {
        setSelectedHandIndex(basicIdx);
        setSelectedHex(hexId);
        showNotification(`Selected ${hexId} and ${activeHand[basicIdx].name}. Click again to reinforce!`, {
          privateTo: activePlayer,
          publicText: `Selected ${hexId} to reinforce.`
        });
      } else {
        setSelectedHex(hexId);
        showNotification(`Tile ${hexId} is ready, but you have no Basic units in hand.`);
      }
      return;
    }

    // In Setup Phase: Unit actions/passives are inactive per Rule 5.3
    if (gamePhase === 'setup') {
      const unitOnHex = unitsOnBoard[hexId];
      if (unitOnHex) {
        showNotification("Unit abilities and movement are inactive during the pregame setup phase (Rule 5.3). Both players must choose 'Start' to begin gameplay.");
      }
      setSelectedHex((prev) => (prev === hexId ? null : hexId));
      return;
    }


    // Case 2: Moving active unit via menu select then click on tile
    if (isMovingMode && activeTurnUnitHex && activeTurnUnit && validMoveHexes.includes(hexId)) {
      handleUnitMove(activeTurnUnitHex, hexId);
      setIsMovingMode(false);
      return;
    }

    // Case 3: Executing Ability on target (Unit or Tile)
    // Using abilities on a target in range places damage counters, creates tokens, moves units, and spends AP
    const isTargetLegal = isStraightLineAbility(activeAbility)
      ? validAttackHexes.includes(hexId)
      : (validAttackHexes.includes(hexId) || (abilityRangeHexes.includes(hexId) && isAbilityTargetingAnyTile(activeAbility)));

    if (activeAbility && !isTargetLegal) {
      if (multiStageTargetInfo) {
        showNotification(multiStageTargetInfo.promptMessage);
        return;
      }
      if (activeAbility.id === 'reckless_leap') {
        showNotification("You must click a highlighted empty tile within 2 tiles in a straight line for Reckless Leap.");
      } else if (isStraightLineAbility(activeAbility)) {
        showNotification(`${activeAbility.name} can only target the first enemy unit in an unobstructed straight line.`);
      } else if (isAbilityTargetingEmptyTile(activeAbility)) {
        showNotification(`You must click a highlighted empty tile in range of ${activeAbility.name}.`);
      } else if (activeAbility.target === 'obstructingWall') {
        showNotification("You must click an adjacent Obstructing Wall token.");
      } else {
        showNotification("Target is out of range for this ability.");
      }
      return;
    }

    if (
      activeAbility &&
      activeTurnUnitHex &&
      activeTurnUnit &&
      isTargetLegal
    ) {
      if (isPromotedAbilityProvider(activeAbility) && !activeAbility.id.includes('__') && !activeAbility.id.startsWith('anchor_smash')) {
        showNotification(
          `Please select a qualifying ability from among the promoted cards in the action menu to use with ${activeAbility.name} first!`
        );
        return;
      }

      const cost = getAbilityApCost(activeAbility);
      if (activeTurnUnit.currentAp < cost) {
        showNotification(`Not enough AP to use ${activeAbility.name} (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`);
        return;
      }

      // An enemy's readied ability (e.g. Ready Spell) may interrupt this use before it takes effect. A multi-step
      // ability is used on its first step.
      const isCommitStep =
        !multiStageState || (multiStageState.targets.length === 0 && !multiStageState.metadata?.splitHitCandidates);
      if (
        isCommitStep &&
        offerReadySpellInterrupt({ kind: 'hex', hexId, abilityId: activeAbility.id, targetInstanceId: unitsOnBoard[hexId]?.instanceId })
      ) {
        return;
      }

      // Subcase 3.0: Multi-stage abilities
      if (multiStageState) {
        handleMultiStageStep(hexId);
        return;
      }

      // Subcase 3.01: Healing a friendly target (e.g. Soothing Sap, or Tree's Bounty used on a friendly unit)
      const friendlyHealEff: any = activeAbility.effects?.find((e: any) => e.type === 'heal' && e.target === 'friendlyTarget');
      const clickedUnit = unitsOnBoard[hexId];
      if (friendlyHealEff && clickedUnit && clickedUnit.owner === activePlayer) {
        if (clickedUnit.instanceId !== activeTurnUnit.instanceId && isImmuneToNonDamageEffects(clickedUnit)) {
          showNotification(`${clickedUnit.card.name} is immune to non-damage effects right now, so it can't be healed.`);
          return;
        }
        const healAmount = typeof friendlyHealEff.amount === 'number' ? friendlyHealEff.amount : 0;
        const healed = Math.min(healAmount, clickedUnit.damageCounters);
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, activeAbility);
        const casterHex = activeTurnUnitHex;
        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          if (next[hexId]) next[hexId] = { ...next[hexId], damageCounters: Math.max(0, next[hexId].damageCounters - healAmount) };
          if (next[casterHex]) next[casterHex] = { ...next[casterHex], currentAp: newAp, usedTurnCounts: nextCounts };
          return next;
        });
        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `💚 ${activeTurnUnit.card.name} used ${activeAbility.name} on ${clickedUnit.card.name}: healed ${healed} damage. (${cost} AP spent, ${newAp} AP remaining).`
        );
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }

      // Subcase 3.02: "Move 1 tile. Then, if there is an enemy unit in the direction moved, deal N to it" (e.g. Leap Strike)
      if (
        !clickedUnit &&
        activeAbility.effects?.some((e: any) => e.type === 'damage' && e.target === 'enemyInDirectionMoved')
      ) {
        startMoveThenStrike(activeAbility, [hexId], 'direction');
        return;
      }
      // ...or "Move 1 tile. Then, deal N damage to a surrounding enemy unit" (e.g. Storm Surge, Pouncing Arc)
      if (
        !clickedUnit &&
        activeAbility.effects?.some((e: any) => e.type === 'move' && e.target === 'self' && e.tile === 'target') &&
        activeAbility.effects?.some((e: any) => e.type === 'damage' && e.target === 'chosenEnemyInMeleeRange')
      ) {
        startMoveThenStrike(activeAbility, [hexId], 'choose');
        return;
      }

      // "Apply knockback N" with no damage (e.g. Gust of Wind): pushes the target straight away from this unit, at any
      // range the ability reaches
      const pushOnlyEff: any =
        !activeAbility.effects?.some((e: any) => e.type === 'damage') &&
        activeAbility.effects?.find((e: any) => e.type === 'knockback' && e.direction !== 'chosen');
      if (pushOnlyEff && clickedUnit) {
        const tiles = typeof pushOnlyEff.distance === 'number' ? pushOnlyEff.distance : 1;
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, activeAbility);
        const casterHex = activeTurnUnitHex;
        const caster = activeTurnUnit;
        const immune = isImmuneToKnockback(clickedUnit) || (clickedUnit.owner !== caster.owner && isImmuneToNonDamageEffects(clickedUnit));
        setUnitsOnBoard((prev) => {
          let next = { ...prev };
          if (next[casterHex]) next[casterHex] = { ...next[casterHex], currentAp: newAp, usedTurnCounts: nextCounts };
          if (immune || !next[hexId]) return next;
          const dest = getKnockbackDestination(casterHex, hexId, tiles, next);
          if (dest.tilesMoved > 0 && dest.finalHex !== hexId) {
            const u = next[hexId];
            delete next[hexId];
            next[dest.finalHex] = { ...u, hexId: dest.finalHex };
          }
          return applyKnockbackRiders(next, next[casterHex] || caster, clickedUnit.instanceId);
        });
        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${caster.card.name} used ${activeAbility.name} on ${clickedUnit.card.name}${immune ? `, but it can't be knocked back` : `: knockback ${tiles}`}. (${cost} AP spent, ${newAp} AP remaining).`
        );
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }

      // "Place this unit on the tile behind the target" (e.g. Shadow Emergence)
      if (isPlaceBehindTargetAbility(activeAbility) && clickedUnit) {
        const behind = clickedUnit.owner === activePlayer ? null : getTileBehindFor(hexId, activePlayer);
        if (!behind || unitsOnBoard[behind]) {
          showNotification(`${activeAbility.name}: the tile behind ${clickedUnit.card.name} must be empty.`);
          return;
        }
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, activeAbility);
        const casterHex = activeTurnUnitHex;
        setUnitsOnBoard((prev) => {
          const u = prev[casterHex];
          if (!u) return prev;
          const next = { ...prev };
          delete next[casterHex];
          next[behind] = { ...u, hexId: behind, currentAp: newAp, usedTurnCounts: nextCounts };
          return next;
        });
        setActiveTurnUnitHex(behind);
        setSelectedHex(behind);
        playCardDrawSound();
        setActiveAbility(null);
        showNotification(`${activeTurnUnit.card.name} used ${activeAbility.name}: placed behind ${clickedUnit.card.name} on ${behind}. (${cost} AP spent, ${newAp} AP remaining).`);
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }

      // "Place this unit on the target tile. If you place it directly behind an enemy, deal N damage to that enemy"
      // (e.g. Thunderstep): the enemy whose tile behind it (from its opponent's perspective) is where this unit lands
      const behindStrike: any = activeAbility.effects?.find((e: any) => e.type === 'damage' && e.target === 'enemyThisUnitIsBehind');
      if (
        behindStrike &&
        !clickedUnit &&
        activeAbility.effects?.some((e: any) => e.type === 'place' && e.target === 'self' && e.tile === 'target')
      ) {
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, activeAbility);
        const casterHex = activeTurnUnitHex;
        const victimHex = getSurroundingHexes(hexId).find((h) => {
          const u = unitsOnBoard[h];
          return u && u.owner !== activePlayer && getTileBehindUnit(h, u.owner) === hexId;
        });
        setUnitsOnBoard((prev) => {
          const u = prev[casterHex];
          if (!u) return prev;
          const next = { ...prev };
          delete next[casterHex];
          next[hexId] = { ...u, hexId, currentAp: newAp, usedTurnCounts: nextCounts };
          return next;
        });
        setActiveTurnUnitHex(hexId);
        setSelectedHex(hexId);
        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} used ${activeAbility.name}: placed on ${hexId}${victimHex ? `, behind ${unitsOnBoard[victimHex].card.name}` : ''}. (${cost} AP spent, ${newAp} AP remaining).`
        );
        if (victimHex && typeof behindStrike.amount === 'number') {
          const strikeAbility = activeAbility;
          const victimId = unitsOnBoard[victimHex].instanceId;
          setUnitsOnBoard((prev) => {
            const h = Object.keys(prev).find((k) => prev[k].instanceId === victimId);
            return h ? resolvePassiveDamage(prev, [{ hex: h, amount: behindStrike.amount, source: strikeAbility.name }]) : prev;
          });
        }
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }

      // Subcase 3.05: Range modification abilities (e.g. Broaden Search)
      if (isModifyRangeAbility(activeAbility)) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit || targetUnit.owner !== activePlayer) {
          showNotification(`${activeAbility.name} must target a friendly unit.`);
          return;
        }
        if (targetUnit.instanceId !== activeTurnUnit.instanceId && isImmuneToNonDamageEffects(targetUnit)) {
          showNotification(`${targetUnit.card.name} is immune to non-damage effects right now, so ${activeAbility.name} can't affect it.`);
          return;
        }

        const rangeBonus = getModifyRangeAmount(activeAbility);
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, activeAbility);

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          next[hexId] = {
            ...targetUnit,
            bonusRangeThisTurn: (targetUnit.bonusRangeThisTurn || 0) + rangeBonus
          };
          const caster = next[activeTurnUnitHex];
          if (caster) {
            next[activeTurnUnitHex] = {
              ...caster,
              currentAp: newAp,
              usedTurnCounts: newCounts,
              ...(hexId === activeTurnUnitHex
                ? { bonusRangeThisTurn: (caster.bonusRangeThisTurn || 0) + rangeBonus }
                : {})
            };
          }
          return next;
        });

        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `🔭 ${activeTurnUnit.card.name} used ${activeAbility.name} on ${targetUnit.card.name} (+${rangeBonus} range to abilities this turn).`
        );

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }

      // Subcase 3.1: Token creation abilities, from their createToken effect (Stone Wall, Build Structure, Pitch Camp,
      // Mushroom Sprouting): the token comes from the card data's token list, and the effect's `if` limits how many of
      // yours may already be in play ('noFriendlyToken:X' = none, 'friendlyTokensAtMost:X:N' = N or fewer)
      const createTokenEff: any = activeAbility.effects?.find((e: any) => e.type === 'createToken');
      if (createTokenEff) {
        const tokenId: string = createTokenEff.token;
        const tokenDef = (cardsData.tokens || []).find((t) => t.id === tokenId);
        if (!tokenDef) {
          showNotification(`${activeAbility.name}: unknown token "${tokenId}".`);
          return;
        }
        const owned = Object.values(unitsOnBoard).filter((u) => u.owner === activePlayer && u.card.id === tokenId).length;
        const cond: string = typeof createTokenEff.if === 'string' ? createTokenEff.if : '';
        const atMost = cond.match(/^friendlyTokensAtMost:[^:]+:(\d+)$/);
        const maxAlreadyInPlay = cond.startsWith('noFriendlyToken:') ? 0 : atMost ? parseInt(atMost[1], 10) : Infinity;
        if (owned > maxAlreadyInPlay) {
          showNotification(
            maxAlreadyInPlay === 0
              ? `You already have a ${tokenDef.name} token in play! Only 1 can be in play at a time.`
              : `You already have ${owned} ${tokenDef.name} tokens in play (this needs ${maxAlreadyInPlay} or fewer).`
          );
          return;
        }

        if (unitsOnBoard[hexId]) {
          showNotification("Tokens must be placed on an empty tile.");
          return;
        }

        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, activeAbility);

        const tokenUnit: BattlefieldUnit = {
          instanceId: newInstanceId(`token_${tokenId}`),
          card: { ...tokenDef, type: 'token' },
          owner: activePlayer,
          hexId,
          damageCounters: 0,
          armour: 0,
          currentAp: 0,
          promotedCards: []
        };
        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          next[hexId] = tokenUnit;
          if (next[activeTurnUnitHex]) {
            next[activeTurnUnitHex] = {
              ...next[activeTurnUnitHex],
              currentAp: newAp,
              usedTurnCounts: newCounts
            };
          }
          return next;
        });

        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} created ${tokenUnit.card.name} on ${hexId}! (${cost === 0 ? 'Free' : `${cost} AP spent`}, ${newAp} AP remaining).`
        );

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }

      // Subcase 3.2: Reinforce Structure (targets Obstructing Wall token)
      if (activeAbility.id === 'reinforce_structure') {
        const wall = unitsOnBoard[hexId];
        if (!wall || (wall.card.id !== 'obstructing_wall' && wall.card.name !== 'Obstructing Wall')) {
          showNotification("Must target an Obstructing Wall token.");
          return;
        }
        const newArmour = Math.min(18, wall.armour + 6);
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, activeAbility);

        setUnitsOnBoard((prev) => ({
          ...prev,
          [hexId]: {
            ...wall,
            armour: newArmour
          },
          [activeTurnUnitHex]: {
            ...activeTurnUnit,
            currentAp: newAp,
            usedTurnCounts: newCounts
          }
        }));

        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} reinforced Obstructing Wall on ${hexId} (+6 armour, now ${newArmour} armour).`
        );

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }

      // Subcase 3.25: Reckless Leap
      // "Move this unit 2 tiles in the same direction for free. Then, this unit takes 3 damage."
      // "The effect of reckless leap should show a line of 2 tiles in each straight line direction, and clicking one should move the unit to that tile along the connecting ones before the 3 self damage is dealt."
      if (activeAbility.id === 'reckless_leap') {
        if (unitsOnBoard[hexId]) {
          showNotification("Reckless Leap must land on an empty tile.");
          return;
        }

        const allLines = getAllStraightLinesFromHex(activeTurnUnitHex);
        let connectingPath: string[] = [];
        for (const line of allLines) {
          const twoTiles = line.slice(0, 2);
          const idx = twoTiles.indexOf(hexId);
          if (idx !== -1) {
            connectingPath = twoTiles.slice(0, idx + 1);
            break;
          }
        }

        if (connectingPath.length === 0) {
          showNotification("Reckless Leap can only move up to 2 tiles in a straight line direction.");
          return;
        }

        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, activeAbility);

        const passives = getUnitPassives(activeTurnUnit);

        // Check moving through units (Break the Line: After moving through a unit, this unit gains 2 armour)
        let movedThroughUnit = false;
        if (connectingPath.length > 1) {
          for (let i = 0; i < connectingPath.length - 1; i++) {
            const midHex = connectingPath[i];
            if (unitsOnBoard[midHex]) {
              movedThroughUnit = true;
            }
          }
        }
        const hasBreakTheLine = passives.some((p) => p.id === 'break_the_line' || p.name === 'Break the Line');
        const bonusArmour = movedThroughUnit && hasBreakTheLine ? 2 : 0;

        // Check scorched tile damage along the connecting path:
        // "units moving onto or off of a scorched tile take 4 damage"
        const isImmuneToScorch =
          isImmuneToScorchDamage(activeTurnUnit);

        let scorchDamage = 0;
        if (!isImmuneToScorch) {
          let prevHex = activeTurnUnitHex;
          for (const stepHex of connectingPath) {
            const fromScorched = isTileScorched(prevHex, unitsOnBoard, scorchedTiles);
            const toScorched = isTileScorched(stepHex, unitsOnBoard, scorchedTiles);
            if (fromScorched || toScorched) {
              scorchDamage += reduceNonAttackDamage(activeTurnUnit, 4);
            }
            prevHex = stepHex;
          }
        }

        // Apply scorch damage while moving along connecting tiles
        let currentArmour = activeTurnUnit.armour + bonusArmour;
        let currentCounters = activeTurnUnit.damageCounters;
        if (scorchDamage > 0) {
          let rem = scorchDamage;
          if (currentArmour > 0) {
            const abs = Math.min(currentArmour, rem);
            currentArmour -= abs;
            rem -= abs;
          }
          currentCounters += rem;
        }

        const defeatedByScorch = currentCounters >= activeTurnUnit.card.hp;

        // Move unit to destination tile FIRST ("move the unit to that tile along the connecting ones before the 3 self damage is dealt")
        const selfDmg = 3;
        let finalArmour = currentArmour;
        let finalCounters = currentCounters;
        let defeatedBySelfDmg = false;

        if (!defeatedByScorch) {
          // Unit reached target tile, now 3 self damage is dealt
          let remSelf = selfDmg;
          if (finalArmour > 0) {
            const abs = Math.min(finalArmour, remSelf);
            finalArmour -= abs;
            remSelf -= abs;
          }
          finalCounters += remSelf;
          defeatedBySelfDmg = finalCounters >= activeTurnUnit.card.hp;
        }

        const isDefeated = defeatedByScorch || defeatedBySelfDmg;

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[activeTurnUnitHex];
          if (isDefeated) {
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
              }
            }
          } else {
            const moveDir = getHexMovementDirection(activeTurnUnitHex, hexId);
            const nextMovedDirections =
              moveDir !== null
                ? [...(activeTurnUnit.movedDirectionsThisTurn || []), moveDir]
                : activeTurnUnit.movedDirectionsThisTurn || [];
            next[hexId] = {
              ...activeTurnUnit,
              hexId,
              armour: finalArmour,
              damageCounters: finalCounters,
              tookDamageThisTurn: true,
              currentAp: newAp,
              usedTurnCounts: newCounts,
              movedThisTurn: true,
              movedDirectionsThisTurn: nextMovedDirections,
              movesThisTurn: (activeTurnUnit.movesThisTurn || 0) + 1
            };
          }
          let finalMoveNext = next;
          const damageEvents: DamageEvent[] = [];
          if (scorchDamage > 0) {
            damageEvents.push({ hexId, damagedUnitOwner: activeTurnUnit.owner, damageAmount: scorchDamage });
          }
          if (!defeatedByScorch && selfDmg > 0) {
            damageEvents.push({ hexId, damagedUnitOwner: activeTurnUnit.owner, damageAmount: selfDmg, nonAttack: true });
          }
          if (damageEvents.length > 0) {
            finalMoveNext = applyDamageEventsAndPassives(damageEvents, next);
          }
          checkVictory(finalMoveNext);
          return finalMoveNext;
        });

        playCardDrawSound();
        setActiveAbility(null);

        if (defeatedByScorch) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          showNotification(
            `${activeTurnUnit.card.name} leaped along connecting tiles to ${hexId} via Reckless Leap, but was defeated by scorched tiles (took ${scorchDamage} damage)!`
          );
          switchTurn(false);
          return;
        }
        if (!defeatedBySelfDmg) scorchTileLeftByMove(activeTurnUnit, activeTurnUnitHex, (activeTurnUnit.movesThisTurn || 0) + 1);

        const pathDesc = connectingPath.length > 1
          ? `along connecting tile ${connectingPath[0]} to ${hexId}`
          : `to ${hexId}`;
        const scorchNote = scorchDamage > 0 ? ` (took ${scorchDamage} scorched tile damage)` : '';
        const enrageNote = activeTurnUnit.card.id === 'savage_grizzly' ? ' (Enraged: +1 damage per hit on attacks!)' : '';
        const defeatedNote = isDefeated ? ' (Defeated!)' : '';

        showNotification(
          `🐾 ${activeTurnUnit.card.name} moved ${pathDesc} via Reckless Leap, then took ${selfDmg} self-damage!${scorchNote}${enrageNote}${defeatedNote} (${cost} AP spent).`
        );

        if (isDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          switchTurn(false);
          return;
        }

        setActiveTurnUnitHex(hexId);
        setSelectedHex(hexId);

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }

      // Subcase 3.3: Abilities that put this unit on an empty target tile (Shade Step, Vanish, Runic Vanish)
      if (isSelfPlacementAbility(activeAbility)) {
        if (unitsOnBoard[hexId]) {
          showNotification("Must target an empty tile.");
          return;
        }
        // A move (not a place) is stopped by "cannot move" and counts as this unit moving (e.g. Spectral Retreat)
        const isMoveNotPlace = Boolean(activeAbility.effects?.some((e: any) => e.type === 'move' && e.target === 'self' && e.tile === 'target'));
        if (isMoveNotPlace && isUnitMovementDisabled(activeTurnUnit)) {
          showNotification(getMoveBlockedMessage(activeTurnUnit));
          return;
        }
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, activeAbility);

        const selfDmg = getAbilitySelfDamage(activeAbility);
        let finalArmour = activeTurnUnit.armour;
        let finalCounters = activeTurnUnit.damageCounters;
        if (selfDmg > 0) {
          let rem = selfDmg;
          if (finalArmour > 0) {
            const abs = Math.min(finalArmour, rem);
            finalArmour -= abs;
            rem -= abs;
          }
          finalCounters += rem;
        }
        const isDefeated = finalCounters >= activeTurnUnit.card.hp;

        // Self armour that comes with the placement (e.g. Runic Vanish: "This unit gains 2 armour")
        const placeArmourEff: any = activeAbility.effects?.find((e: any) => e.type === 'armour' && e.target === 'self');
        if (placeArmourEff && !isDefeated) {
          finalArmour =
            typeof placeArmourEff.upTo === 'number'
              ? Math.max(finalArmour, placeArmourEff.upTo)
              : finalArmour + (typeof placeArmourEff.amount === 'number' ? placeArmourEff.amount : 0);
        }
        const gainsReactImmunity = Boolean(
          activeAbility.effects?.some((e: any) => e.type === 'cannotBeTargeted' && e.target === 'self' && String(e.by || '').toLowerCase().includes('react'))
        );
        const becomesUntargetable = Boolean(
          activeAbility.effects?.some((e: any) => e.type === 'cannotBeTargeted' && e.target === 'self' && !e.by)
        );
        const placementEndsTurn =
          Boolean(activeAbility.effects?.some((e: any) => e.type === 'endTurn')) ||
          (activeAbility.text || '').toLowerCase().includes("unit's turn ends");

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          delete next[activeTurnUnitHex];
          if (isDefeated) {
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
              }
            }
          } else {
            // Runic Vanish: immune to react effects; Vanish: can't be targeted at all (both until the opponent's next turn ends)
            next[hexId] = applySelfUntargetable(
              applySelfReactImmunity(
                {
                  ...activeTurnUnit,
                  hexId,
                  armour: finalArmour,
                  damageCounters: finalCounters,
                  tookDamageThisTurn: activeTurnUnit.tookDamageThisTurn || selfDmg > 0,
                  currentAp: newAp,
                  usedTurnCounts: newCounts,
                  ...(isMoveNotPlace
                    ? {
                        movedThisTurn: true,
                        movesThisTurn: (activeTurnUnit.movesThisTurn || 0) + 1,
                        tilesMovedThisTurn: (activeTurnUnit.tilesMovedThisTurn || 0) + getHexDistance(activeTurnUnitHex, hexId)
                      }
                    : {})
                },
                activeAbility
              ),
              activeAbility
            );
          }
          let finalMoveNext = isMoveNotPlace && !isDefeated ? applyMoveTriggers(next, activeTurnUnit.instanceId, [hexId], activeTurnUnitHex) : next;
          if (selfDmg > 0) {
            finalMoveNext = applyDamageEventsAndPassives(
              [{ hexId: activeTurnUnitHex, damagedUnitOwner: activeTurnUnit.owner, damageAmount: selfDmg, nonAttack: true }],
              next
            );
          }
          checkVictory(finalMoveNext);
          return finalMoveNext;
        });

        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} moved to ${hexId} via ${activeAbility.name}${selfDmg > 0 ? ` and took ${selfDmg} self-damage` : ''}${
            placeArmourEff && !isDefeated ? ` (armour now ${finalArmour})` : ''
          }${gainsReactImmunity && !isDefeated ? "; it can't be targeted by enemy react effects until the end of your opponent's next turn" : ''}${
            becomesUntargetable && !isDefeated ? "; it can't be targeted until the end of your opponent's next turn" : ''
          }${placementEndsTurn && !isDefeated ? '. Its turn ends' : ''}${isDefeated ? ' (Defeated!)' : ''} (${cost} AP spent).`
        );

        if (isDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          switchTurn(false);
          return;
        }

        setActiveTurnUnitHex(hexId);
        setSelectedHex(hexId);

        // "This unit's turn ends" (e.g. Vanish)
        if (placementEndsTurn || (cost > 0 && newAp <= 0)) {
          switchTurn(false);
        }
        return;
      }
      // Subcase 3.35: Area attacks (tile or unit targeted)
      if (isAreaAttack(activeAbility)) {
        executeAreaAbility(activeAbility, hexId);
        return;
      }
      // Subcase 3.36: Self-targeting damage ability (e.g. Profane Insight clicked directly on caster's hex)
      if (hexId === activeTurnUnitHex && getAbilitySelfDamage(activeAbility) > 0) {
        const selfDmg = getAbilitySelfDamage(activeAbility);
        let finalArmour = activeTurnUnit.armour;
        let finalCounters = activeTurnUnit.damageCounters;
        let rem = selfDmg;
        if (finalArmour > 0) {
          const abs = Math.min(finalArmour, rem);
          finalArmour -= abs;
          rem -= abs;
        }
        finalCounters += rem;
        const isDefeated = finalCounters >= activeTurnUnit.card.hp;

        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, activeAbility);

        let drewCard = false;
        const unitPassives = getUnitPassives(activeTurnUnit);
        const sanguine = unitPassives.find((p) => p.id === 'sanguine_offering' || p.name === 'Sanguine Offering');
        if (sanguine && canTriggerPassiveThisTurn(activeTurnUnit, sanguine)) {
          const pKey = sanguine.id || sanguine.name;
          newCounts[pKey] = (newCounts[pKey] || 0) + 1;
          newCounts['sanguine_offering'] = (newCounts['sanguine_offering'] || 0) + 1;
          drawCardForPlayer(activeTurnUnit.owner);
          healOnDraw(activeTurnUnit, 1);
          drewCard = true;
        }

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          if (isDefeated) {
            delete next[activeTurnUnitHex];
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
              }
            }
          } else {
            next[activeTurnUnitHex] = {
              ...activeTurnUnit,
              armour: finalArmour,
              damageCounters: finalCounters,
              tookDamageThisTurn: true,
              currentAp: newAp,
              usedTurnCounts: newCounts
            };
          }
          let finalSelfNext = next;
          if (selfDmg > 0) {
            finalSelfNext = applyDamageEventsAndPassives(
              [{ hexId: activeTurnUnitHex, damagedUnitOwner: activeTurnUnit.owner, damageAmount: selfDmg, nonAttack: true }],
              next
            );
          }
          checkVictory(finalSelfNext);
          return finalSelfNext;
        });

        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} used ${activeAbility.name} and dealt ${selfDmg} damage to itself!${drewCard ? ' Sanguine Offering triggered (drew 1 card)!' : ''}${isDefeated ? ' (Defeated!)' : ''} (${cost === 0 ? 'Free' : `${cost} AP spent`}).`
        );

        if (isDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          switchTurn(false);
          return;
        }

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }
      // Non-attack abilities that only put a "next turn" status on the target unit (e.g. Terrifying Roar)
      const isTargetStatusAbility =
        !activeAbility.effects?.some((e: any) => e.type === 'damage') &&
        Boolean(
          activeAbility.effects?.some(
            (e: any) =>
              (e.type === 'increaseActionCost' && e.target === 'target') ||
              // e.g. Tornado Sphere: "Your opponent cannot choose the target to take their next turn"
              (e.type === 'denyTurnSelection' && e.target !== 'self') ||
              // e.g. Induce Fear: the target gets Mindless during the opponent's next turn
              (e.type === 'giveMindless' && (e.target === 'hitUnit' || e.target === 'target'))
          )
        );
      if (isTargetStatusAbility) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit) {
          showNotification(`${activeAbility.name}: click a unit to target.`);
          return;
        }
        if (targetUnit.instanceId !== activeTurnUnit.instanceId && isImmuneToNonDamageEffects(targetUnit)) {
          showNotification(`${targetUnit.card.name} is immune to non-damage effects right now.`);
          return;
        }
        const cost = getAbilityApCost(activeAbility);
        if (activeTurnUnit.currentAp < cost) {
          showNotification(`Not enough AP to use ${activeAbility.name} (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`);
          return;
        }
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, activeAbility);
        const updatedTarget = applyUseLimitStatuses(applyAbilityStatuses(targetUnit, activeAbility, lastTurnUnitIds, activeTurnUnit), activeAbility, false);
        setUnitsOnBoard((prev) => {
          const next = { ...prev, [hexId]: updatedTarget };
          const casterHex = activeTurnUnitHex;
          const caster = hexId === casterHex ? updatedTarget : prev[casterHex] || activeTurnUnit;
          next[casterHex] = { ...caster, currentAp: newAp, usedTurnCounts: nextCounts };
          return next;
        });
        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} used ${activeAbility.name} on ${targetUnit.card.name}: ${
            activeAbility.effects?.some((e: any) => e.type === 'denyTurnSelection')
              ? "your opponent can't choose it to take their next turn unless it is their last non-token unit"
              : activeAbility.effects?.some((e: any) => e.type === 'giveMindless')
              ? "it is Mindless (can't use the Universal Draw Action) during your opponent's next turn"
              : 'if it takes its next turn, its first action costs 1 more AP'
          }. (${cost} AP spent, ${newAp} AP remaining).`
        );
        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }
      // "Use a 1AP or 2AP ability of the target as this ability for free" (e.g. Synaptic Link): pick one of the target's
      // (and the cards under it), then use it as a provider's free ability
      if (isTargetAbilityBorrower(activeAbility)) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit || hexId === activeTurnUnitHex) {
          showNotification(`${activeAbility.name}: click a unit in range.`);
          return;
        }
        const cards = getBorrowableCards(activeAbility, targetUnit);
        const choices = getQualifyingPromotedAbilities(activeAbility, cards, activeTurnUnit);
        if (choices.length === 0) {
          showNotification(`${activeAbility.name}: ${targetUnit.card.name} has no ability it can use this way.`);
          return;
        }
        const parent = activeAbility;
        askCardChoice(
          {
            title: parent.name,
            message: `Choose an ability of ${targetUnit.card.name} to use as ${parent.name} for free.`,
            options: choices.map((c, i) => ({ label: `${c.ability.name} (${c.cardName})`, value: String(i) }))
          },
          (v) => {
            const pick = choices[parseInt(v, 10)];
            if (!pick) return;
            setActiveAbility(null);
            handlePromotedAbilitySelect(pick.ability, parent, cards);
          }
        );
        return;
      }
      // "Move the target unit 1 tile closer to this one if able" with no damage (e.g. Stage Hook): { type: 'pull',
      // target: 'hitUnit', distance, asMove: true }. A move: a unit that cannot move stays, and move triggers apply.
      const hookEff: any = activeAbility.effects?.find((e: any) => e.type === 'pull' && e.target === 'hitUnit');
      if (hookEff && !activeAbility.effects?.some((e: any) => e.type === 'damage')) {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit || hexId === activeTurnUnitHex) {
          showNotification(`${activeAbility.name}: click a unit in range.`);
          return;
        }
        const cost = getAbilityApCost(activeAbility);
        if (activeTurnUnit.currentAp < cost) {
          showNotification(`Not enough AP to use ${activeAbility.name} (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`);
          return;
        }
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, activeAbility);
        const blocked =
          (targetUnit.owner !== activePlayer && isImmuneToNonDamageEffects(targetUnit)) ||
          (hookEff.asMove && isUnitMovementDisabled(targetUnit));
        const dest = blocked
          ? hexId
          : getPullDestination(activeTurnUnitHex, hexId, typeof hookEff.distance === 'number' ? hookEff.distance : 1, unitsOnBoard);
        const casterHex = activeTurnUnitHex;
        setUnitsOnBoard((prev) => {
          let next = { ...prev, [casterHex]: { ...prev[casterHex], currentAp: newAp, usedTurnCounts: nextCounts } };
          if (dest !== hexId && next[hexId] && !next[dest]) {
            const u = next[hexId];
            delete next[hexId];
            next[dest] = { ...u, hexId: dest };
            if (hookEff.asMove) next = applyMoveTriggers(next, u.instanceId, [dest], hexId);
          }
          return next;
        });
        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `${activeTurnUnit.card.name} used ${activeAbility.name}: ${
            dest !== hexId ? `moved ${targetUnit.card.name} to ${dest}` : `${targetUnit.card.name} couldn't be moved closer`
          }. (${cost} AP spent, ${newAp} AP remaining).`
        );
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }
      // Subcase 3.38: Death Mark (Blight Phantom)
      if (activeAbility.id === 'death_mark' || activeAbility.name === 'Death Mark') {
        const targetUnit = unitsOnBoard[hexId];
        if (!targetUnit) {
          showNotification("You must click an enemy unit to place Death Mark.");
          return;
        }
        if (targetUnit.owner === activePlayer) {
          showNotification("Death Mark must target an enemy unit.");
          return;
        }
        if (isImmuneToNonDamageEffects(targetUnit)) {
          showNotification(`${targetUnit.card.name} is immune to non-damage effects right now, so it can't be marked.`);
          return;
        }
        const cost = getAbilityApCost(activeAbility);
        if (activeTurnUnit.currentAp < cost) {
          showNotification(`Not enough AP to use Death Mark (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`);
          return;
        }
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const nextCounts = recordAbilityUse(currentCounts, activeAbility);

        const updatedTarget: BattlefieldUnit = {
          ...targetUnit,
          deathMark: {
            casterInstanceId: activeTurnUnit.instanceId,
            casterOwner: activePlayer,
            bonusDamage: 5
          },
          statuses: targetUnit.statuses?.includes('death_mark')
            ? targetUnit.statuses
            : [...(targetUnit.statuses || []), 'death_mark']
        };

        setUnitsOnBoard((prev) => ({
          ...prev,
          [hexId]: updatedTarget,
          [activeTurnUnitHex]: {
            ...activeTurnUnit,
            currentAp: newAp,
            usedTurnCounts: nextCounts
          }
        }));

        playCardDrawSound();
        setActiveAbility(null);
        showNotification(
          `💀 ${activeTurnUnit.card.name} placed Death Mark on ${targetUnit.card.name}! This turn, ${activeTurnUnit.card.name}'s attacks against that unit deal +5 damage on the first hit (does not stack). (${cost} AP spent, ${newAp} AP remaining).`
        );

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }
      // Subcase 3.39: Echoing Incantation targeting empty tile
      const isEchoEmptyTarget =
        !unitsOnBoard[hexId] &&
        Boolean(
          (activeAbility as any).allowEmptyTileTarget ||
            activeAbility.parentAbilityId === 'echoing_incantation' ||
            activeAbility.id?.startsWith('echoing_incantation__')
        );

      if (isEchoEmptyTarget) {
        const cost = getAbilityApCost(activeAbility);
        if (activeTurnUnit.currentAp < cost) {
          showNotification(
            `Not enough AP to use ${activeAbility.name} (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`
          );
          return;
        }

        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const nextCounts: Record<string, number> = { ...currentCounts };
        const keysToRecord = new Set<string>();
        if (activeAbility.id) keysToRecord.add(String(activeAbility.id));
        // The promoted ability used for free (its 1/Turn limit is per ability, across providers)
        if (activeAbility.promotedAbilityId) keysToRecord.add(freeUseKey(activeAbility.promotedAbilityId));
        if (activeAbility.name) keysToRecord.add(String(activeAbility.name));
        // A cost variant or provider executable also counts toward its base ability (unless the provider was already
        // recorded when it prepaid). The promoted ability's own id isn't recorded: using it for free through a
        // provider is one ability use (the provider), not two.
        if (typeof activeAbility.parentAbilityId === 'string' && !activeAbility.prepaidByParent) {
          keysToRecord.add(activeAbility.parentAbilityId);
        }
        if (activeAbility.id?.includes('__') && !(activeAbility.parentAbilityId && activeAbility.prepaidByParent)) {
          keysToRecord.add(activeAbility.id.split('__')[0]);
        }
        keysToRecord.forEach((k) => {
          nextCounts[k] = (nextCounts[k] || 0) + 1;
        });

        // Armour gain per AP spent or flat armour from ability
        let finalCasterArmour = activeTurnUnit.armour;
        const armourEff = activeAbility.effects?.find(
          (e: any) => e.type === 'armour' && (e.target === 'self' || !e.target)
        );
        if (armourEff) {
          if (
            typeof armourEff.amount === 'object' &&
            armourEff.amount !== null &&
            typeof (armourEff.amount as any).perAP === 'number'
          ) {
            finalCasterArmour += (armourEff.amount as any).perAP * getApSpent(activeAbility);
          } else if (typeof armourEff.amount === 'number') {
            finalCasterArmour += armourEff.amount;
          } else if (typeof armourEff.upTo === 'number') {
            finalCasterArmour = Math.max(finalCasterArmour, armourEff.upTo);
          }
        }

        // Apply recoil / self-damage if any
        const recoilMatch = activeAbility.text.match(/deals?\s+(\d+)\s+damage\s+to\s+itself/i);
        const selfDmg = recoilMatch ? parseInt(recoilMatch[1], 10) : getAbilitySelfDamage(activeAbility);
        let casterCounters = activeTurnUnit.damageCounters;
        let casterTookDamage = false;
        if (selfDmg > 0) {
          casterTookDamage = true;
          let rem = selfDmg;
          if (finalCasterArmour > 0) {
            const abs = Math.min(finalCasterArmour, rem);
            finalCasterArmour -= abs;
            rem -= abs;
          }
          casterCounters += rem;
        }
        const casterDefeated = casterCounters >= activeTurnUnit.card.hp;

        // Cast as though an enemy unit was on that tile:
        // Leyline Invoker Volatile Hexes: "Whenever an attack from this unit deals damage to a unit, the tile that unit is on becomes scorched until the end of your opponent's next turn"
        const unitPassives = getUnitPassives(activeTurnUnit);
        const hasVolatileHexes = unitPassives.some(
          (p) =>
            p.id === 'volatile_hexes' ||
            p.name === 'Volatile Hexes' ||
            p.effects?.some((e: any) => e.type === 'scorchTile' && e.tile === 'damagedUnitTile')
        );

        const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
        if (hasVolatileHexes) {
          setScorchedTiles((prev) => ({
            ...prev,
            [hexId]: {
              expiresOnTurnEndFor: opponent,
              casterPlayer: activePlayer
            }
          }));
        }

        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          if (casterDefeated) {
            delete next[activeTurnUnitHex];
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
              }
            }
          } else {
            next[activeTurnUnitHex] = {
              ...activeTurnUnit,
              armour: finalCasterArmour,
              damageCounters: casterCounters,
              tookDamageThisTurn: activeTurnUnit.tookDamageThisTurn || casterTookDamage,
              currentAp: newAp,
              usedTurnCounts: nextCounts,
              attacksUsedThisTurn: (activeTurnUnit.attacksUsedThisTurn || 0) + 1
            };
          }
          let finalNext = next;
          if (selfDmg > 0) {
            finalNext = applyDamageEventsAndPassives(
              [{ hexId: activeTurnUnitHex, damagedUnitOwner: activeTurnUnit.owner, damageAmount: selfDmg, nonAttack: true }],
              next
            );
          }
          checkVictory(finalNext);
          return finalNext;
        });

        playCardDrawSound();
        setActiveAbility(null);
        const vhNote = hasVolatileHexes
          ? ` Volatile Hexes triggered: Tile ${hexId} is scorched until the end of opponent's next turn!`
          : '';
        showNotification(
          `${activeTurnUnit.card.name} cast ${activeAbility.name} on empty tile ${hexId} via Echoing Incantation!${vhNote} (${cost} AP spent, ${newAp} AP remaining).`
        );

        if (casterDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          switchTurn(false);
          return;
        }

        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }
      // Subcase 3.4: Target unit attack execution
      let targetUnit = unitsOnBoard[hexId];
      if (targetUnit) {
        const isReactAbility =
          activeAbility.tags?.includes('react') ||
          Boolean((activeAbility as any).isReactEffect);
        if (isReactAbility && isImmuneToReactEffects(targetUnit)) {
          showNotification(`${targetUnit.card.name} cannot be targeted by react effects (Nightbound)!`);
          return;
        }

        // Same-target chains (e.g. Overload "against the target", Fend Off): the first attack locks the target
        if (activeAbility.inProviderChain && providerChain?.spec.sameTargetForAttacks) {
          if (providerChain.targetInstanceId && targetUnit.instanceId !== providerChain.targetInstanceId) {
            showNotification(`${providerChain.parent.name}: every attack must target ${providerChain.targetName || 'the same unit'}.`);
            return;
          }
          if (!providerChain.targetInstanceId) {
            const lockedId = targetUnit.instanceId;
            const lockedName = targetUnit.card.name;
            setProviderChain((c) => (c ? { ...c, targetInstanceId: lockedId, targetName: lockedName } : c));
          }
        }

        // "The second hit may target a different unit" (e.g. Cloven Crash): ask first, if another enemy is in range
        const splitHitEff: any = activeAbility.effects?.find(
          (e: any) => e.type === 'damage' && e.secondHitMayTargetDifferentUnit
        );
        const splitDecided =
          splitHitDecisionRef.current?.hexId === hexId && splitHitDecisionRef.current?.abilityId === activeAbility.id;
        if (splitHitEff && !splitDecided && targetUnit.owner !== activeTurnUnit.owner) {
          const { minRange, maxRange } = getEffectiveAbilityRange(activeAbility, activeTurnUnit);
          const candidates = getHexesInRange(activeTurnUnitHex, minRange, maxRange).filter((h) => {
            const u = unitsOnBoard[h];
            return h !== hexId && u && u.owner !== activeTurnUnit.owner && !isUntargetableBy(u, activePlayer);
          });
          if (candidates.length > 0) {
            setSplitHitPrompt({ hexId, abilityName: activeAbility.name, targetName: targetUnit.card.name, candidates });
            return;
          }
        }
        if (splitDecided) splitHitDecisionRef.current = null;

        // Attacker's optional knockback from the provider (e.g. Deny Entry, Repulsion Spell): ask before resolving.
        // Skipped when the attack already knocks back on its own.
        const attackKbDecision =
          attackKnockbackDecisionRef.current?.hexId === hexId && attackKnockbackDecisionRef.current?.abilityId === activeAbility.id
            ? attackKnockbackDecisionRef.current
            : null;
        // Optional extra knockback from the attacker's passives (e.g. Sendoff: "you may have it apply 1 additional tile")
        const providerOptionalKb = getProviderOptionalKnockback(activeAbility, activeTurnUnit);
        // The attack's own conditional knockback (e.g. Disembowel: "If this attack is made from behind ... you may have it
        // apply knockback 1"): automatic when not optional, otherwise offered when its condition holds
        const conditionalKb = getAbilityOptionalKnockbackEffect(activeAbility);
        // "If this is the second time this attack is used on the same unit in a turn" (e.g. Defensive Thrash)
        const usedOnTargetBefore = (activeTurnUnit.usedOnTargets?.[String(activeAbility.baseAbilityId || activeAbility.id)] || []).includes(
          targetUnit.instanceId
        );
        const conditionalKbHolds =
          !!conditionalKb &&
          (!conditionalKb.if ||
            (conditionalKb.if === 'thisAbilityUsedOnTargetEarlierThisTurn' ? usedOnTargetBefore : null) ||
            (conditionalKb.if !== 'thisAbilityUsedOnTargetEarlierThisTurn' && evalAttackerCondition(
              conditionalKb.if,
              activeTurnUnit,
              isAttackFromBehind(activeTurnUnitHex, hexId, targetUnit.owner, activeAbility)
            ) !== false));
        const ownOptionalKb = conditionalKbHolds && conditionalKb!.optional ? conditionalKb!.distance : 0;
        const ownKbTiles =
          getAbilityKnockbackTiles(activeAbility) || (conditionalKbHolds && !conditionalKb!.optional ? conditionalKb!.distance : 0);
        const ownKbApplies =
          ownKbTiles > 0 && (activeAbility.tags?.includes('melee') || getHexDistance(activeTurnUnitHex, hexId) === 1);
        const extraKb = getAttackerExtraKnockback(activeTurnUnit);
        if (
          !attackKbDecision &&
          targetUnit.owner !== activeTurnUnit.owner &&
          !activeTurnUnit.cannotInflictKnockbackNextOwnTurn
        ) {
          const options: { label: string; tiles: number }[] = [];
          if (ownKbApplies && extraKb.optional > 0) {
            // The attack knocks back anyway: choose whether to add the extra tiles
            const base = ownKbTiles + extraKb.automatic;
            options.push({ label: `Knockback ${base}`, tiles: base });
            options.push({ label: `Knockback ${base + extraKb.optional}`, tiles: base + extraKb.optional });
          } else if (!ownKbTiles && (providerOptionalKb > 0 || ownOptionalKb > 0)) {
            // The provider may add knockback (Deny Entry, Repulsion Spell, Dirty Blow), or the attack's own optional one
            const base = Math.max(providerOptionalKb, ownOptionalKb) + extraKb.automatic;
            options.push({ label: 'No knockback', tiles: 0 });
            options.push({ label: `Knockback ${base}`, tiles: base });
            if (extraKb.optional > 0) options.push({ label: `Knockback ${base + extraKb.optional}`, tiles: base + extraKb.optional });
          }
          if (options.length > 1) {
            const extraNote = extraKb.optional > 0 ? ` ${extraKb.sources.join(' & ')} may add ${extraKb.optional} more.` : '';
            setAttackKnockbackPrompt({
              hexId,
              abilityName: activeAbility.name,
              targetName: targetUnit.card.name,
              message: `Choose how far ${activeAbility.name} knocks back ${targetUnit.card.name}.${extraNote}`,
              options
            });
            return;
          }
        }

        // Attacks that resolve as written (e.g. Silencing Strike): react effects don't interrupt or trigger,
        // and no passive (attacker's, target's, or a third unit's) changes or reacts to it
        // ...and a target that can't use react effects right now (e.g. after Jolting Bite), or against an attacker whose
        // passive stops them (e.g. Vacuum Strike: a melee attack from the tile behind the target)
        const attackFromBehind = isAttackFromBehind(activeTurnUnitHex, hexId, targetUnit.owner, activeAbility);
        const passiveStopsReacts = getUnitPassives(activeTurnUnit).some((p) =>
          (p.effects || []).some(
            (e: any) =>
              e.type === 'cannotUseReacts' &&
              e.target === 'target' &&
              (!e.if || evalAttackerCondition(e.if, activeTurnUnit, attackFromBehind) === true) &&
              isMeleeAttackAbility(activeAbility)
          )
        );
        const skipsReacts = ignoresReactEffects(activeAbility) || !canUseReactEffects(targetUnit) || passiveStopsReacts;
        const skipsPassives = ignoresPassives(activeAbility);
        if (skipsPassives) {
          suppressPassivesFor([activeTurnUnit.instanceId, targetUnit.instanceId]);
          setPassiveSuppressionTick((t) => t + 1);
        }

        // Optional knockback immunity (e.g. Hold the Gate): the defending player chooses before the attack resolves,
        // then this same click is replayed with their answer
        const knockbackDecision = knockbackDecisionRef.current?.hexId === hexId ? knockbackDecisionRef.current : null;
        knockbackDecisionRef.current = null;
        const optionalKbPassive = getOptionalKnockbackImmunityPassive(targetUnit, activePlayer);
        if (optionalKbPassive && targetUnit.owner !== activeTurnUnit.owner && !activeTurnUnit.cannotInflictKnockbackNextOwnTurn) {
          let pendingKbTiles = ownKbTiles;
          if (attackKbDecision?.apply) pendingKbTiles = Math.max(pendingKbTiles, attackKbDecision.tiles);
          const pendingKbMelee =
            activeAbility.tags?.includes('melee') || getHexDistance(activeTurnUnitHex, hexId) === 1 || Boolean(attackKbDecision?.originHex);
          if (pendingKbTiles > 0 && pendingKbMelee) {
            if (!knockbackDecision) {
              setKnockbackChoicePending({
                hexId,
                defender: targetUnit.owner,
                unitName: targetUnit.card.name,
                passive: optionalKbPassive,
                attackerName: activeTurnUnit.card.name,
                abilityName: activeAbility.name,
                tiles: pendingKbTiles
              });
              // Flip the camera to the defending player's perspective while they decide
              setBoardYaw(targetUnit.owner === 'player1' ? 0 : 180);
              return;
            }
            if (knockbackDecision.useImmunity) {
              targetUnit = applyOptionalKnockbackImmunity(targetUnit, optionalKbPassive);
              showNotification(`${targetUnit.card.name} used ${optionalKbPassive.name}: immune to knockback until the end of this turn.`);
            }
          }
        }

        const cost = getAbilityApCost(activeAbility);
        const targetDist = getHexDistance(activeTurnUnitHex, hexId);
        const isRanged =
          activeAbility.tags?.includes('ranged') ||
          targetDist > 1 ||
          activeAbility.text?.toLowerCase().includes('ranged') ||
          Boolean(activeAbility.range && Math.max(...activeAbility.range) > 1 && !activeAbility.tags?.includes('melee'));
        const isAttack =
          activeAbility.tags?.includes('attack') ||
          activeAbility.tags?.includes('melee') ||
          activeAbility.tags?.includes('ranged') ||
          activeAbility.text?.toLowerCase().includes('deal') ||
          activeAbility.text?.toLowerCase().includes('damage') ||
          Boolean(activeAbility.effects && activeAbility.effects.some((e: any) => e.type === 'damage')) ||
          isStraightLineAbility(activeAbility);

        const isFriendlyTarget = targetUnit.owner === activeTurnUnit.owner;
        const isFeedingFrenzy = isFriendlyTarget && hasFeedingFrenzy(activeTurnUnit);

        let flawlessParryPrevented = 0;

        // Check Flawless Parry (Skirmish Captain):
        // "The next time this unit would take damage from an attack until the end of your opponent's next turn,
        // prevent up to 4 damage. Then, if the attacker is within range 1, reflect the attack back at them. This unit's turn ends."
        if (!isFriendlyTarget && isAttack && !skipsReacts && targetUnit.reflectStance?.preventUpTo !== undefined) {
          const hitStructure = getAbilityHitStructure(activeAbility, activeTurnUnit, targetUnit);
          let incomingHits: AttackHit[] = [];
          if (getFalloffDamageBase(activeAbility) !== null) {
            const tilesBetween = Math.max(0, targetDist - 1);
            incomingHits = [{ hitIndex: 1, damage: Math.max(0, (getFalloffDamageBase(activeAbility) ?? 0) - tilesBetween) }];
          } else if (activeAbility.id === 'weighty_shot') {
            incomingHits = [{ hitIndex: 1, damage: targetDist === 1 ? 10 : 7 }];
          } else if (hitStructure.isMultiHit && hitStructure.hits.length > 0) {
            incomingHits = hitStructure.hits;
          } else {
            let rawDmg = 5;
            const match =
              activeAbility.text.match(/deal[s]?\s+(\d+)\s+damage/i) ||
              activeAbility.text.match(/deal[s]?\s+(?:up\s+to\s+)?(\d+)/i) ||
              activeAbility.text.match(/(\d+)\s+damage/i);
            if (match) rawDmg = parseInt(match[1], 10);
            if (hitStructure.hits && hitStructure.hits.length > 0) {
              incomingHits = hitStructure.hits;
            } else {
              incomingHits = [{ hitIndex: 1, damage: rawDmg }];
            }
          }

          const rawIncomingDamage = incomingHits.reduce((sum, h) => sum + h.damage, 0);

          if (rawIncomingDamage > 0) {
            let parryLeft = targetUnit.reflectStance.preventUpTo;
            const reducedHits = incomingHits.map((h) => {
              const cut = Math.min(parryLeft, h.damage);
              parryLeft -= cut;
              flawlessParryPrevented += cut;
              return { ...h, damage: Math.max(0, h.damage - cut) };
            });

            // Target consumes the react stance
            targetUnit = {
              ...targetUnit,
              reflectStance: null
            };

            const attackerInRange1 = targetDist <= 1;
            const attackerCanBeReflected = attackerInRange1 && !isImmuneToReactEffects(activeTurnUnit);

            if (attackerCanBeReflected) {
              // Attacker is in range 1 and not Nightbound: Reflect attack back at attacker, and target takes reduced damage
              const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
              const currentCounts = activeTurnUnit.usedTurnCounts || {};
              const nextCounts = { ...currentCounts };
              const keysToRecord = new Set<string>();
              if (activeAbility.id) keysToRecord.add(String(activeAbility.id));
              // The promoted ability used for free (its 1/Turn limit is per ability, across providers)
              if (activeAbility.promotedAbilityId) keysToRecord.add(freeUseKey(activeAbility.promotedAbilityId));
              if (activeAbility.name) keysToRecord.add(String(activeAbility.name));
              if (typeof activeAbility.parentAbilityId === 'string') {
                keysToRecord.add(activeAbility.parentAbilityId);
              }
              if (activeAbility.id?.includes('__')) {
                activeAbility.id.split('__').forEach((p) => keysToRecord.add(p));
              }
              keysToRecord.forEach((k) => {
                nextCounts[k] = (nextCounts[k] || 0) + 1;
              });

              // 1. Target unit takes reduced damage
              const targetExec = executeSequentialHits(
                reducedHits,
                targetUnit.armour,
                targetUnit.damageCounters,
                targetUnit.card.hp,
                activeAbility.id,
                {
                  attacker: activeTurnUnit,
                  target: targetUnit,
                  ability: activeAbility,
                  attackerHex: activeTurnUnitHex,
                  targetHex: hexId,
                  unitsOnBoard
                }
              );
              const targetDamageDealt = targetExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
              const targetDefeated = targetExec.isDefeated;

              // 2. Attacker takes reflected attack
              const reflectedExec = executeSequentialHits(
                incomingHits,
                activeTurnUnit.armour,
                activeTurnUnit.damageCounters,
                activeTurnUnit.card.hp,
                activeAbility.id,
                {
                  attacker: targetUnit,
                  target: activeTurnUnit,
                  ability: activeAbility,
                  attackerHex: hexId,
                  targetHex: activeTurnUnitHex,
                  unitsOnBoard
                }
              );
              const attackerDamageDealt = reflectedExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
              const attackerDefeated = reflectedExec.isDefeated;

              // Knockback handling on attacker if ability has knockback and attacker survived
              let knockbackTiles = getAbilityKnockbackTiles(activeAbility);

              const isMeleeOrRange1 = activeAbility.tags?.includes('melee') || targetDist === 1;
              let attackerFinalHex = activeTurnUnitHex;
              if (knockbackTiles > 0 && isMeleeOrRange1 && !attackerDefeated && !targetUnit.cannotInflictKnockbackNextOwnTurn) {
                const isImmune = isImmuneToKnockback(activeTurnUnit);
                if (!isImmune) {
                  const kbDest = getKnockbackDestination(hexId, activeTurnUnitHex, knockbackTiles, unitsOnBoard);
                  attackerFinalHex = kbDest.finalHex;
                }
              }

              playCardDrawSound();
              const nextBoard = { ...unitsOnBoard };

              if (targetDefeated) {
                delete nextBoard[hexId];
                if (targetUnit.card.type !== 'token') {
                  if (targetUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, targetUnit.card]);
                  else setPlayer2Graveyard((g) => [...g, targetUnit.card]);
                }
              } else {
                nextBoard[hexId] = {
                  ...targetUnit,
                  armour: targetExec.finalArmour,
                  damageCounters: targetExec.finalDamageCounters
                };
              }

              if (attackerDefeated) {
                delete nextBoard[activeTurnUnitHex];
                if (activeTurnUnit.card.type !== 'token') {
                  if (activeTurnUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
                  else setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
                }
              } else {
                if (attackerFinalHex !== activeTurnUnitHex) {
                  delete nextBoard[activeTurnUnitHex];
                }
                nextBoard[attackerFinalHex] = {
                  ...activeTurnUnit,
                  hexId: attackerFinalHex,
                  armour: reflectedExec.finalArmour,
                  damageCounters: reflectedExec.finalDamageCounters,
                  currentAp: newAp,
                  usedTurnCounts: nextCounts
                };
              }

              const damageEvents: DamageEvent[] = [];
              if (attackerDamageDealt > 0) {
                damageEvents.push({ hexId: activeTurnUnitHex, damagedUnitOwner: activeTurnUnit.owner, damageAmount: attackerDamageDealt });
              }
              if (targetDamageDealt > 0) {
                damageEvents.push({ hexId, damagedUnitOwner: targetUnit.owner, damageAmount: targetDamageDealt });
              }
              let finalBoard = nextBoard;
              if (damageEvents.length > 0) {
                finalBoard = applyDamageEventsAndPassives(damageEvents, nextBoard);
              }

              setUnitsOnBoard(finalBoard);
              setActiveAbility(null);

              showNotification(
                `⚔️ FLAWLESS PARRY! ${targetUnit.card.name} prevented ${flawlessParryPrevented} damage and reflected ${activeAbility.name} back at ${activeTurnUnit.card.name}! (${targetDamageDealt > 0 ? `${targetUnit.card.name} took ${targetDamageDealt} damage${targetDefeated ? ' - Defeated!' : ''}. ` : ''}${attackerDamageDealt} damage dealt to ${activeTurnUnit.card.name}${attackerDefeated ? ' - Defeated!' : ''}).`
              );

              if (attackerDefeated || targetDefeated) {
                if (attackerDefeated) setActiveTurnUnitHex(null);
                checkVictory(finalBoard);
                if (attackerDefeated) switchTurn(false);
                else if (cost > 0 && newAp <= 0) switchTurn(false);
              } else if (cost > 0 && newAp <= 0) {
                switchTurn(false);
              }
              return;
            }
          }
        }

        const triggersReflect =
          Boolean(!isFriendlyTarget &&
          isAttack &&
          !skipsReacts &&
          targetUnit.reflectStance &&
          targetUnit.reflectStance.preventUpTo === undefined &&
          (targetUnit.reflectStance.triggerType === 'all' ||
            (targetUnit.reflectStance.triggerType === 'ranged' && isRanged) ||
            (targetUnit.reflectStance.triggerType === 'range1' && targetDist === 1)));

        if (triggersReflect) {
          const newAp = Math.max(0, activeTurnUnit.currentAp - cost);

          // Record 1/Turn usage for attacker
          const currentCounts = activeTurnUnit.usedTurnCounts || {};
          const nextCounts = { ...currentCounts };
          const keysToRecord = new Set<string>();
          if (activeAbility.id) keysToRecord.add(String(activeAbility.id));
          // The promoted ability used for free (its 1/Turn limit is per ability, across providers)
          if (activeAbility.promotedAbilityId) keysToRecord.add(freeUseKey(activeAbility.promotedAbilityId));
          if (activeAbility.name) keysToRecord.add(String(activeAbility.name));
          if (typeof activeAbility.parentAbilityId === 'string') {
            keysToRecord.add(activeAbility.parentAbilityId);
          }
          if (activeAbility.id?.includes('__')) {
            activeAbility.id.split('__').forEach((p) => keysToRecord.add(p));
          }
          keysToRecord.forEach((k) => {
            nextCounts[k] = (nextCounts[k] || 0) + 1;
          });

          // Target unit consumes reflect stance
          const updatedTarget: BattlefieldUnit = {
            ...targetUnit,
            reflectStance: targetUnit.reflectStance?.once ? null : targetUnit.reflectStance
          };

          if (isImmuneToReactEffects(activeTurnUnit)) {
            const finalReflectBoard = {
              ...unitsOnBoard,
              [hexId]: updatedTarget,
              [activeTurnUnitHex]: {
                ...activeTurnUnit,
                currentAp: newAp,
                usedTurnCounts: nextCounts,
                attacksUsedThisTurn: (activeTurnUnit.attacksUsedThisTurn || 0) + 1
              }
            };
            setUnitsOnBoard(finalReflectBoard);
            setActiveAbility(null);
            showNotification(
              `🪞 REFLECT! ${targetUnit.card.name}'s ${targetUnit.reflectStance?.sourceAbilityName || 'Reflect'} triggered, but ${activeTurnUnit.card.name} is Nightbound (cannot be targeted by react effects)! No damage dealt to ${activeTurnUnit.card.name}.`
            );
            if (cost > 0 && newAp <= 0) switchTurn(false);
            return;
          }

          // Target unit immediately casts the SAME ability back at the attacker!
          const hitStructure = getAbilityHitStructure(activeAbility, targetUnit, activeTurnUnit);
          let hitsToExecute: AttackHit[] = [];
          if (getFalloffDamageBase(activeAbility) !== null) {
            const tilesBetween = Math.max(0, targetDist - 1);
            hitsToExecute = [{ hitIndex: 1, damage: Math.max(0, (getFalloffDamageBase(activeAbility) ?? 0) - tilesBetween) }];
          } else if (activeAbility.id === 'weighty_shot') {
            hitsToExecute = [{ hitIndex: 1, damage: targetDist === 1 ? 10 : 7 }];
          } else if (hitStructure.isMultiHit) {
            hitsToExecute = hitStructure.hits;
          } else {
            let rawDmg = 5;
            const match =
              activeAbility.text.match(/deal[s]?\s+(\d+)\s+damage/i) ||
              activeAbility.text.match(/deal[s]?\s+(?:up\s+to\s+)?(\d+)/i) ||
              activeAbility.text.match(/(\d+)\s+damage/i);
            if (match) rawDmg = parseInt(match[1], 10);
            if (hitStructure.hits && hitStructure.hits.length > 0) {
              hitsToExecute = hitStructure.hits;
            } else {
              hitsToExecute = [{ hitIndex: 1, damage: rawDmg }];
            }
          }

          const reflectedExec = executeSequentialHits(
            hitsToExecute,
            activeTurnUnit.armour,
            activeTurnUnit.damageCounters,
            activeTurnUnit.card.hp,
            activeAbility.id,
            {
              attacker: targetUnit,
              target: activeTurnUnit,
              ability: activeAbility,
              attackerHex: hexId,
              targetHex: activeTurnUnitHex,
              unitsOnBoard
            }
          );

          const attackerDamageDealt = reflectedExec.hitResults.reduce((sum, h) => sum + h.damage, 0);
          const attackerDefeated = reflectedExec.isDefeated;

          // Knockback handling on attacker if ability has knockback and attacker survived
          let knockbackTiles = getAbilityKnockbackTiles(activeAbility);

          const isMeleeOrRange1 = activeAbility.tags?.includes('melee') || targetDist === 1;
          let attackerFinalHex = activeTurnUnitHex;
          if (knockbackTiles > 0 && isMeleeOrRange1 && !attackerDefeated && !targetUnit.cannotInflictKnockbackNextOwnTurn) {
            const isImmune = isImmuneToKnockback(activeTurnUnit);

            if (!isImmune) {
              const kbDest = getKnockbackDestination(hexId, activeTurnUnitHex, knockbackTiles, unitsOnBoard);
              attackerFinalHex = kbDest.finalHex;
            }
          }

          playCardDrawSound();

          const nextBoard = { ...unitsOnBoard };
          nextBoard[hexId] = updatedTarget;

          if (attackerDefeated) {
            delete nextBoard[activeTurnUnitHex];
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
              }
            }
          } else {
            if (attackerFinalHex !== activeTurnUnitHex) {
              delete nextBoard[activeTurnUnitHex];
            }
            nextBoard[attackerFinalHex] = {
              ...activeTurnUnit,
              hexId: attackerFinalHex,
              armour: reflectedExec.finalArmour,
              damageCounters: reflectedExec.finalDamageCounters,
              currentAp: newAp,
              usedTurnCounts: nextCounts
            };
          }

          let finalReflectBoard = nextBoard;
          if (attackerDamageDealt > 0) {
            finalReflectBoard = applyDamageEventsAndPassives(
              [{ hexId: activeTurnUnitHex, damagedUnitOwner: activeTurnUnit.owner, damageAmount: attackerDamageDealt }],
              nextBoard
            );
          }

          setUnitsOnBoard(finalReflectBoard);
          setActiveAbility(null);

          showNotification(
            `🪞 REFLECT! ${targetUnit.card.name}'s ${targetUnit.reflectStance?.sourceAbilityName || 'Reflect'} reflected ${activeAbility.name} back at ${activeTurnUnit.card.name}! (${attackerDamageDealt} damage dealt to ${activeTurnUnit.card.name}${attackerDefeated ? ' - Defeated!' : ''}).`
          );

          if (attackerDefeated) {
            setActiveTurnUnitHex(null);
            checkVictory(finalReflectBoard);
            switchTurn(false);
          } else if (cost > 0 && newAp <= 0) {
            switchTurn(false);
          }
          return;
        }
        const targetIsVenomed = Boolean(targetUnit.statuses?.includes('slow_venom'));
        let coupBypass = false;

        // Check for ability effects that remove armour from target prior to damage calculation
        let armourRemovedBeforeAttack = 0;
        let effectiveTargetArmour = targetUnit.armour;

        if (activeAbility.id === 'rip_and_tear') {
          // Rip and Tear: Remove all armour from target first
          armourRemovedBeforeAttack = targetUnit.armour;
          effectiveTargetArmour = 0;
        } else if (activeAbility.id === 'shield_bash_and_cleave') {
          // Shield Bash & Cleave: Removes up to 2 armour from target unit first
          armourRemovedBeforeAttack = Math.min(2, targetUnit.armour);
          effectiveTargetArmour = Math.max(0, targetUnit.armour - armourRemovedBeforeAttack);
        } else if (activeAbility.id === 'coup_de_grace') {
          // Non-venomed: 1 damage that bypasses armour. Venomed: normal 10 damage.
          coupBypass = !targetIsVenomed;
          if (coupBypass) effectiveTargetArmour = 0;
        } else if (activeAbility.id === 'telekinetic_rend') {
          // Telekinetic Rend: Remove up to 5 armour from the target and place that much armour on this unit
          armourRemovedBeforeAttack = Math.min(5, targetUnit.armour);
          effectiveTargetArmour = Math.max(0, targetUnit.armour - armourRemovedBeforeAttack);
        } else {
          // Generic removeArmour effect in card data
          const rmEffect = activeAbility.effects?.find((e: any) => e.type === 'removeArmour');
          if (rmEffect) {
            const maxRm = rmEffect.amount === 'all' ? targetUnit.armour : (typeof rmEffect.amount === 'number' ? rmEffect.amount : 2);
            armourRemovedBeforeAttack = Math.min(maxRm, targetUnit.armour);
            effectiveTargetArmour = Math.max(0, targetUnit.armour - armourRemovedBeforeAttack);
          }
        }

        // Immune to other units' non-damage effects, friendly or enemy (e.g. Machine Heart): armour removal happens
        // before any damage, so it is blocked unless the target already took damage this turn
        const targetImmuneBeforeHit =
          targetUnit.instanceId !== activeTurnUnit.instanceId && isImmuneToNonDamageEffects(targetUnit);
        if (targetImmuneBeforeHit && armourRemovedBeforeAttack > 0) {
          armourRemovedBeforeAttack = 0;
          effectiveTargetArmour = coupBypass ? 0 : targetUnit.armour;
        }

        // "When targeted" scry passives (e.g. Preemptive Counter): the armour comes before the damage; the owner's
        // look at their deck happens once the attack is done (it can't change the attack, so the order is the same)
        const targetedScry =
          !isFriendlyTarget && !isFeedingFrenzy ? getTargetedScryPassive(targetUnit, isMeleeAttackAbility(activeAbility), turnCount) : null;
        if (targetedScry && targetedScry.armour > 0 && !coupBypass) {
          effectiveTargetArmour += targetedScry.armour;
        }
        // Armour a surrounding friendly unit shares with the target (e.g. Battered Shield): used after its own
        const attackBypassesArmour = Boolean(
          activeAbility.effects?.some((e: any) => e.type === 'damage' && e.bypassArmour)
        );
        const sharedArmourInfo =
          coupBypass || isFeedingFrenzy || attackBypassesArmour ? null : getUsableArmour(unitsOnBoard, hexId);
        const sharedArmourAmount = sharedArmourInfo ? sharedArmourInfo.total - sharedArmourInfo.own : 0;
        effectiveTargetArmour += sharedArmourAmount;
        let sharedArmourLost = 0;

        const attackOptions: AttackExecutionOptions = {
          attacker: activeTurnUnit,
          target: { ...targetUnit, armour: effectiveTargetArmour },
          ability: activeAbility,
          attackerHex: activeTurnUnitHex,
          targetHex: hexId,
          unitsOnBoard,
          scorchedTiles
        };

        // Multi-hit and damage determination:
        const hitStructure = getAbilityHitStructure(
          activeAbility,
          activeTurnUnit,
          { ...targetUnit, armour: effectiveTargetArmour },
          attackOptions
        );

        let damage = 5;
        let newArmour = effectiveTargetArmour;
        let newDamageCounters = targetUnit.damageCounters;
        let isDefeated = false;
        let multiHitRecords: import('./utils/attackLogic').HitExecutionRecord[] = [];

        let hitsToExecute: AttackHit[] = [];

        // Custom ability damage formulas:
        if (activeAbility.id === 'rip_and_tear') {
          // Rip and Tear: If no armour was removed this way, deal 5 damage (as an additional hit)
          if (armourRemovedBeforeAttack === 0) {
            hitsToExecute = [
              { hitIndex: 1, damage: 7 },
              { hitIndex: 2, damage: 5, conditionalNote: 'no armour was removed' }
            ];
          } else {
            hitsToExecute = [
              { hitIndex: 1, damage: 7, conditionalNote: `removed all ${armourRemovedBeforeAttack} armour` }
            ];
          }
        } else if (activeAbility.id === 'shield_bash_and_cleave') {
          hitsToExecute = [
            { hitIndex: 1, damage: 7, conditionalNote: armourRemovedBeforeAttack > 0 ? `removed ${armourRemovedBeforeAttack} armour` : '' },
            { hitIndex: 2, damage: 4, conditionalNote: 'cleave' }
          ];
        } else if (activeAbility.id === 'telekinetic_rend') {
          hitsToExecute = [
            { hitIndex: 1, damage: armourRemovedBeforeAttack, conditionalNote: `1 damage per armour stolen (${armourRemovedBeforeAttack})` }
          ];
          } else if (activeAbility.id === 'coup_de_grace') {
          hitsToExecute = [
            {
              hitIndex: 1,
              damage: targetIsVenomed ? 10 : 1,
              conditionalNote: targetIsVenomed ? 'Slow Venom: 10 damage' : 'bypassed armour'
            }
          ];
                  } else if (activeAbility.id === 'plunge_and_twist') {
          hitsToExecute = [{ hitIndex: 1, damage: 5 }];
        } else if (getFalloffDamageBase(activeAbility) !== null) {
          // Full Bore: deals less damage equal to the number of tiles between this unit and the unit hit (N - tilesBetween)
          const targetDist = getHexDistance(activeTurnUnitHex, hexId);
          const tilesBetween = Math.max(0, targetDist - 1);
          damage = Math.max(0, (getFalloffDamageBase(activeAbility) ?? 0) - tilesBetween);
          hitsToExecute = [{ hitIndex: 1, damage }];
        } else if (activeAbility.id === 'weighty_shot') {
          // Weighty Shot: Deals 7 damage. Crossbow Fighter passive deals +3 damage if unit hit is within range 1
          const targetDist = getHexDistance(activeTurnUnitHex, hexId);
          damage = targetDist === 1 ? 10 : 7;
          hitsToExecute = [{ hitIndex: 1, damage, conditionalNote: targetDist === 1 ? '+3 Stopping Power (range 1)' : undefined }];
        } else if (activeAbility.id === 'flaming_dive') {
          const hasMoved = Boolean(activeTurnUnit.movedThisTurn);
          damage = hasMoved ? 9 : 7;
          hitsToExecute = [
            {
              hitIndex: 1,
              damage,
              conditionalNote: hasMoved ? '+2 moved this turn bonus' : undefined,
              appliedBonuses: hasMoved ? ['flaming_dive'] : []
            }
          ];
          applyAttackerBonusPassives(hitsToExecute, activeAbility, activeTurnUnit, targetUnit, attackOptions);
        } else if (hitStructure.hits.length > 0) {
          hitsToExecute = hitStructure.hits;
        } else {
          // Fallback single-hit attack
          const match =
            activeAbility.text.match(/deal[s]?\s+(\d+)\s+damage/i) ||
            activeAbility.text.match(/deal[s]?\s+(?:up\s+to\s+)?(\d+)/i) ||
            activeAbility.text.match(/(\d+)\s+damage/i);
          if (match) damage = parseInt(match[1], 10);
          // Card-data driven: "if this unit already used this attack on the target this turn, deal additional damage"
          const repeatMod = ((activeAbility.effects as any[]) || [])
            .flatMap((e: any) => e.modifiers || [])
            .find((m: any) => m.if === 'thisAbilityUsedOnTargetEarlierThisTurn' && typeof m.addAmount === 'number');
          if (
            repeatMod &&
            (activeTurnUnit.usedOnTargets?.[String(activeAbility.id)] || []).includes(targetUnit.instanceId)
          ) {
            damage += repeatMod.addAmount;
          }
          hitsToExecute = [{ hitIndex: 1, damage }];
        }

        // If Flawless Parry was triggered by an attack outside Range 1, apply the damage prevention:
        if (flawlessParryPrevented > 0) {
          let leftParry = flawlessParryPrevented;
          hitsToExecute = hitsToExecute.map((h) => {
            const cut = Math.min(leftParry, h.damage);
            leftParry -= cut;
            return { ...h, damage: Math.max(0, h.damage - cut) };
          });
        }

        let exec = executeSequentialHits(
          hitsToExecute,
          effectiveTargetArmour,
          targetUnit.damageCounters,
          targetUnit.card.hp,
          activeAbility.id,
          attackOptions
        );
        // Plunge and Twist: if the target has no armour after hit 1, hit again for 3
        if (activeAbility.id === 'plunge_and_twist' && !exec.isDefeated && exec.finalArmour === 0) {
          const second = executeSequentialHits(
            [{ hitIndex: 2, damage: 3, conditionalNote: 'no armour left' }],
            exec.finalArmour,
            exec.finalDamageCounters,
            targetUnit.card.hp,
            activeAbility.id,
            attackOptions
          );
          exec = { ...second, hitResults: [...exec.hitResults, ...second.hitResults] };
        }
        // Ready Stance: prevent up to 7 damage from a melee attack and deal that much back
        let readyStanceTriggered = false;
        let readyStancePrevented = 0;
        if (!isFeedingFrenzy && !skipsReacts && targetUnit.readyStance && activeAbility.tags?.includes('melee')) {
          readyStanceTriggered = true;
          let left = targetUnit.readyStance.preventUpTo;
          const reducedHits = hitsToExecute.map((h, i) => {
            const dealt = exec.hitResults[i]?.damage ?? 0;
            const cut = Math.min(left, dealt);
            left -= cut;
            return { ...h, damage: Math.max(0, h.damage - cut) };
          });
          readyStancePrevented = targetUnit.readyStance.preventUpTo - left;
          if (readyStancePrevented > 0) {
            exec = executeSequentialHits(
              reducedHits,
              effectiveTargetArmour,
              targetUnit.damageCounters,
              targetUnit.card.hp,
              activeAbility.id,
              attackOptions
            );
          }
        }
        const readyStanceReturn = isImmuneToReactEffects(activeTurnUnit) ? 0 : readyStancePrevented;
        newArmour = exec.finalArmour;
        if (sharedArmourAmount > 0) {
          // The target's own armour goes first; the rest of the armour lost comes off the sharing unit
          const ownPool = effectiveTargetArmour - sharedArmourAmount;
          const lost = Math.max(0, effectiveTargetArmour - newArmour);
          const ownLost = Math.min(ownPool, lost);
          sharedArmourLost = Math.min(sharedArmourAmount, lost - ownLost);
          newArmour = ownPool - ownLost;
        }
        if (coupBypass) newArmour = targetUnit.armour + (targetedScry?.armour || 0);
        newDamageCounters = exec.finalDamageCounters;
        isDefeated = exec.isDefeated;
        multiHitRecords = exec.hitResults;
        damage = exec.hitResults.reduce((sum, h) => sum + h.damage, 0);
        // Retaliation passives, handled like Ready Stance's return damage (e.g. Reflective Armour: "When targeted by a
        // ranged attack, this unit deals 3 damage to the attacker"; Hot to the Touch when a melee attack damaged it):
        // works at any range, and react immunity doesn't stop it
        const retaliation = isFeedingFrenzy
          ? { amount: 0, sources: [] as string[] }
          : getTargetedRetaliation(targetUnit, isRanged, damage > 0, {
              distance: targetDist,
              attacker: activeTurnUnit,
              rawFirstHit: hitsToExecute[0]?.damage,
              armourLost: Math.max(0, effectiveTargetArmour - sharedArmourAmount - newArmour)
            });
        // "Remove up to that much armour from the attacking unit" when a melee attack damages it (e.g. Corrosive Sludge)
        const armourStrip =
          isFeedingFrenzy || isFriendlyTarget ? null : getAttackerArmourStrip(targetUnit, isMeleeAttackAbility(activeAbility), damage);
        const retaliationReturn = retaliation.amount;
        // Feeding Frenzy turns the hit into a heal: a non-damage effect, so an immune ally (Machine Heart) isn't healed
        if (isFeedingFrenzy && targetImmuneBeforeHit) {
          newArmour = targetUnit.armour;
          newDamageCounters = targetUnit.damageCounters;
          isDefeated = false;
        }

        // Effects after the hits: a non-damage immunity (Machine Heart) only still holds if this attack dealt no damage
        const targetImmuneAfterHit = targetImmuneBeforeHit && damage === 0;
        // e.g. Silencing Strike: a unit that took damage (armour included) has no passive until its owner's next turn ends
        const targetSilenced = !isFeedingFrenzy && damage > 0 && activeAbility.effects?.some((e: any) => e.type === 'removePassives');
        const targetAfterStanceBase = readyStanceTriggered ? { ...targetUnit, readyStance: null } : targetUnit;
        // Record "the first time each turn" for a targeted scry passive (e.g. Preemptive Counter)
        const targetAfterStance = targetedScry
          ? {
              ...targetAfterStanceBase,
              passiveTurnMarks: { ...(targetAfterStanceBase.passiveTurnMarks || {}), [targetedScry.key]: turnCount }
            }
          : targetAfterStanceBase;
        const venomTarget = markDamageCapUsed(
          targetImmuneAfterHit
            ? targetAfterStance
            : applyUseLimitStatuses(
                applyRemovePassives(
                  applyAbilityStatuses(
                    withAttackStatuses(targetAfterStance, activeTurnUnit, multiHitRecords),
                    activeAbility,
                    lastTurnUnitIds,
                    activeTurnUnit
                  ),
                  activeAbility,
                  Boolean(targetSilenced)
                ),
                activeAbility,
                !isFeedingFrenzy && damage > 0
              ),
          exec.damageCapKey
        );

        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);

        // Knockback functionality ONLY on melee or range 1 abilities
        // (a conditional knockback the attacker chose to apply comes in through attackKbDecision below)
        let knockbackTiles = ownKbTiles;
        const kbAny = activeAbility.effects?.find((e: any) => e.type === 'knockback') as Record<string, any> | undefined;

        // Attacker chose the provider's optional knockback; a ranged one pushes away from the drawn path's last step
        attackKnockbackDecisionRef.current = null;
        // (the chosen distance already includes the attacker's extra tiles, e.g. Sendoff)
        if (attackKbDecision?.apply) knockbackTiles = Math.max(knockbackTiles, attackKbDecision.tiles);
        else if (!attackKbDecision && knockbackTiles > 0) knockbackTiles += extraKb.automatic;
        // A waiting next-attack buff that knocks back on the last hit (e.g. Unstoppable Charge)
        const buffKnockback = activeTurnUnit.nextAttackBonus?.knockbackOnLastHit || 0;
        if (buffKnockback > 0) knockbackTiles = Math.max(knockbackTiles, buffKnockback);
        // A second melee attack on the same unit this turn knocks it back (e.g. Burst Through)
        if (isMeleeAttackAbility(activeAbility) && hasAttackedUnitThisTurn(activeTurnUnit, targetUnit.instanceId)) {
          knockbackTiles = Math.max(knockbackTiles, getSecondMeleeAttackKnockback(activeTurnUnit));
        }
        const knockbackOriginHex = attackKbDecision?.originHex || activeTurnUnitHex;

        const isMeleeOrRange1 =
          activeAbility.tags?.includes('melee') || getHexDistance(activeTurnUnitHex, hexId) === 1 || Boolean(attackKbDecision?.originHex);
        let knockbackDestination: { finalHex: string; tilesMoved: number; blockedCount: number } | null = null;
        let extraBlockedDamage = 0;

        if (!isFeedingFrenzy && knockbackTiles > 0 && isMeleeOrRange1 && !isDefeated && !activeTurnUnit.cannotInflictKnockbackNextOwnTurn) {
          const isImmune = isImmuneToKnockback(targetUnit) || targetImmuneAfterHit;

          if (!isImmune) {
            knockbackDestination = getKnockbackDestination(knockbackOriginHex, hexId, knockbackTiles, unitsOnBoard);
            if (knockbackDestination.blockedCount > 0 && kbAny?.onEachBlockedTile && typeof kbAny.onEachBlockedTile.amount === 'number') {
              extraBlockedDamage = knockbackDestination.blockedCount * kbAny.onEachBlockedTile.amount;
            }
          }
        }

        // A secondary hit on the unit on the next tile in the chosen straight direction (data: a damage effect targeting
        // 'unitOnNextTileInDirection'; no current card has one since Full Bore lost its splash)
        let secondaryHit: { hexId: string; damage: number } | null = null;
        if (activeAbility.effects?.some((e: any) => e.type === 'damage' && e.target === 'unitOnNextTileInDirection')) {
          const pSrc = parseHexId(activeTurnUnitHex);
          const pTgt = parseHexId(hexId);
          const targetDist = getHexDistance(activeTurnUnitHex, hexId);
          if (pSrc && pTgt && targetDist > 0) {
            const cSrc = offsetToCube(pSrc.col, pSrc.rowIdx);
            const cTgt = offsetToCube(pTgt.col, pTgt.rowIdx);
            const dq = Math.round((cTgt.q - cSrc.q) / targetDist);
            const dr = Math.round((cTgt.r - cSrc.r) / targetDist);
            const nextQ = cTgt.q + dq;
            const nextR = cTgt.r + dr;
            const { col, rowNum } = cubeToOffset(nextQ, nextR);
            if (col >= 0 && col < 8 && rowNum >= 1 && rowNum <= 6) {
              const secHex = toHexId(col, rowNum);
              if (unitsOnBoard[secHex]) {
                secondaryHit = { hexId: secHex, damage: Math.ceil(damage / 2) };
              }
            }
          }
        }
        // Heals the attacker gets from this attack, before any recoil: first-attack heal per hit (e.g. Bloodrush,
        // counted with the shared attack counter), per hit of a melee attack (e.g. Draining Touch), and the first
        // damage it deals each turn (e.g. Burn Fuel)
        const attackerPassives = getUnitPassives(activeTurnUnit);
        const firstAttackHeal = getFirstAttackHealPerHit(activeTurnUnit);
        const drainingHeal =
          !isFeedingFrenzy && isMeleeAttackAbility(activeAbility) ? getMeleeAttackHealPerHit(activeTurnUnit) : null;
        const firstDamageHeal = !isFeedingFrenzy && damage > 0 ? getFirstDamageHeal(activeTurnUnit, turnCount) : null;
        // The attack's own self heal (e.g. Red Thirst: "Heal 3 damage from this unit"; Overgrowth Spores: equal to the
        // total damage dealt)
        const abilityHealEff: any = activeAbility.effects?.find((e: any) => e.type === 'heal' && e.target === 'self');
        const abilityHeal =
          !abilityHealEff || isFeedingFrenzy
            ? 0
            : abilityHealEff.amount === 'totalDamageDealt'
            ? damage
            : typeof abilityHealEff.amount === 'number'
            ? abilityHealEff.amount
            : 0;
        const attackHealSources = [
          firstAttackHeal ? { name: firstAttackHeal.name, amount: firstAttackHeal.perHit * multiHitRecords.length } : null,
          drainingHeal ? { name: drainingHeal.name, amount: drainingHeal.perHit * multiHitRecords.length } : null,
          firstDamageHeal ? { name: firstDamageHeal.name, amount: firstDamageHeal.amount } : null,
          abilityHeal > 0 ? { name: activeAbility.name, amount: abilityHeal } : null
        ].filter((h): h is { name: string; amount: number } => Boolean(h && h.amount > 0));
        const bloodrushHeal = attackHealSources.reduce((sum, h) => sum + h.amount, 0);
        playCardDrawSound();

        const selfDamage = getAbilitySelfDamage(activeAbility);
        const totalRecoil = selfDamage + readyStanceReturn + retaliationReturn;
        // Passives that armour this unit whenever it attacks (e.g. Steal Plate); the armour comes before any recoil
        const onAttackArmour = getOnAttackSelfArmour(activeTurnUnit, targetUnit.armour > 0);
        let casterDefeated = false;
        let casterCountersAfterDamage = activeTurnUnit.damageCounters;
        let drewCardFromSelfDamage = false;
        let attackFinalAp = newAp;
        let lootTriggerAmount = 0;
        let lootTriggerTitle = '';
        let twinFuryActive = false;
        let defLootTriggered = false;
        let noxiousBurstVictims: BattlefieldUnit[] = [];
        // "When this unit becomes the target of a melee attack" token passives (e.g. Spirits' Protection)
        if (!isFriendlyTarget && isMeleeAttackAbility(activeAbility)) {
          offerMeleeTargetedTokens(targetUnit.instanceId);
        }
        const isOverloadGemstone =
          activeAbility.parentAbilityId === 'overload_gemstone' ||
          activeAbility.id === 'overload_gemstone' ||
          activeAbility.id?.startsWith('overload_gemstone__');

        // (run at once, not on the next render: the code after this reads what it works out, e.g. the loots its
        // passives trigger (Short Fuse, Iron Clout...), the attacker's AP left and whether the attacker died)
        flushSync(() => setUnitsOnBoard((prev) => {
          let next = { ...prev };
          const currentCounts = activeTurnUnit.usedTurnCounts || {};
          const nextCounts = { ...currentCounts };

          // Record 1/Turn usage for the active ability and any parent/promoted keys
          const keysToRecord = new Set<string>();
          if (activeAbility.id) keysToRecord.add(String(activeAbility.id));
          // The promoted ability used for free (its 1/Turn limit is per ability, across providers)
          if (activeAbility.promotedAbilityId) keysToRecord.add(freeUseKey(activeAbility.promotedAbilityId));
          if (activeAbility.name) keysToRecord.add(String(activeAbility.name));
          if (typeof activeAbility.parentAbilityId === 'string') {
            keysToRecord.add(activeAbility.parentAbilityId);
          }
          if (activeAbility.id?.includes('__')) {
            activeAbility.id.split('__').forEach((p) => keysToRecord.add(p));
          }
          keysToRecord.forEach((k) => {
            nextCounts[k] = (nextCounts[k] || 0) + 1;
          });

          let bonusAp = 0;
          // Check for 1/Turn kill passives like Goreblade Executioner's Bloodlust
          if (isDefeated) {
            const unitPassives = getUnitPassives(activeTurnUnit);
            const bloodlustPassive = unitPassives.find(
              (p) => p.id === 'bloodlust' || (p.text || '').toLowerCase().includes('kills an enemy unit')
            );
            if (bloodlustPassive && canTriggerPassiveThisTurn(activeTurnUnit, bloodlustPassive)) {
              bonusAp = 1;
              const pKey = bloodlustPassive.id || bloodlustPassive.name;
              nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
            }
          }

          // Deduct AP from attacking unit (plus any bonus AP from 1/Turn passives)
          const finalAp = newAp + bonusAp;
          attackFinalAp = finalAp;
          let finalCasterArmour = activeTurnUnit.armour + (activeAbility.id === 'telekinetic_rend' ? armourRemovedBeforeAttack : 0);
          // Armour gain per AP spent (e.g. Boulder Hurl: gain 1 armour per AP spent)
          // A conditional rider (e.g. Blessed Armament's "if no Shield of Blessings bonus") is handled below
          const armourEff = activeAbility.effects?.find(
            (e: any) =>
              e.type === 'armour' && (e.target === 'self' || !e.target) && !e.optional && !e.if
          );
          if (armourEff) {
            if (typeof armourEff.amount === 'object' && armourEff.amount !== null && typeof (armourEff.amount as any).perAP === 'number') {
              finalCasterArmour += (armourEff.amount as any).perAP * getApSpent(activeAbility);
            } else if (typeof armourEff.amount === 'number') {
              finalCasterArmour += armourEff.amount;
            } else if (typeof armourEff.upTo === 'number') {
              finalCasterArmour = Math.max(finalCasterArmour, armourEff.upTo);
            } else if (armourEff.upTo === 'armourDamaged') {
              // "Armour up to the number of armour damaged this way" (e.g. Siphoning Probosces)
              finalCasterArmour = Math.max(finalCasterArmour, Math.max(0, effectiveTargetArmour - newArmour));
            }
          }
          if (activeAbility.parentAbilityId === 'knightly_armament' || activeAbility.id?.startsWith('knightly_armament__')) {
            finalCasterArmour = Math.max(finalCasterArmour, 2);
          }
          // "If this attack did not deal bonus damage from Shield of Blessings, gain 2 armour" (Blessed Armament)
          const noBlessingArmour: any = activeAbility.effects?.find(
            (e: any) => e.type === 'armour' && e.if === 'noShieldOfBlessingsBonusDealt' && typeof e.amount === 'number'
          );
          const blessingBonusDealt =
            hitsToExecute.some((h) => h.appliedBonuses?.includes('shield_of_blessings')) ||
            multiHitRecords.some((r) => r.damage > 0 && Boolean(r.notes?.includes('Shield of Blessings')));
          if (noBlessingArmour && !blessingBonusDealt) {
            finalCasterArmour += noBlessingArmour.amount;
          }
          // Armour from attacking (e.g. Steal Plate: up to 1, or up to 3 if the target was armoured before the attack)
          if (onAttackArmour.upTo > 0) {
            finalCasterArmour = Math.max(finalCasterArmour, onAttackArmour.upTo);
          }
          // Armour the target's passive strips from the attacker (e.g. Corrosive Sludge)
          if (armourStrip) finalCasterArmour = Math.max(0, finalCasterArmour - armourStrip.amount);
          // Apply any self-damage inflicted by the ability (e.g. Reckless Blow)
          let casterArmourAfterDamage = finalCasterArmour;
          // Bloodrush heals first, then any recoil is applied on top
          casterCountersAfterDamage = Math.max(0, activeTurnUnit.damageCounters - bloodrushHeal);
          let casterTookDamage = false;

          if (totalRecoil > 0) {
            casterTookDamage = true;
            let remainingSelfDmg = totalRecoil;
            if (casterArmourAfterDamage > 0) {
              const absorbed = Math.min(casterArmourAfterDamage, remainingSelfDmg);
              casterArmourAfterDamage -= absorbed;
              remainingSelfDmg -= absorbed;
            }
            casterCountersAfterDamage += remainingSelfDmg;
          }

          casterDefeated = casterCountersAfterDamage >= activeTurnUnit.card.hp;

          // Check Sanguine Offering passive (Blood Sage: Whenever this unit takes damage, draw 1 card. Once per turn)
          if (casterTookDamage) {
            const unitPassives = getUnitPassives(activeTurnUnit);
            const sanguineOffering = unitPassives.find(
              (p) => p.id === 'sanguine_offering' || p.name === 'Sanguine Offering'
            );
            if (sanguineOffering && canTriggerPassiveThisTurn(activeTurnUnit, sanguineOffering)) {
              const pKey = sanguineOffering.id || sanguineOffering.name;
              nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
              nextCounts['sanguine_offering'] = (nextCounts['sanguine_offering'] || 0) + 1;
              drawCardForPlayer(activeTurnUnit.owner);
              healOnDraw(activeTurnUnit, 1);
              drewCardFromSelfDamage = true;
            }
          }

          // Check Loot passives on attacker:
          const attackerPassives = getUnitPassives(activeTurnUnit);
          const totalDmgDealt = isFeedingFrenzy ? 0 : ((effectiveTargetArmour - newArmour) + (newDamageCounters - targetUnit.damageCounters));
          const targetDistance = getHexDistance(activeTurnUnitHex, hexId);
          const isRangedAttack = activeAbility.tags?.includes('ranged') || targetDistance > 1 || Boolean(activeAbility.text?.toLowerCase().includes('ranged'));
          const attackerArmourDamage = Math.max(0, finalCasterArmour - casterArmourAfterDamage);
          const dmgToArmour = Math.max(0, effectiveTargetArmour - newArmour);

          // 1. Short Fuse (Powder Keg Plunderer): "Once per turn, when this unit deals damage with an attack, Loot 2."
          const shortFuse = attackerPassives.find((p) => p.id === 'short_fuse' || p.name === 'Short Fuse');
          if (shortFuse && totalDmgDealt > 0 && canTriggerPassiveThisTurn(activeTurnUnit, shortFuse)) {
            const pKey = shortFuse.id || shortFuse.name;
            nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
            nextCounts['short_fuse'] = (nextCounts['short_fuse'] || 0) + 1;
            lootTriggerAmount = Math.max(lootTriggerAmount, 2);
            lootTriggerTitle = 'Short Fuse';
          }

          // 2. Spoils (Swashbuckle Plunderer): "Once per turn, when this unit deals damage with an attack, Loot 2."
          const spoils = attackerPassives.find((p) => p.id === 'spoils' || p.name === 'Spoils');
          if (spoils && totalDmgDealt > 0 && canTriggerPassiveThisTurn(activeTurnUnit, spoils)) {
            const pKey = spoils.id || spoils.name;
            nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
            nextCounts['spoils'] = (nextCounts['spoils'] || 0) + 1;
            lootTriggerAmount = Math.max(lootTriggerAmount, 2);
            lootTriggerTitle = 'Spoils';
          }

          // 3. Twin Fury (Twinaxe Plunderer): "Once per turn, after this unit deals damage to an enemy unit with an attack, Loot 1. When you do, you may have this attack deal 4 damage to a different enemy unit within range 1 of this unit."
          const twinFury = attackerPassives.find((p) => p.id === 'twin_fury' || p.name === 'Twin Fury');
          if (twinFury && totalDmgDealt > 0 && canTriggerPassiveThisTurn(activeTurnUnit, twinFury)) {
            const pKey = twinFury.id || twinFury.name;
            nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
            nextCounts['twin_fury'] = (nextCounts['twin_fury'] || 0) + 1;
            lootTriggerAmount = Math.max(lootTriggerAmount, 1);
            lootTriggerTitle = 'Twin Fury';
            twinFuryActive = true;
          }

          // 4. Iron Clout (Dreadnought Privateer): "Once per turn, when this unit deals damage to armour or takes damage to its armour, Loot 1."
          const ironClout = attackerPassives.find((p) => p.id === 'iron_clout' || p.name === 'Iron Clout');
          if (ironClout && (dmgToArmour > 0 || attackerArmourDamage > 0) && canTriggerPassiveThisTurn(activeTurnUnit, ironClout)) {
            const pKey = ironClout.id || ironClout.name;
            nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
            nextCounts['iron_clout'] = (nextCounts['iron_clout'] || 0) + 1;
            lootTriggerAmount = Math.max(lootTriggerAmount, 1);
            lootTriggerTitle = 'Iron Clout';
          }

          // 5. Magnetized Plunder (Magnetic Marauder): "Once per turn, when a ranged attack from this unit deals damage to an enemy or its armour, Loot 2."
          const magPlunder = attackerPassives.find((p) => p.id === 'magnetized_plunder' || p.name === 'Magnetized Plunder');
          if (magPlunder && isRangedAttack && totalDmgDealt > 0 && canTriggerPassiveThisTurn(activeTurnUnit, magPlunder)) {
            const pKey = magPlunder.id || magPlunder.name;
            nextCounts[pKey] = (nextCounts[pKey] || 0) + 1;
            nextCounts['magnetized_plunder'] = (nextCounts['magnetized_plunder'] || 0) + 1;
            lootTriggerAmount = Math.max(lootTriggerAmount, 2);
            lootTriggerTitle = 'Magnetized Plunder';
          }

          // 6. Shrapnel Volley (Heavy Cannoneer): "Use a 1AP ranged attack from among the promoted cards as this ability for free, then Loot 1."
          if (activeAbility.parentAbilityId === 'shrapnel_volley' || activeAbility.id?.startsWith('shrapnel_volley__')) {
            lootTriggerAmount = Math.max(lootTriggerAmount, 1);
            lootTriggerTitle = 'Shrapnel Volley';
          }

          // Defender Iron Clout (Dreadnought Privateer):
          const defenderPassives = getUnitPassives(targetUnit);
          const defIronClout = defenderPassives.find((p) => p.id === 'iron_clout' || p.name === 'Iron Clout');
          if (!isFeedingFrenzy && defIronClout && dmgToArmour > 0 && canTriggerPassiveThisTurn(targetUnit, defIronClout)) {
            const pKey = defIronClout.id || defIronClout.name;
            const defCounts = targetUnit.usedTurnCounts || {};
            const nextDefCounts = { ...defCounts, [pKey]: (defCounts[pKey] || 0) + 1, 'iron_clout': (defCounts['iron_clout'] || 0) + 1 };
            if (!isDefeated) {
              next[hexId] = {
                ...next[hexId],
                usedTurnCounts: nextDefCounts
              };
            }
            defLootTriggered = true;
          }

          if (casterDefeated) {
            delete next[activeTurnUnitHex];
            if (activeTurnUnit.card.type !== 'token') {
              if (activeTurnUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
              }
            }
          } else {
            const nextLockedAbilities = { ...(activeTurnUnit.lockedAbilities || {}) };
            if (isOverloadGemstone) {
              nextLockedAbilities['overload_gemstone'] = {
                abilityId: 'overload_gemstone',
                sourceAbilityName: 'Overload Gemstone',
                lockedForPlayer: activeTurnUnit.owner,
                turnsRemaining: 2
              };
            }

            // "You cannot choose this unit to take your next turn unless it is your last non-token unit" (e.g. Overheat
            // Blaster): it takes effect once this turn is over
            const deniesSelf = activeAbility.effects?.some((e: any) => e.type === 'denyTurnSelection' && e.target === 'self');
            next[activeTurnUnitHex] = {
              ...activeTurnUnit,
              ...(deniesSelf && !activeTurnUnit.statuses?.includes(SELF_TURN_DENIED_PENDING)
                ? { statuses: [...(activeTurnUnit.statuses || []), SELF_TURN_DENIED_PENDING] }
                : {}),
              armour: casterArmourAfterDamage,
              damageCounters: casterCountersAfterDamage,
              tookDamageThisTurn: activeTurnUnit.tookDamageThisTurn || casterTookDamage,
              currentAp: finalAp,
              usedTurnCounts: nextCounts,
              lockedAbilities: Object.keys(nextLockedAbilities).length > 0 ? nextLockedAbilities : undefined,
              attacksUsedThisTurn: (activeTurnUnit.attacksUsedThisTurn || 0) + 1,
              usedOnTargets: {
                ...(activeTurnUnit.usedOnTargets || {}),
                [String(activeAbility.id)]: [
                  ...((activeTurnUnit.usedOnTargets || {})[String(activeAbility.id)] || []),
                  targetUnit.instanceId
                ]
              }
            };
          }

          if (isDefeated) {
            delete next[hexId];
            if (targetUnit.card.type !== 'token') {
              if (targetUnit.owner === 'player1') {
                setPlayer1Graveyard((g) => [...g, targetUnit.card]);
              } else {
                setPlayer2Graveyard((g) => [...g, targetUnit.card]);
              }
            }
            next = applyDestroyTriggers(activeTurnUnit, targetUnit, hexId, next);
            if (activeTurnUnit && hasNoxiousBurstPassive(activeTurnUnit) && targetUnit.owner !== activeTurnUnit.owner) {
              const nb = applyNoxiousBurst(activeTurnUnit, targetUnit, hexId, next);
              next = nb.updatedBoard;
              noxiousBurstVictims.push(...nb.affectedUnits);
            }
          } else {
            // Apply any extra damage if blocked on knockback
            const finalCounters = newDamageCounters + extraBlockedDamage;
            const defeatedFromBlocked = finalCounters >= targetUnit.card.hp;

            if (defeatedFromBlocked) {
              delete next[hexId];
              if (targetUnit.card.type !== 'token') {
                if (targetUnit.owner === 'player1') {
                  setPlayer1Graveyard((g) => [...g, targetUnit.card]);
                } else {
                  setPlayer2Graveyard((g) => [...g, targetUnit.card]);
                }
              }
              next = applyDestroyTriggers(activeTurnUnit, targetUnit, hexId, next);
              if (activeTurnUnit && hasNoxiousBurstPassive(activeTurnUnit) && targetUnit.owner !== activeTurnUnit.owner) {
                const nb = applyNoxiousBurst(activeTurnUnit, targetUnit, hexId, next);
                next = nb.updatedBoard;
                noxiousBurstVictims.push(...nb.affectedUnits);
              }
            } else if (knockbackDestination && knockbackDestination.tilesMoved > 0) {
              // Move target unit to final destination hex
              delete next[hexId];
              next[knockbackDestination.finalHex] = {
                ...venomTarget,
                hexId: knockbackDestination.finalHex,
                armour: newArmour,
                damageCounters: finalCounters,
                tookDamageThisTurn: isFeedingFrenzy ? venomTarget.tookDamageThisTurn : (venomTarget.tookDamageThisTurn || damage > 0)
              };
            } else if (activeAbility.id === 'tentacle_drag' && targetDist > 1 && !targetImmuneAfterHit) {
              // Tentacle Drag: If target is not on a tile surrounding this unit, place it on an empty tile surrounding this unit
              const emptySurrounding = getSurroundingHexes(activeTurnUnitHex).filter(
                (h) => !next[h] && h !== hexId
              );
              if (emptySurrounding.length > 0) {
                emptySurrounding.sort((a, b) => getHexDistance(a, hexId) - getHexDistance(b, hexId));
                const dragDestHex = emptySurrounding[0];
                delete next[hexId];
                next[dragDestHex] = {
                  ...venomTarget,
                  hexId: dragDestHex,
                  armour: newArmour,
                  damageCounters: finalCounters,
                  tookDamageThisTurn: isFeedingFrenzy ? venomTarget.tookDamageThisTurn : (venomTarget.tookDamageThisTurn || damage > 0)
                };
              } else {
                next[hexId] = {
                  ...venomTarget,
                  armour: newArmour,
                  damageCounters: finalCounters,
                  tookDamageThisTurn: isFeedingFrenzy ? venomTarget.tookDamageThisTurn : (venomTarget.tookDamageThisTurn || damage > 0)
                };
              }
            } else {
              next[hexId] = {
                ...venomTarget,
                armour: newArmour,
                damageCounters: finalCounters,
                tookDamageThisTurn: isFeedingFrenzy ? venomTarget.tookDamageThisTurn : (venomTarget.tookDamageThisTurn || damage > 0)
              };
            }
          }
          // Shared armour the target used (e.g. Battered Shield) is spent from the unit sharing it
          if (sharedArmourLost > 0 && sharedArmourInfo?.sharerHex && next[sharedArmourInfo.sharerHex]) {
            const sharer = next[sharedArmourInfo.sharerHex];
            next[sharedArmourInfo.sharerHex] = { ...sharer, armour: Math.max(0, sharer.armour - sharedArmourLost) };
          }
          // Apply Shield Bash & Cleave cleave damage to surrounding enemies
          if (activeAbility.id === 'shield_bash_and_cleave') {
            const surrounding = getSurroundingHexes(hexId);
            surrounding.forEach((sHex) => {
              const sUnit = next[sHex];
              if (sUnit && sUnit.owner !== activePlayer && sHex !== hexId) {
                let sArmour = sUnit.armour;
                let sRem = 4;
                if (sArmour > 0) {
                  if (sArmour >= sRem) {
                    sArmour -= sRem;
                    sRem = 0;
                  } else {
                    sRem -= sArmour;
                    sArmour = 0;
                  }
                }
                const sCounters = sUnit.damageCounters + sRem;
                if (sCounters >= sUnit.card.hp) {
                  delete next[sHex];
                  if (sUnit.card.type !== 'token') {
                    if (sUnit.owner === 'player1') {
                      setPlayer1Graveyard((g) => [...g, sUnit.card]);
                    } else {
                      setPlayer2Graveyard((g) => [...g, sUnit.card]);
                    }
                  }
                  next = applyDestroyTriggers(activeTurnUnit, sUnit, sHex, next);
                  if (activeTurnUnit && hasNoxiousBurstPassive(activeTurnUnit) && sUnit.owner !== activeTurnUnit.owner) {
                    const nb = applyNoxiousBurst(activeTurnUnit, sUnit, sHex, next);
                    next = nb.updatedBoard;
                    noxiousBurstVictims.push(...nb.affectedUnits);
                  }
                } else {
                  next[sHex] = {
                    ...sUnit,
                    armour: sArmour,
                    damageCounters: sCounters
                  };
                }
              }
            });
          }

          // Apply Full Bore secondary piercing hit if applicable
          if (secondaryHit) {
            const secUnit = next[secondaryHit.hexId];
            if (secUnit) {
              let secArmour = secUnit.armour;
              let secRem = secondaryHit.damage;
              if (secArmour > 0) {
                if (secArmour >= secRem) {
                  secArmour -= secRem;
                  secRem = 0;
                } else {
                  secRem -= secArmour;
                  secArmour = 0;
                }
              }
              const secCounters = secUnit.damageCounters + secRem;
              if (secCounters >= secUnit.card.hp) {
                delete next[secondaryHit.hexId];
                if (secUnit.card.type !== 'token') {
                  if (secUnit.owner === 'player1') {
                    setPlayer1Graveyard((g) => [...g, secUnit.card]);
                  } else {
                    setPlayer2Graveyard((g) => [...g, secUnit.card]);
                  }
                }
                next = applyDestroyTriggers(activeTurnUnit, secUnit, secondaryHit.hexId, next);
                if (activeTurnUnit && hasNoxiousBurstPassive(activeTurnUnit) && secUnit.owner !== activeTurnUnit.owner) {
                  const nb = applyNoxiousBurst(activeTurnUnit, secUnit, secondaryHit.hexId, next);
                  next = nb.updatedBoard;
                  noxiousBurstVictims.push(...nb.affectedUnits);
                }
              } else {
                next[secondaryHit.hexId] = {
                  ...secUnit,
                  armour: secArmour,
                  damageCounters: secCounters
                };
              }
            }
          }

          const stdDamageEvents: DamageEvent[] = [];
          if (!isFeedingFrenzy && (totalDmgDealt > 0 || extraBlockedDamage > 0)) {
            stdDamageEvents.push({
              hexId,
              damagedUnitOwner: targetUnit.owner,
              damageAmount: totalDmgDealt + extraBlockedDamage
            });
          }
          const unitPassives = getUnitPassives(activeTurnUnit);
          const hasVolatileHexes = unitPassives.some(
            (p) =>
              p.id === 'volatile_hexes' ||
              p.name === 'Volatile Hexes' ||
              p.effects?.some((e: any) => e.type === 'scorchTile' && e.tile === 'damagedUnitTile')
          );
          if (hasVolatileHexes && totalDmgDealt > 0) {
            const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
            setScorchedTiles((prev) => ({
              ...prev,
              [hexId]: {
                expiresOnTurnEndFor: opponent,
                casterPlayer: activePlayer
              }
            }));
          }
          // "The tile the target is on becomes scorched" from the ability (e.g. Flame Geyser, Flamethrower, Flaming
          // Cutlass's rider) or from attacking the same unit a second time this turn (e.g. Scorching Tempo)
          const scorchesTargetTile =
            getTargetTileScorch(activeAbility) ||
            (hasAttackedUnitThisTurn(activeTurnUnit, targetUnit.instanceId) ? getSecondAttackScorch(activeTurnUnit) : null);
          if (scorchesTargetTile && !isFeedingFrenzy) {
            const scorchOpponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
            setScorchedTiles((prev) => ({
              ...prev,
              [hexId]: {
                expiresOnTurnEndFor: scorchesTargetTile.duration === 'untilEndOfTurn' ? activePlayer : scorchOpponent,
                casterPlayer: activePlayer
              }
            }));
            showNotification(`🔥 ${scorchesTargetTile.name}: ${hexId} is scorched!`);
          }
          if (activeAbility.id === 'shield_bash_and_cleave') {
            const surrounding = getSurroundingHexes(hexId);
            surrounding.forEach((sHex) => {
              const sUnit = unitsOnBoard[sHex];
              if (sUnit && sUnit.owner !== activePlayer && sHex !== hexId) {
                stdDamageEvents.push({
                  hexId: sHex,
                  damagedUnitOwner: sUnit.owner,
                  damageAmount: 4
                });
              }
            });
          }
          if (secondaryHit) {
            const secUnit = unitsOnBoard[secondaryHit.hexId];
            if (secUnit) {
              stdDamageEvents.push({
                hexId: secondaryHit.hexId,
                damagedUnitOwner: secUnit.owner,
                damageAmount: secondaryHit.damage
              });
            }
          }
          if (casterTookDamage || readyStanceReturn > 0 || retaliationReturn > 0) {
            stdDamageEvents.push({
              hexId: activeTurnUnitHex,
              damagedUnitOwner: activeTurnUnit.owner,
              damageAmount: selfDamage + readyStanceReturn + retaliationReturn,
              nonAttack: true
            });
          }

          let finalNext = next;
          // Attacks that ignore passives don't trigger other units' damage passives either (e.g. Embedded Press)
          if (stdDamageEvents.length > 0 && !skipsPassives) {
            finalNext = applyDamageEventsAndPassives(stdDamageEvents, next);
          }

          checkVictory(finalNext);
          return finalNext;
        }));

        setActiveAbility(null);
        // Used up a waiting next-attack buff; maybe grant a next-armour-ability buff (e.g. Perfect Form)
        afterAttackUsed(activeTurnUnit);
        const isFree = cost === 0;

        // Riders once the attack has resolved, on the board as it now is
        const riderAttacker = activeTurnUnit;
        const riderTargetId = targetUnit.instanceId;
        const riderAbility = activeAbility;
        const riderCasterHex = activeTurnUnitHex;
        const landedMeleeHit =
          !isFeedingFrenzy && !isFriendlyTarget && isMeleeAttackAbility(activeAbility) && multiHitRecords.length > 0;
        const pullEff: any = activeAbility.effects?.find((e: any) => e.type === 'pull' && e.target === 'hitUnit');
        const followEff: any = activeAbility.effects?.find((e: any) => e.type === 'move' && e.tile === 'targetFormerTile');
        const mirrorEff: any = activeAbility.effects?.find((e: any) => e.type === 'mirrorDamage');
        const mirrorHolds =
          Boolean(mirrorEff) && (!mirrorEff.if || evalAttackerCondition(mirrorEff.if, activeTurnUnit, attackFromBehind) === true);
        const bounce =
          !isFriendlyTarget && isMeleeAttackAbility(activeAbility) && !skipsPassives && damage > 0
            ? getMeleeTargetedAttackerKnockback(targetUnit)
            : null;
        const engulfs =
          landedMeleeHit &&
          damage > 0 &&
          !isDefeated &&
          !activeTurnUnit.engulfedCard &&
          (targetUnit.card.basic === true || targetUnit.card.reinforce?.mode === 'basic') &&
          getUnitPassives(activeTurnUnit).some(
            (p) => p.trigger === 'self.damagesEnemyBasicUnitWithMeleeAttack' && (p.effects || []).some((e: any) => e.type === 'engulf')
          );
        const riderNotes: string[] = [];
        setUnitsOnBoard((prev) => {
          let next = prev;
          const hexOf = (id: string) => Object.keys(next).find((h) => next[h].instanceId === id);
          if (knockbackDestination && !isDefeated) next = applyKnockbackRiders(next, riderAttacker, riderTargetId);
          // "Whenever this unit hits an enemy unit with a melee attack, it deals N damage to all other enemy units
          // surrounding the target" (e.g. Conductive Strikes; Arcing Ambush from behind)
          if (landedMeleeHit) {
            const splash = getMeleeHitSplash(riderAttacker, hexId, targetUnit.owner, attackFromBehind, next).filter(
              (r) => r.hex !== hexId && next[r.hex]?.instanceId !== riderTargetId
            );
            next = resolvePassiveDamage(next, splash);
          }
          // "...it deals that much damage to the enemy unit on the other side of the target" (e.g. Cloudsplitter Glaive)
          if (mirrorHolds && damage > 0 && !isFeedingFrenzy) {
            const beyond = getHexBehind(riderCasterHex, hexId);
            if (beyond && next[beyond] && next[beyond].owner !== riderAttacker.owner) {
              next = resolvePassiveDamage(next, [{ hex: beyond, amount: damage, source: riderAbility.name }]);
            }
          }
          // "Pull the target N tiles toward this unit" (e.g. Barbed Tether, Caustic Vine)
          if (pullEff && !isDefeated) {
            const tHex = hexOf(riderTargetId);
            const cHex = hexOf(riderAttacker.instanceId);
            // ("Move the target unit 1 tile closer to this one", e.g. Stage Hook, is a move: a unit that cannot move
            // stays, and its move triggers apply)
            if (tHex && cHex && !isImmuneToNonDamageEffects(next[tHex], damage > 0) && !(pullEff.asMove && isUnitMovementDisabled(next[tHex]))) {
              const dest = getPullDestination(cHex, tHex, typeof pullEff.distance === 'number' ? pullEff.distance : 1, next);
              if (dest !== tHex) {
                const u = next[tHex];
                next = { ...next };
                delete next[tHex];
                next[dest] = { ...u, hexId: dest };
                riderNotes.push(`${pullEff.asMove ? 'moved' : 'pulled'} ${u.card.name} to ${dest}`);
                if (pullEff.asMove) next = applyMoveTriggers(next, u.instanceId, [dest], tHex);
              }
            }
          }
          // "Then, move this unit onto the tile the target was on if it is no longer there" (e.g. Flattening Roll)
          if (followEff && !next[hexId]) {
            const cHex = hexOf(riderAttacker.instanceId);
            if (cHex && !isUnitMovementDisabled(next[cHex])) {
              const u = next[cHex];
              next = { ...next };
              delete next[cHex];
              next[hexId] = {
                ...u,
                hexId,
                movedThisTurn: true,
                movesThisTurn: (u.movesThisTurn || 0) + 1,
                tilesMovedThisTurn: (u.tilesMovedThisTurn || 0) + getHexDistance(cHex, hexId)
              };
              riderNotes.push(`${u.card.name} rolled onto ${hexId}`);
              next = applyMoveTriggers(next, u.instanceId, [hexId], cHex);
            }
          }
          // "Whenever this unit takes damage from a melee attack, apply knockback 1 to the attacker" (e.g. Bouncy Membrane)
          if (bounce) {
            const cHex = hexOf(riderAttacker.instanceId);
            const tHex = hexOf(riderTargetId) || hexId;
            if (cHex && !isImmuneToKnockback(next[cHex])) {
              const dest = getKnockbackDestination(tHex, cHex, bounce.tiles, next);
              if (dest.tilesMoved > 0 && dest.finalHex !== cHex) {
                const u = next[cHex];
                next = { ...next };
                delete next[cHex];
                next[dest.finalHex] = { ...u, hexId: dest.finalHex };
                riderNotes.push(`${targetUnit.card.name}'s ${bounce.name} knocked ${u.card.name} back to ${dest.finalHex}`);
              }
            }
          }
          // "...place that unit under it. That unit is no longer in play, and it now also counts as the promoted unit"
          // (e.g. Engulf)
          if (engulfs) {
            const tHex = hexOf(riderTargetId);
            const cHex = hexOf(riderAttacker.instanceId);
            if (tHex && cHex) {
              const engulfed = next[tHex];
              leftPlayAliveRef.current.add(engulfed.instanceId);
              next = { ...next };
              delete next[tHex];
              next[cHex] = {
                ...next[cHex],
                engulfedCard: engulfed.card,
                engulfedOwner: engulfed.owner,
                promotedCards: [...(next[cHex].promotedCards || []), engulfed.card]
              };
              riderNotes.push(`${riderAttacker.card.name} engulfed ${engulfed.card.name}`);
              checkVictory(next);
            }
          }
          if (riderNotes.length > 0) showNotification(`${riderAbility.name}: ${riderNotes.join(' • ')}.`);
          return next;
        });

        let notif = '';
        if (isFeedingFrenzy) {
          const healedAmount = Math.max(0, targetUnit.damageCounters - newDamageCounters);
          const hitCount = multiHitRecords.length;
          const hitSpec = hitCount > 1 ? ` (${hitCount} hits)` : '';
          notif = `${activeTurnUnit.card.name} used ${activeAbility.name}${hitSpec} on friendly ${targetUnit.card.name}! Feeding Frenzy converted damage into ${damage} healing! (${targetUnit.card.name} healed ${healedAmount} damage, now 💥${newDamageCounters}/${targetUnit.card.hp} counters). (${isFree ? 'Free promoted ability' : `${cost} AP spent`})`;
        } else if (activeAbility.id === 'rip_and_tear') {
          if (armourRemovedBeforeAttack > 0) {
            notif = `${activeTurnUnit.card.name} used Rip and Tear! Removed all ${armourRemovedBeforeAttack} armour from ${targetUnit.card.name} and dealt 7 damage! ${
              isDefeated ? `${targetUnit.card.name} was defeated and sent to Graveyard!` : `(💥${newDamageCounters}/${targetUnit.card.hp} counters placed)`
            }`;
          } else {
            notif = `${activeTurnUnit.card.name} used Rip and Tear! No armour was removed, so Rip and Tear struck twice for 7 + 5 damage (${damage} total)! ${
              isDefeated ? `${targetUnit.card.name} was defeated and sent to Graveyard!` : `(💥${newDamageCounters}/${targetUnit.card.hp} counters placed)`
            }`;
          }
        } else if (activeAbility.id === 'shield_bash_and_cleave') {
          notif = `${activeTurnUnit.card.name} used Shield Bash & Cleave! ${
            armourRemovedBeforeAttack > 0 ? `Removed ${armourRemovedBeforeAttack} armour from ${targetUnit.card.name}. ` : ''
          }Dealt ${damage} damage to ${targetUnit.card.name} and cleaved surrounding enemies for 4 damage! ${
            isDefeated ? `${targetUnit.card.name} was defeated!` : `(💥${newDamageCounters}/${targetUnit.card.hp} counters placed)`
          }`;
        } else if (activeAbility.id === 'telekinetic_rend') {
          notif = `${activeTurnUnit.card.name} used Telekinetic Rend! Removed ${armourRemovedBeforeAttack} armour from ${targetUnit.card.name}, placed ${armourRemovedBeforeAttack} armour on ${activeTurnUnit.card.name}, and dealt ${damage} damage! ${
            isDefeated ? `${targetUnit.card.name} was defeated!` : `(💥${newDamageCounters}/${targetUnit.card.hp} counters placed)`
          }`;
        } else if (hitStructure.isMultiHit && multiHitRecords.length > 0) {
          const hitCount = multiHitRecords.length;
          const damages = multiHitRecords.map((h) => h.damage);
          const totalDmg = damages.reduce((sum, d) => sum + d, 0);
          const diffDamages = damages.some((d) => d !== damages[0]);

          let hitSpec = '';
          if (diffDamages) {
            // Subsequent hits deal different damage than the first: specify it!
            hitSpec = `${hitCount} hits: ${multiHitRecords.map((h) => `Hit ${h.hitIndex} dealt ${h.damage}`).join(', ')}`;
          } else {
            // All hits deal same damage
            hitSpec = `${hitCount} hits of ${damages[0]} damage each`;
          }

          const defeatedHit = multiHitRecords.find((h) => h.targetDefeated);
          const armNote = armourRemovedBeforeAttack > 0 ? `Removed ${armourRemovedBeforeAttack} armour. ` : '';
          if (defeatedHit) {
            notif = `${activeTurnUnit.card.name} used ${activeAbility.name} (${hitSpec})! ${armNote}${targetUnit.card.name} was defeated on Hit ${defeatedHit.hitIndex} (${totalDmg} total damage dealt) and sent to Graveyard! (${isFree ? 'Free promoted ability' : `${cost} AP spent`})`;
          } else {
            notif = `${activeTurnUnit.card.name} used ${activeAbility.name} (${hitSpec})! ${armNote}${targetUnit.card.name} took ${totalDmg} total damage (💥${newDamageCounters}/${targetUnit.card.hp} counters placed). (${isFree ? 'Free promoted ability' : `${cost} AP spent`})`;
          }
        } else {
          const armNote = armourRemovedBeforeAttack > 0 ? `Removed ${armourRemovedBeforeAttack} armour. ` : '';
          const bonusNote = multiHitRecords.length > 0 && multiHitRecords[0].notes ? ` (${multiHitRecords[0].notes})` : '';
          notif = isDefeated
            ? `${activeTurnUnit.card.name} used ${activeAbility.name}! ${armNote}Dealt ${damage} damage${bonusNote}! ${targetUnit.card.name} defeated and sent to Graveyard! (${isFree ? 'Free promoted ability' : `${cost} AP spent`})`
            : `${activeTurnUnit.card.name} used ${activeAbility.name}! ${armNote}${targetUnit.card.name} took ${damage} damage${bonusNote} (💥${newDamageCounters}/${targetUnit.card.hp} counters placed). ${isFree ? 'Free promoted ability' : `${cost} AP spent`}.`;
        }

        if (knockbackDestination && knockbackDestination.tilesMoved > 0 && !isDefeated) {
          notif += ` Knocked back ${knockbackDestination.tilesMoved} tile(s) to ${knockbackDestination.finalHex}!`;
        }

        if (secondaryHit) {
          const secUnit = unitsOnBoard[secondaryHit.hexId];
          notif += ` Full Bore also blasted ${secUnit?.card.name || 'unit'} at ${secondaryHit.hexId} for ${secondaryHit.damage} damage!`;
        }

        const reductionNotes = multiHitRecords
          .map((h) => h.notes)
          .filter(Boolean)
          .join(', ');
        if (reductionNotes) {
          notif += ` [${reductionNotes}]`;
        }

        if (selfDamage > 0) {
          notif += ` ${activeTurnUnit.card.name} took ${selfDamage} self-damage${
            casterDefeated ? ' (Defeated!)' : ` (💥${casterCountersAfterDamage}/${activeTurnUnit.card.hp})`
          }.${drewCardFromSelfDamage ? ' Sanguine Offering triggered: drew 1 card!' : ''}`;
        }
        const actualHeal = Math.min(bloodrushHeal, activeTurnUnit.damageCounters);
        if (actualHeal > 0) {
          notif += ` ${attackHealSources.map((h) => h.name).join(' & ')} healed ${actualHeal} damage.`;
        }
        // Burn Fuel and the like happen once per turn: record that it did (after the attack's own board update)
        if (firstDamageHeal && !casterDefeated) {
          const healerId = activeTurnUnit.instanceId;
          setUnitsOnBoard((prev) => {
            const h = Object.keys(prev).find((k) => prev[k].instanceId === healerId);
            if (!h) return prev;
            return {
              ...prev,
              [h]: { ...prev[h], passiveTurnMarks: { ...(prev[h].passiveTurnMarks || {}), [firstDamageHeal.markKey]: turnCount } }
            };
          });
        }
        // "When this unit is hit by a melee attack, the attacker cannot move during your opponent's next turn"
        // (e.g. Trapping Teeth)
        const meleeTrap =
          !isFeedingFrenzy && isMeleeAttackAbility(activeAbility) && multiHitRecords.length > 0 ? getMeleeHitTrap(targetUnit) : null;
        if (meleeTrap && !casterDefeated) {
          const trappedId = activeTurnUnit.instanceId;
          setUnitsOnBoard((prev) => {
            const h = Object.keys(prev).find((k) => prev[k].instanceId === trappedId);
            return h ? { ...prev, [h]: applyCannotMoveThisTurn(prev[h]) } : prev;
          });
          notif += ` 🪤 ${targetUnit.card.name}'s ${meleeTrap}: ${activeTurnUnit.card.name} can't move for the rest of this turn.`;
        }
        if (readyStancePrevented > 0) {
          if (isImmuneToReactEffects(activeTurnUnit)) {
            notif += ` 🛡️ ${targetUnit.card.name}'s Ready Stance prevented ${readyStancePrevented} damage, but ${activeTurnUnit.card.name} is Nightbound (cannot be targeted by react effects)! No return damage dealt.`;
          } else {
            notif += ` 🛡️ ${targetUnit.card.name}'s Ready Stance prevented ${readyStancePrevented} damage and dealt ${readyStanceReturn} back to ${activeTurnUnit.card.name}${casterDefeated ? ' (Defeated!)' : ''}.`;
          }
        }
        if (retaliationReturn > 0) {
          notif += ` 💎 ${targetUnit.card.name}'s ${retaliation.sources.join(' & ')} dealt ${retaliationReturn} damage back to ${activeTurnUnit.card.name}${casterDefeated ? ' (Defeated!)' : ''}.`;
        }
        if (isOverloadGemstone && !casterDefeated) {
          notif += ` [Overload Gemstone: Locked during your next turn]`;
        }
        if (isFlowingStanceActive(activeTurnUnit) && getHexDistance(activeTurnUnitHex, hexId) === 2 && (activeAbility.tags?.includes('melee') || activeAbility.text?.toLowerCase().includes('melee'))) {
          notif += ` [Flowing Stance: Range 2 melee strike]`;
        }
        if (hasCephalopodReach(activeTurnUnit) && targetDist > 1 && (activeAbility.tags?.includes('melee') || activeAbility.text?.toLowerCase().includes('melee'))) {
          notif += ` [🐙 Cephalopod Reach: +1 Range melee strike]`;
        }
        if (activeAbility.id === 'tentacle_drag' && !isDefeated && targetDist > 1) {
          notif += ` [🐙 Tentacle Drag: Dragged target to surrounding tile]`;
        }
        if (flawlessParryPrevented > 0) {
          const parryReason = isImmuneToReactEffects(activeTurnUnit)
            ? `(${activeTurnUnit.card.name} is Nightbound: cannot be targeted by react effects so attack was not reflected).`
            : `(Attacker was at Range ${targetDist}, outside Range 1 so attack was not reflected).`;
          notif += ` 🛡️ ${targetUnit.card.name}'s Flawless Parry prevented ${flawlessParryPrevented} damage! ${parryReason}`;
        }
        if (activeAbility.id === 'ice_lance' && !isDefeated) {
          notif += ` [🧊 Ice Lance: ${targetUnit.card.name} cannot be promoted or fused during opponent's next turn!]`;
        }
        if (onAttackArmour.upTo > 0) {
          notif += ` [${activeTurnUnit.card.name}'s ${onAttackArmour.sources.join(' & ')}: armoured up to ${onAttackArmour.upTo}]`;
        }
        if (targetedScry && targetedScry.armour > 0) {
          notif += ` [${targetUnit.card.name}'s ${targetedScry.name}: +${targetedScry.armour} armour before the hit]`;
        }
        if (targetSilenced && !isDefeated) {
          notif += ` [🔇 ${targetUnit.card.name} has no passives until the end of its next turn!]`;
        }
        if (skipsReacts || skipsPassives) {
          notif += ` [${activeAbility.name} ignored react effects and passives]`;
        }
        showNotification(notif);

        if (noxiousBurstVictims.length > 0) {
          const uniqueVictims = Array.from(new Set(noxiousBurstVictims.map((u) => u.card.name)));
          showNotification(
            `☠️ Noxious Burst triggered! Surrounding units (${uniqueVictims.join(', ')}) lose 1AP if they take the next turn!`
          );
        }

        if (defLootTriggered) {
          triggerLoot(targetUnit.owner, 1, 'Iron Clout', targetUnit.card.name, { unitHex: hexId });
        }

        // The defender's look at the top of their deck from a targeted scry passive (e.g. Preemptive Counter).
        // Their choice, so the camera turns to them; this attack's turn end waits for the choice.
        const defenderDeck = targetUnit.owner === 'player1' ? player1Deck : player2Deck;
        const startsTargetedScry = Boolean(targetedScry) && defenderDeck.length > 0;
        if (startsTargetedScry && targetedScry) {
          const scryOwner = targetUnit.owner;
          const scryUnitName = targetUnit.card.name;
          const scryAfterAp =
            casterDefeated || lootTriggerAmount > 0 || activeAbility.inProviderChain ? undefined : attackFinalAp;
          // Queued: the camera turns to the defender when it opens
          enqueuePopup(scryOwner, `${targetedScry.name}: Scry 1`, (ctx) => {
            const d = scryOwner === 'player1' ? ctx.p1Deck : ctx.p2Deck;
            if (d.length === 0) {
              if (scryAfterAp !== undefined && scryAfterAp <= 0) endTurnAfterPopups();
              return;
            }
            setScryPending({
              card: d[0],
              player: scryOwner,
              unitName: scryUnitName,
              sourceTitle: `${targetedScry.name}: Scry 1`,
              abilityName: targetedScry.name,
              afterAp: scryAfterAp
            });
          });
        }

        if (casterDefeated) {
          setActiveTurnUnitHex(null);
          setSelectedHex(null);
          switchTurn(false);
          return;
        }

        // Reveal and rearrange the top of your deck after the hit (e.g. Scroll-Bound Strike)
        const arrangeEffect: any = activeAbility.effects?.find(
          (e: any) => e.type === 'revealTop' && e.deck === 'own' && e.rearrange
        );
        const ownDeckNow = activePlayer === 'player1' ? player1Deck : player2Deck;
        const startsDeckArrange = Boolean(arrangeEffect) && ownDeckNow.length > 0;
        if (startsDeckArrange) {
          const revealCount = typeof arrangeEffect.count === 'number' ? arrangeEffect.count : 2;
          const arrangePlayer = activePlayer;
          const arrangeUnitName = activeTurnUnit.card.name;
          const arrangeAbilityName = activeAbility.name;
          // The arrange popup ends the turn when it closes, unless loot or a chain is handling that
          const arrangeAfterAp = lootTriggerAmount > 0 || activeAbility.inProviderChain ? undefined : attackFinalAp;
          // Reveals the top of the deck as it is when the popup opens (an earlier loot may have drawn from it)
          enqueuePopup(arrangePlayer, `${arrangeAbilityName}: reveal and arrange`, (ctx) => {
            const d = arrangePlayer === 'player1' ? ctx.p1Deck : ctx.p2Deck;
            if (d.length === 0) {
              if (arrangeAfterAp !== undefined && arrangeAfterAp <= 0) endTurnAfterPopups();
              return;
            }
            setDeckArrangePending({
              player: arrangePlayer,
              unitName: arrangeUnitName,
              abilityName: arrangeAbilityName,
              afterAp: arrangeAfterAp,
              cards: d.slice(0, revealCount),
              index: 0,
              tops: [],
              bottoms: [],
              orderedTops: [],
              orderedBottoms: []
            });
          });
        }

        if (lootTriggerAmount > 0) {
          triggerLoot(activePlayer, lootTriggerAmount, lootTriggerTitle, activeTurnUnit.card.name, {
            unitHex: activeTurnUnitHex,
            afterAp: activeAbility.inProviderChain ? undefined : attackFinalAp,
            postLootCallback: twinFuryActive ? () => {
              setUnitsOnBoard((prevUnits) => {
                const surrounding = getSurroundingHexes(activeTurnUnitHex);
                const otherEnemyHex = surrounding.find((h) => prevUnits[h] && prevUnits[h].owner !== activePlayer && h !== hexId);
                if (!otherEnemyHex) return prevUnits;
                const otherUnit = prevUnits[otherEnemyHex];
                let oArmour = otherUnit.armour;
                let oDamage = 4;
                if (oArmour > 0) {
                  if (oArmour >= oDamage) {
                    oArmour -= oDamage;
                    oDamage = 0;
                  } else {
                    oDamage -= oArmour;
                    oArmour = 0;
                  }
                }
                const oCounters = otherUnit.damageCounters + oDamage;
                const nextB = { ...prevUnits };
                if (oCounters >= otherUnit.card.hp) {
                  delete nextB[otherEnemyHex];
                  if (otherUnit.card.type !== 'token') {
                    if (otherUnit.owner === 'player1') setPlayer1Graveyard((g) => [...g, otherUnit.card]);
                    else setPlayer2Graveyard((g) => [...g, otherUnit.card]);
                  }
                  showNotification(`⚡ Twin Fury: Cleaved ${otherUnit.card.name} at ${otherEnemyHex} for 4 damage (Defeated!)`);
                } else {
                  nextB[otherEnemyHex] = {
                    ...otherUnit,
                    armour: oArmour,
                    damageCounters: oCounters
                  };
                  showNotification(`⚡ Twin Fury: Cleaved ${otherUnit.card.name} at ${otherEnemyHex} for 4 damage!`);
                }
                let nextBWithPress = nextB;
                if (otherUnit && (oDamage > 0 || otherUnit.armour > oArmour)) {
                  nextBWithPress = applyDamageEventsAndPassives(
                    [{ hexId: otherEnemyHex, damagedUnitOwner: otherUnit.owner, damageAmount: 4 }],
                    nextB
                  );
                }
                checkVictory(nextBWithPress);
                return nextBWithPress;
              });
            } : undefined
          });
          return;
        }

        // Automatically end turn when actions cannot be taken (only if AP was spent)
        // A prepaid free attack (e.g. Seer's Visions) costs 0 here but its parent already spent the AP
        // Chain steps never end the turn here: the chain does that when it finishes (as does an open deck arrange)
        // A free 1-tile move after the attack: the ability's own (e.g. Radiant Swoop; Crescent Slash if it was the first
        // ability this turn; Lethal Fangs if it killed the target) or a passive's (e.g. Predator's Rhythm the first time
        // it deals damage each turn, Blood Moon Frenzy on its second attack on the same unit this turn). The turn waits for it.
        const afterMove = getAfterAttackMove(activeAbility);
        const afterMoveHolds =
          Boolean(afterMove) &&
          (!afterMove!.if ||
            (afterMove!.if === 'targetKilled'
              ? isDefeated
              : evalAttackerCondition(afterMove!.if, activeTurnUnit, attackFromBehind) === true));
        const passiveMove =
          !isFeedingFrenzy && !isFriendlyTarget
            ? getAttackFreeMovePassive(
                activeTurnUnit,
                damage > 0,
                countAttacksOnUnitThisTurn(activeTurnUnit, targetUnit.instanceId),
                turnCount
              )
            : null;
        const freeMoveSource = afterMoveHolds ? activeAbility.name : passiveMove?.name;
        const offersFreeMove = Boolean(freeMoveSource) && !isUnitMovementDisabled(activeTurnUnit) && !activeAbility.inProviderChain;
        if (offersFreeMove) {
          if (passiveMove?.markKey && !afterMoveHolds) {
            const markKey = passiveMove.markKey;
            const id = activeTurnUnit.instanceId;
            setUnitsOnBoard((prev) => {
              const h = Object.keys(prev).find((k) => prev[k].instanceId === id);
              return h
                ? { ...prev, [h]: { ...prev[h], passiveTurnMarks: { ...(prev[h].passiveTurnMarks || {}), [markKey]: turnCount } } }
                : prev;
            });
          }
          setPendingFreeMove({ unitInstanceId: activeTurnUnit.instanceId, sourceName: freeMoveSource! });
          setIsMovingMode(true);
          showNotification(`${freeMoveSource}: you may move ${activeTurnUnit.card.name} 1 tile for free (or click Skip).`);
        }

        if (
          !offersFreeMove &&
          !startsDeckArrange &&
          !startsTargetedScry &&
          (cost > 0 || (activeAbility.prepaidByParent && !activeAbility.inProviderChain)) &&
          attackFinalAp <= 0
        ) {
          switchTurn(false);
        }
        return;
      }
    }

    // Case 3: Selecting a unit to take a turn (Rule 6)
    // When a unit starts taking a turn, refresh its AP to full and uses of limited actions like Draw to full, and refresh 1/Turn counts to 0
    const unitOnHex = unitsOnBoard[hexId];
    if (unitOnHex) {
      if (unitOnHex.owner === activePlayer && lockedAssist) {
        showNotification(`Finish ${lockedAssist.card.name}'s Assist (${lockedAssist.ability.name}) or click Cancel Assist first.`);
        return;
      }
      if (unitOnHex.owner === activePlayer) {
        const turnChoice = canChooseUnitForTurn(unitOnHex, unitsOnBoard, activePlayer);
        if (!turnChoice.allowed) {
          showNotification(turnChoice.reason || 'That unit cannot take this turn.');
          setSelectedHex(hexId);
          return;
        }
        // Allow switching units during turn, but only if no AP has been spent (no indicator, just allow it)
        if (activeTurnUnitHex) {
          if (activeTurnUnitHex !== hexId) {
            const hasSpentAp =
              activeTurnUnit &&
              (activeTurnUnit.currentAp < (activeTurnUnit.turnStartingAp ?? activeTurnUnit.card.ap) ||
                activeTurnUnit.usedUniversalDrawThisTurn ||
                activeTurnUnit.lockedIn ||
                getAttacksUsedThisTurn(activeTurnUnit) > 0 ||
                activeTurnUnit.movedThisTurn);
            if (hasSpentAp) {
              showNotification(
                `Cannot switch units during a turn. You must complete your turn with ${activeTurnUnit?.card.name || 'your chosen unit'}.`
              );
              return;
            }
            // No AP has been spent on the previous unit, allow smooth switch to hexId!
          } else {
            // Same unit already taking the turn
            setSelectedHex(hexId);
            return;
          }
        }

        setActiveTurnUnitHex(hexId);
        setActiveAbility(null);
        setSelectedHandIndex(null);
        setIsMovingMode(false);
        // Refresh unit AP to full (or 1 less AP if afflicted with Noxious Burst), and refresh 1/Turn counts to 0
        const { startingAp, hadNoxiousBurst, windchill } = getStartingApForTurn(unitOnHex, unitsOnBoard);
        const refreshedAp = startingAp;
        setUnitsOnBoard((prev) => {
          const current = prev[hexId] || unitOnHex;
          const unitAfterNoxious = consumeNoxiousBurstStatus(current);
          // Apply turnstart passives for this unit if not already applied this turn (the turn key says)
          const singleUnitBoard: Record<string, BattlefieldUnit> = { [hexId]: unitAfterNoxious };
          const { updatedUnits: passiveUpdated } = applyTurnStartPassives(singleUnitBoard, activePlayer, turnStartKeyRef.current);
          const unitAfterPassive = passiveUpdated[hexId] || unitAfterNoxious;

          return {
            ...prev,
            [hexId]: {
              ...unitAfterPassive,
              currentAp: refreshedAp,
              turnStartingAp: refreshedAp,
              usedUniversalDrawThisTurn: false,
              attacksUsedThisTurn: 0,
              usedTurnCounts: {},
              usedOnTargets: {},
              tookDamageThisTurn: false,
              movedThisTurn: false,
              movesThisTurn: 0,
              lockedIn: false,
            }
          };
        });
        playCardDrawSound();
        const nbNote = `${hadNoxiousBurst ? ' (Afflicted by Noxious Burst: Starts turn with 1 less AP!)' : ''}${windchill ? ` (${windchill}: 1 less AP)` : ''}`;
        showNotification(`${unitOnHex.card.name} is taking the turn! (${refreshedAp} AP available)${nbNote}`);
        triggerForesight(unitOnHex);
        triggerTurnTakenPassives(unitOnHex);
        resolveDamageOnTakingTurn(hexId, unitOnHex, unitsOnBoard);
      } else {
        showNotification(`Enemy unit: ${unitOnHex.card.name} (${unitOnHex.card.hp - unitOnHex.damageCounters}/${unitOnHex.card.hp} HP).`);
      }
      setSelectedHex(hexId);
      return;
    }

    setSelectedHex((prev) => (prev === hexId ? null : hexId));
  };

  // Unit Drag-and-Drop Movement (Rule 6.2.2)
  // Ensure units are allowed to move to ANY empty surrounding tile for 1AP by dragging (drag and drop only)
  // One more universal Move action this turn (read by "only as this unit's Nth action", e.g. Fatal Error!)
  const countUniversalMove = (counts: Record<string, number> | undefined) => ({
    ...(counts || {}),
    [UNIVERSAL_MOVE_KEY]: ((counts || {})[UNIVERSAL_MOVE_KEY] || 0) + 1
  });

  const handleUnitMove = (fromHexId: string, toHexId: string) => {
    if (readySpellReact) {
      showNotification(`Interrupting: use ${readySpellReact.ability.name}, or cancel it.`);
      return;
    }
    if (lockedAssist || pendingAssistDeployment) {
      showNotification("Locked in to Assist deployment/action: Select target/placement or click Cancel Assist.");
      return;
    }
    if (providerChain) {
      showNotification(`Finish or cancel ${providerChain.parent.name} first.`);
      return;
    }
    if (pendingRabbleMove) {
      // A drag onto a highlighted landing tile takes the extra move
      if (pendingRabbleMove.choices.includes(toHexId)) handleExecuteRabbleMove(toHexId);
      else showNotification(`Finish ${pendingRabbleMove.passiveName}'s move first.`);
      return;
    }
    if (gamePhase !== 'playing') return;
    const movingUnit = unitsOnBoard[fromHexId];
    if (!movingUnit || movingUnit.owner !== activePlayer) return;
    if (activeTurnUnitHex !== fromHexId) {
      const turnChoice = canChooseUnitForTurn(movingUnit, unitsOnBoard, activePlayer);
      if (!turnChoice.allowed) {
        showNotification(turnChoice.reason || 'That unit cannot take this turn.');
        return;
      }
    }
    // When starting a turn by dragging, refresh AP to full (accounting for Noxious Burst) if unit hasn't started its turn yet
    let currentUnit = movingUnit;
    let hadNbOnDrag = false;
    if (activeTurnUnitHex !== fromHexId) {
      const { startingAp, hadNoxiousBurst } = getStartingApForTurn(movingUnit, unitsOnBoard);
      hadNbOnDrag = hadNoxiousBurst;
      const unitAfterNb = consumeNoxiousBurstStatus(movingUnit);
      currentUnit = {
        ...unitAfterNb,
        currentAp: startingAp,
        turnStartingAp: startingAp,
        usedUniversalDrawThisTurn: false,
        usedTurnCounts: {},
        attacksUsedThisTurn: 0,
        usedOnTargets: {},
        movedThisTurn: false,
        movesThisTurn: 0,
        lockedIn: false,
      };
    }

    const wasFirstMove = !currentUnit.movedThisTurn;

    // A free move granted by an ability (e.g. Shadow Cast) costs no AP
    const isFreeMove = Boolean(pendingFreeMove && pendingFreeMove.unitInstanceId === currentUnit.instanceId);
    const moveCost = isFreeMove ? 0 : getUniversalMoveCost(currentUnit, unitsOnBoard);
    if (currentUnit.currentAp < moveCost) {
      showNotification(`${currentUnit.card.name} does not have enough AP to move (Requires ${moveCost} AP).`);
      return;
    }

    // Check cannot move (walls, blazing fixture, tokens with cannotMove, pincer clamp)
    const movingPassives = getUnitPassives(movingUnit);
    if (
      movingUnit.card.isWall ||
      movingPassives.some((p) => p.effects?.some((e) => e.type === 'cannotMove')) ||
      movingUnit.card.id === 'raging_bonfire' ||
      movingUnit.card.id === 'obstructing_wall' ||
      movingUnit.statuses?.includes(CANNOT_MOVE) ||
      movingUnit.statuses?.includes(CANT_MOVE_SELF)
    ) {
      showNotification(getMoveBlockedMessage(movingUnit));
      return;
    }

    if (!canOmnipresenceUnitMove(movingUnit)) {
      showNotification("Magical Omnipresence: This unit may only move once per turn.");
      return;
    }

    // Must be an empty surrounding tile, or Range 2 tile for Magical Omnipresence, or legal wraparound boundary via Esoteric Pathways
    const surrounding = getSurroundingHexes(fromHexId);
    const esotericHexes = hasEsotericPathways(movingUnit)
      ? getEsotericPathwaysHexes(fromHexId, unitsOnBoard)
      : [];
    const isEsotericMove = esotericHexes.includes(toHexId);
    const isOmni = hasMagicalOmnipresence(movingUnit);
    const moveDist = getHexDistance(fromHexId, toHexId);
    const isOmniMove = isOmni && moveDist >= 1 && moveDist <= 2;

    if (!surrounding.includes(toHexId) && !isEsotericMove && !isOmniMove) {
      showNotification(
        isOmni
          ? "Magical Omnipresence: Can move to any empty tile within Range 2."
          : "Units can only move to an empty surrounding tile or legal wraparound boundary."
      );
      return;
    }
    const moveThrough = getMoveThroughPassive(currentUnit, turnCount);
    // A move is an action an enemy's readied react may interrupt (e.g. Ready Spell). Only for the unit already taking
    // the turn: a drag that starts a turn chooses the unit first.
    if (
      !isFreeMove &&
      activeTurnUnitHex === fromHexId &&
      (!unitsOnBoard[toHexId] || moveThrough) &&
      offerReadySpellInterrupt({ kind: 'move', fromHex: fromHexId, toHex: toHexId })
    ) {
      return;
    }
    const trample = getTramplingMove(currentUnit);
    if (unitsOnBoard[toHexId] && trample && unitsOnBoard[toHexId].owner !== currentUnit.owner && !moveThrough) {
      // Trampling Path: knock the enemy back from this unit; if its tile is then empty, armour up and move onto it
      const occupant = unitsOnBoard[toHexId];
      const kb = isImmuneToKnockback(occupant) ? null : getKnockbackDestination(fromHexId, toHexId, trample.knockback, unitsOnBoard);
      const cleared = Boolean(kb && kb.tilesMoved > 0 && kb.finalHex !== toHexId);
      const trampleAp = currentUnit.currentAp - moveCost;
      const trampleDir = getHexMovementDirection(fromHexId, toHexId);
      const scorchHit = cleared && !isImmuneToScorchDamage(currentUnit) && (isTileScorched(fromHexId, unitsOnBoard, scorchedTiles) || isTileScorched(toHexId, unitsOnBoard, scorchedTiles)) ? reduceNonAttackDamage(currentUnit, 4) : 0;
      const moverId = currentUnit.instanceId;
      setUnitsOnBoard((prev) => {
        let next = { ...prev };
        if (cleared && kb && next[toHexId]) {
          const o = next[toHexId];
          delete next[toHexId];
          next[kb.finalHex] = { ...o, hexId: kb.finalHex };
        }
        next = applyKnockbackRiders(next, currentUnit, occupant.instanceId);
        const me = next[fromHexId];
        if (!me) return next;
        const spent: BattlefieldUnit = {
          ...me,
          currentAp: trampleAp,
          statuses: me.statuses?.filter((s) => s !== MOVE_TAX),
          movedThisTurn: true,
          movesThisTurn: (me.movesThisTurn || 0) + 1,
          usedTurnCounts: isFreeMove ? me.usedTurnCounts : countUniversalMove(me.usedTurnCounts)
        };
        if (!cleared || next[toHexId]) {
          next[fromHexId] = spent;
          return next;
        }
        const absorbed = Math.min(Math.max(spent.armour, trample.armourUpTo), scorchHit);
        delete next[fromHexId];
        next[toHexId] = {
          ...spent,
          hexId: toHexId,
          armour: Math.max(spent.armour, trample.armourUpTo) - absorbed,
          damageCounters: spent.damageCounters + scorchHit - absorbed,
          movedDirectionsThisTurn: trampleDir !== null ? [...(spent.movedDirectionsThisTurn || []), trampleDir] : spent.movedDirectionsThisTurn,
          tilesMovedThisTurn: (spent.tilesMovedThisTurn || 0) + 1
        };
        if (next[toHexId].damageCounters >= next[toHexId].card.hp) {
          sendToGraveyard([next[toHexId]]);
          delete next[toHexId];
          checkVictory(next);
          return next;
        }
        return applyMoveTriggers(next, moverId, [toHexId], fromHexId);
      });
      setActiveAbility(null);
      setIsMovingMode(false);
      if (isFreeMove) setPendingFreeMove(null);
      playCardDrawSound();
      if (cleared) {
        setActiveTurnUnitHex(toHexId);
        setSelectedHex(toHexId);
      }
      showNotification(
        cleared
          ? `${currentUnit.card.name}'s ${trample.name}: knocked back ${occupant.card.name}, armoured up to ${trample.armourUpTo} and moved to ${toHexId}${scorchHit > 0 ? ` (took ${scorchHit} scorched tile damage)` : ''}.`
          : `${currentUnit.card.name}'s ${trample.name}: ${occupant.card.name} couldn't be knocked off ${toHexId}, so ${currentUnit.card.name} stays put.`
      );
      if (trampleAp <= 0) switchTurn(false);
      return;
    }
    // "When this unit moves, if it is on a tile with another unit on it, that unit moves with it" (e.g. Hidden Strings):
    // like Engulf, moving onto a unit picks it up (out of play while carried, one at a time); it is put down on the last
    // empty tile this unit left when the turn ends. A unit that can't move isn't picked up (this unit lands around it).
    if (
      unitsOnBoard[toHexId] &&
      moveThrough?.carriesUnit &&
      !currentUnit.carriedUnit &&
      !isUnitMovementDisabled(unitsOnBoard[toHexId])
    ) {
      const carried = unitsOnBoard[toHexId];
      const carryAp = currentUnit.currentAp - moveCost;
      const carryDir = getHexMovementDirection(fromHexId, toHexId);
      const carryScorch =
        !isImmuneToScorchDamage(currentUnit) &&
        (isTileScorched(fromHexId, unitsOnBoard, scorchedTiles) || isTileScorched(toHexId, unitsOnBoard, scorchedTiles))
          ? reduceNonAttackDamage(currentUnit, 4)
          : 0;
      const absorbed = Math.min(currentUnit.armour, carryScorch);
      const carrierDies = currentUnit.damageCounters + carryScorch - absorbed >= currentUnit.card.hp;
      const moverId = currentUnit.instanceId;
      if (!carrierDies) leftPlayAliveRef.current.add(carried.instanceId);
      setUnitsOnBoard((prev) => {
        const me = prev[fromHexId];
        const other = prev[toHexId];
        if (!me || me.instanceId !== moverId || !other || other.instanceId !== carried.instanceId) return prev;
        const next = { ...prev };
        delete next[fromHexId];
        const moved: BattlefieldUnit = {
          ...me,
          hexId: toHexId,
          currentAp: carryAp,
          armour: me.armour - absorbed,
          damageCounters: me.damageCounters + carryScorch - absorbed,
          statuses: me.statuses?.filter((s) => s !== MOVE_TAX),
          movedThisTurn: true,
          movesThisTurn: (me.movesThisTurn || 0) + 1,
          movedDirectionsThisTurn: carryDir !== null ? [...(me.movedDirectionsThisTurn || []), carryDir] : me.movedDirectionsThisTurn,
          tilesMovedThisTurn: (me.tilesMovedThisTurn || 0) + 1,
          usedTurnCounts: isFreeMove ? me.usedTurnCounts : countUniversalMove(me.usedTurnCounts),
          carriedUnit: { unit: other, lastLeftHex: fromHexId, sourceName: moveThrough.name }
        };
        if (carrierDies) {
          // (it dies on the scorched tile before picking the unit up: that unit stays where it is)
          sendToGraveyard([moved]);
          checkVictory(next);
          return next;
        }
        next[toHexId] = moved;
        return applyMoveTriggers(next, moverId, [toHexId], fromHexId);
      });
      setActiveAbility(null);
      setIsMovingMode(false);
      if (isFreeMove) setPendingFreeMove(null);
      playCardDrawSound();
      if (carrierDies) {
        setActiveTurnUnitHex(null);
        setSelectedHex(null);
        showNotification(`${currentUnit.card.name} took ${carryScorch} scorched tile damage and was defeated!`);
        switchTurn(false);
        return;
      }
      setActiveTurnUnitHex(toHexId);
      setSelectedHex(toHexId);
      showNotification(
        `🎭 ${currentUnit.card.name}'s ${moveThrough.name}: picked up ${carried.card.name} on ${toHexId}; it moves with ${currentUnit.card.name} and is put down on the last empty tile it left when the turn ends${carryScorch > 0 ? ` (took ${carryScorch} scorched tile damage)` : ''}.`
      );
      if (carryAp <= 0) switchTurn(false);
      return;
    }
    if (unitsOnBoard[toHexId]) {
      const occupant = unitsOnBoard[toHexId];
      const landing = getLandingTilesAround(toHexId, fromHexId, unitsOnBoard);
      // Move-through passive (Rabble Rouse): the first move of the turn may go into an enemy, dealing damage to it
      // (a flying passive, e.g. Aerial Apex: any move, over any unit or obstacle)
      const canPassThrough =
        moveThrough?.throughUnits &&
        (moveThrough.everyMove || wasFirstMove) &&
        (moveThrough.anyUnit || occupant.owner !== currentUnit.owner) &&
        landing.length > 0;
      if (!moveThrough || !canPassThrough) {
        showNotification(`Tile ${toHexId} is occupied.`);
        return;
      }
      const passAp = currentUnit.currentAp - moveCost;
      let enemyArmour = occupant.armour;
      let enemyCounters = occupant.damageCounters;
      // Only enemies passed through take the damage, unless the passive hits any unit there (e.g. Pirate's Curse)
      const passDamage = !moveThrough.damageEnemiesOnly || occupant.owner !== currentUnit.owner ? moveThrough.damage : 0;
      // Its other effects for sharing the tile (e.g. armour, loot, turn denial, damage reduction)
      const onto = applyMoveOntoUnit(currentUnit, occupant, moveThrough.onMoveOntoUnit, lastTurnUnitIds, moveThrough.name, TURN_DENIED);
      let rem = passDamage;
      if (enemyArmour > 0) {
        const absorbed = Math.min(enemyArmour, rem);
        enemyArmour -= absorbed;
        rem -= absorbed;
      }
      enemyCounters += rem;
      const enemyDefeated = enemyCounters >= occupant.card.hp;
      const moveDirThrough = getHexMovementDirection(fromHexId, toHexId);
      const passingUnit: BattlefieldUnit = {
        ...onto.mover,
        currentAp: passAp,
        turnStartingAp: currentUnit.turnStartingAp,
        statuses: currentUnit.statuses?.filter((s) => s !== MOVE_TAX),
        movedThisTurn: true,
        movedDirectionsThisTurn:
          moveDirThrough !== null ? [...(currentUnit.movedDirectionsThisTurn || []), moveDirThrough] : currentUnit.movedDirectionsThisTurn || [],
        movesThisTurn: (currentUnit.movesThisTurn || 0) + 1,
        usedTurnCounts: isFreeMove ? currentUnit.usedTurnCounts : countUniversalMove(currentUnit.usedTurnCounts),
        passiveTurnMarks: { ...(currentUnit.passiveTurnMarks || {}), [moveThrough.key]: turnCount }
      };
      // If the damage defeats the enemy, its tile is empty: the unit lands there
      const unitEndHex = enemyDefeated ? toHexId : fromHexId;
      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        delete next[fromHexId];
        if (enemyDefeated) {
          delete next[toHexId];
          if (occupant.card.type !== 'token') {
            if (occupant.owner === 'player1') setPlayer1Graveyard((g) => [...g, occupant.card]);
            else setPlayer2Graveyard((g) => [...g, occupant.card]);
          }
        } else {
          next[toHexId] = {
            ...onto.other,
            armour: enemyArmour,
            damageCounters: enemyCounters,
            tookDamageThisTurn: occupant.tookDamageThisTurn || passDamage > 0
          };
        }
        next[unitEndHex] = { ...passingUnit, hexId: unitEndHex };
        const withPassives =
          passDamage > 0
            ? applyDamageEventsAndPassives([{ hexId: toHexId, damagedUnitOwner: occupant.owner, damageAmount: passDamage, nonAttack: true }], next)
            : next;
        checkVictory(withPassives);
        return withPassives;
      });
      setActiveTurnUnitHex(unitEndHex);
      setSelectedHex(unitEndHex);
      setActiveAbility(null);
      setIsMovingMode(false);
      if (isFreeMove) setPendingFreeMove(null);
      playCardDrawSound();
      const ontoNote = onto.notes.length > 0 ? ` (${onto.notes.join('; ')})` : '';
      if (enemyDefeated && moveThrough.everyMove) {
        // A flier landed on the cleared tile: that move is done
        showNotification(`${currentUnit.card.name}'s ${moveThrough.name}: passed through ${occupant.card.name} for ${passDamage} damage, defeating it, and landed on ${toHexId}${ontoNote}.`);
        if (onto.loot > 0) {
          triggerLoot(currentUnit.owner, onto.loot, moveThrough.name, currentUnit.card.name, { unitHex: toHexId, afterAp: passAp });
        } else if (passAp <= 0) switchTurn(false);
      } else if (enemyDefeated) {
        // Landed on the cleared tile: the extra move is now optional
        setPendingRabbleMove({
          unitInstanceId: currentUnit.instanceId,
          unitHex: toHexId,
          choices: getSurroundingHexes(toHexId).filter((h) => !unitsOnBoard[h] && h !== fromHexId).concat(fromHexId),
          mustMove: false,
          apRemaining: passAp,
          passiveName: moveThrough.name
        });
        showNotification(
          `${currentUnit.card.name}'s ${moveThrough.name}: moved through ${occupant.card.name} for ${moveThrough.damage} damage, defeating it, and landed on ${toHexId}. You may move 1 more tile (4 seconds).`
        );
      } else {
        setPendingRabbleMove({
          unitInstanceId: currentUnit.instanceId,
          unitHex: fromHexId,
          throughHex: toHexId,
          choices: landing,
          mustMove: true,
          apRemaining: passAp,
          passiveName: moveThrough.name,
          ...(onto.loot > 0 ? { lootAfterLanding: onto.loot } : {})
        });
        showNotification(
          `${currentUnit.card.name}'s ${moveThrough.name}: moving onto ${occupant.card.name}'s tile${passDamage > 0 ? ` (${passDamage} damage)` : ''}${ontoNote}. Choose an empty tile around it to move to.`
        );
      }
      return;
    }

    // Check scorched tile damage:
    // "units moving onto or off of a scorched tile take 4 damage"
    const wasFromScorched = isTileScorched(fromHexId, unitsOnBoard, scorchedTiles);
    const wasToScorched = isTileScorched(toHexId, unitsOnBoard, scorchedTiles);
    // (the first move on its own turn may ignore scorched tiles, e.g. Burning Trail)
    const firstMoveBonus = wasFirstMove && movingUnit.owner === activePlayer ? getFirstMoveBonus(movingUnit) : null;
    const isImmuneToScorch =
      isImmuneToScorchDamage(movingUnit) || Boolean(firstMoveBonus?.scorchImmune);

    let scorchDamage = 0;
    if (!isImmuneToScorch && (wasFromScorched || wasToScorched)) {
      scorchDamage = reduceNonAttackDamage(currentUnit, 4);
    }

    let finalArmour = currentUnit.armour;
    let finalDamageCounters = currentUnit.damageCounters;
    if (scorchDamage > 0) {
      let remainingDamage = scorchDamage;
      if (finalArmour > 0) {
        if (finalArmour >= remainingDamage) {
          finalArmour -= remainingDamage;
          remainingDamage = 0;
        } else {
          remainingDamage -= finalArmour;
          finalArmour = 0;
        }
      }
      finalDamageCounters += remainingDamage;
    }

    const isDefeatedByScorch = scorchDamage > 0 && finalDamageCounters >= movingUnit.card.hp;

    const moveDir = getHexMovementDirection(fromHexId, toHexId);
    const nextMovedDirections =
      moveDir !== null
        ? [...(currentUnit.movedDirectionsThisTurn || []), moveDir]
        : currentUnit.movedDirectionsThisTurn || [];

    const newAp = currentUnit.currentAp - moveCost;
    // A second move in the same direction may grant a next-attack buff (e.g. Unstoppable Charge)
    const { unit: movedUnit, granted: straightLineBuff } = applyStraightLineMoveBuff({
      ...currentUnit,
      hexId: toHexId,
      armour: finalArmour,
      damageCounters: finalDamageCounters,
      currentAp: newAp,
      turnStartingAp: currentUnit.turnStartingAp,
      statuses: currentUnit.statuses?.filter((s) => s !== MOVE_TAX),
      movedThisTurn: true,
      movedDirectionsThisTurn: nextMovedDirections,
      movesThisTurn: (currentUnit.movesThisTurn || 0) + 1,
      usedTurnCounts: isFreeMove ? currentUnit.usedTurnCounts : countUniversalMove(currentUnit.usedTurnCounts)
    });
    if (straightLineBuff) {
      showNotification(`${currentUnit.card.name}'s ${straightLineBuff}: its next attack this turn is empowered!`);
    }
    const moveScorchNote = isDefeatedByScorch ? '' : scorchTileLeftByMove(currentUnit, fromHexId, movedUnit.movesThisTurn!);

    setUnitsOnBoard((prev) => {
      const next = { ...prev };
      delete next[fromHexId];
      if (isDefeatedByScorch) {
        if (movingUnit.card.type !== 'token') {
          if (movingUnit.owner === 'player1') {
            setPlayer1Graveyard((g) => [...g, movingUnit.card]);
          } else {
            setPlayer2Graveyard((g) => [...g, movingUnit.card]);
          }
        }
      } else {
        next[toHexId] = movedUnit;
      }
      const syncRes = syncLeaderOfTheBunch(next, allCardList);
      syncRes.logMessages.forEach((msg) => showNotification(msg));
      syncRes.defeatedUnits.forEach((defUnit) => {
        delete syncRes.updatedBoard[defUnit.hexId];
        if (defUnit.card.type !== 'token') {
          if (defUnit.owner === 'player1') {
            setPlayer1Graveyard((g) => [...g, defUnit.card]);
          } else {
            setPlayer2Graveyard((g) => [...g, defUnit.card]);
          }
        }
        showNotification(`👑 ${defUnit.card.name} lost surrounding allies and succumbed to its wounds!`);
      });
      checkVictory(syncRes.updatedBoard);
      return syncRes.updatedBoard;
    });

    if (isDefeatedByScorch) {
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
      setActiveAbility(null);
      setIsMovingMode(false);
      showNotification(`${movingUnit.card.name} moved across a scorched tile, took 4 damage, and was defeated!`);
      switchTurn(false);
      return;
    }

    setActiveTurnUnitHex(toHexId);
    setSelectedHex(toHexId);
    setActiveAbility(null);
    setIsMovingMode(false);
    if (isFreeMove) setPendingFreeMove(null);
    playCardDrawSound();
    const moveTaxNote = moveCost > 1 ? ' [Cold Feet / Gravity +1 AP]' : isFreeMove ? ` [Free move: ${pendingFreeMove!.sourceName}]` : '';
    const nbDragNote = hadNbOnDrag ? ' [Noxious Burst: Started turn with 1 less AP]' : '';
    const esotericNote = isEsotericMove ? ' (wraparound boundary via Esoteric Pathways)' : '';
    const omniNote = isOmniMove && moveDist === 2 ? ' (Range 2 warp via Magical Omnipresence)' : isOmni ? ' (1/Turn move via Magical Omnipresence)' : '';
    showNotification(
      `${movedUnit.card.name} moved to ${toHexId}${esotericNote}${omniNote}${scorchDamage > 0 ? ' (took 4 scorched tile damage!)' : ''}${moveTaxNote}${nbDragNote} (${moveCost} AP spent, ${newAp} AP remaining).${moveScorchNote}`
    );
    // Damage from moving (e.g. Static Discharge, Living Squall, an enemy's Static Fur)
    const movedId = movedUnit.instanceId;
    setUnitsOnBoard((prev) => applyMoveTriggers(prev, movedId, [toHexId], fromHexId));
    if (activeTurnUnitHex !== fromHexId) {
      triggerForesight(movingUnit);
      triggerTurnTakenPassives(movedUnit);
      if (resolveDamageOnTakingTurn(toHexId, movedUnit, unitsOnBoard)) return;
    }
    // Check Spear Fighter's Momentum Charge passive
    // "The first time this unit moves on its turn, it may move an additional tile in the same direction."
    const momentumNextHex = checkMomentumCharge(currentUnit, fromHexId, toHexId, unitsOnBoard, wasFirstMove);
    // Other "another tile in the same direction for free" passives (e.g. Daybreak Charge, Extreme Momentum, a friendly
    // Tailwind), through the same prompt
    const extraMove = momentumNextHex ? null : getExtraSameDirectionMove(currentUnit, fromHexId, toHexId, unitsOnBoard, moveCost > 0);
    if (extraMove && !isDefeatedByScorch) {
      const armoured = extraMove.armourUpTo > movedUnit.armour ? { ...movedUnit, armour: extraMove.armourUpTo } : movedUnit;
      if (armoured !== movedUnit) setUnitsOnBoard((prev) => (prev[toHexId] ? { ...prev, [toHexId]: { ...prev[toHexId], armour: armoured.armour } } : prev));
      setPendingMomentumCharge({ unitHex: toHexId, nextHex: extraMove.nextHex, unit: armoured, apRemaining: newAp, sourceName: extraMove.name });
      showNotification(
        `${movedUnit.card.name} moved to ${toHexId}. ⚡ ${extraMove.name}${extraMove.armourUpTo > 0 ? ` (armoured up to ${extraMove.armourUpTo})` : ''}: you may move another tile in the same direction to ${extraMove.nextHex} for free!`
      );
      return;
    }
    if (momentumNextHex && !isDefeatedByScorch) {
      setPendingMomentumCharge({
        unitHex: toHexId,
        nextHex: momentumNextHex,
        unit: movedUnit,
        apRemaining: newAp
      });
      showNotification(
        `${movedUnit.card.name} moved to ${toHexId}. ⚡ Momentum Charge triggered! You may move an additional tile in the same direction to ${momentumNextHex} for free!`
      );
      return;
    }

    // "...it may move an additional 2 tiles for free" on its first move each turn (e.g. Burning Trail), one at a time
    if (firstMoveBonus && firstMoveBonus.extraTiles > 0 && !isDefeatedByScorch) {
      const trailChoices = getSurroundingHexes(toHexId).filter((h) => !unitsOnBoard[h] || h === fromHexId);
      if (trailChoices.length > 0) {
        setPendingRabbleMove({
          unitInstanceId: movedUnit.instanceId,
          unitHex: toHexId,
          choices: trailChoices,
          mustMove: false,
          apRemaining: newAp,
          passiveName: firstMoveBonus.name,
          moreTiles: firstMoveBonus.extraTiles - 1,
          scorchImmune: firstMoveBonus.scorchImmune
        });
        showNotification(`${movedUnit.card.name}'s ${firstMoveBonus.name}: you may move up to ${firstMoveBonus.extraTiles} more tiles for free (4 seconds each).`);
        return;
      }
    }
    // Move-through passive (Rabble Rouse), once per turn: after the first move, an optional extra move in any
    // direction to an empty tile. The turn waits for it (3 seconds, then it lapses).
    if (moveThrough && !moveThrough.everyMove && wasFirstMove && !isDefeatedByScorch) {
      const extraChoices = getSurroundingHexes(toHexId).filter((h) => !unitsOnBoard[h] || h === fromHexId);
      if (extraChoices.length > 0) {
        setUnitsOnBoard((prev) => {
          const u = prev[toHexId];
          if (!u) return prev;
          return { ...prev, [toHexId]: { ...u, passiveTurnMarks: { ...(u.passiveTurnMarks || {}), [moveThrough.key]: turnCount } } };
        });
        setPendingRabbleMove({
          unitInstanceId: movedUnit.instanceId,
          unitHex: toHexId,
          choices: extraChoices,
          mustMove: false,
          apRemaining: newAp,
          passiveName: moveThrough.name
        });
        showNotification(`${movedUnit.card.name}'s ${moveThrough.name}: you may move 1 more tile in any direction (4 seconds).`);
        return;
      }
    }

    // "Any time this unit moves on its turn, it may move an additional tile in a different direction" (e.g. Slithering
    // Advance): offered after each move, through the same optional extra-move prompt. The extra tile doesn't offer another.
    const slither = getUnitPassives(currentUnit).find(
      (p) =>
        p.trigger === 'self.movesOnOwnTurn' &&
        (p.effects || []).some((e: any) => e.type === 'move' && e.direction === 'different' && e.extraTiles)
    );
    if (slither && !isDefeatedByScorch) {
      const sameDirection = getSameDirectionNextHex(fromHexId, toHexId);
      const slitherChoices = getSurroundingHexes(toHexId).filter(
        (h) => h !== sameDirection && (!unitsOnBoard[h] || h === fromHexId)
      );
      if (slitherChoices.length > 0) {
        setPendingRabbleMove({
          unitInstanceId: movedUnit.instanceId,
          unitHex: toHexId,
          choices: slitherChoices,
          mustMove: false,
          apRemaining: newAp,
          passiveName: slither.name
        });
        showNotification(`${movedUnit.card.name}'s ${slither.name}: you may move 1 more tile in a different direction (4 seconds).`);
        return;
      }
    }

    // "Any time this unit spends AP to move on its turn, choose a tile in a different direction. Apply knockback 1 to
    // any unit on that tile, then, if it is empty, move this unit to that tile for free" (e.g. Night-Adder's Path)
    const adder = getUnitPassives(currentUnit).find(
      (p) =>
        p.trigger === 'self.spendsApToMove' &&
        (p.effects || []).some((e: any) => e.type === 'knockback' && e.target === 'unitOnChosenTileInDifferentDirection')
    );
    if (adder && moveCost > 0 && !isDefeatedByScorch) {
      const sameDirection = getSameDirectionNextHex(fromHexId, toHexId);
      const adderChoices = getSurroundingHexes(toHexId).filter((h) => h !== sameDirection);
      if (adderChoices.length > 0) {
        setPendingRabbleMove({
          unitInstanceId: movedUnit.instanceId,
          unitHex: toHexId,
          choices: adderChoices,
          mustMove: false,
          apRemaining: newAp,
          passiveName: adder.name,
          knockbackOccupant: true
        });
        showNotification(`${movedUnit.card.name}'s ${adder.name}: choose a tile in a different direction (a unit there is knocked back 1, then it moves there if empty).`);
        return;
      }
    }

    // A free move before an attack (Shifting Strike) doesn't end the turn: the attack comes next
    if (newAp <= 0 && !(isFreeMove && abilityAfterFreeMoveRef.current)) {
      switchTurn(false);
    }
  };

  // Once a free move made "before choosing a target" is done or skipped, target the waiting free ability
  useEffect(() => {
    if (pendingFreeMove || !abilityAfterFreeMoveRef.current) return;
    const ability = abilityAfterFreeMoveRef.current;
    abilityAfterFreeMoveRef.current = null;
    if (!activeTurnUnit) return;
    setActiveAbility(ability);
    showNotification(`Now targeting ${ability.name} for free: click an enemy in range (blue tiles).`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFreeMove]);

  // Resolves a move-through passive's extra move (Rabble Rouse) onto destHex
  const handleExecuteRabbleMove = (destHex: string) => {
    const pending = pendingRabbleMove;
    if (!pending || !pending.choices.includes(destHex)) return;
    const unitHex = pending.unitHex;
    const unit = unitsOnBoard[unitHex];
    setPendingRabbleMove(null);
    if (!unit) return;
    // Night-Adder's Path: knock the unit on that tile back 1 (away from this unit); then move there only if it is empty
    if (pending.knockbackOccupant && unitsOnBoard[destHex]) {
      const occupant = unitsOnBoard[destHex];
      const dest = isImmuneToKnockback(occupant) ? null : getKnockbackDestination(unitHex, destHex, 1, unitsOnBoard);
      const cleared = Boolean(dest && dest.tilesMoved > 0 && dest.finalHex !== destHex);
      setUnitsOnBoard((prev) => {
        let next = prev;
        if (cleared && dest && next[destHex]) {
          next = { ...next };
          const o = next[destHex];
          delete next[destHex];
          next[dest.finalHex] = { ...o, hexId: dest.finalHex };
        }
        return applyKnockbackRiders(next, unit, occupant.instanceId);
      });
      if (!cleared) {
        showNotification(`${unit.card.name}'s ${pending.passiveName}: knocked back ${occupant.card.name}, but the tile is still occupied.`);
        if (pending.apRemaining <= 0) switchTurn(false);
        return;
      }
      // The tile is empty now: carry on with the move below (the knockback has already been queued)
      setPendingRabbleMove(null);
      setUnitsOnBoard((prev) => {
        const u = prev[unitHex];
        if (!u || prev[destHex]) return prev;
        const next = { ...prev };
        delete next[unitHex];
        next[destHex] = { ...u, hexId: destHex };
        return applyMoveTriggers(next, u.instanceId, [destHex], unitHex);
      });
      setActiveTurnUnitHex(destHex);
      setSelectedHex(destHex);
      showNotification(`${unit.card.name}'s ${pending.passiveName}: knocked back ${occupant.card.name} and moved to ${destHex}.`);
      if (pending.apRemaining <= 0) switchTurn(false);
      return;
    }
    // Scorched landing tile, as with Momentum Charge
    const scorchDmg =
      !pending.scorchImmune && !isImmuneToScorchDamage(unit) && isTileScorched(destHex, unitsOnBoard, scorchedTiles) ? 4 : 0;
    let armour = unit.armour;
    let counters = unit.damageCounters;
    if (scorchDmg > 0) {
      const absorbed = Math.min(armour, scorchDmg);
      armour -= absorbed;
      counters += scorchDmg - absorbed;
    }
    const isDefeated = counters >= unit.card.hp;
    setUnitsOnBoard((prev) => {
      const next = { ...prev };
      delete next[unitHex];
      if (isDefeated) {
        if (unit.card.type !== 'token') {
          if (unit.owner === 'player1') setPlayer1Graveyard((g) => [...g, unit.card]);
          else setPlayer2Graveyard((g) => [...g, unit.card]);
        }
      } else {
        next[destHex] = { ...unit, hexId: destHex, armour, damageCounters: counters };
      }
      checkVictory(next);
      return isDefeated ? next : applyMoveTriggers(next, unit.instanceId, [destHex], unitHex);
    });
    playCardDrawSound();
    if (isDefeated) {
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
      showNotification(`${unit.card.name} landed on a scorched tile, took 4 damage, and was defeated!`);
      switchTurn(false);
      return;
    }
    setActiveTurnUnitHex(destHex);
    setSelectedHex(destHex);
    showNotification(
      `${unit.card.name}'s ${pending.passiveName}: ${pending.throughHex ? `passed through ${pending.throughHex} and ` : ''}landed on ${destHex}${scorchDmg > 0 ? ' (took 4 scorched tile damage)' : ''}.`
    );
    if (pending.lootAfterLanding) {
      triggerLoot(unit.owner, pending.lootAfterLanding, pending.passiveName, unit.card.name, { unitHex: destHex, afterAp: pending.apRemaining });
      return;
    }
    // Another free tile to offer (e.g. Burning Trail's second extra tile)
    if (pending.moreTiles && pending.moreTiles > 0) {
      const more = getSurroundingHexes(destHex).filter((h) => !unitsOnBoard[h] || h === unitHex);
      if (more.length > 0) {
        setPendingRabbleMove({ ...pending, unitHex: destHex, throughHex: undefined, choices: more, mustMove: false, moreTiles: pending.moreTiles - 1 });
        showNotification(`${pending.passiveName}: you may move 1 more tile for free (4 seconds).`);
        return;
      }
    }
    if (pending.apRemaining <= 0) switchTurn(false);
  };

  // Skips (or lets lapse) an optional move-through extra move
  const handleDeclineRabbleMove = (reason: 'skip' | 'timeout') => {
    const pending = pendingRabbleMove;
    if (!pending || pending.mustMove) return;
    setPendingRabbleMove(null);
    showNotification(
      reason === 'timeout' ? `${pending.passiveName}: the extra move lapsed.` : `${pending.passiveName}: skipped the extra move.`
    );
    if (pending.apRemaining <= 0) switchTurn(false);
  };

  // 4-second window for an optional move-through extra move
  useEffect(() => {
    if (!pendingRabbleMove || pendingRabbleMove.mustMove) return;
    setRabbleSecondsLeft(4);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const left = Math.max(0, 4 - Math.floor((Date.now() - startedAt) / 1000));
      setRabbleSecondsLeft(left);
    }, 200);
    const timeout = setTimeout(() => handleDeclineRabbleMove('timeout'), 4000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRabbleMove]);

  const handleExecuteMomentumCharge = (targetHex?: string) => {
    if (!pendingMomentumCharge) return;
    const { unitHex, nextHex, unit, apRemaining } = pendingMomentumCharge;
    const destHex = targetHex || nextHex;
    if (destHex !== nextHex) return;

    const passives = getUnitPassives(unit);
    const wasScorched = isTileScorched(destHex, unitsOnBoard, scorchedTiles);
    const isImmuneToScorch =
      isImmuneToScorchDamage(unit);

    let scorchDmg = !isImmuneToScorch && wasScorched ? 4 : 0;
    let finalArmour = unit.armour;
    let finalDamageCounters = unit.damageCounters;

    if (scorchDmg > 0) {
      if (finalArmour >= scorchDmg) {
        finalArmour -= scorchDmg;
      } else {
        finalDamageCounters += scorchDmg - finalArmour;
        finalArmour = 0;
      }
    }
    const isDefeated = scorchDmg > 0 && finalDamageCounters >= unit.card.hp;

    setUnitsOnBoard((prev) => {
      const next = { ...prev };
      delete next[unitHex];
      if (isDefeated) {
        if (unit.card.type !== 'token') {
          if (unit.owner === 'player1') setPlayer1Graveyard((g) => [...g, unit.card]);
          else setPlayer2Graveyard((g) => [...g, unit.card]);
        }
      } else {
        const moveDir = getHexMovementDirection(unitHex, destHex);
        const nextMovedDirections =
          moveDir !== null
            ? [...(unit.movedDirectionsThisTurn || []), moveDir]
            : unit.movedDirectionsThisTurn || [];
        // Moving on in the same direction may grant a next-attack buff (e.g. Unstoppable Charge)
        next[destHex] = applyStraightLineMoveBuff({
          ...unit,
          hexId: destHex,
          armour: finalArmour,
          damageCounters: finalDamageCounters,
          movedDirectionsThisTurn: nextMovedDirections
        }).unit;
      }
      const syncRes = syncLeaderOfTheBunch(next, allCardList);
      syncRes.logMessages.forEach((msg) => showNotification(msg));
      syncRes.defeatedUnits.forEach((defUnit) => {
        delete syncRes.updatedBoard[defUnit.hexId];
        if (defUnit.card.type !== 'token') {
          if (defUnit.owner === 'player1') {
            setPlayer1Graveyard((g) => [...g, defUnit.card]);
          } else {
            setPlayer2Graveyard((g) => [...g, defUnit.card]);
          }
        }
        showNotification(`👑 ${defUnit.card.name} lost surrounding allies and succumbed to its wounds!`);
      });
      checkVictory(syncRes.updatedBoard);
      return syncRes.updatedBoard;
    });

    setPendingMomentumCharge(null);

    if (isDefeated) {
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
      showNotification(`${unit.card.name} charged onto a scorched tile, took 4 damage, and was defeated!`);
      switchTurn(false);
      return;
    }

    setActiveTurnUnitHex(destHex);
    setSelectedHex(destHex);
    playCardDrawSound();
    showNotification(`⚡ ${unit.card.name} surged an additional tile to ${destHex} via ${pendingMomentumCharge.sourceName || 'Momentum Charge'} (Free)!`);
    const surgedId = unit.instanceId;
    setUnitsOnBoard((prev) => applyMoveTriggers(prev, surgedId, [destHex], unitHex));

    if (apRemaining <= 0) {
      switchTurn(false);
    }
  };

  const handleDeclineMomentumCharge = () => {
    if (!pendingMomentumCharge) return;
    const { apRemaining, unit } = pendingMomentumCharge;
    setPendingMomentumCharge(null);
    showNotification(`${unit.card.name} finished moving.`);
    if (apRemaining <= 0) {
      switchTurn(false);
    }
  };

  // Universal Draw Action (Rule 6.2.2)
  // Allow units to use the universal draw action every time they take a turn (just once per their turn, no other restriction).
  const handleUniversalDraw = () => {
    moveRunRef.current = null;
    if (lockedAssist || pendingAssistDeployment || providerChain || readySpellReact) {
      showNotification("Locked in or active choice pending: Resolve your current action first.");
      return;
    }
    if (!activeTurnUnit || activeTurnUnit.usedUniversalDrawThisTurn) return;
    // "...must spend an additional 1AP to use the Universal Draw Action" (e.g. Ear Ringer)
    const drawCost = 1 + (activeTurnUnit.statuses?.includes(DRAW_TAX) ? 1 : 0);
    if (activeTurnUnit.currentAp < drawCost) {
      if (drawCost > 1) showNotification(`Drawing costs ${drawCost} AP for ${activeTurnUnit.card.name} this turn (Ear Ringer).`);
      return;
    }
    if (isUnitMindless(activeTurnUnit)) {
      showNotification(`${activeTurnUnit.card.name} has the Mindless passive and cannot use the draw action.`);
      return;
    }
    if (activeDeck.length === 0) {
      showNotification("Your deck is empty.");
      return;
    }
    // The draw is an action an enemy's readied react may interrupt (e.g. Ready Spell)
    if (offerReadySpellInterrupt({ kind: 'draw' })) return;

    const passives = getUnitPassives(activeTurnUnit);
    const hasRapidCatalog = passives.some(
      (p) => p.id === 'rapid_catalog' || p.name === 'Rapid Catalog' || p.name === 'Rapid Catalogue'
    );

    const newAp = activeTurnUnit.currentAp - drawCost;
    setUnitsOnBoard((prev) => ({
      ...prev,
      [activeTurnUnit.hexId]: {
        ...activeTurnUnit,
        currentAp: newAp,
        usedUniversalDrawThisTurn: true
      }
    }));

    if (hasRapidCatalog) {
      playCardDrawSound();
      if (activeDeck.length === 1) {
        const drawnCard = activeDeck[0];
        if (activePlayer === 'player1') {
          setPlayer1Hand((h) => [...h, drawnCard]);
          setPlayer1Deck([]);
        } else {
          setPlayer2Hand((h) => [...h, drawnCard]);
          setPlayer2Deck([]);
        }
        showNotification(`${activeTurnUnit.card.name}'s Rapid Catalogue drew the last card of the deck (${drawnCard.name})!`, {
          privateTo: activePlayer,
          publicText: `${activeTurnUnit.card.name}'s Rapid Catalogue drew the last card of the deck!`
        });
        if (newAp <= 0) {
          switchTurn(false);
        }
        return;
      }

      const top2 = activeDeck.slice(0, 2);
      setResearchPending({
        cards: top2,
        player: activePlayer,
        sourceTitle: 'Rapid Catalogue',
        unitName: activeTurnUnit.card.name,
        afterAp: newAp
      });
      showNotification(`${activeTurnUnit.card.name} activated Rapid Catalogue! Choose 1 of the top 2 cards for your hand.`);
      return;
    }

    const drawnCard = activeDeck[0];
    if (activePlayer === 'player1') {
      setPlayer1Hand((h) => [...h, drawnCard]);
      setPlayer1Deck((d) => d.slice(1));
    } else {
      setPlayer2Hand((h) => [...h, drawnCard]);
      setPlayer2Deck((d) => d.slice(1));
    }

    playCardDrawSound();
    showNotification(`${activeTurnUnit.card.name} used Universal Draw (1 AP spent, 1 card drawn).`);
    healOnDraw(activeTurnUnit, 1);

    // Automatically end turn when actions cannot be taken
    if (newAp <= 0) {
      switchTurn(false);
    }
  };
    // Resolves area abilities (Exploding Fireball, Whirlwind Execution, Acidic Bile, etc.) from card data
    const executeAreaAbility = (ability: CardAbility, targetHex: string, extra?: { path?: string[]; targetHexes?: string[] }) => {
    if (!activeTurnUnit || !activeTurnUnitHex) return;
    const cost = getAbilityApCost(ability);

    // "Move up to N tiles in a straight line for free, then ..." (e.g. Spitfire Landing): the drawn path is the move.
    // It must end on an empty tile; units on the way block it unless this unit flies over them (e.g. Aerial Apex,
    // which also damages enemies passed over).
    let casterHex: string = activeTurnUnitHex;
    let board: Record<string, BattlefieldUnit> = unitsOnBoard;
    let moveNote = '';
    const moveDefeated: BattlefieldUnit[] = [];
    if (getSelfStraightLineMove(ability) && extra?.path && extra.path.length > 0) {
      const path = extra.path;
      const dest = path[path.length - 1];
      const flier = getMoveThroughPassive(activeTurnUnit, turnCount);
      // ...or the move itself ignores units in the way (e.g. Ride the Gale)
      const flies = Boolean(flier?.everyMove && flier.anyUnit) || Boolean(getSelfStraightLineMove(ability)?.ignoreUnits);
      const over = path.slice(0, -1).filter((h) => board[h]);
      if (board[dest] || (over.length > 0 && !flies)) {
        showNotification(`${ability.name}: the move must end on an empty tile${flies ? '' : ', with no units in the way'}.`);
        return;
      }
      if (isUnitMovementDisabled(activeTurnUnit)) {
        showNotification(getMoveBlockedMessage(activeTurnUnit));
        return;
      }
      board = { ...board };
      delete board[casterHex];
      board[dest] = {
        ...activeTurnUnit,
        hexId: dest,
        movedThisTurn: true,
        movesThisTurn: (activeTurnUnit.movesThisTurn || 0) + 1,
        tilesMovedThisTurn: (activeTurnUnit.tilesMovedThisTurn || 0) + path.length
      };
      if (flies && flier?.everyMove && flier.anyUnit && flier.damage > 0) {
        over.forEach((h) => {
          const u = board[h];
          if (!u || u.owner === activeTurnUnit.owner) return;
          const absorbed = Math.min(u.armour, flier.damage);
          const counters = u.damageCounters + flier.damage - absorbed;
          if (counters >= u.card.hp) {
            delete board[h];
            moveDefeated.push(u);
          } else {
            board[h] = { ...u, armour: u.armour - absorbed, damageCounters: counters, tookDamageThisTurn: true };
          }
        });
      }
      moveNote = ` Moved ${path.length} tile(s) to ${dest}${
        flies && over.length > 0 ? ` over ${over.map((h) => unitsOnBoard[h].card.name).join(', ')}` : ''
      }.`;
      // (moving sets off move triggers, e.g. Lock-Step, damage for moving)
      board = applyMoveTriggers(board, activeTurnUnit.instanceId, path, casterHex);
      casterHex = Object.keys(board).find((h) => board[h].instanceId === activeTurnUnit.instanceId) || dest;
      if (!board[casterHex]) {
        // The move itself destroyed it (e.g. damage for moving)
        setUnitsOnBoard(board);
        setActiveAbility(null);
        showNotification(`${activeTurnUnit.card.name} used ${ability.name} and was destroyed while moving.`);
        checkVictory(board);
        return;
      }
    }

    // "Move / place this unit on the target tile, then ..." (e.g. Bright Swoop, Super Jump, Smothering Drop, Sludge Wave):
    // a self move or place effect onto the target tile comes first, so the area is centred where it lands
    let tilesTravelled = 0;
    const selfTileMove: any = (ability.effects || []).find(
      (e: any) => (e.type === 'move' || e.type === 'place') && e.target === 'self' && e.tile === 'target'
    );
    if (selfTileMove && targetHex !== casterHex) {
      if (board[targetHex]) {
        showNotification(`${ability.name}: the unit must land on an empty tile.`);
        return;
      }
      tilesTravelled = getHexDistance(casterHex, targetHex);
      const mover = board[casterHex];
      board = { ...board };
      delete board[casterHex];
      board[targetHex] = {
        ...mover,
        hexId: targetHex,
        ...(selfTileMove.type === 'move'
          ? {
              movedThisTurn: true,
              movesThisTurn: (mover.movesThisTurn || 0) + 1,
              tilesMovedThisTurn: (mover.tilesMovedThisTurn || 0) + tilesTravelled
            }
          : {})
      };
      moveNote = ` ${selfTileMove.type === 'move' ? 'Moved' : 'Placed'} on ${targetHex}.`;
      casterHex = targetHex;
      if (selfTileMove.type === 'move') board = applyMoveTriggers(board, mover.instanceId, [targetHex], mover.hexId);
    }
    // Pulls before the damage (e.g. Eye of the Storm: "Pull all enemy units that are exactly Range 2 from this unit 1
    // tile toward this unit. Then deal 5 damage to all surrounding enemy units")
    const prePull: any = (ability.effects || []).find(
      (e: any) => e.type === 'pull' && typeof e.target === 'string' && e.target.startsWith('enemyUnitsAtExactlyRange:')
    );
    if (prePull) {
      const r = parseInt(prePull.target.split(':')[1], 10);
      const pulled = Object.keys(board).filter(
        (h) => board[h].owner !== activePlayer && getHexDistance(casterHex, h) === r && !isImmuneToNonDamageEffects(board[h])
      );
      pulled.forEach((h) => {
        const dest = getPullDestination(casterHex, h, typeof prePull.distance === 'number' ? prePull.distance : 1, board);
        if (dest === h) return;
        const u = board[h];
        board = { ...board };
        delete board[h];
        board[dest] = { ...u, hexId: dest };
      });
      if (pulled.length > 0) moveNote += ` Pulled ${pulled.length} enemy unit(s) in.`;
    }
    // Knockback before the damage (e.g. Sludge Wave: "Apply knockback 1 to all surrounding enemy units, then deal 3
    // damage to them"): the damage follows the units to where they land
    let knockedHexes: string[] | undefined;
    const preKnockback: any = (ability.effects || []).find(
      (e: any, i: number, all: any[]) =>
        e.type === 'knockback' &&
        e.target === 'enemyUnitsSurroundingSelf' &&
        all.findIndex((d: any) => d.type === 'damage') > i
    );
    if (preKnockback) {
      const around = getSurroundingHexes(casterHex).filter((h) => board[h] && board[h].owner !== activePlayer);
      const ids = around.map((h) => board[h].instanceId);
      const kb = knockBackUnits(board, casterHex, around, typeof preKnockback.distance === 'number' ? preKnockback.distance : 1, (u) =>
        isImmuneToKnockback(u)
      );
      board = kb.board;
      knockedHexes = kb.landed;
      ids.forEach((id) => (board = applyKnockbackRiders(board, board[casterHex], id)));
      knockedHexes = ids
        .map((id) => Object.keys(board).find((h) => board[h].instanceId === id))
        .filter((h): h is string => Boolean(h));
    }

    const res = resolveAreaAttack(ability, casterHex, targetHex, board, activePlayer, {
      path: getSelfStraightLineMove(ability) ? undefined : extra?.path,
      apSpent: getApSpent(ability),
      tilesTravelled,
      knockedHexes,
      targetHexes: extra?.targetHexes,
      previousUses: activeTurnUnit.usedTurnCounts?.[ability.id] || 0
    });
    if (!res) return;
    res.defeated.push(...moveDefeated);
    // "This unit's turn ends" (e.g. Borrowing 100,000 Bones)
    const endsTurn = (ability.effects || []).some((e: any) => e.type === 'endTurn' && e.target === 'self');
    const newAp = endsTurn ? 0 : Math.max(0, activeTurnUnit.currentAp - cost);
    const nextCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);

    let finalUnits = { ...res.updatedUnits };
    if (res.damageEvents && res.damageEvents.length > 0) {
      finalUnits = applyDamageEventsAndPassives(res.damageEvents, finalUnits);
    }
    // "...and knockback 1 each unit hit" (e.g. Thrash and Flail): push every surviving unit hit away from the caster,
    // nearest first so units further out don't block the ones behind them
    const areaKnockback: any = ability.effects?.find((e: any) => e.type === 'knockback' && e.target === 'areaHitUnits');
    if (areaKnockback?.rotation && res.hitHexes.length > 0) {
      // "Then, applies knockback 1 clockwise around this unit" (e.g. Clockwise Sweep): all units move at once
      const rot = rotateUnitsAround(finalUnits, casterHex, res.hitHexes, areaKnockback.rotation, (u) => isImmuneToKnockback(u));
      finalUnits = rot.board;
      rot.moved.forEach(({ to }) => {
        const u = finalUnits[to];
        if (u) finalUnits = applyKnockbackRiders(finalUnits, activeTurnUnit, u.instanceId);
      });
    } else if (areaKnockback && res.hitHexes.length > 0) {
      const kbTiles = typeof areaKnockback.distance === 'number'
        ? areaKnockback.distance
        : typeof areaKnockback.amount === 'number' ? areaKnockback.amount : 1;
      const order = [...res.hitHexes].sort((a, b) => getHexDistance(casterHex, a) - getHexDistance(casterHex, b));
      order.forEach((h) => {
        const u = finalUnits[h];
        if (!u || h === casterHex || isImmuneToKnockback(u)) return;
        const dest = getKnockbackDestination(casterHex, h, kbTiles, finalUnits);
        if (dest.tilesMoved > 0 && dest.finalHex !== h) {
          finalUnits = { ...finalUnits };
          delete finalUnits[h];
          finalUnits[dest.finalHex] = { ...u, hexId: dest.finalHex };
        }
        finalUnits = applyKnockbackRiders(finalUnits, activeTurnUnit, u.instanceId);
      });
    }
    // "Then, apply knockback 1 to all surrounding units" after the damage (e.g. Bass Tremor), friendly ones too
    const postKnockback: any = (ability.effects || []).find(
      (e: any, i: number, all: any[]) =>
        e.type === 'knockback' &&
        e.target === 'allUnitsSurroundingSelf' &&
        all.findIndex((d: any) => d.type === 'damage') < i
    );
    if (postKnockback) {
      const around = getSurroundingHexes(casterHex).filter((h) => finalUnits[h]);
      const ids = around.map((h) => finalUnits[h].instanceId);
      finalUnits = knockBackUnits(finalUnits, casterHex, around, typeof postKnockback.distance === 'number' ? postKnockback.distance : 1, (u) =>
        isImmuneToKnockback(u)
      ).board;
      ids.forEach((id) => (finalUnits = applyKnockbackRiders(finalUnits, activeTurnUnit, id)));
    }
    const caster = finalUnits[casterHex];
    // Passives that armour this unit whenever it attacks (e.g. Steal Plate): "the target" is the unit on the target tile
    const areaOnAttackArmour = getOnAttackSelfArmour(activeTurnUnit, (board[targetHex]?.armour || 0) > 0);
    // First-attack heal per hit (e.g. Bloodrush): every hit that landed on any unit
    const areaFirstAttackHeal = getFirstAttackHealPerHit(activeTurnUnit);
    const areaHeal = areaFirstAttackHeal ? areaFirstAttackHeal.perHit * (res.hitsLanded || 0) : 0;
    if (caster) {
      // e.g. Human Cannonball: "...but it cannot move until the end of your opponent's next turn"
      finalUnits[casterHex] = applySelfCannotMove(
        {
          ...caster,
          armour: Math.max(caster.armour, areaOnAttackArmour.upTo),
          damageCounters: Math.max(0, caster.damageCounters - areaHeal),
          currentAp: newAp,
          usedTurnCounts: nextCounts
        },
        ability
      );
    }
    const selfCannotMoveNote = ability.effects?.some((e: any) => e.type === 'cannotMove' && e.target === 'self') && caster
      ? " It can't move until the end of your opponent's next turn."
      : '';
    if (activeTurnUnit && hasNoxiousBurstPassive(activeTurnUnit)) {
      res.defeated.forEach((u) => {
        if (u.owner !== activeTurnUnit.owner && u.hexId) {
          const nb = applyNoxiousBurst(activeTurnUnit, u, u.hexId, finalUnits);
          finalUnits = nb.updatedBoard;
          if (nb.affectedUnits.length > 0) {
            showNotification(
              `☠️ Noxious Burst triggered! ${u.card.name} was slain under Death Mark; surrounding units (${nb.affectedUnits.map((a) => a.card.name).join(', ')}) lose 1AP if they take the next turn!`
            );
          }
        }
      });
    }
    // "When this unit destroys an enemy unit or an Obstructing Wall" blasts (e.g. Rigged to Blow)
    res.defeated.forEach((u) => {
      if (u.hexId) finalUnits = applyDestroyTriggers(activeTurnUnit, u, u.hexId, finalUnits, ability);
    });
    setUnitsOnBoard(finalUnits);
    if (casterHex !== activeTurnUnitHex) {
      setActiveTurnUnitHex(casterHex);
      setSelectedHex(casterHex);
    }
    // Used up a waiting next-attack buff; maybe grant a next-armour-ability buff (e.g. Perfect Form)
    afterAttackUsed(activeTurnUnit);
    res.defeated.forEach((u) => {
      if (u.card.type === 'token') return;
      if (u.owner === 'player1') setPlayer1Graveyard((g) => [...g, u.card]);
      else setPlayer2Graveyard((g) => [...g, u.card]);
    });
    checkVictory(finalUnits);

    // "Scorch all tiles in the path until your next turn" (e.g. Infernal Breath)
    if (extra?.path && ability.effects?.some((e: any) => e.type === 'scorchTile' && e.tile === 'allTilesOnPath')) {
      const pathTiles = extra.path;
      const scorchOpponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      setScorchedTiles((prev) => {
        const next = { ...prev };
        pathTiles.forEach((h) => (next[h] = { expiresOnTurnEndFor: scorchOpponent, casterPlayer: activePlayer }));
        return next;
      });
      moveNote += ` Scorched ${pathTiles.join(', ')}.`;
    }
    // Tiles of units its damage hit that it scorches (e.g. Chain-Lantern Combo), until the end of the opponent's next turn
    if (res.scorchHexes.length > 0) {
      const scorchOpponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      const hexes = res.scorchHexes;
      setScorchedTiles((prev) => {
        const next = { ...prev };
        hexes.forEach((h) => (next[h] = { expiresOnTurnEndFor: scorchOpponent, casterPlayer: activePlayer }));
        return next;
      });
      moveNote += ` Scorched ${hexes.join(', ')}.`;
    }
    // Scorch the target tile if the ability says so (e.g. Rainbow Geyser: "then that tile becomes scorched")
    const targetScorch: any = ability.effects?.find(
      (e: any) => e.type === 'scorchTile' && (e.tile === 'target' || e.tile === 'targetTile')
    );
    let scorchNote = '';
    if (targetScorch) {
      const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      setScorchedTiles((prev) => ({
        ...prev,
        [targetHex]: {
          expiresOnTurnEndFor: targetScorch.duration === 'untilEndOfTurn' ? activePlayer : opponent,
          casterPlayer: activePlayer
        }
      }));
      scorchNote = ` Tile ${targetHex} is scorched${targetScorch.duration === 'untilEndOfTurn' ? ' until the end of this turn' : " until the end of your opponent's next turn"}!`;
    }

    playCardDrawSound();
    setActiveAbility(null);
    showNotification(
      `${activeTurnUnit.card.name} used ${ability.name}! ${res.logMessages.join(' ')} (${cost === 0 ? 'Free' : `${cost} AP spent`}, ${newAp} AP remaining).${moveNote}${scorchNote}${selfCannotMoveNote}`
    );

    // Enemies whose armour the area damaged, for their "when its armour takes damage" loot (e.g. Iron Clout)
    lootOnArmourDamaged(
      Object.values(board)
        .filter((u) => u.owner !== activePlayer && u.armour > 0)
        .map((u) => {
          const after = Object.values(res.updatedUnits).find((x) => x.instanceId === u.instanceId);
          return { unit: u, armourLost: u.armour - (after ? after.armour : 0) };
        })
    );

    const anyEnemyDamaged = res.logMessages.some((m) => m.includes('damage') || m.includes('hit') || m.includes('💥'));
    let areaLootAmount = 0;
    let areaLootTitle = '';
    if (anyEnemyDamaged && activeTurnUnit) {
      const aPassives = getUnitPassives(activeTurnUnit);
      const sf = aPassives.find((p) => p.id === 'short_fuse' || p.name === 'Short Fuse');
      if (sf && canTriggerPassiveThisTurn(activeTurnUnit, sf)) {
        nextCounts[sf.id || sf.name] = (nextCounts[sf.id || sf.name] || 0) + 1;
        areaLootAmount = Math.max(areaLootAmount, 2);
        areaLootTitle = 'Short Fuse';
      }
      const sp = aPassives.find((p) => p.id === 'spoils' || p.name === 'Spoils');
      if (sp && canTriggerPassiveThisTurn(activeTurnUnit, sp)) {
        nextCounts[sp.id || sp.name] = (nextCounts[sp.id || sp.name] || 0) + 1;
        areaLootAmount = Math.max(areaLootAmount, 2);
        areaLootTitle = 'Spoils';
      }
      const ic = aPassives.find((p) => p.id === 'iron_clout' || p.name === 'Iron Clout');
      if (ic && canTriggerPassiveThisTurn(activeTurnUnit, ic)) {
        nextCounts[ic.id || ic.name] = (nextCounts[ic.id || ic.name] || 0) + 1;
        areaLootAmount = Math.max(areaLootAmount, 1);
        areaLootTitle = 'Iron Clout';
      }
    }

    if (areaLootAmount > 0) {
      triggerLoot(activePlayer, areaLootAmount, areaLootTitle, activeTurnUnit.card.name, {
        unitHex: casterHex,
        afterAp: ability.inProviderChain && !endsTurn ? undefined : newAp
      });
      return;
    }

    if ((cost > 0 || endsTurn) && newAp <= 0) switchTurn(false);
  };
  // Handle Ability Trigger (Works from action panel or directly from standee hover)
  // Abilities bring up range indicator (blue) and spend AP
  // freeUse: a promoted ability a provider uses for free that takes effect at once (the provider's cost, if any, is
  // the ability's cost; its uses are recorded through the executable's provider keys)
  const handleAbilityClick = (ability: CardAbility, freeUse = false) => {
    moveRunRef.current = null;
    // Rules keyed to a specific ability still apply when it's used for free through a provider
    const abilityId = ability.promotedAbilityId || ability.id;
    // During an Assist only its own ability may be activated, once (by the assist start effect)
    const isAssistActivation = Boolean(lockedAssist && !lockedAssist.started && ability.id === lockedAssist.ability.id);
    if (pendingAssistDeployment || (lockedAssist && !isAssistActivation)) {
      showNotification("Locked in to Assist deployment/action: Select target/placement or click Cancel Assist.");
      return;
    }
    if (abilityReinforcePending) {
      showNotification(`${abilityReinforcePending.sourceTitle}: Reinforce ${abilityReinforcePending.card.name} or click Skip first.`);
      return;
    }
    // While interrupting with a readied ability (e.g. Ready Spell), only that ability can be used (clicking it again
    // while targeting cancels it, as usual)
    if (readySpellReact?.started && ability.id !== readySpellReact.ability.id) {
      showNotification(`Interrupting: use ${readySpellReact.ability.name}, or click it again to cancel.`);
      return;
    }
    if (providerChain && !freeUse) {
      showNotification(`Finish or cancel ${providerChain.parent.name} first.`);
      return;
    }
    if (pendingRabbleMove) {
      showNotification(`Finish ${pendingRabbleMove.passiveName}'s move first.`);
      return;
    }
    // Using another ability gives up an unused free move
    if (pendingFreeMove) {
      setPendingFreeMove(null);
      setIsMovingMode(false);
    }
    if (!activeTurnUnit) return;
    // (a free use was already checked against its provider's and its own limits)
    const usageCheck = freeUse ? { allowed: true, reason: undefined } : canUseAbilityThisTurn(activeTurnUnit, ability);
    if (!usageCheck.allowed) {
      showNotification(usageCheck.reason || `${ability.name} can only be used once per turn.`);
      return;
    }
    // Limits from enemies around it (e.g. Hypnotic Sway: no abilities that cost 2 or more AP)
    const auraBlock = getAuraAbilityBlock(activeTurnUnit, ability, unitsOnBoard);
    if (auraBlock) {
      showNotification(auraBlock);
      return;
    }
    const cost = getAbilityApCost(ability);
    if (activeTurnUnit.currentAp < cost) {
      showNotification(`Not enough AP to use ${ability.name} (Requires ${cost} AP, has ${activeTurnUnit.currentAp} AP).`);
      return;
    }
    // An ability that takes effect as soon as it's activated (no target): an enemy's readied ability (e.g. Ready
    // Spell) may interrupt it now. Targeted ones are offered on their target click.
    const isImmediateUse =
      !isAssistActivation && !isPromotedAbilityProvider(ability) && !isTargetedAbility(ability) && !isMultiStageAbility(ability);
    if (isImmediateUse && !freeUse && offerReadySpellInterrupt({ kind: 'ability', ability })) return;
    // Readying one of this unit's own abilities to interrupt with (e.g. Ready Spell): choose it now
    const reactSpec = getReactAbilitySpec(ability);
    if (reactSpec) {
      const options = getReactAbilityChoices(activeTurnUnit, ability, reactSpec.cost);
      if (options.length === 0) {
        showNotification(`${ability.name}: ${activeTurnUnit.card.name} has no ${reactSpec.cost}AP ability to ready.`);
        return;
      }
      setReadySpellChoice({ ability, cost: reactSpec.cost, once: reactSpec.once, onAnyAction: reactSpec.onAnyAction, options });
      return;
    }
    if (abilityId === 'rally_stance') {
      const surroundingFriends = getSurroundingHexes(activeTurnUnitHex!).filter((h) => {
        const u = unitsOnBoard[h];
        return u && u.owner === activePlayer && h !== activeTurnUnitHex;
      });
      if (surroundingFriends.length === 0) {
        // No surrounding allies to rally: execute immediately on self!
        const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts = recordAbilityUse(currentCounts, ability);

        setUnitsOnBoard((prev) => {
          const cur = prev[activeTurnUnitHex!] || activeTurnUnit;
          return {
            ...prev,
            [activeTurnUnitHex!]: {
              ...cur,
              armour: Math.max(cur.armour, 4),
              currentAp: newAp,
              usedTurnCounts: newCounts
            }
          };
        });

        playCardDrawSound();
        showNotification(
          `${activeTurnUnit.card.name} used Rally Stance! (Armoured up to 4; no surrounding allies present, ${cost} AP spent, ${newAp} AP remaining).`
        );
        if (!afterArmourAbilityUsed(activeTurnUnit, ability, newAp) && cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }
    }
    if (abilityId === 'ready_stance') {
      const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);
      setUnitsOnBoard((prev) => ({
        ...prev,
        [activeTurnUnitHex!]: {
          ...activeTurnUnit,
          readyStance: { sourceAbilityName: ability.name, preventUpTo: 7, expiresOnTurnEndFor: opponent },
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      }));
      playCardDrawSound();
      showNotification(`${activeTurnUnit.card.name} used ${ability.name}! The next melee attack against it will be partly prevented and reflected.`);
      if (ability.effects?.some((e: any) => e.type === 'endTurn') || (cost > 0 && newAp <= 0)) {
        switchTurn(false);
      }
      return;
    }
    if (abilityId === 'deep_research') {
      const deck = activePlayer === 'player1' ? player1Deck : player2Deck;
      if (deck.length === 0) {
        showNotification("Your deck is empty.");
        return;
      }
      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);

      setUnitsOnBoard((prev) => ({
        ...prev,
        [activeTurnUnitHex!]: {
          ...activeTurnUnit,
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      }));

      playCardDrawSound();

      if (deck.length === 1) {
        const drawnCard = deck[0];
        if (activePlayer === 'player1') {
          setPlayer1Hand((h) => [...h, drawnCard]);
          setPlayer1Deck([]);
        } else {
          setPlayer2Hand((h) => [...h, drawnCard]);
          setPlayer2Deck([]);
        }
        showNotification(`${activeTurnUnit.card.name} used Deep Research: drew the last card of the deck (${drawnCard.name})!`, {
          privateTo: activePlayer,
          publicText: `${activeTurnUnit.card.name} used Deep Research: drew the last card of the deck!`
        });
        if (cost > 0 && newAp <= 0) {
          switchTurn(false);
        }
        return;
      }

      const top2 = deck.slice(0, 2);
      setResearchPending({
        cards: top2,
        player: activePlayer,
        sourceTitle: 'Deep Research',
        unitName: activeTurnUnit.card.name,
        afterAp: newAp
      });
      showNotification(`${activeTurnUnit.card.name} activated Deep Research! Choose 1 of the top 2 cards for your hand.`);
      return;
    }
    // Reveal the top cards of your own deck and choose one for your hand (e.g. Foretell)
    const revealChooseEffect: any = ability.effects?.find(
      (e: any) => e.type === 'revealTop' && e.deck === 'own' && e.chooseOneToHand
    );
    if (revealChooseEffect) {
      const deck = activePlayer === 'player1' ? player1Deck : player2Deck;
      if (deck.length === 0) {
        showNotification("Your deck is empty.");
        return;
      }
      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);

      setUnitsOnBoard((prev) => ({
        ...prev,
        [activeTurnUnitHex!]: {
          ...activeTurnUnit,
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      }));

      playCardDrawSound();
      const revealCount = typeof revealChooseEffect.count === 'number' ? revealChooseEffect.count : 2;
      setResearchPending({
        cards: deck.slice(0, revealCount),
        player: activePlayer,
        sourceTitle: ability.name,
        unitName: activeTurnUnit.card.name,
        afterAp: newAp,
        restOnTop: Boolean(revealChooseEffect.restOnTop),
        offerReinforce: Boolean(ability.effects?.some((e: any) => e.type === 'reinforce' && e.card === 'chosenCard')),
        unitHex: activeTurnUnitHex!,
        drawsCard: /\bdraw\b/i.test(ability.text || '')
      });
      showNotification(`${activeTurnUnit.card.name} activated ${ability.name}! Choose 1 of the revealed cards for your hand.`);
      return;
    }
    // Reveal the top card of the opponent's deck; you may put it on the bottom (e.g. Foreknowledge, like Fatesteal)
    const revealEnemyEffect: any = ability.effects?.find(
      (e: any) => e.type === 'revealTop' && (e.deck === 'enemy' || e.deck === 'opponent')
    );
    if (revealEnemyEffect) {
      const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      const enemyDeck = opponent === 'player1' ? player1Deck : player2Deck;
      if (enemyDeck.length === 0) {
        showNotification("Your opponent's deck is empty.");
        return;
      }
      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);

      setUnitsOnBoard((prev) => ({
        ...prev,
        [activeTurnUnitHex!]: {
          ...activeTurnUnit,
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      }));

      playCardDrawSound();
      setScryPending({
        card: enemyDeck[0],
        player: opponent,
        unitName: activeTurnUnit.card.name,
        isFieldNotes: true,
        sourceTitle: `${ability.name}: Opponent's Top Card`,
        abilityName: ability.name,
        targetPlayer: opponent,
        afterAp: newAp
      });
      showNotification(`${activeTurnUnit.card.name} activated ${ability.name}! Keep your opponent's top card on top or put it on the bottom.`);
      return;
    }
    if (isFieldNotesAbility(ability)) {
      const p1DeckCount = player1Deck.length;
      const p2DeckCount = player2Deck.length;
      if (p1DeckCount === 0 && p2DeckCount === 0) {
        showNotification("Both players' decks are empty.");
        return;
      }
      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);

      setUnitsOnBoard((prev) => ({
        ...prev,
        [activeTurnUnitHex!]: {
          ...activeTurnUnit,
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      }));

      playCardDrawSound();
      setFieldNotesPending({
        unitName: activeTurnUnit.card.name,
        afterAp: newAp
      });
      showNotification(`${activeTurnUnit.card.name} activated Field Notes! Choose which player's deck to inspect.`);
      return;
    }
    // Area abilities centred on the caster need no target (Whirlwind Execution, Ritual of Pain)
    // (one that moves first, e.g. Spitfire Landing, draws its move as a path instead)
    // (one that moves onto a target tile first, e.g. Bright Swoop, is aimed at that tile instead)
    if (isAreaAttack(ability) && isSelfCentredArea(ability) && !getPathSpec(ability) && ability.target !== 'emptyTile') {
      executeAreaAbility(ability, activeTurnUnitHex!);
      return;
    }
    // "All Freak tokens you control use Explode for free" (e.g. Vile Ceremony): { type: 'tokensUseAbility', source:
    // 'friendlyTokens:<token id>', ability: <its ability id> }. They all explode at the same time: each one deals the
    // damage it would on its own (its remaining health as the ceremony starts) to itself and the units around it, every
    // hit landing on the units as they stand, and the units destroyed are only removed once every blast has landed.
    const tokensUse: any = ability.effects?.find((e: any) => e.type === 'tokensUseAbility');
    if (tokensUse) {
      const tokenId = String(tokensUse.source || '').split(':')[1];
      const tokenDef = (cardsData.tokens || []).find((t) => t.id === tokenId);
      const tokenAbility = tokenDef?.abilities?.find((a) => a.id === tokensUse.ability);
      if (!tokenDef || !tokenAbility) {
        showNotification(`${ability.name}: unknown token ability "${tokensUse.ability}".`);
        return;
      }
      const casterHex = activeTurnUnitHex!;
      const casterId = activeTurnUnit.instanceId;
      const newAp = activeTurnUnit.currentAp - cost;
      const newCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);
      let board: Record<string, BattlefieldUnit> = {
        ...unitsOnBoard,
        [casterHex]: { ...activeTurnUnit, currentAp: newAp, usedTurnCounts: newCounts }
      };
      const tokenHexes = Object.keys(unitsOnBoard).filter(
        (h) => unitsOnBoard[h].owner === activePlayer && unitsOnBoard[h].card.id === tokenId
      );
      // Each blast: the token's damage effect, with "remaining health" read before any blast lands
      const blasts = tokenHexes.map((h) => {
        const token = board[h];
        const dmgEff: any = tokenAbility.effects?.find((e: any) => e.type === 'damage');
        const perHp = typeof dmgEff?.amount?.perRemainingHealth === 'number' ? dmgEff.amount.perRemainingHealth : 0;
        const amount = typeof dmgEff?.amount === 'number' ? dmgEff.amount : perHp * (token.card.hp - token.damageCounters);
        const hexes = dmgEff?.area === 'selfAndAllUnitsSurroundingSelf' ? [h, ...getSurroundingHexes(h)] : getSurroundingHexes(h);
        return { hex: h, token, amount, hexes: hexes.filter((t) => board[t]) };
      });
      // Every hit lands on the units as they stand (armour and damage counters carried from blast to blast)
      const state: Record<string, { armour: number; counters: number; dealt: number; killer?: BattlefieldUnit }> = {};
      blasts.forEach((b) => {
        b.hexes.forEach((t) => {
          const u = board[t];
          const cur = state[t] || { armour: u.armour, counters: u.damageCounters, dealt: 0 };
          const exec = executeSequentialHits([{ hitIndex: 1, damage: b.amount }], cur.armour, cur.counters, u.card.hp, tokenAbility.id, {
            attacker: b.token,
            target: { ...u, armour: cur.armour, damageCounters: cur.counters },
            ability: tokenAbility,
            attackerHex: b.hex,
            targetHex: t,
            unitsOnBoard: board,
            scorchedTiles
          });
          const dealt = exec.hitResults.reduce((s2, r) => s2 + r.damage, 0);
          state[t] = {
            armour: exec.finalArmour,
            counters: exec.finalDamageCounters,
            dealt: cur.dealt + dealt,
            killer: cur.killer || (exec.isDefeated ? b.token : undefined)
          };
        });
      });
      const defeated: BattlefieldUnit[] = [];
      const events: DamageEvent[] = [];
      Object.entries(state).forEach(([t, st]) => {
        const u = board[t];
        if (st.dealt > 0) events.push({ hexId: t, damagedUnitOwner: u.owner, damageAmount: st.dealt });
        if (st.counters >= u.card.hp) defeated.push({ ...u, hexId: t });
        else board = { ...board, [t]: { ...u, armour: st.armour, damageCounters: st.counters, tookDamageThisTurn: u.tookDamageThisTurn || st.dealt > 0 } };
      });
      defeated.forEach((u) => {
        board = { ...board };
        delete board[u.hexId];
      });
      // (damage reactions only for units still in play; then kill and destroy rules for each unit destroyed)
      board = applyDamageEventsAndPassives(events.filter((e) => board[e.hexId]), board);
      defeated.forEach((u) => {
        board = applyDestroyTriggers(state[u.hexId].killer || blasts[0].token, u, u.hexId, board, tokenAbility);
      });
      const logs = blasts.map((b) => `${tokenDef.name} on ${b.hex} explodes for ${b.amount}`);
      sendToGraveyard(defeated);
      setUnitsOnBoard(board);
      checkVictory(board);
      playCardDrawSound();
      showNotification(
        blasts.length === 0
          ? `${activeTurnUnit.card.name} used ${ability.name}, but you control no ${tokenDef.name} tokens. (${cost} AP spent)`
          : `${activeTurnUnit.card.name} used ${ability.name}: ${logs.join(' • ')}${
              defeated.length > 0 ? ` Destroyed: ${defeated.map((u) => u.card.name).join(', ')}.` : ''
            } (${cost} AP spent)`
      );
      // If the blasts destroyed this unit, the turn-unit watch ends the turn
      if (!Object.values(board).some((u) => u.instanceId === casterId)) return;
      if (cost > 0 && newAp <= 0) switchTurn(false);
      return;
    }
    // Reveal-gated provider (Seer's Visions): paid and revealed on activation. A unit card: choose the free promoted
    // ability (already paid for). Otherwise: draw that card and do the '!revealed.isUnit' effects (armour up to 4).
    // (clicking it again while choosing cancels, as with any provider: the AP stays spent)
    if (isRevealGatedProvider(ability) && !ability.revealPrepaid && !freeUse && activeAbility?.id !== ability.id) {
      const deck = activeTurnUnit.owner === 'player1' ? player1Deck : player2Deck;
      const top = deck[0];
      const revealedUnit = Boolean(top && top.type === 'unit');
      const newAp = activeTurnUnit.currentAp - cost;
      const newCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);
      const armourEff: any = ability.effects?.find((e: any) => e.type === 'armour' && e.if === '!revealed.isUnit');
      setUnitsOnBoard((prev) => {
        const cur = prev[activeTurnUnitHex!] || activeTurnUnit;
        const armour =
          !revealedUnit && armourEff && typeof armourEff.upTo === 'number' ? Math.max(cur.armour, armourEff.upTo) : cur.armour;
        return { ...prev, [activeTurnUnitHex!]: { ...cur, currentAp: newAp, usedTurnCounts: newCounts, armour } };
      });
      playCardDrawSound();
      if (!top) {
        showNotification(`${ability.name}: your deck is empty, so there is no card to reveal${armourEff ? `. Armoured up to ${armourEff.upTo}` : ''}. (${cost} AP spent)`);
        if (cost > 0 && newAp <= 0) switchTurn(false);
        return;
      }
      if (revealedUnit) {
        setActiveAbility({ ...ability, revealPrepaid: true });
        showNotification(
          `${ability.name}: revealed ${top.name}, a unit card (it stays on top). Choose a qualifying ability from among the promoted cards below to use for free. (${cost} AP spent)`
        );
        return;
      }
      if (ability.effects?.some((e: any) => e.type === 'draw' && e.if === '!revealed.isUnit')) {
        drawCardForPlayer(activeTurnUnit.owner);
        healOnDraw(activeTurnUnit, 1);
      }
      showNotification(
        `${ability.name}: revealed ${top.name}, not a unit card: drew it${armourEff ? ` and armoured up to ${armourEff.upTo}` : ''}. (${cost} AP spent)`
      );
      if (cost > 0 && newAp <= 0) switchTurn(false);
      return;
    }

    // Provider abilities (that allow using a promoted ability for free)
    if (isPromotedAbilityProvider(ability)) {
      if (activeAbility?.id === ability.id) {
        setActiveAbility(null);
        return;
      }
      setActiveAbility(ability);
      showNotification(`${ability.name} selected (${cost} AP). Choose a qualifying ability from among the promoted cards below to use for free.`);
      return;
    }

    // Targeted abilities (attacks, empty tile targeting like Stone Wall/Build Structure/Pitch Camp/Shade Step, tile targeting, wall reinforce)
    if (isTargetedAbility(ability) || isMultiStageAbility(ability)) {
      if (activeAbility?.id === ability.id) {
        if (multiStageState) {
          const pathSpec = getPathSpec(multiStageState.ability);
          if (pathSpec && validatePath(multiStageState.casterHex, multiStageState.targets, pathSpec).valid) {
            handleFinishMultiStage();
            return;
          }
        }
        setActiveAbility(null);
        setMultiStageState(null);
        return;
      }
      // "If this is the first ability this unit used this turn, you may move this unit 1 tile for free before declaring
      // the target" (e.g. Full Moon Thrust): the free move comes first, then targeting (see abilityAfterFreeMoveRef)
      const preMove: any = ability.effects?.find(
        (e: any) => e.type === 'move' && e.target === 'self' && e.timing === 'beforeDeclaringAttack' && e.free
      );
      if (
        preMove &&
        !freeUse &&
        !isUnitMovementDisabled(activeTurnUnit) &&
        (!preMove.if || evalAttackerCondition(preMove.if, activeTurnUnit, false) === true) &&
        getSurroundingHexes(activeTurnUnitHex!).some((h) => !unitsOnBoard[h])
      ) {
        abilityAfterFreeMoveRef.current = ability;
        setActiveAbility(null);
        setPendingFreeMove({ unitInstanceId: activeTurnUnit.instanceId, sourceName: ability.name });
        setIsMovingMode(true);
        showNotification(`${ability.name}: you may move 1 tile for free first (click a highlighted tile, or click Skip), then choose the target.`);
        return;
      }
      setActiveAbility(ability);
      if (isMultiStageAbility(ability)) {
        const initialState: MultiStageState = {
          ability,
          casterHex: activeTurnUnitHex!,
          stage: 1,
          targets: []
        };
        setMultiStageState(initialState);
        const info = getMultiStageTargetInfo(initialState, unitsOnBoard, activePlayer);
        showNotification(info.promptMessage);
      } else if (isAbilityTargetingEmptyTile(ability)) {
        showNotification(
          `Targeting ${ability.name} (${cost === 0 ? 'Free' : `${cost} AP`}): Click an empty highlighted tile within range.`
        );
      } else if (ability.target === 'obstructingWall') {
        showNotification(
          `Targeting ${ability.name} (${cost === 0 ? 'Free' : `${cost} AP`}): Click an adjacent Obstructing Wall token.`
        );
      } else if (isAbilityTargetingAnyTile(ability)) {
        showNotification(
          `Targeting ${ability.name} (${cost === 0 ? 'Free' : `${cost} AP`}): Click a highlighted tile within range.`
        );
      } else {
        showNotification(
          `Targeting ${ability.name} (${cost === 0 ? 'Free' : `${cost} AP`}): Click a highlighted enemy in range.`
        );
      }
      return;
    }

    // Non-targeted self abilities:
    if (abilityId === 'roast_a_marshmallow') {
      const surroundingHexes = getSurroundingHexes(activeTurnUnitHex!);
      const nearBonfire = surroundingHexes.some((h) => {
        const u = unitsOnBoard[h];
        return u && (u.card.id === 'raging_bonfire' || u.card.name === 'Raging Bonfire');
      });
      const healAmount = nearBonfire ? 4 : 2;
      const newDamageCounters = Math.max(0, activeTurnUnit.damageCounters - healAmount);
      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);

      setUnitsOnBoard((prev) => ({
        ...prev,
        [activeTurnUnitHex!]: {
          ...activeTurnUnit,
          damageCounters: newDamageCounters,
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      }));

      playCardDrawSound();
      showNotification(
        `${activeTurnUnit.card.name} used Roast a Marshmallow and healed ${healAmount} damage!${nearBonfire ? ' (Boosted by adjacent Raging Bonfire)' : ''} (${cost} AP spent, ${newAp} AP remaining).`
      );

      if (cost > 0 && newAp <= 0) {
        switchTurn(false);
      }
      return;
    }

    // Non-targeted self-damaging abilities (e.g. Profane Insight)
    const selfDmgAmount = getAbilitySelfDamage(ability);
    const hasTargetEffects = Boolean(
      (ability.effects || []).some((e: any) => e.type === 'damage' && e.target !== 'self' && e.target !== 'caster') ||
      ability.tags?.includes('melee') ||
      ability.tags?.includes('ranged') ||
      // A tile to click first (e.g. Reckless Leap: move, then take damage)
      isAbilityTargetingAnyTile(ability)
    );

    if (selfDmgAmount > 0 && !hasTargetEffects) {
      let finalArmour = activeTurnUnit.armour;
      let finalDamageCounters = activeTurnUnit.damageCounters;
      let remainingDmg = selfDmgAmount;
      if (finalArmour > 0) {
        const absorbed = Math.min(finalArmour, remainingDmg);
        finalArmour -= absorbed;
        remainingDmg -= absorbed;
      }
      finalDamageCounters += remainingDmg;
      const isDefeated = finalDamageCounters >= activeTurnUnit.card.hp;

      const newAp = activeTurnUnit.currentAp - cost;
      const currentCounts = activeTurnUnit.usedTurnCounts || {};
      const newCounts = recordAbilityUse(currentCounts, ability);

      // Check Sanguine Offering passive (Blood Sage: Whenever this unit takes damage, draw 1 card. Once per turn)
      const unitPassives = getUnitPassives(activeTurnUnit);
      const sanguineOffering = unitPassives.find(
        (p) => p.id === 'sanguine_offering' || p.name === 'Sanguine Offering'
      );
      let drewCardFromPassive = false;
      if (sanguineOffering && canTriggerPassiveThisTurn(activeTurnUnit, sanguineOffering)) {
        const pKey = sanguineOffering.id || sanguineOffering.name;
        newCounts[pKey] = (newCounts[pKey] || 0) + 1;
        newCounts['sanguine_offering'] = (newCounts['sanguine_offering'] || 0) + 1;
        drawCardForPlayer(activeTurnUnit.owner);
        healOnDraw(activeTurnUnit, 1);
        drewCardFromPassive = true;
      }

      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        if (isDefeated) {
          delete next[activeTurnUnitHex!];
          if (activeTurnUnit.card.type !== 'token') {
            if (activeTurnUnit.owner === 'player1') {
              setPlayer1Graveyard((g) => [...g, activeTurnUnit.card]);
            } else {
              setPlayer2Graveyard((g) => [...g, activeTurnUnit.card]);
            }
          }
        } else {
          next[activeTurnUnitHex!] = {
            ...activeTurnUnit,
            armour: finalArmour,
            damageCounters: finalDamageCounters,
            tookDamageThisTurn: true,
            currentAp: newAp,
            usedTurnCounts: newCounts
          };
        }
        let finalSelfNext = next;
        if (selfDmgAmount > 0) {
          finalSelfNext = applyDamageEventsAndPassives(
            [{ hexId: activeTurnUnitHex!, damagedUnitOwner: activeTurnUnit.owner, damageAmount: selfDmgAmount, nonAttack: true }],
            next
          );
        }
        checkVictory(finalSelfNext);
        return finalSelfNext;
      });

      playCardDrawSound();
      showNotification(
        `${activeTurnUnit.card.name} used ${ability.name} and took ${selfDmgAmount} damage!${
          drewCardFromPassive ? ' Sanguine Offering triggered (drew 1 card)!' : ''
        }${isDefeated ? ' (Defeated!)' : ''} (${cost === 0 ? 'Free' : `${cost} AP spent`}, ${newAp} AP remaining).`
      );

      if (isDefeated) {
        setActiveTurnUnitHex(null);
        setSelectedHex(null);
        setActiveAbility(null);
        switchTurn(false);
        return;
      }

      if (cost > 0 && newAp <= 0) {
        switchTurn(false);
      }
      return;
    }

    // "Choose a basic unit card from your graveyard and return it to your hand" (e.g. Chilling Insight):
    // { type: 'returnFromGraveyard', filter: { basic: true }, to: 'hand', count: 1 }
    const fromGraveyard: any = ability.effects?.find((e: any) => e.type === 'returnFromGraveyard');
    if (fromGraveyard) {
      const grave = activePlayer === 'player1' ? player1Graveyard : player2Graveyard;
      const picks = grave
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.type !== 'token' && (!fromGraveyard.filter?.basic || c.basic));
      if (picks.length === 0) {
        showNotification(`${ability.name}: there is no ${fromGraveyard.filter?.basic ? 'basic unit ' : ''}card in your graveyard.`);
        return;
      }
      const owner = activePlayer;
      const casterId = activeTurnUnit.instanceId;
      const newAp = activeTurnUnit.currentAp - cost;
      const newCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, ability);
      // (the AP is spent up front; the pick can't be backed out of)
      setUnitsOnBoard((prev) => {
        const h = Object.keys(prev).find((k) => prev[k].instanceId === casterId);
        return h ? { ...prev, [h]: { ...prev[h], currentAp: newAp, usedTurnCounts: newCounts } } : prev;
      });
      setActiveAbility(null);
      askCardChoice(
        {
          title: ability.name,
          message: 'Choose a card from your graveyard to return to your hand.',
          options: picks.map(({ c, i }) => ({ label: c.name, value: String(i) }))
        },
        (value) => {
          const idx = parseInt(value, 10);
          const setGrave = owner === 'player1' ? setPlayer1Graveyard : setPlayer2Graveyard;
          const setHand = owner === 'player1' ? setPlayer1Hand : setPlayer2Hand;
          const card = grave[idx];
          if (!card) return;
          setGrave((g) => {
            const at = g.indexOf(card);
            return at < 0 ? g : [...g.slice(0, at), ...g.slice(at + 1)];
          });
          setHand((h) => [...h, card]);
          playCardDrawSound();
          showNotification(`${activeTurnUnit.card.name} used ${ability.name}: returned ${card.name} to your hand (${cost} AP spent, ${newAp} AP remaining).`);
          if (cost > 0 && newAp <= 0) switchTurn(false);
        }
      );
      return;
    }

    // Non-attack self buff ability: spends AP immediately and applies effect
    let armourGain = 0;
    const match = ability.text.match(/armour\s+up\s+to\s+(\d+)/i) || ability.text.match(/gain[s]?\s+(\d+)\s+armour/i);
    if (match) armourGain = parseInt(match[1], 10);

    const hasReflect =
      abilityId === 'fortress_stance' ||
      abilityId === 'gird_for_battle' ||
      abilityId === 'flawless_parry' ||
      Boolean(ability.effects?.some((e: any) => e.type === 'setReact' && e.effects?.some((re: any) => re.type === 'reflect'))) ||
      Boolean(ability.effects?.some((e: any) => e.type === 'reflect')) ||
      ability.text?.toLowerCase().includes('reflect');

    let newReflectStance: import('./types/game').ReflectStance | null = null;
    if (hasReflect) {
      const isRangedOnly =
        ability.text?.toLowerCase().includes('ranged attack') ||
        abilityId === 'fortress_stance' ||
        abilityId === 'gird_for_battle' ||
        Boolean(ability.effects?.some((e: any) => e.trigger?.toLowerCase().includes('ranged')));
      const isRange1Only =
        ability.text?.toLowerCase().includes('within range 1') ||
        abilityId === 'flawless_parry';

      const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      const preventUpTo = abilityId === 'flawless_parry' ? 4 : undefined;
      newReflectStance = {
        sourceAbilityName: ability.name,
        triggerType: isRangedOnly ? 'ranged' : isRange1Only ? 'range1' : 'all',
        preventUpTo,
        once: true,
        expiresOnTurnEndFor: opponent
      };
    }

    const newAp = activeTurnUnit.currentAp - cost;
    const currentCounts = activeTurnUnit.usedTurnCounts || {};
    const newCounts = recordAbilityUse(currentCounts, ability);

    // Self armour read from data when the ability has it: { upTo } armours up to N; { upTo, otherwiseGain } gains
    // otherwiseGain instead when already at N or more (e.g. Ready Deflection); { amount } gains N. Otherwise the text.
    const selfArmourEff: any = ability.effects?.find(
      (e: any) => e.type === 'armour' && (e.target === 'self' || !e.target) && !e.if
    );
    const armourAfter = (current: number): number => {
      if (selfArmourEff) {
        if (typeof selfArmourEff.upTo === 'number') {
          if (typeof selfArmourEff.otherwiseGain === 'number' && current >= selfArmourEff.upTo) {
            return current + selfArmourEff.otherwiseGain;
          }
          return Math.max(current, selfArmourEff.upTo);
        }
        // { amount, max } gains up to a maximum (e.g. Unbreakable Line: 2 armour, to a maximum of 12)
        if (typeof selfArmourEff.amount === 'number') {
          return typeof selfArmourEff.max === 'number'
            ? Math.max(current, Math.min(selfArmourEff.max, current + selfArmourEff.amount))
            : current + selfArmourEff.amount;
        }
      }
      return armourGain > 0 ? Math.max(current, armourGain) : current;
    };

    // "All tiles surrounding this unit become scorched" (e.g. Lava Elemental's Burning Barrier): until the end of the
    // opponent's next turn, or of your next turn (that one outlasts the end of this turn too)
    const selfScorch: any = ability.effects?.find((e: any) => e.type === 'scorchTiles' && e.tiles === 'surroundingSelf');
    if (selfScorch && activeTurnUnitHex) {
      const scorchOpponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
      const untilMyNextTurn = selfScorch.duration === 'untilEndOfYourNextTurn';
      setScorchedTiles((prev) => {
        const next = { ...prev };
        getSurroundingHexes(activeTurnUnitHex).forEach((h) => {
          next[h] = untilMyNextTurn
            ? { expiresOnTurnEndFor: activePlayer, casterPlayer: activePlayer, skipTurnEnds: 1 }
            : { expiresOnTurnEndFor: scorchOpponent, casterPlayer: activePlayer };
        });
        return next;
      });
    }

    // "Each enemy unit surrounding a Toadstool must spend an additional 1AP on its first action next turn" (e.g. Fungal
    // Surprise): target 'enemyUnitsSurroundingFriendlyToken:<token id>' taxes every enemy next to one of your tokens
    const tokenTax: any = ability.effects?.find(
      (e: any) => e.type === 'increaseActionCost' && typeof e.target === 'string' && e.target.startsWith('enemyUnitsSurroundingFriendlyToken:')
    );
    let tokenTaxCount = 0;
    if (tokenTax) {
      const tokenId = tokenTax.target.split(':')[1];
      const taxed = new Set<string>();
      Object.entries(unitsOnBoard).forEach(([h, u]) => {
        if (u.owner !== activeTurnUnit.owner || u.card.id !== tokenId) return;
        getSurroundingHexes(h).forEach((s) => {
          const e = unitsOnBoard[s];
          if (e && e.owner !== activeTurnUnit.owner) taxed.add(e.instanceId);
        });
      });
      tokenTaxCount = taxed.size;
      if (taxed.size > 0) {
        const taxAbility = { ...ability, effects: [{ ...tokenTax, target: 'target' }] } as CardAbility;
        setUnitsOnBoard((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((h) => {
            if (taxed.has(next[h].instanceId)) next[h] = applyActionTax(next[h], taxAbility);
          });
          return next;
        });
      }
    }

    // Other self-ability effects read from data:
    //   heals: { type: 'heal', target: 'self' | 'selfAndFriendlyUnitsSurroundingSelf', amount } (e.g. Radiant Burst)
    //   { type: 'cannotUseRangedAttacks', target: 'enemyUnitsSurroundingSelf', if? } (e.g. Blinding Shield, if it is the
    //     first ability this turn)
    //   { type: 'reduceDamageDealt', target: 'enemyUnits', amount, appliesTo: 'itsAttacks' } (e.g. Maddening Fog: during
    //     the opponent's next turn; read as that much less on the first hit of each attack)
    const selfHeal: any = ability.effects?.find(
      (e: any) => e.type === 'heal' && (e.target === 'self' || e.target === 'selfAndFriendlyUnitsSurroundingSelf') && typeof e.amount === 'number'
    );
    const isFirstAbility = getAbilitiesUsedThisTurn(activeTurnUnit) === 0;
    const blindEff: any = ability.effects?.find(
      (e: any) => e.type === 'cannotUseRangedAttacks' && e.target === 'enemyUnitsSurroundingSelf'
    );
    const blinds = Boolean(blindEff) && (blindEff.if !== 'abilityNumberThisTurn:1' || isFirstAbility);
    const fogEff: any = ability.effects?.find(
      (e: any) => e.type === 'reduceDamageDealt' && e.target === 'enemyUnits' && typeof e.amount === 'number'
    );
    // "If you would gain armour this way and it's the first time it has used this ability this turn, deal that much
    // damage to all surrounding enemy units" (e.g. Sunlight Tactics, on the free promoted ability it used)
    const providerAbility = ability.parentAbilityId
      ? activeTurnUnit.card.abilities?.find((a) => a.id === ability.parentAbilityId)
      : undefined;
    const armourBurst: any = providerAbility?.effects?.find((e: any) => e.type === 'armourBurst');
    const providerUsesBefore = providerAbility ? currentCounts[providerAbility.id] || 0 : 0;
    const providerFirstUse = ability.prepaidByParent ? providerUsesBefore <= 1 : providerUsesBefore === 0;
    const armourGained = Math.max(0, armourAfter(activeTurnUnit.armour) - activeTurnUnit.armour);
    const burstDamage = armourBurst && providerFirstUse ? armourGained : 0;
    const casterHexForBuff = activeTurnUnitHex!;
    setUnitsOnBoard((prev) => {
      // "Surrounding friendly units may use this unit's armour as their own" (Battered Shield), "this unit cannot move
      // until ..." (e.g. Iceshell Stance), and "cannot be knocked back until the start of your next turn" (e.g. Brace for
      // Impact)
      const cur = applySelfKnockbackImmunity(
        applySelfCannotMove(applySelfArmourShare(prev[casterHexForBuff] || activeTurnUnit, ability), ability),
        ability
      );
      let next: Record<string, BattlefieldUnit> = {
        ...prev,
        [casterHexForBuff]: {
          ...cur,
          armour: armourAfter(cur.armour),
          reflectStance: newReflectStance || cur.reflectStance,
          currentAp: newAp,
          usedTurnCounts: newCounts
        }
      };
      if (selfHeal) {
        const healHexes =
          selfHeal.target === 'self'
            ? [casterHexForBuff]
            : [casterHexForBuff, ...getSurroundingHexes(casterHexForBuff).filter((h) => next[h]?.owner === activePlayer)];
        healHexes.forEach((h) => {
          const u = next[h];
          if (!u || (h !== casterHexForBuff && isImmuneToNonDamageEffects(u))) return;
          next = { ...next, [h]: { ...u, damageCounters: Math.max(0, u.damageCounters - selfHeal.amount) } };
        });
      }
      if (blinds) {
        getSurroundingHexes(casterHexForBuff).forEach((h) => {
          const u = next[h];
          if (u && u.owner !== activePlayer && !isImmuneToNonDamageEffects(u)) next = { ...next, [h]: addUseLimitStatus(u, CANNOT_USE_RANGED) };
        });
      }
      if (fogEff) {
        Object.keys(next).forEach((h) => {
          const u = next[h];
          if (u.owner !== activePlayer && !isImmuneToNonDamageEffects(u)) {
            next = { ...next, [h]: { ...u, firstHitReduction: (u.firstHitReduction || 0) + fogEff.amount } };
          }
        });
      }
      // "All of your opponent's units get Mindless during your opponent's next turn" (e.g. Horrifying Screech)
      if (ability.effects?.some((e: any) => e.type === 'giveMindless' && e.target === 'enemyUnits')) {
        Object.keys(next).forEach((h) => {
          const u = next[h];
          if (u.owner === activePlayer || isImmuneToNonDamageEffects(u) || u.statuses?.includes(MINDLESS)) return;
          next = { ...next, [h]: { ...u, statuses: [...(u.statuses || []), MINDLESS] } };
        });
      }
      // "During your next turn, this unit can't use this ability" (e.g. Horrifying Screech)
      if (ability.effects?.some((e: any) => e.type === 'lockSelfAbility') && next[casterHexForBuff]) {
        const me = next[casterHexForBuff];
        const lockId = String(ability.baseAbilityId || ability.id);
        next = {
          ...next,
          [casterHexForBuff]: {
            ...me,
            lockedAbilities: {
              ...(me.lockedAbilities || {}),
              [lockId]: { abilityId: lockId, sourceAbilityName: ability.name, lockedForPlayer: me.owner, turnsRemaining: 2 }
            }
          }
        };
      }
      if (burstDamage > 0) {
        const around = getSurroundingHexes(casterHexForBuff).filter((h) => next[h] && next[h].owner !== activePlayer);
        next = resolvePassiveDamage(
          next,
          around.map((h) => ({ hex: h, amount: burstDamage, source: providerAbility!.name }))
        );
      }
      return next;
    });

    playCardDrawSound();
    const armourNow = armourAfter(activeTurnUnit.armour);
    showNotification(
      `${activeTurnUnit.card.name} used ${ability.name}! (${selfHeal ? `healed ${selfHeal.amount}${selfHeal.target === 'self' ? '' : ' (with surrounding friendly units)'}, ` : ''}${blinds ? "surrounding enemies can't use ranged attacks until the end of your opponent's next turn, " : ''}${fogEff ? `your opponent's attacks deal ${fogEff.amount} less next turn, ` : ''}${ability.effects?.some((e: any) => e.type === 'immune' && e.to === 'knockback') ? "can't be knocked back until your next turn, " : ''}${burstDamage > 0 ? `${burstDamage} damage to surrounding enemies, ` : ''}${armourNow !== activeTurnUnit.armour ? `Armour now ${armourNow}, ` : ''}${selfScorch ? 'surrounding tiles scorched, ' : ''}${tokenTax ? `${tokenTaxCount} enemy unit(s) taxed 1AP on their first action, ` : ''}${newReflectStance ? `Reflect Stance active (reflects next ${newReflectStance.triggerType === 'ranged' ? 'ranged attack' : 'attack'}), ` : ''}${cost === 0 ? 'Free ability' : `${cost} AP spent`}, ${newAp} AP remaining).`
    );

    const endsTurn =
      ability.effects?.some((e: any) => e.type === 'endTurn') ||
      ability.text?.toLowerCase().includes("unit's turn ends");

    // An armour ability may trigger a scry (e.g. Tactician's Ledger); if so, the scry ends the turn when needed
    const ledgerScry = afterArmourAbilityUsed(activeTurnUnit, ability, endsTurn ? 0 : newAp);

    // Automatically end turn when actions cannot be taken or ability ends turn
    if (!ledgerScry && (endsTurn || (cost > 0 && newAp <= 0))) {
      switchTurn(false);
    }
  };

  // ---- Multi-use provider chains (Dual Casting, Overload, Fend Off, Villainous Combo, Grand Metamorphosis) ----
  // The provider's AP is paid on the first choice. Each promoted ability then resolves fully (with its own targeting)
  // before the next one is chosen or used; the provider is finished when the last one resolves or the player cancels.

  const getChainQualifying = (parent: CardAbility) =>
    getQualifyingPromotedAbilities(parent, activeTurnUnit?.promotedCards, activeTurnUnit);

  // completed = false when cancelled: a provider's follow-up (e.g. Shadow Cast's free move) only happens if it finished
  const endProviderChain = (message: string, completed = true) => {
    const chain = providerChain;
    setProviderChain(null);
    setActiveAbility(null);
    // "Then, this unit may move 1 tile for free" (Shadow Cast)
    const freeMove: any = completed
      ? chain?.parent.effects?.find((e: any) => e.type === 'move' && e.target === 'self' && e.free)
      : undefined;
    if (freeMove && activeTurnUnit && !isUnitMovementDisabled(activeTurnUnit)) {
      setPendingFreeMove({ unitInstanceId: activeTurnUnit.instanceId, sourceName: chain!.parent.name });
      setIsMovingMode(true);
      showNotification(`${message} You may move 1 tile for free: click a highlighted tile, or click Skip.`);
      return;
    }
    showNotification(message);
    if (activeTurnUnit && activeTurnUnit.currentAp <= 0) switchTurn(false);
  };

  // Uses one promoted ability as a step of the chain
  const runChainStep = (chain: ProviderChainState, promoted: CardAbility) => {
    const nextChain: ProviderChainState = { ...chain, used: [...chain.used, promoted] };
    setProviderChain(nextChain);
    const stepTotal = chain.spec.chooseFirst ? nextChain.used.length + nextChain.queue.length : chain.spec.uses;
    const stepLabel = `${nextChain.used.length}/${stepTotal}`;
    const parent = chain.parent;

    // Attacks, and non-attack abilities that need a target, are targeted as usual (for free) before the next choice
    const needsTarget = isAttackAbility(promoted) || isTargetedAbility(promoted);
    if (needsTarget) {
      const executable = buildProviderExecutable(parent, promoted, {
        cost: 0,
        // Later uses in the same chain are not the provider's first use this turn
        parentUsedBefore: chain.used.length > 0,
        extra: { prepaidByParent: true, inProviderChain: true }
      });
      // A repeat of the same attack (e.g. Overload Gemstone's second use) fires at the locked target by itself
      if (chain.spec.autoTargetRepeats && chain.targetInstanceId) {
        const targetHex = Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === chain.targetInstanceId);
        if (!targetHex) {
          endProviderChain(`${parent.name} ended early: ${chain.targetName || 'the target'} is gone.`);
          return;
        }
        setActiveAbility(executable);
        setPendingAttackReplayHex(targetHex);
        showNotification(`${parent.name} ${stepLabel}: ${promoted.name} again at ${chain.targetName || 'the same target'}.`);
        return;
      }
      setActiveAbility(executable);
      const targetNote =
        chain.spec.sameTargetForAttacks && chain.targetName && isAttackAbility(promoted)
          ? ` It must target ${chain.targetName}.`
          : isAttackAbility(promoted)
          ? ' Click an enemy in range (blue tiles).'
          : ' Click a target in range.';
      showNotification(`${parent.name} ${stepLabel}: ${promoted.name} for free.${targetNote}`);
      return;
    }

    // Non-attack promoted ability with no target: does exactly what it does when used directly, for free. Resolved on
    // the next render (see the effect below), so it sees the provider's AP already paid.
    setActiveAbility(null);
    setPendingChainInstant(
      buildProviderExecutable(parent, promoted, {
        cost: 0,
        parentUsedBefore: chain.used.length > 0,
        extra: { prepaidByParent: true, inProviderChain: true }
      })
    );
    showNotification(`${parent.name} ${stepLabel}: using ${promoted.name} for free.`);
  };

  useEffect(() => {
    if (!pendingChainInstant) return;
    const executable = pendingChainInstant;
    setPendingChainInstant(null);
    handleAbilityClick(executable, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChainInstant]);

  // Called whenever nothing is being targeted while a chain is active: use or offer the next promoted ability
  const advanceProviderChain = (chain: ProviderChainState) => {
    if (!activeTurnUnit || activeTurnUnit.instanceId !== chain.unitInstanceId) {
      setProviderChain(null);
      return;
    }
    if (chain.phase === 'choosing') {
      setActiveAbility(chain.parent);
      return;
    }
    const targetGone = chain.spec.sameTargetForAttacks && isChainTargetGone(chain, unitsOnBoard);

    if (chain.spec.chooseFirst) {
      const [next, ...rest] = chain.queue;
      if (!next) {
        endProviderChain(`${chain.parent.name} finished.`);
        return;
      }
      runChainStep({ ...chain, queue: rest }, next);
      return;
    }

    const remaining = chain.spec.uses - chain.used.length;
    const candidates = getChainCandidates(chain, getChainQualifying(chain.parent)).filter(
      (c) => !(targetGone && isAttackAbility(c.ability))
    );
    if (remaining <= 0 || candidates.length === 0) {
      const why =
        remaining <= 0
          ? 'finished'
          : targetGone
          ? `ended early: ${chain.targetName || 'the target'} is gone`
          : 'ended early: no other qualifying abilities';
      endProviderChain(`${chain.parent.name} ${why}.`);
      return;
    }
    setActiveAbility(chain.parent);
    showNotification(
      `${chain.parent.name}: choose ability ${chain.used.length + 1}/${chain.spec.uses} from the promoted cards${
        chain.spec.distinct ? ' (must be different)' : ''
      }, or Cancel.`
    );
  };

  // A chain whose picks are extra hits of one attack (e.g. Gemstone Hammer): one melee attack, already paid for,
  // whose hits are the provider's lead damage then each chosen attack's hits, per repeat
  const launchCombinedAttack = (chain: ProviderChainState) => {
    const parent = chain.parent;
    const base = buildProviderExecutable(parent, chain.queue[0], {
      cost: 0,
      parentUsedBefore: false,
      extra: { prepaidByParent: true }
    });
    const executable: CardAbility = {
      ...base,
      id: `${parent.id}__combined`,
      name: `${parent.name} (${chain.queue.map((a) => a.name).join(' + ')})`,
      text: parent.text,
      // The attack is the provider's own (melee for Gemstone Hammer), not the chosen attacks' ranges
      tags: parent.tags || [],
      range: parent.range,
      rangeText: parent.rangeText,
      target: parent.target,
      effects: (parent.effects || []).filter((e: any) => e.type === 'damage'),
      combinedHits: {
        leadDamage: chain.spec.leadDamage || 0,
        leadName: parent.name,
        parts: chain.queue,
        singleHit: Boolean(chain.spec.singleHit)
      }
    };
    setProviderChain(null);
    setActiveAbility(executable);
    showNotification(
      chain.spec.singleHit
        ? `${parent.name}: one hit worth the total of ${chain.queue.map((a) => a.name).join(' + ')}. Click a target in range.`
        : chain.spec.repeatFirstChoice
        ? `${parent.name}: ${chain.queue[0].name} cast ${chain.queue.length} times at once, as hits of one attack. Click a target in range.`
        : `${parent.name}: ${chain.queue.length} repeat${chain.queue.length > 1 ? 's' : ''} of ${chain.spec.leadDamage || 0} damage + ${chain.queue
            .map((a) => a.name)
            .join(', ')}, all as hits of one attack. Click a target in range.`
    );
  };

  // Done: choose-first chains stop choosing and start using what was chosen;
  // "up to" chains chosen as you go (e.g. Shadow Cast's AP budget) stop between uses
  const handleFinishChainChoosing = () => {
    if (!providerChain) return;
    if (providerChain.phase === 'choosing') {
      if (providerChain.queue.length === 0) return;
      setProviderChain({ ...providerChain, phase: 'using' });
      setActiveAbility(null);
      return;
    }
    if (providerChain.spec.upTo && !activeAbility?.inProviderChain) {
      endProviderChain(`${providerChain.parent.name} finished.`);
    }
  };

  const handleChainSelect = (promotedAbility: CardAbility, parentAbility: CardAbility, spec: ProviderChainSpec) => {
    if (!activeTurnUnit || !activeTurnUnitHex) return;
    if (providerChain && activeAbility?.inProviderChain) {
      showNotification(`Finish targeting ${activeAbility.name} or click Cancel first.`);
      return;
    }
    const promotedCheck = canUseAbilityThisTurn(activeTurnUnit, promotedAbility);
    if (!promotedCheck.allowed) {
      showNotification(promotedCheck.reason || `${promotedAbility.name} can only be used once per turn.`);
      return;
    }

    let chain = providerChain;
    if (!chain) {
      const parentCheck = canUseAbilityThisTurn(activeTurnUnit, parentAbility);
      if (!parentCheck.allowed) {
        showNotification(parentCheck.reason || `${parentAbility.name} can only be used once per turn.`);
        return;
      }
      const parentCost = getAbilityApCost(parentAbility);
      if (activeTurnUnit.currentAp < parentCost) {
        showNotification(`Not enough AP to use ${parentAbility.name} (Requires ${parentCost} AP, has ${activeTurnUnit.currentAp} AP).`);
        return;
      }
      const draft: ProviderChainState = {
        parent: parentAbility,
        unitInstanceId: activeTurnUnit.instanceId,
        spec,
        used: [],
        queue: [],
        phase: spec.chooseFirst ? 'choosing' : 'using',
        promotedCards: activeTurnUnit.promotedCards || []
      };
      const firstCheck = canAddToChain(draft, promotedAbility);
      if (!firstCheck.allowed) {
        showNotification(firstCheck.reason || `${promotedAbility.name} cannot be chosen.`);
        return;
      }
      // Pay for the provider now: the chain is committed from its first choice
      const newAp = activeTurnUnit.currentAp - parentCost;
      setUnitsOnBoard((prev) => {
        const cur = prev[activeTurnUnitHex] || activeTurnUnit;
        const counts = { ...(cur.usedTurnCounts || {}) };
        if (parentAbility.id) counts[parentAbility.id] = (counts[parentAbility.id] || 0) + 1;
        if (parentAbility.name) counts[parentAbility.name] = (counts[parentAbility.name] || 0) + 1;
        // A variable-cost variant (e.g. gemstone_hammer__cost_2) also uses up the real ability's 1/Turn
        if (parentAbility.baseAbilityId) counts[parentAbility.baseAbilityId] = (counts[parentAbility.baseAbilityId] || 0) + 1;
        return { ...prev, [activeTurnUnitHex]: { ...cur, currentAp: newAp, usedTurnCounts: counts } };
      });
      showNotification(`${parentAbility.name}: ${parentCost} AP spent (${newAp} AP remaining).`);
      chain = draft;
    } else {
      const addCheck = canAddToChain(chain, promotedAbility);
      if (!addCheck.allowed) {
        showNotification(addCheck.reason || `${promotedAbility.name} cannot be chosen.`);
        return;
      }
    }

    if (chain.spec.chooseFirst && chain.phase === 'choosing') {
      // (one pick fills every use when the provider repeats its first choice, e.g. Overload)
      const next: ProviderChainState = chain.spec.repeatFirstChoice
        ? { ...chain, queue: Array.from({ length: chain.spec.uses }, () => promotedAbility) }
        : { ...chain, queue: [...chain.queue, promotedAbility] };
      const moreAvailable = getChainCandidates(next, getChainQualifying(parentAbility)).length > 0;
      if ((next.queue.length >= next.spec.uses || !moreAvailable) && next.spec.combineIntoOneAttack) {
        launchCombinedAttack(next);
        return;
      }
      if (next.queue.length >= next.spec.uses || !moreAvailable) {
        setProviderChain({ ...next, phase: 'using' });
        setActiveAbility(null);
        showNotification(`${parentAbility.name}: chose ${next.queue.map((a) => a.name).join(', ')}. Using them in order.`);
        return;
      }
      setProviderChain(next);
      showNotification(
        `${parentAbility.name}: chose ${promotedAbility.name} (${next.queue.length}/${next.spec.uses}). Choose another${
          next.spec.upTo ? ', or click Done' : ''
        }.`
      );
      return;
    }

    runChainStep(chain, promotedAbility);
  };

  // Advance an active chain once nothing is being targeted and no other choice is open
  useEffect(() => {
    if (!providerChain || activeAbility || pendingChainInstant) return;
    if (
      lootPending ||
      researchPending ||
      scryPending ||
      fieldNotesPending ||
      deckArrangePending ||
      pendingMomentumCharge ||
      knockbackChoicePending ||
      facelessKingPendingChoice ||
      abilityReinforcePending ||
      multiStageState ||
      isTurnTransitioning ||
      popupQueue.length > 0 ||
      popupOrderChoice ||
      readySpellReact
    ) {
      return;
    }
    advanceProviderChain(providerChain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    providerChain,
    activeAbility,
    pendingChainInstant,
    lootPending,
    researchPending,
    scryPending,
    fieldNotesPending,
    deckArrangePending,
    pendingMomentumCharge,
    knockbackChoicePending,
    facelessKingPendingChoice,
    abilityReinforcePending,
    multiStageState,
    isTurnTransitioning,
    popupQueue,
    popupOrderChoice,
    readySpellReact
  ]);

  // "Whenever this unit uses an armour ability, look at the top card of your deck. You may put it on the bottom."
  // (e.g. Tactician's Ledger): opens the scry popup. Returns true if it did; the scry then ends the turn if afterAp <= 0.
  const startArmourAbilityScry = (unit: BattlefieldUnit, ability: CardAbility, afterAp?: number): boolean => {
    if (!isArmourAbility(ability)) return false;
    const passive = getUnitPassives(unit).find(
      (p) => p.trigger === 'self.usesArmourAbility' && (p.effects || []).some((e: any) => e.type === 'lookTop')
    );
    if (!passive) return false;
    const deck = unit.owner === 'player1' ? player1Deck : player2Deck;
    if (deck.length === 0) return false;
    enqueuePopup(unit.owner, `${passive.name}: Scry 1`, (ctx) => {
      const d = unit.owner === 'player1' ? ctx.p1Deck : ctx.p2Deck;
      if (d.length === 0) {
        if (afterAp !== undefined && afterAp <= 0) endTurnAfterPopups();
        return;
      }
      setScryPending({
        card: d[0],
        player: unit.owner,
        unitName: unit.card.name,
        sourceTitle: `${passive.name}: Scry 1`,
        abilityName: passive.name,
        afterAp
      });
    });
    return true;
  };

  // After a unit uses an armour ability: a waiting "+N armour" buff is used on it, then a once-per-turn "next attack"
  // buff may be granted (e.g. Perfect Form), then any armour-ability scry (e.g. Tactician's Ledger). Returns true if a
  // scry opened (it then ends the turn when afterAp <= 0).
  const afterArmourAbilityUsed = (unit: BattlefieldUnit, ability: CardAbility, afterAp?: number): boolean => {
    if (!isArmourAbility(ability)) return false;
    const buffs = getNextActionBuffPassives(unit);
    const grant = buffs.afterArmourAbility && unit.passiveTurnMarks?.[buffs.afterArmourAbility.markKey] !== turnCount
      ? buffs.afterArmourAbility
      : undefined;
    const usedArmourBonus = unit.nextArmourAbilityBonus;
    if (grant || usedArmourBonus) {
      setUnitsOnBoard((prev) => {
        const hex = Object.keys(prev).find((h) => prev[h].instanceId === unit.instanceId);
        if (!hex) return prev;
        let u = prev[hex];
        if (u.nextArmourAbilityBonus) u = { ...u, armour: u.armour + u.nextArmourAbilityBonus.amount, nextArmourAbilityBonus: null };
        if (grant) {
          u = {
            ...u,
            nextAttackBonus: { amount: grant.amount, scope: grant.scope, source: grant.name },
            passiveTurnMarks: { ...(u.passiveTurnMarks || {}), [grant.markKey]: turnCount }
          };
        }
        return { ...prev, [hex]: u };
      });
      const notes: string[] = [];
      if (usedArmourBonus) notes.push(`+${usedArmourBonus.amount} armour from ${usedArmourBonus.source}`);
      if (grant) notes.push(`next attack this turn deals +${grant.amount} damage${grant.scope === 'allHits' ? ' per hit' : ''} (${grant.name})`);
      showNotification(`${unit.card.name}: ${notes.join('; ')}.`);
    }
    return startArmourAbilityScry(unit, ability, afterAp);
  };

  // After a unit attacks: a waiting "next attack" buff has been used, then a once-per-turn "next armour ability"
  // buff may be granted (e.g. Perfect Form)
  const afterAttackUsed = (unit: BattlefieldUnit) => {
    const buffs = getNextActionBuffPassives(unit);
    const grant = buffs.afterAttack && unit.passiveTurnMarks?.[buffs.afterAttack.markKey] !== turnCount ? buffs.afterAttack : undefined;
    if (!grant && !unit.nextAttackBonus) return;
    setUnitsOnBoard((prev) => {
      const hex = Object.keys(prev).find((h) => prev[h].instanceId === unit.instanceId);
      if (!hex) return prev;
      let u: BattlefieldUnit = { ...prev[hex], nextAttackBonus: null };
      if (grant) {
        u = {
          ...u,
          nextArmourAbilityBonus: { amount: grant.amount, source: grant.name },
          passiveTurnMarks: { ...(u.passiveTurnMarks || {}), [grant.markKey]: turnCount }
        };
      }
      return { ...prev, [hex]: u };
    });
    if (grant) showNotification(`${unit.card.name}'s ${grant.name}: its next armour ability this turn grants +${grant.amount} armour.`);
  };

  // Applies what a provider does before its free ability (draw, self armour). Returns a note for the message.
  const applyProviderPreEffects = (parent: CardAbility): string => {
    if (!activeTurnUnit || !activeTurnUnitHex) return '';
    const hex = activeTurnUnitHex;
    const notes: string[] = [];
    getProviderPreEffects(parent).forEach((e: any) => {
      if (e.type === 'draw') {
        const n = typeof e.amount === 'number' ? e.amount : 1;
        for (let i = 0; i < n; i++) drawCardForPlayer(activeTurnUnit.owner);
        healOnDraw(activeTurnUnit, n);
        notes.push(`drew ${n} card${n > 1 ? 's' : ''}`);
      } else if (e.type === 'armour' && (e.target === 'self' || !e.target)) {
        setUnitsOnBoard((prev) => {
          const cur = prev[hex];
          if (!cur) return prev;
          // { amount, max } gains up to a maximum (Paladin's Smite: 1 armour to a maximum of 4)
          const gained = cur.armour + (typeof e.amount === 'number' ? e.amount : 0);
          const armour =
            typeof e.upTo === 'number'
              ? Math.max(cur.armour, e.upTo)
              : typeof e.max === 'number'
              ? Math.max(cur.armour, Math.min(e.max, gained))
              : gained;
          return { ...prev, [hex]: { ...cur, armour } };
        });
        notes.push(typeof e.upTo === 'number' ? `armoured up to ${e.upTo}` : `gained ${e.amount} armour${typeof e.max === 'number' ? ` (max ${e.max})` : ''}`);
      }
    });
    return notes.join(', ');
  };

  // Handle selecting a qualifying promoted ability for free via a parent provider ability
  // borrowedFrom: the cards the ability comes from when they aren't this unit's promoted cards (e.g. Synaptic Link: the
  // target's own card and the cards under it)
  const handlePromotedAbilitySelect = (promotedAbility: CardAbility, parentAbility: CardAbility, borrowedFrom?: CardItem[]) => {
    if (!activeTurnUnit) return;
    // A paid-for free attack is being targeted: picking again would pay again
    if (activeAbility?.prepaidByParent && !providerChain) {
      showNotification(`Finish targeting ${activeAbility.name} or click Cancel first.`);
      return;
    }
    // Multi-use providers run as a chain
    const parentCounts = activeTurnUnit.usedTurnCounts || {};
    const parentUsedBefore = ((parentCounts[parentAbility.name] || parentCounts[parentAbility.id] || 0) as number) > 0;
    const chainSpec =
      providerChain && providerChain.parent.id === parentAbility.id
        ? providerChain.spec
        : getProviderChainSpec(parentAbility, parentUsedBefore, activeTurnUnit.promotedCards?.length || 0);
    if (chainSpec) {
      handleChainSelect(promotedAbility, parentAbility, chainSpec);
      return;
    }
    const parentCheck = canUseAbilityThisTurn(activeTurnUnit, parentAbility);
    if (!parentCheck.allowed) {
      showNotification(parentCheck.reason || `${parentAbility.name} can only be used once per turn.`);
      return;
    }
    const promotedCheck = canUseAbilityThisTurn(activeTurnUnit, promotedAbility);
    if (!promotedCheck.allowed) {
      showNotification(promotedCheck.reason || `${promotedAbility.name} can only be used once per turn.`);
      return;
    }
    // Must still qualify right now (e.g. Cycle Through: not already chosen this way this turn)
    const stillQualifies = getQualifyingPromotedAbilities(parentAbility, borrowedFrom || activeTurnUnit.promotedCards, activeTurnUnit).some(
      (q) => q.ability.id === promotedAbility.id
    );
    if (!stillQualifies) {
      showNotification(`${promotedAbility.name} can't be chosen with ${parentAbility.name} again this turn.`);
      return;
    }
    // (a reveal-gated provider, e.g. Seer's Visions, was paid for when it revealed)
    const revealPrepaid = Boolean(parentAbility.revealPrepaid);
    const parentCost = revealPrepaid ? 0 : getAbilityApCost(parentAbility);
    if (activeTurnUnit.currentAp < parentCost) {
      showNotification(`Not enough AP to use ${parentAbility.name} (Requires ${parentCost} AP, has ${activeTurnUnit.currentAp} AP).`);
      return;
    }

    const isAttack =
      promotedAbility.tags?.includes('melee') ||
      promotedAbility.tags?.includes('ranged') ||
      promotedAbility.tags?.includes('attack') ||
      promotedAbility.text.toLowerCase().includes('deal') ||
      promotedAbility.text.toLowerCase().includes('damage');

    const allowEmpty =
      parentAbility.id === 'echoing_incantation' ||
      Boolean((parentAbility as any).allowEmptyTileTarget) ||
      Boolean(parentAbility.effects?.some((e: any) => e.allowEmptyTileTarget));

    // Providers that do something first (e.g. Seer's Visions "Draw a card, then...", Paladin's Lance "This unit gains
    // 1 armour. Then..."): AP is paid and those effects happen as soon as the attack is chosen, so cancelling targeting
    // still costs the AP
    // "This unit may move 1 tile for free before choosing a target for this attack" (Shifting Strike): read from the
    // useAbility effect's 'before' list. The provider is paid when chosen, as with the effects above.
    const beforeMove: any = ((parentAbility.effects?.find((e: any) => e.type === 'useAbility') as any)?.before || []).find(
      (e: any) => e.type === 'move' && e.target === 'self' && e.free
    );
    const prepaysAttack = (getProviderPreEffects(parentAbility).length > 0 || Boolean(beforeMove)) && isAttack;

    const executableAbility = buildProviderExecutable(parentAbility, promotedAbility, {
      cost: prepaysAttack ? 0 : parentCost,
      parentUsedBefore,
      extra: {
        ...(prepaysAttack || revealPrepaid ? { prepaidByParent: true } : {}),
        ...(parentAbility.id === 'blink_strike' ? { treatAsFromBehind: true } : {}),
        ...(allowEmpty ? { allowEmptyTileTarget: true } : {})
      }
    });

    if (isAttack) {
      if (parentAbility.id === 'avast') {
        const newAp = activeTurnUnit.currentAp - parentCost;
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const pKey = parentAbility.id || parentAbility.name;
        const newCounts: Record<string, number> = {
          ...currentCounts,
          [pKey]: (currentCounts[pKey] || 0) + 1
        };
        newCounts['avast'] = (newCounts['avast'] || 0) + 1;
        setUnitsOnBoard((prev) => ({
          ...prev,
          [activeTurnUnitHex!]: {
            ...activeTurnUnit,
            currentAp: newAp,
            usedTurnCounts: newCounts
          }
        }));

        triggerLoot(activePlayer, 1, 'Avast', activeTurnUnit.card.name, {
          unitHex: activeTurnUnitHex!,
          afterAp: newAp,
          postLootCallback: () => {
            setActiveAbility(executableAbility);
            showNotification(
              `Avast: Loot 1 completed! Targeting ${promotedAbility.name} for free. Click an enemy in range (blue tiles).`
            );
          }
        });
        return;
      }

      if (beforeMove) {
        const newAp = activeTurnUnit.currentAp - parentCost;
        const newCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, parentAbility);
        setUnitsOnBoard((prev) => {
          const cur = prev[activeTurnUnitHex!] || activeTurnUnit;
          return { ...prev, [activeTurnUnitHex!]: { ...cur, currentAp: newAp, usedTurnCounts: newCounts } };
        });
        if (getProviderPreEffects(parentAbility).length > 0) applyProviderPreEffects(parentAbility);
        playCardDrawSound();
        if (isUnitMovementDisabled(activeTurnUnit)) {
          setActiveAbility(executableAbility);
          showNotification(`${parentAbility.name}: this unit can't move, so target ${promotedAbility.name} now (${parentCost} AP spent).`);
          return;
        }
        // Targeting starts once the free move is made or skipped (see abilityAfterFreeMoveRef)
        abilityAfterFreeMoveRef.current = executableAbility;
        setActiveAbility(null);
        setPendingFreeMove({ unitInstanceId: activeTurnUnit.instanceId, sourceName: parentAbility.name });
        setIsMovingMode(true);
        showNotification(
          `${parentAbility.name}: ${parentCost} AP spent. You may move 1 tile for free first (click a highlighted tile, or click Skip), then target ${promotedAbility.name}.`
        );
        return;
      }

      if (prepaysAttack) {
        const newAp = activeTurnUnit.currentAp - parentCost;
        const currentCounts = activeTurnUnit.usedTurnCounts || {};
        const newCounts: Record<string, number> = { ...currentCounts };
        if (parentAbility.id) newCounts[parentAbility.id] = (newCounts[parentAbility.id] || 0) + 1;
        if (parentAbility.name) newCounts[parentAbility.name] = (newCounts[parentAbility.name] || 0) + 1;
        setUnitsOnBoard((prev) => {
          const cur = prev[activeTurnUnitHex!] || activeTurnUnit;
          return { ...prev, [activeTurnUnitHex!]: { ...cur, currentAp: newAp, usedTurnCounts: newCounts } };
        });
        const preNote = applyProviderPreEffects(parentAbility);
        playCardDrawSound();
        setActiveAbility(executableAbility);
        showNotification(
          `${parentAbility.name}: ${preNote} (${parentCost} AP spent, ${newAp} AP remaining). Now targeting ${promotedAbility.name} for free: click an enemy in range (blue tiles).`
        );
        return;
      }

      setActiveAbility(executableAbility);
      if (parentAbility.id === 'anchor_smash' || isMultiStageAbility(parentAbility)) {
        const initialState: MultiStageState = {
          ability: executableAbility,
          casterHex: activeTurnUnitHex!,
          stage: 1,
          targets: [],
          metadata: { promotedMeleeAbility: promotedAbility }
        };
        setMultiStageState(initialState);
        const info = getMultiStageTargetInfo(initialState, unitsOnBoard, activePlayer);
        showNotification(info.promptMessage);
        return;
      }
      if (parentAbility.id === 'echoing_incantation' || allowEmpty) {
        showNotification(
          `Targeting Echoing Incantation (${promotedAbility.name}): Click an enemy or empty tile in range (blue tiles).`
        );
      } else if (parentAbility.id === 'overload_gemstone') {
        showNotification(
          `Targeting Overload Gemstone: using ${promotedAbility.name} twice for free against the same target (${parentCost} AP). Click an enemy in range (blue tiles).`
        );
      } else {
        showNotification(
          `Targeting ${parentAbility.name} using ${promotedAbility.name} for free (${parentCost} AP). Click an enemy in range (blue tiles).`
        );
      }
    } else {
      // A non-attack promoted ability takes effect now: an enemy's readied ability (e.g. Ready Spell) may interrupt
      if (offerReadySpellInterrupt({ kind: 'promoted', promoted: promotedAbility, parent: parentAbility })) return;
      // One with a target (e.g. a heal on a friendly unit) is targeted as usual, for the provider's cost
      if (isTargetedAbility(promotedAbility)) {
        setActiveAbility(executableAbility);
        showNotification(`Targeting ${parentAbility.name} using ${promotedAbility.name} for free (${parentCost} AP). Click a target in range.`);
        return;
      }
      // Otherwise it does exactly what it does when used directly, for the provider's cost. Its uses are recorded
      // through the executable: the provider, the free use, and the provider + ability key (Cycle Through)
      setActiveAbility(null);
      handleAbilityClick(executableAbility, true);
      applyProviderPreEffects(parentAbility);
    }
  };

  // Assist Ability Handlers (Rule: Assist abilities)
  // "Assist button from previous point should be the only way to activate an assist ability for now. For assist abilities, the card (regardless of type) is reinforced to back row immediately, regardless of turn, like a basic unit. Then, it uses the assist ability for free (player is locked in to range selection of said ability until they pick how to use it), then the assist unit is immediately put into its player’s graveyard."
  const activeAssistCards = useMemo(() => {
    return activeHand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) =>
        card.abilities?.some((a) => a.tags?.includes('assist') || a.tags?.includes('inspiring'))
      );
  }, [activeHand]);

  const handleAssistButtonClick = () => {
    if (lockedAssist || pendingAssistDeployment) {
      showNotification("Locked in to Assist deployment/action: Select target/placement or click Cancel Assist.");
      return;
    }
    if (!activeTurnUnit || !activeTurnUnitHex) {
      showNotification("You must pick a unit to take a turn first.");
      return;
    }
    if (activeAssistCards.length === 0) {
      showNotification("No cards with an Assist or Inspiring ability in your hand.");
      return;
    }
    setIsAssistModalOpen(true);
  };

  const handleSelectAssist = (card: CardItem, handIndex: number, chosenAbility?: CardAbility) => {
    if (!activeTurnUnit || !activeTurnUnitHex) {
      showNotification("You must pick a unit to take a turn first.");
      return;
    }

    const abilityToUse =
      chosenAbility ||
      card.abilities?.find((a) => a.tags?.includes('inspiring') || a.tags?.includes('assist')) ||
      card.abilities?.[0];

    if (!abilityToUse) return;

    const isP1 = activePlayer === 'player1';
    const isInspiring = abilityToUse.tags?.includes('inspiring');

    // Inspiring Ability Logic:
    // Discarding a card with an inspiring ability to graveyard allows active unit to use it until end of turn
    if (isInspiring) {
      setIsAssistModalOpen(false);

      // Discard card from hand to graveyard
      if (isP1) {
        setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIndex));
        setPlayer1Graveyard((g) => [...g, card]);
      } else {
        setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIndex));
        setPlayer2Graveyard((g) => [...g, card]);
      }

      // Grant inspiring ability to active turn unit until end of turn
      setUnitsOnBoard((prev) => {
        const u = prev[activeTurnUnitHex];
        if (!u) return prev;
        const currentGranted = u.grantedAbilities || [];
        const nextGranted = currentGranted.some((a) => a.id === abilityToUse.id)
          ? currentGranted
          : [...currentGranted, abilityToUse];
        return {
          ...prev,
          [activeTurnUnitHex]: {
            ...u,
            grantedAbilities: nextGranted
          }
        };
      });

      playCardDrawSound();
      showNotification(
        `${card.name} discarded to Graveyard! ${activeTurnUnit.card.name} gained Inspiring ability: ${abilityToUse.name} until end of turn.`
      );
      return;
    }

    // Assist Ability Logic:
    // Back row hexes: Row 1 for Player 1, Row 6 for Player 2
    const backRowCandidates = isP1
      ? ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1']
      : ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6'];

    const availableTiles = backRowCandidates.filter((h) => !unitsOnBoard[h] && !sealedReinforceHexes.has(h));
    if (availableTiles.length === 0) {
      showNotification("Cannot reinforce assist unit: No empty tiles available on your back row (sealed tiles can't be used).");
      return;
    }

    setIsAssistModalOpen(false);

    // Prompt user to pick which back row tile to deploy the assist unit on
    setPendingAssistDeployment({
      card,
      handIndex,
      ability: abilityToUse
    });

    showNotification(
      `Assist: Click an empty tile on your back row (${isP1 ? 'Row 1' : 'Row 6'}) to place ${card.name}, or click Cancel Assist.`
    );
  };

  const handleDeployAssistToHex = (hexId: string) => {
    if (!pendingAssistDeployment) return;
    const { card, handIndex, ability: abilityToUse } = pendingAssistDeployment;
    const isP1 = activePlayer === 'player1';

    setPendingAssistDeployment(null);

    // Remove card from player's hand
    if (isP1) {
      setPlayer1Hand((prev) => prev.filter((_, idx) => idx !== handIndex));
    } else {
      setPlayer2Hand((prev) => prev.filter((_, idx) => idx !== handIndex));
    }

    // Deploy to chosen tile. It gets enough AP for its assist ability: the ability is free for the real turn.
    const assistUnit: BattlefieldUnit = {
      instanceId: newInstanceId('unit_assist'),
      card,
      owner: activePlayer,
      hexId,
      damageCounters: 0,
      armour: 0,
      currentAp: Math.max(card.ap, getAbilityApCost(abilityToUse)),
      promotedCards: []
    };

    setUnitsOnBoard((prev) => ({
      ...prev,
      [hexId]: assistUnit
    }));

    // The assist unit takes over as the acting unit for this one ability; the ability itself is
    // activated by the effect below once the unit is on the board, through the normal ability code.
    const returnUnit = activeTurnUnitHex ? unitsOnBoard[activeTurnUnitHex] : null;
    setLockedAssist({
      unitHex: hexId,
      unitInstanceId: assistUnit.instanceId,
      card,
      ability: abilityToUse,
      returnUnitHex: activeTurnUnitHex!,
      returnUnitInstanceId: returnUnit?.instanceId || '',
      started: false
    });
    setActiveTurnUnitHex(hexId);
    setActiveAbility(null);
    setSelectedHex(hexId);
    setIsMovingMode(false);
    playCardDrawSound();

    showNotification(`Assist: ${card.name} reinforced to back row (${hexId}) and uses ${abilityToUse.name} for free!`);
  };

  // Any popup or choice open right now (the popup queue and readied-ability interrupts wait for these)
  const anyPopupOpen = Boolean(
    lootPending ||
      researchPending ||
      scryPending ||
      fieldNotesPending ||
      deckArrangePending ||
      knockbackChoicePending ||
      attackKnockbackPrompt ||
      splitHitPrompt ||
      facelessKingPendingChoice ||
      abilityReinforcePending ||
      popupOrderChoice ||
      readySpellPrompt ||
      readySpellChoice
  );

  // ---- Portable game state (online play builds on this) ----
  // True when no choice is in progress (no targeting, popup, prompt or chain), so the game can be captured as is
  const isGameStateStable = (): boolean =>
    !anyPopupOpen &&
    popupQueue.length === 0 &&
    !activeAbility &&
    !multiStageState &&
    !providerChain &&
    !lockedAssist &&
    !pendingAssistDeployment &&
    !pendingMomentumCharge &&
    !pendingRabbleMove &&
    !pendingFreeMove &&
    !pendingAttackReplayHex &&
    !readySpellReact &&
    !readySpellResume &&
    !isTurnTransitioning &&
    !cardChoicePrompt &&
    cardChoiceQueueRef.current.length === 0 &&
    deferredChoicesRef.current === 0 &&
    pendingDrawHeals.length === 0 &&
    !knockbackChoicePending &&
    !lootPending;

  // The match as plain JSON-ready data (see game/gameState.ts)
  const captureGameState = (): GameState => ({
    version: GAME_STATE_VERSION,
    gameVersion: LOCAL_VERSION.gameVersion,
    buildId: LOCAL_VERSION.buildId,
    rngState: rngStateRef.current,
    nextInstanceId: nextInstanceIdRef.current,
    turnStartKey: turnStartKeyRef.current,
    gamePhase,
    initialFirstPlayer,
    setupConsecutiveStarts,
    hasCycled: { player1: p1HasCycled, player2: p2HasCycled },
    activePlayer,
    turnCount,
    consecutivePasses,
    lastTurnUnitIds,
    activeTurnUnitHex,
    hands: { player1: player1Hand, player2: player2Hand },
    decks: { player1: player1Deck, player2: player2Deck },
    graveyards: { player1: player1Graveyard, player2: player2Graveyard },
    unitsOnBoard,
    scorchedTiles,
    hexColors,
    winner,
    victoryReason
  });

  // Puts a captured match back exactly as it was, closing any choice in progress
  const loadGameState = (s: GameState) => {
    const byId: Record<string, { unit: BattlefieldUnit; hex: string }> = {};
    const tiles: Record<string, { hex: string; cardId: string; tiles: number }> = {};
    Object.entries(s.unitsOnBoard).forEach(([h, u]) => {
      byId[u.instanceId] = { unit: u, hex: h };
      tiles[u.instanceId] = { hex: h, cardId: u.card.id, tiles: u.tilesMovedThisTurn || 0 };
    });
    lastBoardRef.current = byId;
    lastUnitTilesRef.current = tiles;
    leftPlayAliveRef.current.clear();
    lastArmourRef.current = null;
    activeTurnUnitIdRef.current = s.activeTurnUnitHex ? s.unitsOnBoard[s.activeTurnUnitHex]?.instanceId ?? null : null;
    logBoardRef.current = boardLogSnapshot(s.unitsOnBoard);
    logCardsRef.current = {
      player1: { hand: s.hands.player1.length, deck: s.decks.player1.length, grave: s.graveyards.player1.length },
      player2: { hand: s.hands.player2.length, deck: s.decks.player2.length, grave: s.graveyards.player2.length }
    };
    logTurnUnitRef.current = s.activeTurnUnitHex;
    lastSetupPlayerRef.current = s.activePlayer;
    cardChoiceCallbackRef.current = null;
    cardChoiceQueueRef.current = [];
    setCardChoicePrompt(null);
    setPendingDrawHeals([]);
    setPendingRabbleMove(null);
    setPendingFreeMove(null);
    setPendingMomentumCharge(null);
    rngStateRef.current = s.rngState;
    nextInstanceIdRef.current = s.nextInstanceId;
    turnStartKeyRef.current = s.turnStartKey;
    setGamePhase(s.gamePhase);
    setInitialFirstPlayer(s.initialFirstPlayer);
    setSetupConsecutiveStarts(s.setupConsecutiveStarts);
    setP1HasCycled(s.hasCycled.player1);
    setP2HasCycled(s.hasCycled.player2);
    setActivePlayer(s.activePlayer);
    setTurnCount(s.turnCount);
    setConsecutivePasses(s.consecutivePasses);
    setLastTurnUnitIds(s.lastTurnUnitIds);
    setActiveTurnUnitHex(s.activeTurnUnitHex);
    setPlayer1Hand(s.hands.player1);
    setPlayer2Hand(s.hands.player2);
    setPlayer1Deck(s.decks.player1);
    setPlayer2Deck(s.decks.player2);
    setPlayer1Graveyard(s.graveyards.player1);
    setPlayer2Graveyard(s.graveyards.player2);
    setUnitsOnBoard(s.unitsOnBoard);
    setScorchedTiles(s.scorchedTiles);
    setHexColors(s.hexColors);
    setWinner(s.winner);
    setVictoryReason(s.victoryReason);
    setIsVictoryOpen(Boolean(s.winner));
    // Nothing in progress carries over
    setActiveAbility(null);
    setMultiStageState(null);
    setProviderChain(null);
    setSelectedHex(s.activeTurnUnitHex);
    setSelectedHandIndex(null);
    setIsMovingMode(false);
    setPopupQueue([]);
    setPopupOrderChoice(null);
    setActiveTab('play');
    setBoardYaw(s.activePlayer === 'player1' ? 0 : 180);
  };

  // Developer handle for testing the round trip from the browser console (dev server only):
  //   const s = window.__evilGame.save(); window.__evilGame.load(s)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__evilGame = {
      save: () => serializeGameState(captureGameState()),
      load: (json: string) => loadGameState(parseGameState(json)),
      isStable: () => isGameStateStable(),
      // The last turn handoff (as sent), and a receiver for one: checks it, loads it, returns the acknowledgement
      lastHandoff: () => (lastHandoffRef.current ? JSON.stringify(lastHandoffRef.current) : null),
      receive: (json: string) => receiveHandoff(json, { appendEntries: true }),
      fingerprint: () => fingerprintState(captureGameState()),
      // (test aids: a card by id, and sending this screen's match to the other player as it stands)
      card: (id: string) => allCardList.find((c) => c.id === id) || null,
      sync: () => sendStateSync(),
      // (test aid for resync: this screen loses track of the log, so the next handoff it receives is refused)
      breakLog: () => {
        lastAckedSeqRef.current += 5;
      },
      // Testing online play (Phase 8): a slow link (each message held back lagMs, plus up to jitterMs), a dropped
      // link (no goodbye), and the scenario boards (see dev/onlineScenarios.ts)
      lag: (lagMs = 0, jitterMs = 0) => {
        RoomConnection.testConditions = { lagMs, jitterMs };
        return RoomConnection.testConditions;
      },
      drop: () => roomRef.current?.simulateDrop(),
      // (this game drops off the connection server, as a backgrounded tab or a network blip can make it)
      serverDrop: () => (roomRef.current as any)?.peer?.disconnect(),
      scenarios: () => Object.fromEntries(Object.entries(ONLINE_SCENARIOS).map(([k, s]) => [k, s.description])),
      scenario: (name: string) => {
        const s = ONLINE_SCENARIOS[name];
        if (!s) return `No scenario "${name}". Try: ${Object.keys(ONLINE_SCENARIOS).join(', ')}`;
        loadGameState(applyOnlineScenario(captureGameState(), s, (id) => allCardList.find((c) => c.id === id) || null));
        // (sent once the board has rendered)
        setTimeout(() => (window as any).__evilGame.sync(), 300);
        return s.steps;
      },
      room: () => (roomRef.current ? { role: roomRef.current.role, code: roomRef.current.code, status: roomRef.current.status, localPlayer } : null)
    };
  });

  // ---- Turn handoff (online play, Phase 2) ----
  // Once a new turn has settled, the player whose turn ended hands over the log entries since the last handoff, the
  // state and its fingerprint. The receiver checks them, loads the state and acknowledges. Until networking (Phase 3)
  // the handoff is delivered on this screen: it is always checked; with "Reload each turn" (dev server) the state is
  // also loaded back, and re-captured once it has settled, which must give the same fingerprint.
  const lastHandoffRef = useRef<TurnHandoff | null>(null);
  const handoffPendingRef = useRef(false);
  const lastAckedSeqRef = useRef(0);
  const lastHandoffTurnRef = useRef<number | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [reloadEachTurn, setReloadEachTurn] = useState(false);
  const reloadCheckRef = useRef<{ fingerprint: string; turn: number; to: PlayerId; state: GameState } | null>(null);
  const [reloadCheckTick, setReloadCheckTick] = useState(0);
  // ---- Online connection (Phase 3) ----
  // The room this game is in (see net/connection.ts). While connected, each turn's handoff goes to the other player
  // instead of being checked on this screen.
  const roomRef = useRef<RoomConnection | null>(null);
  const [room, setRoom] = useState<{ role: RoomRole; code: string; status: RoomStatus; detail?: string } | null>(null);
  // The handoff sent and not yet acknowledged
  const pendingHandoffRef = useRef<TurnHandoff | null>(null);
  // Who sits where: decided by the seed both players agree on in the lobby (see net/lobby.ts)
  const seatsRef = useRef<Record<RoomRole, PlayerId>>({ host: 'player1', guest: 'player2' });
  const isOnline = () => Boolean(roomRef.current?.isConnected);

  // The receiving side: check a handoff and, if it is good, load its state (and add its log entries)
  const receiveHandoff = (json: string, opts: { appendEntries: boolean; load?: boolean }): HandoffAck => {
    let h: TurnHandoff;
    try {
      h = JSON.parse(json) as TurnHandoff;
    } catch {
      return { protocol: 0, turn: -1, fingerprint: '', lastSeq: lastAckedSeqRef.current, ok: false, reason: 'The handoff could not be read.' };
    }
    const ack = verifyHandoff(h, lastAckedSeqRef.current, lastHandoffTurnRef.current);
    if (!ack.ok) return ack;
    lastAckedSeqRef.current = ack.lastSeq;
    lastHandoffTurnRef.current = h.turn;
    if (opts.appendEntries) {
      // The turn taker's entries replace anything this side logged after the last acknowledged entry
      gameLogRef.current = [...gameLogRef.current.filter((e) => e.seq < h.firstSeq), ...h.entries];
      nextLogSeqRef.current = ack.lastSeq + 1;
      setGameLog(gameLogRef.current);
    }
    if (opts.load !== false) loadGameState(h.state);
    return ack;
  };

  // A new match starts a new log and handoff sequence
  const resetMatchRecord = () => {
    resetGameLog();
    lastHandoffRef.current = null;
    lastAckedSeqRef.current = 0;
    lastHandoffTurnRef.current = null;
    reloadCheckRef.current = null;
    setHandoffStatus(null);
  };

  useEffect(() => {
    // A reloaded state, once settled, must re-capture to the fingerprint it was sent with
    const check = reloadCheckRef.current;
    if (check && isGameStateStable()) {
      reloadCheckRef.current = null;
      const now = captureGameState();
      const fp = fingerprintState(now);
      if (fp === check.fingerprint) {
        setHandoffStatus({ text: `Turn ${check.turn} handed to ${check.to === 'player1' ? 'P1' : 'P2'}: checked, reloaded and matched (${fp.slice(0, 8)})`, ok: true });
      } else {
        const sent = JSON.parse(canonicalJson(check.state));
        const got = JSON.parse(canonicalJson(now));
        const differs = Object.keys(sent).filter((k) => JSON.stringify(sent[k]) !== JSON.stringify(got[k]));
        console.warn('[handoff] the reloaded state drifted from the one handed over in:', differs, { sent: check.state, reloaded: now });
        setHandoffStatus({ text: `Turn ${check.turn}: the reloaded state drifted (${differs.join(', ') || 'unknown'}); see the console`, ok: false });
      }
    }
    if (!handoffPendingRef.current || !isGameStateStable() || winner) return;
    handoffPendingRef.current = false;
    const state = captureGameState();
    const from: PlayerId = state.activePlayer === 'player1' ? 'player2' : 'player1';
    const entries = gameLogRef.current.filter((e) => e.seq > lastAckedSeqRef.current);
    const h = buildHandoff(from, state, entries, nextLogSeqRef.current);
    lastHandoffRef.current = h;
    // Online: send it to the opponent, whose acknowledgement arrives as a message
    if (isOnline()) {
      if (localPlayer !== h.from) return;
      pendingHandoffRef.current = h;
      roomRef.current!.send('handoff', { handoff: h });
      epochRef.current += 1;
      saveSession(h.state);
      setHandoffStatus({ text: `Turn ${h.turn} sent to ${h.to === 'player1' ? 'P1' : 'P2'}: waiting for confirmation`, ok: true });
      return;
    }
    // Hot seat: this screen receives it (no log entries to add: it made them)
    const ack = receiveHandoff(JSON.stringify(h), { appendEntries: false, load: reloadEachTurn });
    if (!isAckFor(ack, h)) {
      console.warn('[handoff] not acknowledged:', ack.reason, h);
      setHandoffStatus({ text: `Turn ${h.turn} handoff refused: ${ack.reason || 'no acknowledgement'}`, ok: false });
      return;
    }
    if (reloadEachTurn) {
      reloadCheckRef.current = { fingerprint: h.fingerprint, turn: h.turn, to: h.to, state: h.state };
      // (re-check after the reloaded state's own effects have run)
      setTimeout(() => setReloadCheckTick((t) => t + 1), 300);
    } else {
      setHandoffStatus({ text: `Turn ${h.turn} handed to ${h.to === 'player1' ? 'P1' : 'P2'}: ${h.entries.length} log entries, checked (${h.fingerprint.slice(0, 8)})`, ok: true });
    }
  });
  void reloadCheckTick;

  // The whole match as it stands, for the other player (starting a match, or the end of one)
  const sendStateSync = () => {
    if (!roomRef.current?.isConnected) return;
    lastAckedSeqRef.current = nextLogSeqRef.current - 1;
    lastHandoffTurnRef.current = turnCount;
    // (from here on, this screen plays its own seat)
    setLocalPlayer(seatsRef.current[roomRef.current.role]);
    const state = captureGameState();
    roomRef.current.send('state_sync', {
      state,
      log: gameLogRef.current,
      seats: seatsRef.current,
      lastAckedSeq: lastAckedSeqRef.current,
      epoch: epochRef.current
    });
    saveSession(state);
  };

  // Messages from the other player's game (read through a ref, so the room always reaches this render's handler)
  const handleNetMessage = (msg: NetMessage) => {
    const role = roomRef.current?.role;
    if (msg.type === 'handoff') {
      const h = msg.payload.handoff;
      const ack =
        role && h.to !== seatsRef.current[role]
          ? { protocol: h.protocol, turn: h.turn, fingerprint: h.fingerprint, lastSeq: lastAckedSeqRef.current, ok: false, reason: `That turn was handed to ${h.to}, but this screen is ${seatsRef.current[role]}.` }
          : receiveHandoff(JSON.stringify(h), { appendEntries: true });
      roomRef.current?.send('handoff_ack', { ack });
      if (ack.ok) {
        epochRef.current += 1;
        saveSession(h.state);
        playCardDrawSound();
        setHandoffStatus({ text: `Turn ${h.turn} received from ${h.from === 'player1' ? 'P1' : 'P2'}: checked and loaded (${h.fingerprint.slice(0, 8)})`, ok: true });
      } else {
        console.warn('[net] refused a handoff:', ack.reason, h);
        setHandoffStatus({ text: `Turn ${h.turn} from the other player refused: ${ack.reason}`, ok: false });
      }
    } else if (msg.type === 'handoff_ack') {
      const h = pendingHandoffRef.current;
      const ack = msg.payload.ack;
      if (!h) return;
      pendingHandoffRef.current = null;
      if (isAckFor(ack, h)) {
        lastAckedSeqRef.current = ack.lastSeq;
        lastHandoffTurnRef.current = h.turn;
        setHandoffStatus({ text: `Turn ${h.turn} handed to ${h.to === 'player1' ? 'P1' : 'P2'}: confirmed (${h.fingerprint.slice(0, 8)})`, ok: true });
      } else {
        console.warn('[net] the other player refused the handoff:', ack.reason, h);
        // The two games disagree: this screen just finished its turn, so its match is the one to keep. Send it whole.
        sendStateSync();
        setHandoffStatus({ text: `Turn ${h.turn} refused (${ack.reason || 'no reason given'}): resynced by sending the whole match`, ok: false });
      }
    } else if (msg.type === 'rejoin_hello') {
      receiveRejoinHello(msg.payload);
    } else if (msg.type === 'concede') {
      concedeMatch(msg.payload.player, false);
    } else if (msg.type === 'decision_request') {
      showIncomingDecision(msg.payload.id, msg.payload.kind, msg.payload.data);
    } else if (msg.type === 'decision_answer') {
      applyDecisionAnswer(msg.payload.id, msg.payload.kind, msg.payload.answer);
    } else if (msg.type === 'react_start') {
      receiveReactStart(msg.payload);
    } else if (msg.type === 'react_done') {
      receiveReactDone(msg.payload);
    } else if (msg.type === 'lobby_commit') {
      const l = lobbyRef.current;
      if (!l || l.theirCommit) return;
      l.theirCommit = msg.payload.commitment;
      maybeReveal();
    } else if (msg.type === 'lobby_reveal') {
      receiveReveal(msg.payload.secret);
    } else if (msg.type === 'lobby_deck') {
      const l = lobbyRef.current;
      if (!l || l.started) return;
      l.theirDeck = { name: msg.payload.name, cards: msg.payload.cards };
      refreshLobbyView();
      maybeStartMatch();
    } else if (msg.type === 'coin_call') {
      const side = msg.payload.side;
      setCoinRemote((c) => ({ ...c, call: side }));
    } else if (msg.type === 'coin_order') {
      const first = msg.payload.first;
      setCoinRemote((c) => ({ ...c, order: first }));
    } else if (msg.type === 'state_sync') {
      const p = msg.payload;
      let state: GameState;
      try {
        state = parseGameState(JSON.stringify(p.state));
      } catch (e: any) {
        setHandoffStatus({ text: `The match from the other player couldn't be loaded: ${e?.message || e}`, ok: false });
        return;
      }
      loadGameState(state);
      gameLogRef.current = p.log;
      nextLogSeqRef.current = (p.log.length > 0 ? p.log[p.log.length - 1].seq : 0) + 1;
      setGameLog(p.log);
      lastAckedSeqRef.current = p.lastAckedSeq;
      lastHandoffTurnRef.current = state.turnCount;
      pendingHandoffRef.current = null;
      seatsRef.current = p.seats;
      if (typeof p.epoch === 'number') epochRef.current = p.epoch;
      if (sessionRef.current) sessionRef.current.seats = p.seats;
      saveSession(state);
      if (role) setLocalPlayer(p.seats[role]);
      setReconnect(null);
      setIsPlayModeOpen(false);
      setIsDeckSelectOpen(false);
      setIsCoinFlipOpen(false);
      setHandoffStatus({ text: `Match received from the other player (turn ${state.turnCount})`, ok: true });
    }
  };
  const netMessageRef = useRef(handleNetMessage);
  netMessageRef.current = handleNetMessage;

  const openRoom = (make: (events: { onStatus: (s: RoomStatus, d?: string) => void; onMessage: (m: NetMessage) => void }) => RoomConnection) => {
    // (the room being replaced is let go first, so its closing isn't read as this player leaving the match)
    const old = roomRef.current;
    roomRef.current = null;
    old?.close();
    let linked = false;
    const r = make({
      onStatus: (status, detail) => {
        if (roomRef.current !== r) return;
        setRoom({ role: r.role, code: r.code, status, detail });
        // Connected: this screen plays its seat (only when first linked: a quiet link waking up keeps the seat as is).
        // Disconnected: back to hot seat
        if (status === 'connected' && !linked) {
          linked = true;
          // (rejoining a match: compare notes instead of starting a new lobby)
          if (resumingRef.current) liveRef.current.sendRejoinHello();
          else startLobby(r);
        }
        if ((status === 'closed' || status === 'error') && liveRef.current.shouldReconnect(r)) {
          pendingHandoffRef.current = null;
          outgoingDecisionRef.current = null;
          incomingDecisionRef.current = null;
          reactSentRef.current = false;
          reactRemoteRef.current = false;
          liveRef.current.scheduleReconnect(detail);
          return;
        }
        if (status === 'closed' || status === 'error') {
          // (a deliberate leave ends the saved match; closing the page to come back keeps it)
          if ((r.endedBy === 'us' && !unloadingRef.current) || r.endedBy === 'them') clearSession();
          resumingRef.current = false;
          setReconnect(null);
          pendingHandoffRef.current = null;
          outgoingDecisionRef.current = null;
          incomingDecisionRef.current = null;
          reactSentRef.current = false;
          reactRemoteRef.current = false;
          lobbyRef.current = null;
          onlineMatchRef.current = false;
          refreshLobbyView();
          setLocalPlayer(null);
          if (linked) showNotification(`Online: ${detail || 'the connection closed'}. Anything in progress carries on here in hot seat.`);
        }
      },
      onMessage: (m) => netMessageRef.current(m)
    });
    roomRef.current = r;
    setRoom({ role: r.role, code: r.code, status: r.status });
  };
  const hostRoom = () => openRoom((ev) => RoomConnection.host(ev));
  const joinRoom = (input: string) => {
    const code = normalizeRoomCode(input);
    if (!code) {
      showNotification('A room code is 6 letters and numbers.');
      return;
    }
    openRoom((ev) => RoomConnection.join(code, ev));
  };
  const leaveRoom = () => {
    roomRef.current?.close('The other player left the room.');
  };
  // Leaving the page leaves the room
  useEffect(() => {
    const bye = () => {
      // (in a match: save it, and say this side means to come back, so the other side waits for a rejoin)
      const inMatch = Boolean(sessionRef.current);
      unloadingRef.current = true;
      if (inMatch) liveRef.current.saveOnUnload();
      roomRef.current?.close(inMatch ? 'The other player reloaded or closed their game.' : 'The other player closed the game.', inMatch);
    };
    window.addEventListener('beforeunload', bye);
    return () => window.removeEventListener('beforeunload', bye);
  }, []);
  // ---- Mid-turn choices by the other player (Phase 5) ----
  // A choice whose decider isn't this screen's player (a defender's Hold the Gate, a Ready Spell offer, the other
  // player's loot, scry, research, deck order, popup order, or a card choice such as Reassemble) is sent to them. This
  // screen hides it and waits; their screen shows the same choice from the request, and its answer comes back and
  // runs here exactly as a click would. Their screen never resolves the choice itself.
  const isMyDecision = (decider: PlayerId | undefined) => !decider || !localPlayer || !isOnline() || decider === localPlayer;
  // The request this screen sent and is waiting on, and the one it is showing for the other screen
  const outgoingDecisionRef = useRef<{ id: number; kind: DecisionKind } | null>(null);
  const incomingDecisionRef = useRef<{ id: number; kind: DecisionKind } | null>(null);
  const decisionIdRef = useRef(0);
  // The deciding player's hand as the screen running the turn has it (for a loot shown on the deciding screen)
  const [mirroredLootHand, setMirroredLootHand] = useState<CardItem[] | null>(null);
  // The choice open now, if any, and who decides it
  const openDecision = (): { kind: DecisionKind; decider: PlayerId; data: any } | null => {
    if (knockbackChoicePending) return { kind: 'knockback', decider: knockbackChoicePending.defender, data: knockbackChoicePending };
    if (readySpellPrompt) return { kind: 'readySpell', decider: readySpellPrompt.decider, data: readySpellPrompt };
    if (popupOrderChoice)
      return {
        kind: 'popupOrder',
        decider: popupOrderChoice.decider,
        data: { decider: popupOrderChoice.decider, options: popupOrderChoice.options.map((o) => ({ key: o.key, label: o.label, decider: o.decider, turnPlayer: o.turnPlayer })) }
      };
    if (lootPending)
      return {
        kind: 'loot',
        decider: lootPending.player,
        data: { pending: lootPending, hand: lootPending.player === 'player1' ? player1Hand : player2Hand }
      };
    if (scryPending) return { kind: 'scry', decider: scryDecider(scryPending), data: scryPending };
    if (researchPending) return { kind: 'research', decider: researchPending.player, data: researchPending };
    if (deckArrangePending) return { kind: 'deckArrange', decider: deckArrangePending.player, data: deckArrangePending };
    if (cardChoicePrompt) return { kind: 'cardChoice', decider: cardChoicePrompt.player ?? activePlayer, data: cardChoicePrompt };
    return null;
  };
  useEffect(() => {
    if (!isOnline() || !localPlayer || incomingDecisionRef.current) return;
    const d = openDecision();
    if (!d || d.decider === localPlayer || outgoingDecisionRef.current?.kind === d.kind) return;
    decisionIdRef.current += 1;
    outgoingDecisionRef.current = { id: decisionIdRef.current, kind: d.kind };
    // (as plain data: callbacks stay on this screen)
    roomRef.current!.send('decision_request', { id: decisionIdRef.current, kind: d.kind, data: JSON.parse(JSON.stringify(d.data)) });
  });
  // On the deciding screen: send the answer for the choice being shown for the other screen
  const answerIncomingDecision = (kind: DecisionKind, answer: any): boolean => {
    const inc = incomingDecisionRef.current;
    if (!inc || inc.kind !== kind) return false;
    incomingDecisionRef.current = null;
    roomRef.current?.send('decision_answer', { id: inc.id, kind, answer });
    return true;
  };
  const showIncomingDecision = (id: number, kind: DecisionKind, data: any) => {
    incomingDecisionRef.current = { id, kind };
    if (kind === 'knockback') setKnockbackChoicePending(data);
    else if (kind === 'readySpell') setReadySpellPrompt(data);
    else if (kind === 'popupOrder') setPopupOrderChoice(data);
    else if (kind === 'loot') {
      setMirroredLootHand(data.hand);
      setLootPending(data.pending);
    } else if (kind === 'scry') setScryPending(data);
    else if (kind === 'research') setResearchPending(data);
    else if (kind === 'deckArrange') setDeckArrangePending(data);
    else if (kind === 'cardChoice') {
      // (the choice is this one alone: anything queued here belongs to this screen's own game)
      cardChoiceCallbackRef.current = (value: string) => {
        answerIncomingDecision('cardChoice', { value });
      };
      setCardChoicePrompt(data);
    }
  };
  // On the screen running the turn: the other player's answer, applied as their click
  const applyDecisionAnswer = (id: number, kind: DecisionKind, answer: any) => {
    const out = outgoingDecisionRef.current;
    if (!out || out.id !== id || out.kind !== kind) return;
    outgoingDecisionRef.current = null;
    if (kind === 'knockback') handleKnockbackChoice(Boolean(answer.useImmunity));
    else if (kind === 'readySpell') handleReadySpellAnswer(Boolean(answer.yes));
    else if (kind === 'popupOrder') handlePopupOrderChoice(String(answer.value));
    else if (kind === 'loot') handleConfirmLoot(Array.isArray(answer.picked) ? answer.picked : []);
    else if (kind === 'scry') handleScryChoice(Boolean(answer.toBottom));
    else if (kind === 'research') handleResearchChoice(Number(answer.index));
    else if (kind === 'deckArrange') {
      if (typeof answer.order === 'number') handleDeckArrangeOrder(answer.order);
      else handleDeckArrangeScry(Boolean(answer.toBottom));
    } else if (kind === 'cardChoice') answerCardChoice(String(answer.value));
  };

  // ---- A readied interrupt taking over (Phase 5, step 19) ----
  // When the reacting unit is the other player's, this screen hands them the game (as at a turn end, plus the
  // interrupt in progress); they use the readied ability on their screen and hand the game back, and this screen
  // resumes the interrupted use. A mini-handoff each way, checked by fingerprint.
  const reactSentRef = useRef(false);
  const reactRemoteRef = useRef(false);
  const sendReactStart = () => {
    if (reactSentRef.current || !readySpellReact) return;
    reactSentRef.current = true;
    epochRef.current += 1;
    const state = captureGameState();
    roomRef.current?.send('react_start', {
      state,
      react: JSON.parse(JSON.stringify({ ...readySpellReact, savedAbility: null, savedMultiStage: null })),
      log: gameLogRef.current.filter((e) => e.seq > lastAckedSeqRef.current),
      fingerprint: fingerprintState(state)
    });
    setHandoffStatus({ text: 'Interrupt: handed to the other player', ok: true });
  };
  // Replaces this screen's log from the first of these entries on
  const importLog = (entries: LogEntry[]) => {
    if (entries.length === 0) return;
    gameLogRef.current = [...gameLogRef.current.filter((e) => e.seq < entries[0].seq), ...entries];
    nextLogSeqRef.current = entries[entries.length - 1].seq + 1;
    setGameLog(gameLogRef.current);
  };
  const receiveReactStart = (p: { state: GameState; react: any; log: LogEntry[]; fingerprint: string }) => {
    if (fingerprintState(p.state) !== p.fingerprint) {
      setHandoffStatus({ text: "Interrupt refused: the state didn't match its fingerprint", ok: false });
      return;
    }
    importLog(p.log);
    loadGameState(p.state);
    epochRef.current += 1;
    reactRemoteRef.current = true;
    setReadySpellReact({ ...p.react, started: false });
    setHandoffStatus({ text: 'Interrupt: your unit acts now', ok: true });
  };
  const receiveReactDone = (p: { state: GameState; log: LogEntry[]; fingerprint: string }) => {
    const r = readySpellReact;
    reactSentRef.current = false;
    if (!r) return;
    if (fingerprintState(p.state) !== p.fingerprint) {
      setHandoffStatus({ text: "Interrupt result refused: the state didn't match its fingerprint", ok: false });
      return;
    }
    importLog(p.log);
    loadGameState(p.state);
    epochRef.current += 1;
    // Then hand the turn back here, as when the interrupt finishes on this screen
    setReadySpellReact(null);
    setActivePlayer(r.returnPlayer);
    const returnHex = r.returnUnitInstanceId
      ? Object.keys(p.state.unitsOnBoard).find((h) => p.state.unitsOnBoard[h].instanceId === r.returnUnitInstanceId)
      : undefined;
    setActiveTurnUnitHex(returnHex || null);
    setSelectedHex(returnHex || null);
    if (returnHex) {
      if (r.savedAbility) setActiveAbility(r.savedAbility);
      if (r.savedMultiStage) setMultiStageState(r.savedMultiStage);
    }
    setReadySpellResume({ commit: r.commit, returnUnitInstanceId: r.returnUnitInstanceId || '', player: r.returnPlayer });
    setHandoffStatus({ text: 'Interrupt done: the turn carries on', ok: true });
  };

  // ---- Online lobby (Phase 4) ----
  // On connecting, both games agree on a seed neither could steer (commit, then reveal: see net/lobby.ts), and each
  // player picks their own deck. Once both decks are in, both screens start the same match from that seed: the seed
  // decides the seats, the shuffles and the coin flip; Player 2 calls the flip on their screen and the winner chooses
  // the order on theirs. Setup turns are then handed over like any other turn.
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  type LobbyDeck = { name: string; cards: CardItem[] };
  const lobbyRef = useRef<{
    secret: number;
    myCommit?: string;
    theirCommit?: string;
    revealed: boolean;
    seed?: number;
    myDeck?: LobbyDeck;
    theirDeck?: LobbyDeck;
    started: boolean;
  } | null>(null);
  const [lobbyView, setLobbyView] = useState<{ myDeckName: string | null; opponentDeckName: string | null; seedAgreed: boolean }>({
    myDeckName: null,
    opponentDeckName: null,
    seedAgreed: false
  });
  const refreshLobbyView = () => {
    const l = lobbyRef.current;
    setLobbyView({ myDeckName: l?.myDeck?.name ?? null, opponentDeckName: l?.theirDeck?.name ?? null, seedAgreed: l?.seed !== undefined });
  };
  // This match was started through the lobby (so the coin flip and setup are shared)
  const onlineMatchRef = useRef(false);
  const [coinRemote, setCoinRemote] = useState<{ call: 'heads' | 'tails' | null; order: PlayerId | null }>({ call: null, order: null });
  const lobbyDecks = useMemo(() => buildSelectableDecks(allCardList), [allCardList, isLobbyOpen]);

  const startLobby = (r: RoomConnection) => {
    const secret = makeSecret();
    lobbyRef.current = { secret, revealed: false, started: false };
    refreshLobbyView();
    commitTo(secret, r.role, r.code).then((commitment) => {
      const l = lobbyRef.current;
      if (!l || l.secret !== secret) return;
      l.myCommit = commitment;
      r.send('lobby_commit', { commitment });
      maybeReveal();
    });
  };
  // Reveal this side's secret once both commitments are in
  const maybeReveal = () => {
    const l = lobbyRef.current;
    if (!l || !l.myCommit || !l.theirCommit || l.revealed) return;
    l.revealed = true;
    roomRef.current?.send('lobby_reveal', { secret: l.secret });
  };
  const receiveReveal = async (theirSecret: number) => {
    const l = lobbyRef.current;
    const r = roomRef.current;
    if (!l || !r || l.seed !== undefined) return;
    const theirRole: RoomRole = r.role === 'host' ? 'guest' : 'host';
    const ok = Boolean(l.theirCommit) && (await checkReveal(theirSecret, theirRole, r.code, l.theirCommit!));
    if (lobbyRef.current !== l) return;
    if (!ok) {
      r.close("The other player's secret didn't match what they committed to.");
      return;
    }
    const seed = await combineSeed(r.role === 'host' ? l.secret : theirSecret, r.role === 'host' ? theirSecret : l.secret, r.code);
    if (lobbyRef.current !== l) return;
    l.seed = seed;
    seatsRef.current = seatsFromSeed(seed);
    refreshLobbyView();
    maybeStartMatch();
  };
  const handleLobbyReady = (deck: SelectableDeck) => {
    const l = lobbyRef.current;
    if (!l || l.myDeck) return;
    l.myDeck = { name: deck.name, cards: deck.cardList };
    roomRef.current?.send('lobby_deck', { name: deck.name, cards: deck.cardList });
    refreshLobbyView();
    maybeStartMatch();
  };
  // Both decks in and the seed agreed: both screens start the same match
  const maybeStartMatch = () => {
    const l = lobbyRef.current;
    const r = roomRef.current;
    if (!l || !r || l.started || l.seed === undefined || !l.myDeck || !l.theirDeck) return;
    l.started = true;
    const mySeat = seatsRef.current[r.role];
    const asDeck = (d: LobbyDeck, id: string): SelectableDeck => ({
      id,
      name: d.name,
      category: 'preset',
      cardCount: d.cards.length,
      cardList: d.cards,
      isValid: true
    });
    const mine = asDeck(l.myDeck, 'online_mine');
    const theirs = asDeck(l.theirDeck, 'online_theirs');
    onlineMatchRef.current = true;
    sessionRef.current = { code: r.code, role: r.role, matchId: l.seed.toString(16), seats: seatsRef.current };
    epochRef.current = 0;
    setCoinRemote({ call: null, order: null });
    setIsLobbyOpen(false);
    handleDecksSelected({ player1: mySeat === 'player1' ? mine : theirs, player2: mySeat === 'player1' ? theirs : mine }, l.seed);
    setLocalPlayer(mySeat);
    showNotification(`Online match: you are ${mySeat === 'player1' ? 'Player 1' : 'Player 2'} (${l.myDeck.name} against ${l.theirDeck.name}).`);
  };

  // A match that ends on this screen's turn: the other side gets the final state (it never gets a turn to hand over)
  useEffect(() => {
    if (winner && isOnline() && localPlayer === activePlayer) sendStateSync();
    if (winner) clearSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // ---- Robustness (Phase 7) ----
  // A match started online is a session: its room code, this side's role, the match id (from the seed) and the seats.
  // It is saved in this browser at every handoff, so a dropped link or a reloaded page can rejoin it. On a drop, the
  // host reopens the same code and the guest keeps trying to join it; once linked, both sides compare how many handoffs
  // they have seen (epoch) and the one further along (on a tie, the one whose turn it is) sends the whole match.
  type OnlineSession = { code: string; role: RoomRole; matchId: string; seats: Record<RoomRole, PlayerId> };
  type SavedSession = OnlineSession & { epoch: number; savedAt: number; state: GameState; log: LogEntry[]; lastAckedSeq: number };
  const SESSION_KEY = 'evil_cg_online_match';
  const sessionRef = useRef<OnlineSession | null>(null);
  const epochRef = useRef(0);
  const resumingRef = useRef(false);
  // The page is closing (the saved match stays, to rejoin)
  const unloadingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reconnect, setReconnect] = useState<{ attempt: number; gaveUp: boolean; detail?: string } | null>(null);
  const RECONNECT_TRIES = 30;
  const saveSession = (state: GameState) => {
    const s = sessionRef.current;
    if (!s) return;
    const saved: SavedSession = { ...s, epoch: epochRef.current, savedAt: Date.now(), state, log: gameLogRef.current, lastAckedSeq: lastAckedSeqRef.current };
    // (this tab's own copy survives a reload; the browser-wide one lets a new tab rejoin)
    try {
      const json = JSON.stringify(saved);
      sessionStorage.setItem(SESSION_KEY, json);
      localStorage.setItem(SESSION_KEY, json);
    } catch {
      // (storage full or blocked: rejoining after a reload won't be offered)
    }
  };
  const clearSession = () => {
    sessionRef.current = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  };
  const readSavedSession = (): SavedSession | null => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as SavedSession;
      if (!s?.state || !s.code || Date.now() - s.savedAt > 6 * 3600 * 1000) return null;
      return s;
    } catch {
      return null;
    }
  };
  // A match saved in this browser that can be rejoined (e.g. after a reload)
  const savedMatchInfo = useMemo(() => {
    if (!isLobbyOpen) return null;
    const s = readSavedSession();
    return s ? { code: s.code, turn: s.state.turnCount, savedAt: s.savedAt } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLobbyOpen]);
  // A drop (not a deliberate leave) during a match that isn't over is worth reconnecting after
  const shouldReconnect = (r: RoomConnection) => Boolean(sessionRef.current) && !winner && r.endedBy === 'drop';
  const openSessionRoom = () => {
    const s = sessionRef.current;
    if (!s) return;
    resumingRef.current = true;
    openRoom((ev) => (s.role === 'host' ? RoomConnection.host(ev, s.code) : RoomConnection.join(s.code, ev)));
  };
  const scheduleReconnect = (detail?: string) => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setReconnect((prev) => {
      const attempt = (prev?.attempt ?? 0) + 1;
      if (attempt > RECONNECT_TRIES) return { attempt: prev?.attempt ?? attempt, gaveUp: true, detail };
      reconnectTimerRef.current = setTimeout(() => liveRef.current.openSessionRoom(), attempt === 1 ? 500 : 3000);
      return { attempt, gaveUp: false, detail };
    });
  };
  const stopReconnecting = (leave: boolean) => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    resumingRef.current = false;
    clearSession();
    roomRef.current?.close('The other player left the match.');
    setReconnect(null);
    setLocalPlayer(null);
    onlineMatchRef.current = false;
    if (leave) setActiveTab('gallery');
    else showNotification('Online: the match carries on here in hot seat.');
  };
  const sendRejoinHello = () => {
    const s = sessionRef.current;
    if (!s) return;
    roomRef.current?.send('rejoin_hello', {
      matchId: s.matchId,
      epoch: epochRef.current,
      turn: turnCount,
      activePlayer,
      fingerprint: fingerprintState(captureGameState())
    });
  };
  // Both sides run this on the other's hello and reach the same answer: at most one of them sends the match
  const receiveRejoinHello = (p: { matchId: string; epoch: number; turn: number; activePlayer: PlayerId; fingerprint: string }) => {
    const s = sessionRef.current;
    const r = roomRef.current;
    if (!s || !r) return;
    if (p.matchId !== s.matchId) {
      r.close('That room is running a different match.');
      return;
    }
    resumingRef.current = false;
    const mySeat = seatsRef.current[s.role];
    const theirSeat = seatsRef.current[s.role === 'host' ? 'guest' : 'host'];
    const myFingerprint = fingerprintState(captureGameState());
    let iSend: boolean;
    if (epochRef.current !== p.epoch) iSend = epochRef.current > p.epoch;
    else if (myFingerprint === p.fingerprint) iSend = false;
    else {
      const meActing = activePlayer === mySeat;
      const themActing = p.activePlayer === theirSeat;
      iSend = meActing !== themActing ? meActing : s.role === 'host';
    }
    if (iSend) sendStateSync();
    setLocalPlayer(mySeat);
    if (iSend || myFingerprint === p.fingerprint) setReconnect(null);
    setHandoffStatus({
      text: iSend ? 'Reconnected: sent this match to the other player' : myFingerprint === p.fingerprint ? 'Reconnected: both games match' : 'Reconnected: receiving the match…',
      ok: true
    });
    showNotification('Online: reconnected to the other player.');
  };
  // Rejoining a saved match after this page was reloaded
  const rejoinSavedMatch = () => {
    const saved = readSavedSession();
    if (!saved) return;
    let state: GameState;
    try {
      state = parseGameState(JSON.stringify(saved.state));
    } catch (e: any) {
      showNotification(`The saved match can't be continued: ${e?.message || e}`);
      clearSession();
      return;
    }
    loadGameState(state);
    gameLogRef.current = saved.log || [];
    nextLogSeqRef.current = (gameLogRef.current.length > 0 ? gameLogRef.current[gameLogRef.current.length - 1].seq : 0) + 1;
    setGameLog(gameLogRef.current);
    lastAckedSeqRef.current = saved.lastAckedSeq || 0;
    lastHandoffTurnRef.current = state.turnCount;
    seatsRef.current = saved.seats;
    epochRef.current = saved.epoch || 0;
    sessionRef.current = { code: saved.code, role: saved.role, matchId: saved.matchId, seats: saved.seats };
    onlineMatchRef.current = true;
    setLocalPlayer(saved.seats[saved.role]);
    setIsLobbyOpen(false);
    setReconnect({ attempt: 1, gaveUp: false });
    openSessionRoom();
  };

  // Conceding (step 25): the player gives up and the other player wins; online, the other screen is told
  const concedeMatch = (player: PlayerId, tellOther: boolean) => {
    const other: PlayerId = player === 'player1' ? 'player2' : 'player1';
    setWinner(other);
    setVictoryReason(`${player === 'player1' ? 'Player 1' : 'Player 2'} conceded.`);
    setIsVictoryOpen(true);
    appendLog('turn', 'conceded the match', player);
    if (tellOther && isOnline()) roomRef.current?.send('concede', { player });
  };
  const askConcede = () => {
    const who: PlayerId = localPlayer ?? activePlayer;
    askCardChoice(
      {
        title: `Concede (${who === 'player1' ? 'Player 1' : 'Player 2'})`,
        message: 'Give up the match? Your opponent wins.',
        options: [
          { label: 'Concede', value: 'yes' },
          { label: 'Keep playing', value: 'no' }
        ],
        player: who
      },
      (v) => {
        if (v === 'yes') concedeMatch(who, true);
      }
    );
  };

  // (the room's callbacks were made on an earlier render: they reach this render's functions through here)
  const liveRef = useRef<any>({});
  liveRef.current = {
    sendRejoinHello,
    shouldReconnect,
    scheduleReconnect,
    openSessionRoom,
    saveOnUnload: () => {
      if (isGameStateStable()) saveSession(captureGameState());
    }
  };

  // Setup turns (Rule 5) pass straight to the other player without a turn transition: each one is handed over too
  const lastSetupPlayerRef = useRef<PlayerId>(activePlayer);
  useEffect(() => {
    const prev = lastSetupPlayerRef.current;
    lastSetupPlayerRef.current = activePlayer;
    if (gamePhase === 'setup' && prev !== activePlayer && !isCoinFlipOpen) handoffPendingRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayer]);

  // What the board and the card zones looked like at the last log check, and the unit taking the turn
  const logBoardRef = useRef(boardLogSnapshot({}));
  const logCardsRef = useRef<Record<PlayerId, { hand: number; deck: number; grave: number }>>({
    player1: { hand: 0, deck: 0, grave: 0 },
    player2: { hand: 0, deck: 0, grave: 0 }
  });
  const logTurnUnitRef = useRef<string | null>(null);
  // Every change to the board and the card zones goes in the log, whatever caused it (moves, knockbacks, deaths,
  // damage, draws, discards); card names in hands stay out of it
  useEffect(() => {
    const snap = boardLogSnapshot(unitsOnBoard);
    const cards: Record<PlayerId, { hand: number; deck: number; grave: number }> = {
      player1: { hand: player1Hand.length, deck: player1Deck.length, grave: player1Graveyard.length },
      player2: { hand: player2Hand.length, deck: player2Deck.length, grave: player2Graveyard.length }
    };
    const before = logBoardRef.current;
    const cardsBefore = logCardsRef.current;
    logBoardRef.current = snap;
    logCardsRef.current = cards;
    if (gamePhase !== 'setup' && gamePhase !== 'playing') return;
    // (credited to the turn of the action that caused them, i.e. the last entry: by the time this runs, a setup
    // reinforce has already passed the turn to the other player)
    const last = gameLogRef.current[gameLogRef.current.length - 1];
    const who = last?.player ?? activePlayer;
    const when = last?.turn ?? turnCount;
    describeBoardChanges(before, snap).forEach((c) => appendLog(c.kind, c.text, who, when));
    describeCardChanges(cardsBefore, cards).forEach((t) => appendLog('cards', t, who, when));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsOnBoard, player1Hand, player2Hand, player1Deck, player2Deck, player1Graveyard, player2Graveyard]);
  useEffect(() => {
    const prev = logTurnUnitRef.current;
    logTurnUnitRef.current = activeTurnUnitHex;
    if (gamePhase !== 'playing' || !activeTurnUnitHex || prev) return;
    const u = unitsOnBoard[activeTurnUnitHex];
    if (u) appendLog('turn', `chose ${u.card.name} on ${activeTurnUnitHex} to take the turn`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTurnUnitHex]);

  // ---- Readied-ability interrupts (e.g. Ready Spell) ----
  const commitKey = (c: AbilityCommit): string =>
    c.kind === 'hex'
      ? `hex|${c.abilityId}|${c.hexId}`
      : c.kind === 'ability'
      ? `ability|${c.ability.id}`
      : c.kind === 'move'
      ? `move|${c.fromHex}|${c.toHex}`
      : c.kind === 'draw'
      ? 'draw'
      : `promoted|${c.parent.id}|${c.promoted.id}`;

  // Called as the active player commits an ability use, after its AP check and before its effect: asks the next enemy
  // with a readied ability whether to interrupt. Returns true if it asked (the use then waits for the answer and is
  // replayed after). Each enemy is asked once per use.
  const offerReadySpellInterrupt = (commit: AbilityCommit): boolean => {
    // (an answer replays the use from the same render, so an open prompt isn't a reason to skip: it is closing)
    if (readySpellReact || lockedAssist || providerChain || gamePhase !== 'playing') return false;
    const key = commitKey(commit);
    if (readySpellAskedRef.current?.key !== key) readySpellAskedRef.current = { key, asked: [] };
    const asked = readySpellAskedRef.current.asked;
    // (a move or a draw is only interrupted by a react that triggers on any action, e.g. Ready Spell)
    const isAbilityUse = commit.kind === 'hex' || commit.kind === 'ability' || commit.kind === 'promoted';
    const entry = Object.entries(unitsOnBoard).find(
      ([, u]) =>
        !asked.includes(u.instanceId) &&
        canUseReactEffects(u) &&
        Boolean(getReadiedAbility(u, activePlayer)) &&
        (isAbilityUse || Boolean(u.readySpell?.onAnyAction))
    );
    if (!entry) {
      // Nobody (else) interrupts: the use goes ahead. A target click is kept until the ability is done, since an
      // attack may replay its click (knockback choices); other uses resolve right away.
      if (commit.kind !== 'hex') readySpellAskedRef.current = null;
      return false;
    }
    const [reactorHex, reactor] = entry;
    asked.push(reactor.instanceId);
    const readied = getReadiedAbility(reactor, activePlayer)!;
    setReadySpellPrompt({
      reactorHex,
      reactorInstanceId: reactor.instanceId,
      reactorName: reactor.card.name,
      decider: reactor.owner,
      abilityName: readied.name,
      commit
    });
    setBoardYaw(reactor.owner === 'player1' ? 0 : 180);
    return true;
  };

  // A finished use (its ability no longer active) lets the next use of it be interrupted again
  useEffect(() => {
    if (readySpellPrompt || readySpellReact || readySpellResume) return;
    const key = readySpellAskedRef.current?.key;
    if (key?.startsWith('hex|') && (!activeAbility || !key.startsWith(`hex|${activeAbility.id}|`))) {
      readySpellAskedRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAbility]);

  const replayCommit = (commit: AbilityCommit) => {
    if (commit.kind === 'hex') handleHexClick(commit.hexId);
    else if (commit.kind === 'ability') handleAbilityClick(commit.ability);
    else if (commit.kind === 'move') handleUnitMove(commit.fromHex, commit.toHex);
    else if (commit.kind === 'draw') handleUniversalDraw();
    else handlePromotedAbilitySelect(commit.promoted, commit.parent);
  };

  const handleReadySpellAnswer = (yes: boolean) => {
    if (answerIncomingDecision('readySpell', { yes })) {
      setReadySpellPrompt(null);
      return;
    }
    if (readySpellPrompt) appendLog('choice', `${readySpellPrompt.abilityName}: ${yes ? 'interrupt' : "don't interrupt"}`, readySpellPrompt.decider);
    const p = readySpellPrompt;
    setReadySpellPrompt(null);
    setBoardYaw(activePlayer === 'player1' ? 0 : 180);
    if (!p) return;
    const reactor = unitsOnBoard[p.reactorHex];
    const readied =
      reactor && reactor.instanceId === p.reactorInstanceId ? getReadiedAbility(reactor, activePlayer) : null;
    if (!yes || !readied || !reactor?.readySpell) {
      replayCommit(p.commit);
      return;
    }
    // The reacting unit acts now, through the normal ability code, with its readied ability for free
    const use = buildReadiedUse(readied, reactor.readySpell.cost);
    if (reactor.readySpell.once) {
      setUnitsOnBoard((prev) => (prev[p.reactorHex] ? { ...prev, [p.reactorHex]: { ...prev[p.reactorHex], readySpell: null } } : prev));
    }
    setReadySpellReact({
      reactorHex: p.reactorHex,
      reactorInstanceId: reactor.instanceId,
      reactorOwner: reactor.owner,
      ability: use,
      started: false,
      returnPlayer: activePlayer,
      returnUnitInstanceId: activeTurnUnit?.instanceId || null,
      savedAbility: activeAbility,
      savedMultiStage: multiStageState,
      commit: p.commit
    });
    setActiveAbility(null);
    setMultiStageState(null);
    setIsMovingMode(false);
    setActivePlayer(reactor.owner);
    setActiveTurnUnitHex(p.reactorHex);
    setSelectedHex(p.reactorHex);
    setBoardYaw(reactor.owner === 'player1' ? 0 : 180);
    showNotification(`⚡ ${reactor.card.name} interrupts with ${readied.name} (${reactor.readySpell.sourceName})!`);
  };

  // Activate the readied ability once the reacting unit is acting
  useEffect(() => {
    if (!readySpellReact || readySpellReact.started) return;
    if (activePlayer !== readySpellReact.reactorOwner || activeTurnUnitHex !== readySpellReact.reactorHex) return;
    // Online, when the reacting unit is the other player's: they act on their screen (see the takeover below)
    if (isOnline() && localPlayer && localPlayer !== readySpellReact.reactorOwner) {
      sendReactStart();
      return;
    }
    setReadySpellReact({ ...readySpellReact, started: true });
    handleAbilityClick(readySpellReact.ability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readySpellReact, activePlayer, activeTurnUnitHex]);

  // Hand the turn back once the readied ability has fully resolved (or its targeting was cancelled)
  const finishReadySpellReact = () => {
    const r = readySpellReact;
    if (!r) return;
    // Online, on the reacting player's screen: hand the game back to the screen running the turn, which resumes it
    if (reactRemoteRef.current) {
      reactRemoteRef.current = false;
      epochRef.current += 1;
      const state = captureGameState();
      roomRef.current?.send('react_done', {
        state,
        log: gameLogRef.current.filter((e) => e.seq > lastAckedSeqRef.current),
        fingerprint: fingerprintState(state)
      });
      setReadySpellReact(null);
      setActiveAbility(null);
      setMultiStageState(null);
      setIsMovingMode(false);
      setActivePlayer(r.returnPlayer);
      return;
    }
    setReadySpellReact(null);
    setActiveAbility(null);
    setMultiStageState(null);
    setIsMovingMode(false);
    setActivePlayer(r.returnPlayer);
    setBoardYaw(r.returnPlayer === 'player1' ? 0 : 180);
    const returnHex = r.returnUnitInstanceId
      ? Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === r.returnUnitInstanceId)
      : undefined;
    setActiveTurnUnitHex(returnHex || null);
    setSelectedHex(returnHex || null);
    if (returnHex) {
      if (r.savedAbility) setActiveAbility(r.savedAbility);
      if (r.savedMultiStage) setMultiStageState(r.savedMultiStage);
    }
    setReadySpellResume({ commit: r.commit, returnUnitInstanceId: r.returnUnitInstanceId || '', player: r.returnPlayer });
  };

  useEffect(() => {
    if (!readySpellReact || !readySpellReact.started) return;
    if (
      activeAbility ||
      multiStageState ||
      anyPopupOpen ||
      popupQueue.length > 0 ||
      pendingAttackReplayHex ||
      pendingFreeMove ||
      pendingRabbleMove ||
      pendingMomentumCharge ||
      isTurnTransitioning
    ) {
      return;
    }
    finishReadySpellReact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readySpellReact,
    activeAbility,
    multiStageState,
    anyPopupOpen,
    popupQueue,
    pendingAttackReplayHex,
    pendingFreeMove,
    pendingRabbleMove,
    pendingMomentumCharge,
    isTurnTransitioning
  ]);

  // Resume the interrupted use: its AP was already committed, so if its unit or its target is gone it fizzles
  useEffect(() => {
    const r = readySpellResume;
    if (!r || activePlayer !== r.player) return;
    setReadySpellResume(null);
    const returnHex = Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === r.returnUnitInstanceId);
    if (!returnHex) {
      showNotification('The interrupted unit was defeated, so its ability does not happen.');
      switchTurn(false);
      return;
    }
    const c = r.commit;
    if (c.kind === 'hex' && c.targetInstanceId && unitsOnBoard[c.hexId]?.instanceId !== c.targetInstanceId) {
      const unit = unitsOnBoard[returnHex];
      const ab = activeAbility;
      if (ab) {
        const cost = getAbilityApCost(ab);
        const newAp = Math.max(0, unit.currentAp - cost);
        const counts = recordAbilityUse(unit.usedTurnCounts || {}, ab);
        setUnitsOnBoard((prev) => (prev[returnHex] ? { ...prev, [returnHex]: { ...prev[returnHex], currentAp: newAp, usedTurnCounts: counts } } : prev));
        setActiveAbility(null);
        setMultiStageState(null);
        showNotification(`${ab.name}'s target is gone, so it fizzles (${cost} AP spent).`);
        if (newAp <= 0) switchTurn(false);
      }
      readySpellAskedRef.current = null;
      return;
    }
    replayCommit(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readySpellResume, activePlayer, activeTurnUnitHex]);

  // Choosing which own ability a ready react readies (e.g. Ready Spell), as it is used
  const handleReadySpellChoice = (value: string) => {
    const c = readySpellChoice;
    setReadySpellChoice(null);
    if (!c || value === 'cancel' || !activeTurnUnit || !activeTurnUnitHex) return;
    const chosen = c.options.find((a) => a.id === value);
    if (!chosen) return;
    const cost = getAbilityApCost(c.ability);
    const newAp = Math.max(0, activeTurnUnit.currentAp - cost);
    const opponent: PlayerId = activePlayer === 'player1' ? 'player2' : 'player1';
    const newCounts = recordAbilityUse(activeTurnUnit.usedTurnCounts || {}, c.ability);
    const hex = activeTurnUnitHex;
    setUnitsOnBoard((prev) => {
      const cur = prev[hex] || activeTurnUnit;
      return {
        ...prev,
        [hex]: {
          ...cur,
          currentAp: newAp,
          usedTurnCounts: newCounts,
          readySpell: {
            abilityId: chosen.id,
            abilityName: chosen.name,
            sourceName: c.ability.name,
            cost: c.cost,
            expiresOnTurnEndFor: opponent,
            once: c.once,
            onAnyAction: c.onAnyAction
          }
        }
      };
    });
    playCardDrawSound();
    showNotification(
      `${activeTurnUnit.card.name} readied ${chosen.name} with ${c.ability.name}: during your opponent's next turn it may interrupt ${c.onAnyAction ? 'an action' : 'an ability'} they take${c.once ? ' (once)' : ''}.`
    );
    const endsTurn = c.ability.effects?.some((e: any) => e.type === 'endTurn');
    if (endsTurn || (cost > 0 && newAp <= 0)) switchTurn(false);
  };

  // Ends an Assist: the assist unit goes to the Graveyard (unless it was already defeated) and the turn
  // returns to the unit that was taking it
  const finishAssist = (message?: string) => {
    if (!lockedAssist) return;
    const { unitInstanceId, card, returnUnitHex, returnUnitInstanceId } = lockedAssist;
    const assistEntry = Object.entries(unitsOnBoard).find(([, u]) => u.instanceId === unitInstanceId);
    if (assistEntry) {
      setUnitsOnBoard((prev) => {
        const next = { ...prev };
        const hex = Object.keys(next).find((h) => next[h].instanceId === unitInstanceId);
        if (hex) delete next[hex];
        return next;
      });
      if (activePlayer === 'player1') setPlayer1Graveyard((g) => [...g, card]);
      else setPlayer2Graveyard((g) => [...g, card]);
    }
    const returnHex =
      Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === returnUnitInstanceId) || returnUnitHex;
    setLockedAssist(null);
    setActiveAbility(null);
    setMultiStageState(null);
    setIsMovingMode(false);
    setActiveTurnUnitHex(unitsOnBoard[returnHex] ? returnHex : null);
    setSelectedHex(returnHex);
    showNotification(message || `Assist: ${card.name} finished ${lockedAssist.ability.name} and was sent to the Graveyard.`);
  };

  // Activate the assist ability once the assist unit is on the board and acting
  useEffect(() => {
    if (!lockedAssist || lockedAssist.started) return;
    if (activeTurnUnitHex !== lockedAssist.unitHex || !unitsOnBoard[lockedAssist.unitHex]) return;
    setLockedAssist({ ...lockedAssist, started: true });
    handleAbilityClick(lockedAssist.ability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedAssist, activeTurnUnitHex, unitsOnBoard]);

  // Finish the assist once its ability has fully resolved (nothing targeted, no choice left open)
  useEffect(() => {
    if (!lockedAssist || !lockedAssist.started) return;
    if (
      activeAbility ||
      multiStageState ||
      researchPending ||
      scryPending ||
      fieldNotesPending ||
      lootPending ||
      deckArrangePending ||
      pendingMomentumCharge ||
      knockbackChoicePending ||
      attackKnockbackPrompt ||
      pendingAttackReplayHex ||
      providerChain ||
      abilityReinforcePending ||
      facelessKingPendingChoice ||
      isTurnTransitioning
    ) {
      return;
    }
    finishAssist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lockedAssist,
    activeAbility,
    multiStageState,
    researchPending,
    scryPending,
    fieldNotesPending,
    lootPending,
    deckArrangePending,
    pendingMomentumCharge,
    knockbackChoicePending,
    attackKnockbackPrompt,
    pendingAttackReplayHex,
    providerChain,
    abilityReinforcePending,
    facelessKingPendingChoice,
    isTurnTransitioning
  ]);

  const handleCancelAssist = () => {
    const isP1 = activePlayer === 'player1';

    if (pendingAssistDeployment) {
      const { card, handIndex } = pendingAssistDeployment;
      if (isP1) {
        setPlayer1Hand((h) => h.filter((_, idx) => idx !== handIndex));
        setPlayer1Graveyard((g) => [...g, card]);
      } else {
        setPlayer2Hand((h) => h.filter((_, idx) => idx !== handIndex));
        setPlayer2Graveyard((g) => [...g, card]);
      }
      setPendingAssistDeployment(null);
      showNotification(`Assist cancelled: ${card.name} sent to Graveyard without effect.`);
      return;
    }

    if (lockedAssist) {
      // Close whatever the assist ability had open, then hand the turn back
      setProviderChain(null);
      setAttackKnockbackPrompt(null);
      setPendingAttackReplayHex(null);
      setResearchPending(null);
      setScryPending(null);
      setFieldNotesPending(null);
      setDeckArrangePending(null);
      finishAssist(`Assist cancelled: ${lockedAssist.card.name} sent to Graveyard without effect.`);
      return;
    }
  };

  const handleFieldNotesSelectPlayer = (targetPlayer: PlayerId) => {
    if (!fieldNotesPending) return;
    const targetDeck = targetPlayer === 'player1' ? player1Deck : player2Deck;
    const { unitName, afterAp } = fieldNotesPending;

    if (targetDeck.length === 0) {
      showNotification(`${targetPlayer === 'player1' ? "Player 1's" : "Player 2's"} deck is empty!`);
      if (afterAp !== undefined && afterAp <= 0) endTurnAfterPopups();
      setFieldNotesPending(null);
      return;
    }

    const topCard = targetDeck[0];
    setFieldNotesPending(null);
    setScryPending({
      card: topCard,
      player: targetPlayer,
      unitName,
      isFieldNotes: true,
      sourceTitle: 'Field Notes: Reveal Top Card',
      targetPlayer,
      afterAp
    });
  };

  // The killer's "when this unit destroys an enemy unit or an Obstructing Wall" blast (e.g. Rigged to Blow), run on the
  // board at a kill: units it destroys go to the graveyard
  // Also records that the killer killed an enemy unit this turn (e.g. Relentless Rage reads it). `killingAbility`
  // defaults to the ability being used (a ranged one sets off "kills with a ranged attack" blasts, e.g. Spore Burst).
  const applyDestroyTriggers = (
    killer: BattlefieldUnit | null | undefined,
    killed: BattlefieldUnit,
    killedHex: string,
    board: Record<string, BattlefieldUnit>,
    killingAbility?: CardAbility | null
  ): Record<string, BattlefieldUnit> => {
    const ability = killingAbility ?? activeAbility;
    const ranged = Boolean(ability && ability.effects?.some((e: any) => e.type === 'damage') && !isMeleeAttackAbility(ability));
    const res = applyDestroyBlast(killer, killed, killedHex, board, { ranged });
    res.defeated.forEach((u) => {
      if (u.card.type === 'token') return;
      if (u.owner === 'player1') setPlayer1Graveyard((g) => [...g, u.card]);
      else setPlayer2Graveyard((g) => [...g, u.card]);
    });
    if (killer && res.defeated.some((u) => u.instanceId === killer.instanceId)) {
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
    }
    if (res.log) showNotification(res.log);
    let next = res.updatedBoard;
    const killedAnEnemy = killer && [killed, ...res.defeated].some((u) => u.owner !== killer.owner && !u.card.isWall);
    // Only on its own turn: "on a turn when it has killed an enemy unit" is the turn of the unit that has it
    if (killer && killedAnEnemy && killer.owner === activePlayer) {
      const killerHex = Object.keys(next).find((h) => next[h].instanceId === killer.instanceId);
      if (killerHex) next = { ...next, [killerHex]: { ...next[killerHex], killedEnemyThisTurn: true } };
    }
    // "If the target dies this turn, heal up to N damage from this unit" (e.g. Parasitic Enzyme's mark on it)
    const mark = killed.attackerMark;
    if (mark?.healCasterOnDeath && mark.turn === turnCount) {
      const casterHex = Object.keys(next).find((h) => next[h].instanceId === mark.casterInstanceId);
      if (casterHex && next[casterHex].damageCounters > 0) {
        next = { ...next, [casterHex]: { ...next[casterHex], damageCounters: Math.max(0, next[casterHex].damageCounters - mark.healCasterOnDeath) } };
        showNotification(`${mark.sourceName}: ${next[casterHex].card.name} healed ${mark.healCasterOnDeath} as ${killed.card.name} died.`);
      }
    }
    // "When this unit kills an enemy unit" (e.g. Medal Collection, Pride Feast)
    if (killer && killed.owner !== killer.owner && !killed.card.isWall) {
      const rewards = applyKillRewards(killer, next);
      next = rewards.board;
      if (rewards.log.length > 0) showNotification(`🏅 ${rewards.log.join(' • ')}`);
    }
    return next;
  };

  // "If it takes the next turn, it takes N damage" (Flame Blast): dealt when the unit is chosen to take the turn,
  // which locks it in. If that defeats it, the player chooses another unit.
  // Also "Units starting their turn next to this one take N damage" (e.g. Deep Freeze), read from the board given.
  const resolveDamageOnTakingTurn = (hexId: string, unit: BattlefieldUnit, board?: Record<string, BattlefieldUnit>): boolean => {
    const adjacency = board ? getTurnStartAdjacencyDamage(unit, Object.keys(board).find((h) => board[h].instanceId === unit.instanceId) || hexId, board) : [];
    const amount = (unit.damageOnTakingTurn || 0) + adjacency.reduce((sum, d) => sum + d.amount, 0);
    if (amount <= 0) return false;
    const absorbed = Math.min(unit.armour, amount);
    const counters = unit.damageCounters + amount - absorbed;
    const defeated = counters >= unit.card.hp;
    setUnitsOnBoard((prev) => {
      const cur = prev[hexId];
      if (!cur || cur.instanceId !== unit.instanceId) return prev;
      let next = { ...prev };
      if (defeated) {
        delete next[hexId];
      } else {
        const curAbsorbed = Math.min(cur.armour, amount);
        next[hexId] = {
          ...cur,
          armour: cur.armour - curAbsorbed,
          damageCounters: cur.damageCounters + amount - curAbsorbed,
          damageOnTakingTurn: undefined,
          tookDamageThisTurn: true,
          lockedIn: true
        };
      }
      next = applyDamageEventsAndPassives([{ hexId, damagedUnitOwner: cur.owner, damageAmount: amount, nonAttack: true }], next);
      checkVictory(next);
      return next;
    });
    if (defeated) {
      if (unit.card.type !== 'token') {
        if (unit.owner === 'player1') setPlayer1Graveyard((g) => [...g, unit.card]);
        else setPlayer2Graveyard((g) => [...g, unit.card]);
      }
      setActiveTurnUnitHex(null);
      setSelectedHex(null);
      setIsMovingMode(false);
      showNotification(`🔥 ${unit.card.name} took ${amount} damage for taking the turn${adjacency.length ? ` (${adjacency.map((d) => d.source).join(', ')})` : ''} and was defeated! Choose another unit.`);
    } else {
      showNotification(`🔥 ${unit.card.name} took ${amount} damage for taking the turn${adjacency.length ? ` (${adjacency.map((d) => d.source).join(', ')})` : ''} (locked in to this unit).`);
    }
    return defeated;
  };

  // "When this unit takes its turn, choose one of its 1AP abilities. This turn, the first time that ability is used, use it
  // an additional time for free" (e.g. Critical Forecast: { type: 'repeatAbility', choose: { cost, from: 'self' } }).
  // The choice is stored on the unit; once that ability has been used, a free copy of it is granted for this turn.
  const triggerTurnTakenPassives = (unit: BattlefieldUnit) => {
    const unitId = unit.instanceId;
    const unitHexNow = Object.keys(unitsOnBoard).find((h) => unitsOnBoard[h].instanceId === unitId);
    // "When an enemy unit starts its turn surrounding this unit, that unit cannot use 1AP abilities this turn" (e.g.
    // Suffocation Draught): { trigger: 'enemyUnitStartsTurnSurroundingSelf', effects: [{ type: 'cannotUseAbilities',
    // target: 'thatUnit', cost: 1, duration: 'thisTurn' }] }
    if (unitHexNow && !isImmuneToNonDamageEffects(unit)) {
      const barred = new Set<number>();
      const sources: string[] = [];
      getSurroundingHexes(unitHexNow).forEach((h) => {
        const o = unitsOnBoard[h];
        if (!o || o.owner === unit.owner) return;
        getUnitPassives(o).forEach((p) => {
          if (p.trigger !== 'enemyUnitStartsTurnSurroundingSelf') return;
          (p.effects || []).forEach((e: any) => {
            if (e.type === 'cannotUseAbilities' && typeof e.cost === 'number') {
              barred.add(e.cost);
              sources.push(`${o.card.name}'s ${p.name}`);
            }
          });
        });
      });
      if (barred.size > 0) {
        setUnitsOnBoard((prev) => {
          const h = Object.keys(prev).find((k) => prev[k].instanceId === unitId);
          if (!h) return prev;
          const add = [...barred].map((c) => cannotUseExactCostStatus(c)).filter((s) => !prev[h].statuses?.includes(s));
          return add.length ? { ...prev, [h]: { ...prev[h], statuses: [...(prev[h].statuses || []), ...add] } } : prev;
        });
        showNotification(`${sources.join(', ')}: ${unit.card.name} can't use ${[...barred].join('/')}AP abilities this turn.`);
      }
    }
    // "When this unit starts its turn, choose an enemy unit. That unit's passives have no effect this turn" (e.g.
    // Posthumous Prerogative): { type: 'removePassives', trigger: 'self.takesTurn', target: 'chosenEnemyUnit' }
    const prerogative = getUnitPassives(unit).find((p) =>
      (p.effects || []).some((e: any) => e.type === 'removePassives' && e.trigger === 'self.takesTurn' && e.target === 'chosenEnemyUnit')
    );
    const enemies = Object.values(unitsOnBoard).filter((u) => u.owner !== unit.owner && !isImmuneToNonDamageEffects(u));
    if (prerogative && enemies.length > 0) {
      askCardChoice(
        {
          title: prerogative.name,
          message: `Choose an enemy unit. Its passives have no effect this turn.`,
          options: enemies.map((u) => ({ label: `${u.card.name} (${u.hexId})`, value: u.instanceId }))
        },
        (enemyId) => {
          setUnitsOnBoard((prev) => {
            const h = Object.keys(prev).find((k) => prev[k].instanceId === enemyId);
            if (!h || prev[h].statuses?.includes(PASSIVES_REMOVED_THIS_TURN)) return prev;
            return { ...prev, [h]: { ...prev[h], statuses: [...(prev[h].statuses || []), PASSIVES_REMOVED_THIS_TURN] } };
          });
          const chosen = enemies.find((u) => u.instanceId === enemyId);
          if (chosen) showNotification(`${prerogative.name}: ${chosen.card.name}'s passives have no effect this turn.`);
        }
      );
      return;
    }
    const forecast = getUnitPassives(unit).find(
      (p) => p.trigger === 'self.takesTurn' && (p.effects || []).some((e: any) => e.type === 'repeatAbility')
    );
    if (!forecast) return;
    const eff: any = (forecast.effects || []).find((e: any) => e.type === 'repeatAbility');
    const cost = typeof eff?.choose?.cost === 'number' ? eff.choose.cost : 1;
    const options = (unit.card.abilities || []).filter((a) => a.cost === cost);
    if (options.length === 0) return;
    askCardChoice(
      {
        title: forecast.name,
        message: `Choose one of ${unit.card.name}'s ${cost}AP abilities. The first time it is used this turn, use it an additional time for free.`,
        options: options.map((a) => ({ label: a.name, value: a.id }))
      },
      (abilityId) => {
        setUnitsOnBoard((prev) => {
          const h = Object.keys(prev).find((k) => prev[k].instanceId === unitId);
          return h
            ? {
                ...prev,
                [h]: {
                  ...prev[h],
                  forecastAbilityId: abilityId,
                  passiveTurnMarks: { ...(prev[h].passiveTurnMarks || {}), forecast: turnCount }
                }
              }
            : prev;
        });
      }
    );
  };

  // Foresight (Fateweaver Sage): when this unit takes a turn, scry 1
  const triggerForesight = (unit: BattlefieldUnit) => {
    if (!getUnitPassives(unit).some((p) => p.id === 'foresight')) return;
    const deck = unit.owner === 'player1' ? player1Deck : player2Deck;
    if (deck.length === 0) return;
    enqueuePopup(unit.owner, 'Foresight: Scry 1', (ctx) => {
      const d = unit.owner === 'player1' ? ctx.p1Deck : ctx.p2Deck;
      if (d.length > 0) setScryPending({ card: d[0], player: unit.owner, unitName: unit.card.name });
    });
    // Once you scry, you're locked in to this unit for the turn
    setUnitsOnBoard((prev) => {
      const entry = Object.entries(prev).find(([, u]) => u.instanceId === unit.instanceId);
      if (!entry) return prev;
      return { ...prev, [entry[0]]: { ...entry[1], lockedIn: true } };
    });
  };

  const handleScryChoice = (toBottom: boolean) => {
    if (answerIncomingDecision('scry', { toBottom })) {
      setScryPending(null);
      return;
    }
    if (scryPending) appendLog('choice', `Scry: card to the ${toBottom ? 'bottom' : 'top'} of the deck`, scryDecider(scryPending));
    if (!scryPending) return;
    const { player, card, unitName, isFieldNotes, abilityName, afterAp } = scryPending;
    if (toBottom) {
      const rotate = (d: CardItem[]) => (d.length > 1 ? [...d.slice(1), d[0]] : d);
      if (player === 'player1') setPlayer1Deck(rotate);
      else setPlayer2Deck(rotate);
    }

    if (isFieldNotes) {
      const isOwnerDeck = player === activePlayer;
      const targetLabel = isOwnerDeck ? 'your' : "opponent's";
      showNotification(
        `📰 ${unitName}'s ${abilityName || 'Field Notes'}: ${card.name} ${toBottom ? 'put on the bottom of' : 'kept on top of'} ${targetLabel} deck.`,
        {
          privateTo: activePlayer,
          publicText: `📰 ${unitName}'s ${abilityName || 'Field Notes'}: a card ${toBottom ? 'put on the bottom of' : 'kept on top of'} ${player === 'player1' ? "Player 1's" : "Player 2's"} deck.`
        }
      );
    } else {
      showNotification(
        `${unitName}'s ${abilityName || 'Foresight'}: card ${toBottom ? 'put on the bottom of' : 'kept on top of'} ${
          player === activePlayer ? 'your' : "its owner's"
        } deck.`
      );
    }

    // A defender's scry (e.g. Preemptive Counter) turned the camera to them: turn it back
    if (!isFieldNotes && player !== activePlayer) setBoardYaw(activePlayer === 'player1' ? 0 : 180);

    if (afterAp !== undefined && afterAp <= 0) endTurnAfterPopups();

    setScryPending(null);
  };

  // Moves a deck-arrange step forward: places any order that is already forced, and finishes when everything is placed
  const continueDeckArrange = (state: DeckArrangeState) => {
    let s = state;
    if (s.index < s.cards.length) {
      setDeckArrangePending(s);
      return;
    }
    const remainingTops = s.tops.filter((c) => !s.orderedTops.includes(c));
    if (remainingTops.length === 1) s = { ...s, orderedTops: [...s.orderedTops, remainingTops[0]] };
    else if (remainingTops.length > 1) {
      setDeckArrangePending(s);
      return;
    }
    const remainingBottoms = s.bottoms.filter((c) => !s.orderedBottoms.includes(c));
    if (remainingBottoms.length === 1) s = { ...s, orderedBottoms: [...s.orderedBottoms, remainingBottoms[0]] };
    else if (remainingBottoms.length > 1) {
      setDeckArrangePending(s);
      return;
    }

    // Everything placed: rebuild the deck (orderedBottoms runs from the very bottom up)
    const count = s.cards.length;
    const topCards = s.orderedTops.map((i) => s.cards[i]);
    const bottomsInDeckOrder = [...s.orderedBottoms].reverse().map((i) => s.cards[i]);
    const rebuild = (d: CardItem[]) => [...topCards, ...d.slice(count), ...bottomsInDeckOrder];
    if (s.player === 'player1') setPlayer1Deck(rebuild);
    else setPlayer2Deck(rebuild);
    setDeckArrangePending(null);
    const parts: string[] = [];
    if (s.orderedTops.length > 0) parts.push(`${s.orderedTops.length} on top`);
    if (s.orderedBottoms.length > 0) parts.push(`${s.orderedBottoms.length} on the bottom`);
    showNotification(`${s.unitName}'s ${s.abilityName}: put ${parts.join(' and ')} of your deck.`);
    if (s.afterAp !== undefined && s.afterAp <= 0) endTurnAfterPopups();
  };

  const handleDeckArrangeScry = (toBottom: boolean) => {
    if (answerIncomingDecision('deckArrange', { toBottom })) {
      setDeckArrangePending(null);
      return;
    }
    if (!deckArrangePending) return;
    const s = deckArrangePending;
    continueDeckArrange({
      ...s,
      index: s.index + 1,
      tops: toBottom ? s.tops : [...s.tops, s.index],
      bottoms: toBottom ? [...s.bottoms, s.index] : s.bottoms
    });
  };

  const handleDeckArrangeOrder = (chosenIndex: number) => {
    if (answerIncomingDecision('deckArrange', { order: chosenIndex })) {
      setDeckArrangePending(null);
      return;
    }
    if (!deckArrangePending) return;
    const s = deckArrangePending;
    const remainingTops = s.tops.filter((c) => !s.orderedTops.includes(c));
    if (remainingTops.length > 1) {
      continueDeckArrange({ ...s, orderedTops: [...s.orderedTops, remainingTops[chosenIndex]] });
      return;
    }
    const remainingBottoms = s.bottoms.filter((c) => !s.orderedBottoms.includes(c));
    continueDeckArrange({ ...s, orderedBottoms: [...s.orderedBottoms, remainingBottoms[chosenIndex]] });
  };

  // Attacker's optional knockback answer. A ranged target needs a drawn path to know the push direction.
  const handleAttackKnockbackChoice = (value: string) => {
    appendLog('choice', `Knockback: ${value}`);
    const prompt = attackKnockbackPrompt;
    setAttackKnockbackPrompt(null);
    if (!prompt || !activeAbility || !activeTurnUnitHex) return;
    // value is the chosen knockback distance (0 = no knockback)
    const tiles = parseInt(value, 10) || 0;
    const apply = tiles > 0;
    const dist = getHexDistance(activeTurnUnitHex, prompt.hexId);
    if (apply && dist > 1) {
      // Reuse the path tool: the path must run from this unit to the target (shortest route); its last step is the direction
      const pathAbility: CardAbility = {
        ...activeAbility,
        id: `${activeAbility.id}__knockback_path`,
        name: `${activeAbility.name} (knockback path)`,
        usesPath: true,
        pathRule: 'any',
        pathLength: dist,
        knockbackPathFor: { hexId: prompt.hexId, tiles, attackAbilityId: activeAbility.id }
      };
      setMultiStageState({ ability: pathAbility, casterHex: activeTurnUnitHex, stage: 1, targets: [] });
      showNotification(
        `${activeAbility.name}: Draw the attack's path to ${prompt.targetName} (${dist} tiles, ending on it). Its last step sets the knockback direction. Then confirm.`
      );
      return;
    }
    attackKnockbackDecisionRef.current = { abilityId: activeAbility.id, hexId: prompt.hexId, apply, tiles };
    setPendingAttackReplayHex(prompt.hexId);
  };

  // A knockback answer belongs to one attack: drop it once a different ability is active
  useEffect(() => {
    if (attackKnockbackDecisionRef.current && attackKnockbackDecisionRef.current.abilityId !== activeAbility?.id) {
      attackKnockbackDecisionRef.current = null;
    }
  }, [activeAbility]);

  // Replays an attack click once the state it waited on has cleared
  useEffect(() => {
    if (!pendingAttackReplayHex || multiStageState || attackKnockbackPrompt) return;
    const hex = pendingAttackReplayHex;
    setPendingAttackReplayHex(null);
    handleHexClick(hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAttackReplayHex, multiStageState, attackKnockbackPrompt]);

  const handleKnockbackChoice = (useImmunity: boolean) => {
    if (answerIncomingDecision('knockback', { useImmunity })) {
      setKnockbackChoicePending(null);
      return;
    }
    if (knockbackChoicePending) appendLog('choice', `Knockback immunity: ${useImmunity ? 'used' : 'not used'}`, knockbackChoicePending.defender);
    const pending = knockbackChoicePending;
    if (!pending) return;
    setKnockbackChoicePending(null);
    setBoardYaw(activePlayer === 'player1' ? 0 : 180);
    // A multi-step attack's hit already landed: just resolve its knockback
    if (knockbackChoiceCallbackRef.current) {
      const resolve = knockbackChoiceCallbackRef.current;
      knockbackChoiceCallbackRef.current = null;
      resolve(useImmunity);
      return;
    }
    knockbackDecisionRef.current = { hexId: pending.hexId, useImmunity };
    handleHexClick(pending.hexId);
    knockbackDecisionRef.current = null;
  };

  const handleResearchChoice = (chosenIndex: number) => {
    if (answerIncomingDecision('research', { index: chosenIndex })) {
      setResearchPending(null);
      return;
    }
    if (researchPending) appendLog('choice', `Research: took card ${chosenIndex + 1}`, researchPending.player);
    if (!researchPending) return;
    const { cards, player, sourceTitle, unitName, afterAp, restOnTop, offerReinforce, unitHex, drawsCard } = researchPending;
    const chosenCard = cards[chosenIndex];
    const otherCard = cards[1 - chosenIndex];
    const restCards = cards.filter((_, idx) => idx !== chosenIndex);
    const restPlacement = restOnTop ? 'on top' : 'on the bottom';

    const isP1 = player === 'player1';
    const chosenHandIdx = (isP1 ? player1Hand : player2Hand).length;
    const placeRest = (d: CardItem[]) => {
      const remaining = d.slice(cards.length);
      return restOnTop ? [...restCards, ...remaining] : [...remaining, ...restCards];
    };

    if (isP1) {
      setPlayer1Hand((h) => [...h, chosenCard]);
      setPlayer1Deck(placeRest);
    } else {
      setPlayer2Hand((h) => [...h, chosenCard]);
      setPlayer2Deck(placeRest);
    }

    playCardDrawSound();
    if (drawsCard && unitHex) healOnDraw(unitsOnBoard[unitHex], 1);

    showNotification(
      `${unitName} used ${sourceTitle}: Added ${chosenCard.name} to hand, put ${otherCard ? otherCard.name : 'other card'} ${restPlacement} of deck.`,
      { privateTo: player, publicText: `${unitName} used ${sourceTitle}: added a card to hand, put the other ${restPlacement} of deck.` }
    );
    if (offerReinforce && unitHex && chosenCard.type === 'unit') {
      setResearchPending(null);
      startAbilityReinforce(chosenCard, chosenHandIdx, player, unitHex, afterAp, sourceTitle);
      return;
    }
    if (afterAp !== undefined && afterAp <= 0) {
      endTurnAfterPopups();
    }

    setResearchPending(null);
  };

  // ---- Popup queue ----
  const enqueuePopup = (decider: PlayerId, label: string, open: (ctx: PopupContext) => void) => {
    popupKeyRef.current += 1;
    const entry: QueuedPopup = { key: popupKeyRef.current, decider, turnPlayer: activePlayer, label, open };
    setPopupQueue((q) => [...q, entry]);
  };

  // Called by a popup that ends the turn when it closes (afterAp <= 0): waits for any other queued popup first
  const endTurnAfterPopups = () => {
    turnEndAfterPopupsRef.current = true;
    setTurnEndRequestTick((t) => t + 1);
  };

  const turnCameraTo = (player: PlayerId) => {
    if (player !== activePlayer) popupYawChangedRef.current = true;
    setBoardYaw(player === 'player1' ? 0 : 180);
  };

  const openQueuedPopup = (entry: QueuedPopup) => {
    setPopupQueue((q) => q.filter((p) => p.key !== entry.key));
    if (entry.decider !== activePlayer) turnCameraTo(entry.decider);
    entry.open({ p1Deck: player1Deck, p2Deck: player2Deck, p1Hand: player1Hand, p2Hand: player2Hand });
  };

  // Shows the next queued popup once nothing else is open, and ends a waiting turn once the queue is empty
  useEffect(() => {
    if (anyPopupOpen || activeLootRef.current || isTurnTransitioning) return;
    if (popupQueue.length === 0) {
      if (popupYawChangedRef.current) {
        popupYawChangedRef.current = false;
        setBoardYaw(activePlayer === 'player1' ? 0 : 180);
      }
      if (turnEndAfterPopupsRef.current) {
        turnEndAfterPopupsRef.current = false;
        switchTurn(false);
      }
      return;
    }
    // The player taking the turn handles theirs fully first; then the other player's happen as normal
    const turnPlayer = popupQueue[0].turnPlayer;
    const decider = popupQueue.some((p) => p.decider === turnPlayer) ? turnPlayer : popupQueue[0].decider;
    const group = popupQueue.filter((p) => p.decider === decider);
    if (group.length > 1) {
      // Several at once for the same player: they choose which resolves first
      turnCameraTo(decider);
      setPopupOrderChoice({ decider, options: group });
      return;
    }
    openQueuedPopup(group[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupQueue, anyPopupOpen, isTurnTransitioning, turnEndRequestTick]);

  const handlePopupOrderChoice = (value: string) => {
    if (answerIncomingDecision('popupOrder', { value })) {
      setPopupOrderChoice(null);
      return;
    }
    if (popupOrderChoice) appendLog('choice', `Popup order: ${value}`, popupOrderChoice.decider);
    const choice = popupOrderChoice;
    setPopupOrderChoice(null);
    const entry = choice?.options.find((p) => String(p.key) === value);
    if (entry) openQueuedPopup(entry);
  };

  // Core Loot Mechanic:
  // "defined as drawing the specified number of cards and then choosing the same number of cards from your hand to go to the bottom of your deck. When the player chooses which to put back, have the cards go back in the order they were chosen (last chosen on the very bottom)."
  const executeLoot = (
    player: PlayerId,
    amount: number,
    sourceTitle: string,
    unitName: string,
    opts?: {
      unitHex?: string;
      afterAp?: number;
      postLootCallback?: () => void;
    },
    overrideHand?: CardItem[],
    overrideDeck?: CardItem[]
  ) => {
    const isP1 = player === 'player1';
    const deck = overrideDeck !== undefined ? overrideDeck : (isP1 ? player1Deck : player2Deck);
    const currentHand = overrideHand !== undefined ? overrideHand : (isP1 ? player1Hand : player2Hand);

    const actualDrawnCount = Math.min(amount, deck.length);
    const drawn = deck.slice(0, actualDrawnCount);
    const remainingDeck = deck.slice(actualDrawnCount);
    const newHandWithDrawn = [...currentHand, ...drawn];

    // Immediately update hand and deck with drawn cards
    if (isP1) {
      setPlayer1Hand(newHandWithDrawn);
      setPlayer1Deck(remainingDeck);
    } else {
      setPlayer2Hand(newHandWithDrawn);
      setPlayer2Deck(remainingDeck);
    }

    playCardDrawSound();
    // Looting draws cards (e.g. Tapestry of Fate heals per card drawn)
    healOnDraw(opts?.unitHex ? unitsOnBoard[opts.unitHex] : null, drawn.length);

    const targetToReturn = Math.min(amount, newHandWithDrawn.length);

    if (targetToReturn === 0) {
      showNotification(`${unitName} triggered ${sourceTitle} (Loot ${amount}), but has no cards in hand to return to deck.`);
      if (opts?.postLootCallback) {
        opts.postLootCallback();
      }
      activeLootRef.current = null;
      setLootPending(null);
      if (lootQueueRef.current.length > 0) {
        const nextReq = lootQueueRef.current.shift()!;
        executeLoot(nextReq.player, nextReq.amount, nextReq.sourceTitle, nextReq.unitName, nextReq.opts);
        return;
      }
      if (opts?.afterAp !== undefined && opts.afterAp <= 0) {
        endTurnAfterPopups();
      }
      return;
    }

    const stateObj: LootPendingState = {
      player,
      count: targetToReturn,
      sourceTitle,
      unitName,
      unitHex: opts?.unitHex,
      drawnCards: drawn,
      afterAp: opts?.afterAp,
      postLootCallback: opts?.postLootCallback
    };

    activeLootRef.current = stateObj;
    setLootPending(stateObj);

    showNotification(
      `🏴‍☠️ ${unitName} triggered ${sourceTitle} (Loot ${amount})! Drew ${drawn.length} card(s). Choose ${targetToReturn} card(s) from hand to put on the bottom of your deck.`
    );
  };

  const triggerLoot = (
    player: PlayerId,
    amount: number,
    sourceTitle: string,
    unitName: string,
    opts?: {
      unitHex?: string;
      afterAp?: number;
      postLootCallback?: () => void;
    }
  ) => {
    // Draws when the popup opens, from the hand and deck as they are then
    enqueuePopup(player, `${sourceTitle} (Loot ${amount})`, (ctx) =>
      executeLoot(
        player,
        amount,
        sourceTitle,
        unitName,
        opts,
        player === 'player1' ? ctx.p1Hand : ctx.p2Hand,
        player === 'player1' ? ctx.p1Deck : ctx.p2Deck
      )
    );
  };

  // "Once per turn, when this unit ... takes damage to its armour, Loot N" (e.g. Iron Clout): { trigger:
  // 'self.dealsOrTakesDamageToArmour', effects: [{ type: 'loot', amount }] }, for units whose armour an attack just
  // damaged. Its owner loots (on their own screen online, when it isn't their turn).
  const lootOnArmourDamaged = (hits: { unit: BattlefieldUnit; armourLost: number }[]) => {
    hits.forEach(({ unit, armourLost }) => {
      if (armourLost <= 0) return;
      getUnitPassives(unit).forEach((p) => {
        if (p.trigger !== 'self.dealsOrTakesDamageToArmour') return;
        const loot: any = (p.effects || []).find((e: any) => e.type === 'loot' && typeof e.amount === 'number');
        if (!loot || !canTriggerPassiveThisTurn(unit, p)) return;
        const key = p.id || p.name;
        setUnitsOnBoard((prev) => {
          const h = Object.keys(prev).find((k) => prev[k].instanceId === unit.instanceId);
          if (!h) return prev;
          const counts = prev[h].usedTurnCounts || {};
          return { ...prev, [h]: { ...prev[h], usedTurnCounts: { ...counts, [key]: (counts[key] || 0) + 1 } } };
        });
        const hex = Object.keys(unitsOnBoard).find((k) => unitsOnBoard[k].instanceId === unit.instanceId);
        triggerLoot(unit.owner, loot.amount, p.name, unit.card.name, hex ? { unitHex: hex } : undefined);
      });
    });
  };

  const handleConfirmLoot = (pickedIndices: number[]) => {
    if (answerIncomingDecision('loot', { picked: pickedIndices })) {
      setLootPending(null);
      setMirroredLootHand(null);
      return;
    }
    if (lootPending) appendLog('choice', `Loot: kept ${pickedIndices.length} card(s)`, lootPending.player);
    const active = activeLootRef.current || lootPending;
    if (!active) return;
    const { player, sourceTitle, unitName, unitHex, afterAp, postLootCallback } = active;
    const isP1 = player === 'player1';
    const currentHand = isP1 ? player1Hand : player2Hand;
    const currentDeck = isP1 ? player1Deck : player2Deck;

    // Exactly this loot's number of cards go back: real hand positions only, no repeats, at most `count`
    const selectedIndices = Array.from(new Set(pickedIndices))
      .filter((idx) => idx >= 0 && idx < currentHand.length)
      .slice(0, active.count);
    const chosenCards = selectedIndices.map((idx) => currentHand[idx]).filter(Boolean);
    const remainingHand = currentHand.filter((_, idx) => !selectedIndices.includes(idx));

    // "When the player chooses which to put back, have the cards go back in the order they were chosen (last chosen on the very bottom)."
    const finalDeck = [...currentDeck, ...chosenCards];

    if (isP1) {
      setPlayer1Hand(remainingHand);
      setPlayer1Deck(finalDeck);
    } else {
      setPlayer2Hand(remainingHand);
      setPlayer2Deck(finalDeck);
    }

    playCardDrawSound();

    const lastChosenName = chosenCards[chosenCards.length - 1]?.name || 'Card';
    showNotification(
      `${unitName}'s ${sourceTitle} completed: Put ${chosenCards.length} card(s) on bottom of deck (${chosenCards.map((c) => c.name).join(' → ')}, with ${lastChosenName} on the very bottom).`,
      { privateTo: player, publicText: `${unitName}'s ${sourceTitle} completed: put ${chosenCards.length} card(s) on the bottom of the deck.` }
    );

    // Check High Seas Captain's passive Plunderer's Due:
    // "The first time each turn this unit loots, you may loot 1 again."
    const lootingUnit = unitHex ? unitsOnBoard[unitHex] : activeTurnUnit;
    let plunderersDueTriggered = false;
    if (lootingUnit) {
      const passives = getUnitPassives(lootingUnit);
      const plunderersDue = passives.find((p) => p.id === 'plunderers_due' || p.name === "Plunderer's Due");
      if (plunderersDue && canTriggerPassiveThisTurn(lootingUnit, plunderersDue)) {
        plunderersDueTriggered = true;
        const pKey = plunderersDue.id || plunderersDue.name;
        const currentCounts = lootingUnit.usedTurnCounts || {};
        const nextCounts = { ...currentCounts, [pKey]: (currentCounts[pKey] || 0) + 1, 'plunderers_due': (currentCounts['plunderers_due'] || 0) + 1 };
        setUnitsOnBoard((prev) => {
          const uHex = lootingUnit.hexId;
          if (!prev[uHex]) return prev;
          return {
            ...prev,
            [uHex]: {
              ...prev[uHex],
              usedTurnCounts: nextCounts
            }
          };
        });
        showNotification(`🏴‍☠️ ${lootingUnit.card.name}'s Plunderer's Due: Loot 1 again!`);
        lootQueueRef.current.push({
          player,
          amount: 1,
          sourceTitle: "Plunderer's Due",
          unitName: lootingUnit.card.name,
          opts: {
            unitHex: lootingUnit.hexId,
            afterAp,
            postLootCallback
          }
        });
      }
    }

    if (postLootCallback && !plunderersDueTriggered) {
      postLootCallback();
    }

    if (lootQueueRef.current.length > 0) {
      const nextReq = lootQueueRef.current.shift()!;
      const overrideHand = nextReq.player === player ? remainingHand : undefined;
      const overrideDeck = nextReq.player === player ? finalDeck : undefined;
      executeLoot(nextReq.player, nextReq.amount, nextReq.sourceTitle, nextReq.unitName, nextReq.opts, overrideHand, overrideDeck);
      return;
    }

    activeLootRef.current = null;
    setLootPending(null);

    if (afterAp !== undefined && afterAp <= 0) {
      endTurnAfterPopups();
    }
  };
  // Earthen Shards (Dravite Mage): armour beyond 3 becomes damage to surrounding enemies.
  // Runs after any board change, so every armour source (abilities, passives, allies) is covered.
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const res = resolveEarthenShards(unitsOnBoard);
    if (!res.changed) return;
    res.defeated.forEach((u) => {
      if (u.card.type === 'token') return;
      if (u.owner === 'player1') setPlayer1Graveyard((g) => [...g, u.card]);
      else setPlayer2Graveyard((g) => [...g, u.card]);
    });
    let finalBoard = res.updatedUnits;
    if (res.damageEvents && res.damageEvents.length > 0) {
      finalBoard = applyDamageEventsAndPassives(res.damageEvents, res.updatedUnits);
    }
    setUnitsOnBoard(finalBoard);
    checkVictory(finalBoard);
    showNotification(res.logMessages.join(' • '));
  }, [unitsOnBoard, gamePhase]);
  // ---- Control gating (online) ----
  // The player whose input the game is waiting for: whoever decides an open mid-turn choice (a defender's Hold the
  // Gate, a Ready Spell offer, their own scry or loot, the order of their popups), else the player taking the turn
  // (a Ready Spell takeover already makes the reacting player the active one), or the next player at a turn change.
  const inputOwner: PlayerId =
    cardChoicePrompt?.player ??
    readySpellPrompt?.decider ??
    knockbackChoicePending?.defender ??
    popupOrderChoice?.decider ??
    lootPending?.player ??
    (scryPending ? scryDecider(scryPending) : undefined) ??
    researchPending?.player ??
    deckArrangePending?.player ??
    (isTurnTransitioning ? transitionPlayer : activePlayer);
  // The shared match log, as a button that sits with the camera controls (see below)
  const logControl = (
    <GameLogPanel
      entries={gameLog}
      handoffStatus={handoffStatus}
      viewer={isOnline() ? localPlayer : null}
      open={isLogOpen}
      onToggle={() => setIsLogOpen((o) => !o)}
    />
  );
  // (while reconnecting, nobody plays on: the two games would drift apart)
  const isWaitingForOpponent = activeTab === 'play' && localPlayer !== null && (localPlayer !== inputOwner || Boolean(reconnect));

  // While waiting, every click in the game is stopped before it reaches a handler, except on controls marked
  // data-input-always (header, camera, match menus). Hovering still works, so cards can be inspected.
  const blockWhileWaiting = (e: React.SyntheticEvent) => {
    if (!isWaitingForOpponent) return;
    if ((e.target as HTMLElement).closest?.('[data-input-always]')) return;
    e.stopPropagation();
    e.preventDefault();
  };
  const blockKeysWhileWaiting = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') blockWhileWaiting(e);
  };

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-sky-500 selection:text-stone-950 select-none"
      onClickCapture={blockWhileWaiting}
      onDoubleClickCapture={blockWhileWaiting}
      onMouseDownCapture={blockWhileWaiting}
      onChangeCapture={blockWhileWaiting}
      onKeyDownCapture={blockKeysWhileWaiting}
    >
      {/* ================= TOP NAV BAR ================= */}
      <header
        data-input-always
        className="relative h-16 shrink-0 border-b px-6 flex items-center justify-between backdrop-blur-md z-40 transition-colors shadow-md"
        style={{
          backgroundColor: '#2f2829',
          borderColor: '#433738'
        }}
      >
        <div className="flex items-center gap-3 h-full py-1.5">
          {/* The game's name, filling the bar's height */}
          <div className="flex flex-col justify-center h-full">
            <span className="font-serif font-black text-stone-100 text-[28px] leading-none tracking-wider">
              EVIL
            </span>
            <span className="text-[13px] font-mono text-stone-400 uppercase tracking-widest leading-none mt-1">
              Card Game
            </span>
          </div>
          {/* Game version and build fingerprint (online players must match, see src/version.ts), and under it the newest
              set (the last one in the card list), which names the update */}
          <button
            onClick={() => setIsVersionOpen((open) => !open)}
            title={isVersionOpen ? 'Hide the version' : 'Show the version'}
            className="self-start mt-1.5 px-0.5 py-1.5 rounded-md bg-[#231e1f] border border-[#433738] text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
          >
            {isVersionOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {isVersionOpen && (
          <div className="self-start flex flex-col gap-1 pt-2">
            <span
              className="text-[10px] font-mono text-stone-500 leading-none"
              title={`Game version ${formatVersion()}: online players need the same version`}
            >
              {formatVersion()}
            </span>
            {LATEST_SET && (
              <span className="text-[10px] font-serif italic text-stone-400 leading-none" title="The newest set">
                “{LATEST_SET}”
              </span>
            )}
          </div>
          )}
        </div>

        {/* Centred on the page bar whatever the width of the title or the right side (it lines up with the gallery bar's tab) */}
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-[#231e1f] p-1 rounded-xl border border-[#433738] shadow-inner">
          <button
            onClick={() => {
              if (activeTab !== 'play') setActiveTab('gallery');
            }}
            disabled={activeTab === 'play'}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === 'play'
                ? 'opacity-30 cursor-not-allowed text-stone-600'
                : activeTab === 'gallery'
                ? 'bg-red-800 text-red-50 shadow-sm cursor-pointer'
                : 'text-stone-300 hover:text-stone-100 hover:bg-[#3d3334] cursor-pointer'
            }`}
            title={activeTab === 'play' ? "Locked out during active match" : "Card Gallery"}
          >
            Card Gallery
          </button>
          <button
            onClick={() => {
              if (activeTab !== 'play') setActiveTab('deckbuilder');
            }}
            disabled={activeTab === 'play'}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === 'play'
                ? 'opacity-30 cursor-not-allowed text-stone-600'
                : activeTab === 'deckbuilder'
                ? 'bg-red-800 text-red-50 shadow-sm cursor-pointer'
                : 'text-stone-300 hover:text-stone-100 hover:bg-[#3d3334] cursor-pointer'
            }`}
            title={activeTab === 'play' ? "Locked out during active match" : "Construct Deck"}
          >
            Deckbuilder
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {/* Testing aid until the online lobby assigns seats: which player this screen is (dev server only) */}
          {import.meta.env.DEV && activeTab === 'play' && (
            <select
              value={localPlayer ?? ''}
              onChange={(e) => setLocalPlayer((e.target.value || null) as PlayerId | null)}
              className="bg-[#1c1819] border border-[#382d2e] rounded-xl px-2 py-2 text-xs text-stone-300 cursor-pointer"
              title="Which player this screen is (testing online control)"
            >
              <option value="">Seat: Both (hot seat)</option>
              <option value="player1">Seat: Player 1</option>
              <option value="player2">Seat: Player 2</option>
            </select>
          )}
          {/* Testing aid for the turn handoff: load each handed-over state back and check it re-captures the same */}
          {import.meta.env.DEV && activeTab === 'play' && (
            <label
              className="flex items-center gap-1.5 bg-[#1c1819] border border-[#382d2e] rounded-xl px-2 py-2 text-xs text-stone-300 cursor-pointer"
              title="At every turn end, reload the handed-over state and check that it re-captures to the same fingerprint"
            >
              <input type="checkbox" checked={reloadEachTurn} onChange={(e) => setReloadEachTurn(e.target.checked)} />
              Reload each turn
            </label>
          )}
          <div className="relative" ref={volumeDropdownRef}>
            <button
              onClick={handleVolumeButtonClick}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                !isMuted
                  ? 'text-amber-400 bg-[#231e1f] border-[#433738] shadow-sm hover:text-amber-300 hover:border-amber-500/60'
                  : 'text-stone-400 hover:text-stone-200 bg-[#1c1819] border-[#382d2e] hover:border-[#433738]'
              }`}
              title={isMuted ? "Unmute and play music" : "Adjust volume / mute music"}
              aria-label="Volume and Music Controls"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            {showVolumeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-60 p-3.5 bg-[#272021]/95 border border-[#433738] rounded-xl shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio Track</span>
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-stone-800 rounded-lg appearance-none"
                />

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#433738]/80 text-[11px] text-stone-400">
                  <span className="truncate max-w-[120px] font-mono text-stone-500" title="assets>music>music.mp3">
                    music.mp3
                  </span>
                  <button
                    onClick={toggleMuteOnly}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (activeTab === 'play') return;
              setIsPlayModeOpen(true);
            }}
            className={`flex items-center gap-2 px-6 py-2.5 text-base font-black transition-all rounded-xl shadow-md uppercase tracking-wider cursor-pointer active:scale-95 ${
              activeTab === 'play'
                ? 'bg-red-700 text-red-50 ring-2 ring-red-600 shadow-red-900/20'
                : 'text-red-50 bg-red-800 hover:bg-red-700 ring-1 ring-red-600/60'
            }`}
            title="Choose how to play, then select decks and enter the match arena"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play</span>
          </button>
        </div>
      </header>

      {/* Online: the link to the other player dropped; reconnecting, or a way out */}
      {reconnect && (
        <div
          data-input-always
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[75] max-w-[calc(100vw-32px)] px-5 py-3 rounded-xl bg-stone-900/95 border border-amber-700/80 text-amber-100 shadow-xl flex flex-col items-center gap-2 text-sm"
        >
          <span className="font-bold">
            {reconnect.gaveUp
              ? "Couldn't reconnect to the other player."
              : `Connection lost. Reconnecting${room?.role === 'host' && room.status === 'waiting' ? ' (waiting for the other player to come back)' : ''}… (try ${reconnect.attempt})`}
          </span>
          {reconnect.detail && <span className="text-xs text-stone-400">{reconnect.detail}</span>}
          <div className="flex gap-2">
            {reconnect.gaveUp && (
              <button
                onClick={() => {
                  setReconnect({ attempt: 1, gaveUp: false });
                  openSessionRoom();
                }}
                className="px-3 py-1 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-50 text-xs font-bold cursor-pointer"
              >
                Try again
              </button>
            )}
            <button onClick={() => stopReconnecting(false)} className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs cursor-pointer">
              Continue here in hot seat
            </button>
            <button onClick={() => stopReconnecting(true)} className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-red-900 text-xs cursor-pointer">
              Leave match
            </button>
          </div>
        </div>
      )}

      {/* Online: shown while the game is waiting on the other player's input (clicks are blocked meanwhile) */}
      {isWaitingForOpponent && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] pointer-events-none px-5 py-2 rounded-xl bg-stone-900/95 border border-red-800/80 text-red-100 font-bold shadow-xl animate-pulse">
          Waiting for opponent…
        </div>
      )}
      {/* ...and its counterpart when the game is waiting on this screen's player */}
      {activeTab === 'play' &&
        localPlayer !== null &&
        !isWaitingForOpponent &&
        (gamePhase === 'setup' || gamePhase === 'playing') &&
        !winner &&
        !isTurnTransitioning && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] pointer-events-none px-5 py-2 rounded-xl bg-stone-900/95 border border-emerald-600/80 text-emerald-200 font-bold shadow-xl animate-pulse">
            Your turn!
          </div>
        )}

      {/* Play Mode Menu: Hot Seat (this screen, the current game) or Online (not available yet) */}
      <div data-input-always>
        <PlayModeModal
          isOpen={isPlayModeOpen}
          onClose={() => setIsPlayModeOpen(false)}
          onHotSeat={() => {
            setIsPlayModeOpen(false);
            setIsDeckSelectOpen(true);
          }}
          onOnline={() => {
            setIsPlayModeOpen(false);
            setIsLobbyOpen(true);
          }}
        />
      </div>

      {/* Online lobby: host or join, then each player picks their deck */}
      <div data-input-always>
        <OnlineLobbyModal
          isOpen={isLobbyOpen}
          room={room}
          customDecks={lobbyDecks.customDecks}
          presetDecks={lobbyDecks.lockedPresetDecks}
          myDeckName={lobbyView.myDeckName}
          opponentDeckName={lobbyView.opponentDeckName}
          seedAgreed={lobbyView.seedAgreed}
          onHost={hostRoom}
          onJoin={joinRoom}
          onReady={handleLobbyReady}
          savedMatch={!room || room.status === 'closed' || room.status === 'error' ? savedMatchInfo : null}
          onRejoin={rejoinSavedMatch}
          onLeave={leaveRoom}
          onClose={() => setIsLobbyOpen(false)}
        />
      </div>

      {/* Deck Selection Modal (No descriptions) */}
      <div data-input-always>
        <DeckSelectModal
          isOpen={isDeckSelectOpen}
          onClose={() => setIsDeckSelectOpen(false)}
          onConfirmDecks={handleDecksSelected}
          allCards={allCardList}
          customArtMap={customArtMap}
        />
      </div>

      {/* Coin Flip Modal (Rule 4: Winner chooses to play first or second) */}
      <div data-input-always>
        <CoinFlipModal
          isOpen={isCoinFlipOpen}
          onComplete={(first) => {
            // (online: this screen's own choice goes to the other player; theirs arrived as coinRemote.order)
            if (onlineMatchRef.current && isOnline() && !coinRemote.order) roomRef.current?.send('coin_order', { first });
            handleCoinFlipComplete(first);
          }}
          random={matchRandom}
          canCall={!onlineMatchRef.current || localPlayer === 'player2'}
          canChoose={(w) => !onlineMatchRef.current || localPlayer === w}
          onCall={(side) => {
            if (onlineMatchRef.current) roomRef.current?.send('coin_call', { side });
          }}
          remoteCall={coinRemote.call}
          remoteOrder={coinRemote.order}
        />
      </div>

      {/* Victory / Draw Modal (Rule 8) */}
      <div data-input-always>
        <VictoryModal
          isOpen={isVictoryOpen}
          winner={winner}
          reason={victoryReason}
          onPlayAgain={() => {
            setIsVictoryOpen(false);
            setIsDeckSelectOpen(true);
          }}
          onClose={() => setIsVictoryOpen(false)}
        />
      </div>

      {/* Turn Transition Animated Overlay */}
      <TurnTransitionOverlay
        isOpen={isTurnTransitioning}
        activePlayer={transitionPlayer}
        onComplete={handleTurnTransitionComplete}
      />

      {/* Cycle Cards Modal (Rule 5.2) */}
      <CycleModal
        isOpen={isCycleModalOpen}
        player={activePlayer}
        hand={activeHand}
        customArtMap={customArtMap}
        onConfirmCycle={handleConfirmCycle}
        onCancel={() => setIsCycleModalOpen(false)}
      />

      {/* Assist Ability Modal */}
      <AssistModal
        isOpen={isAssistModalOpen}
        onClose={() => setIsAssistModalOpen(false)}
        assistCards={activeAssistCards}
        onSelectAssist={handleSelectAssist}
        customArtMap={customArtMap}
      />
      {fieldNotesPending && (
        <FieldNotesModal
          unitName={fieldNotesPending.unitName}
          activePlayer={activePlayer}
          player1DeckCount={player1Deck.length}
          player2DeckCount={player2Deck.length}
          onSelectPlayer={handleFieldNotesSelectPlayer}
          onCancel={lockedAssist ? handleCancelAssist : undefined}
        />
      )}
      {scryPending && isMyDecision(scryDecider(scryPending)) && (
        <ScryModal
          card={scryPending.card}
          unitName={scryPending.unitName}
          customArtUrl={customArtMap[scryPending.card.id]}
          title={scryPending.sourceTitle || (scryPending.isFieldNotes ? 'Field Notes: Reveal Top Card' : 'Foresight: Scry 1')}
          subtitle={
            scryPending.isFieldNotes
              ? `${scryPending.unitName} reveals the top card of ${scryPending.player === activePlayer ? 'your' : "opponent's"} deck (${scryPending.player === 'player1' ? 'Player 1' : 'Player 2'})`
              : undefined
          }
          onChoose={handleScryChoice}
          onCancel={lockedAssist ? handleCancelAssist : undefined}
        />
      )}
      {researchPending && isMyDecision(researchPending.player) && (
        <ResearchModal
          cards={researchPending.cards}
          sourceTitle={researchPending.sourceTitle}
          unitName={researchPending.unitName}
          customArtMap={customArtMap}
          restOnTop={researchPending.restOnTop}
          onChoose={handleResearchChoice}
          onCancel={lockedAssist ? handleCancelAssist : undefined}
        />
      )}
      {deckArrangePending &&
        isMyDecision(deckArrangePending.player) &&
        (() => {
          const s = deckArrangePending;
          if (s.index < s.cards.length) {
            const card = s.cards[s.index];
            return (
              <ScryModal
                card={card}
                unitName={s.unitName}
                customArtUrl={customArtMap[card.id]}
                title={`${s.abilityName}: Card ${s.index + 1}/${s.cards.length}`}
                subtitle={`${s.unitName} reveals the top ${s.cards.length} cards of your deck. Put this one back on top or on the bottom.`}
                onChoose={handleDeckArrangeScry}
              />
            );
          }
          const remainingTops = s.tops.filter((i) => !s.orderedTops.includes(i));
          const orderingTops = remainingTops.length > 1;
          const toOrder = orderingTops ? remainingTops : s.bottoms.filter((i) => !s.orderedBottoms.includes(i));
          return (
            <ResearchModal
              cards={toOrder.map((i) => s.cards[i])}
              sourceTitle={`${s.abilityName}: Order`}
              unitName={s.unitName}
              customArtMap={customArtMap}
              promptText={
                orderingTops
                  ? 'Choose the card to put on the very top of your deck.'
                  : 'Choose the card to put on the very bottom of your deck.'
              }
              buttonLabel={orderingTops ? 'Put on Top' : 'Put on Bottom'}
              onChoose={handleDeckArrangeOrder}
            />
          );
        })()}
      {readySpellPrompt && isMyDecision(readySpellPrompt.decider) && (
        <TimedYesNoModal
          decider={readySpellPrompt.decider}
          title="Interrupt"
          question={`Have ${readySpellPrompt.reactorName} use ${readySpellPrompt.abilityName}?`}
          timeLimitMs={3000}
          onChoose={handleReadySpellAnswer}
        />
      )}
      {readySpellChoice && (
        <ChoiceModal
          title={readySpellChoice.ability.name}
          message={`Choose the ${readySpellChoice.cost}AP ability to ready. During your opponent's next turn, you may use it for free to interrupt each ability they use.`}
          options={[
            ...readySpellChoice.options.map((a, i) => ({ label: a.name, value: a.id, primary: i === 0 })),
            { label: 'Cancel', value: 'cancel' }
          ]}
          onChoose={handleReadySpellChoice}
        />
      )}
      {cardChoicePrompt && isMyDecision(cardChoicePrompt.player ?? activePlayer) && (
        <ChoiceModal
          title={cardChoicePrompt.title}
          message={cardChoicePrompt.message}
          options={cardChoicePrompt.options.map((o, i) => ({ ...o, primary: i === 0 }))}
          onChoose={answerCardChoice}
        />
      )}
      {splitHitPrompt && (
        <ChoiceModal
          title={splitHitPrompt.abilityName}
          message={`The second hit may target a different unit. Hit ${splitHitPrompt.targetName} twice, or choose another unit for the second hit?`}
          options={[
            { label: `Both on ${splitHitPrompt.targetName}`, value: 'same' },
            { label: 'Choose a different unit', value: 'split', primary: true }
          ]}
          onChoose={handleSplitHitChoice}
        />
      )}
      {popupOrderChoice && isMyDecision(popupOrderChoice.decider) && (
        <ChoiceModal
          title={`${popupOrderChoice.decider === 'player1' ? 'Player 1' : 'Player 2'}: Choose the Order`}
          message="These trigger at the same time. Choose which one resolves first; the rest follow after it."
          options={popupOrderChoice.options.map((p, i) => ({
            label: p.label,
            value: String(p.key),
            primary: i === 0
          }))}
          onChoose={handlePopupOrderChoice}
        />
      )}
      {attackKnockbackPrompt && (
        <ChoiceModal
          title={attackKnockbackPrompt.abilityName}
          message={attackKnockbackPrompt.message}
          options={attackKnockbackPrompt.options.map((o, i) => ({
            label: o.label,
            value: String(o.tiles),
            primary: i === attackKnockbackPrompt.options.length - 1
          }))}
          onChoose={handleAttackKnockbackChoice}
        />
      )}
      {knockbackChoicePending && isMyDecision(knockbackChoicePending.defender) && (
        <KnockbackChoiceModal
          defender={knockbackChoicePending.defender}
          unitName={knockbackChoicePending.unitName}
          passive={knockbackChoicePending.passive}
          attackerName={knockbackChoicePending.attackerName}
          abilityName={knockbackChoicePending.abilityName}
          tiles={knockbackChoicePending.tiles}
          onChoose={handleKnockbackChoice}
        />
      )}
      {pendingFreeMove && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-2 rounded-xl bg-stone-900/95 border-2 border-emerald-400/90 shadow-xl text-xs sm:text-sm text-stone-200 font-sans">
          <span>
            <span className="font-bold text-emerald-300">{pendingFreeMove.sourceName}</span>: you may move 1 tile for free.
          </span>
          <button
            onClick={() => {
              setPendingFreeMove(null);
              setIsMovingMode(false);
              showNotification(`${pendingFreeMove.sourceName}: skipped the free move.`);
              if (activeTurnUnit && activeTurnUnit.currentAp <= 0 && !abilityAfterFreeMoveRef.current) switchTurn(false);
            }}
            className="px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wide bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer transition-colors"
          >
            Skip
          </button>
        </div>
      )}
      {abilityReinforcePending && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-2 rounded-xl bg-stone-900/95 border-2 border-amber-400/90 shadow-xl text-xs sm:text-sm text-stone-200 font-sans">
          <span>
            <span className="font-bold text-amber-300">{abilityReinforcePending.sourceTitle}</span>: Reinforce{' '}
            <span className="font-semibold text-emerald-300">{abilityReinforcePending.card.name}</span> now?
          </span>
          <button
            onClick={() => {
              showNotification(`${abilityReinforcePending.sourceTitle}: Skipped reinforcing ${abilityReinforcePending.card.name}; it stays in your hand.`, {
                privateTo: activePlayer,
                publicText: `${abilityReinforcePending.sourceTitle}: skipped reinforcing; the card stays in hand.`
              });
              finishAbilityReinforce([]);
            }}
            className="px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wide bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer transition-colors"
          >
            Skip
          </button>
        </div>
      )}
      {lootPending && isMyDecision(lootPending.player) && (
        <LootModal
          isOpen={true}
          player={lootPending.player}
          hand={mirroredLootHand ?? (lootPending.player === 'player1' ? player1Hand : player2Hand)}
          count={lootPending.count}
          sourceTitle={lootPending.sourceTitle}
          unitName={lootPending.unitName}
          drawnCards={lootPending.drawnCards}
          customArtMap={customArtMap}
          onConfirmLoot={handleConfirmLoot}
        />
      )}
      {/* Faceless King Perfect Synthesis Passive Choice Modal */}
      {facelessKingPendingChoice && (
        <FacelessKingPassiveChoiceModal
          isOpen={true}
          unitName={facelessKingPendingChoice.unitName}
          promotedCards={facelessKingPendingChoice.promotedCards}
          customArtMap={customArtMap}
          onConfirm={(chosenPassive) => {
            const { unitHex, nextAction } = facelessKingPendingChoice;
            if (chosenPassive) {
              setUnitsOnBoard((prev) => {
                const target = prev[unitHex];
                if (!target) return prev;
                return {
                  ...prev,
                  [unitHex]: {
                    ...target,
                    chosenPassive
                  }
                };
              });
              showNotification(`Faceless King permanently acquired "${chosenPassive.name}" via Perfect Synthesis!`);
            } else {
              showNotification('Faceless King did not acquire a passive.');
            }
            setFacelessKingPendingChoice(null);
            nextAction();
          }}
        />
      )}

      {/* ================= TAB 1: CARD GALLERY ================= */}
      {activeTab === 'gallery' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Standee preview for the hovered card, where the card preview sits in a match (top right) */}
          {previewStandee && (
            <div className="fixed top-24 right-6 z-40 pointer-events-none">
              <StandeePreview card={previewStandee.card} customArtUrl={customArtMap[previewStandee.card.id]} showPedestal={false} />
            </div>
          )}
          {/* The title, search and filter bar: fixed right under the page bar (the cards scroll below it). A small tab
              in the middle of its bottom edge hides it; while hidden, the tab hangs under the page bar to bring it back. */}
          <div className="relative shrink-0 z-30">
            {isGalleryBarOpen && (
              <div className="bg-stone-950/95 border-b border-stone-800">
                <div className="max-w-7xl mx-auto w-full px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-bold font-serif text-stone-100">All Cards ({filteredCards.length} Cards)</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter cards..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-200 placeholder:text-stone-500 focus:outline-hidden focus:border-sky-400"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-stone-900 p-1 rounded border border-stone-800 text-xs">
                      {['all', 'basic', 'promote', 'fusion', 'tribute'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat as typeof categoryFilter)}
                          className={`px-2.5 py-1 rounded capitalize transition-colors cursor-pointer ${
                            categoryFilter === cat ? 'bg-red-800 text-red-50 font-bold' : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsGalleryBarOpen((open) => !open)}
              title={isGalleryBarOpen ? 'Hide the search and filter bar' : 'Show the search and filter bar'}
              className="absolute top-full left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-md bg-stone-950/95 border border-t-0 border-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            >
              {isGalleryBarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full hide-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredCards.map((card) => (
                <div
                  key={`gallery-card-${card.id}`}
                  onMouseEnter={() => setPreviewStandee({ card })}
                  onMouseLeave={() => setPreviewStandee(null)}
                  className="relative rounded-xl overflow-hidden shadow-xl border border-stone-800 bg-stone-950 select-none"
                >
                  <CardThumbnail card={card} customArtUrl={customArtMap[card.id]} />
                </div>
              ))}
            </div>
{/* ================= STANDARD BOTTOM NOTICE ================= */}
        <footer className="w-full border-t border-stone-800/80 bg-stone-900/90 py-2.5 px-6 text-center text-stone-400 leading-relaxed">
          <div className="max-w-4xl mx-auto">
            <p className="font-serif text-stone-400" style={{ fontSize: '7pt', lineHeight: '1.4' }}>
              EVIL Card Game, 2026, was made by 1 person across hundreds of hours with the help of countless friends, kind strangers, and AI agents. Absolutely no AI artwork was used for the cards in this game. EVIL Card Game is not under official copyright. Please do not steal this game. Anybody who does so having read this notice openly admits that they are a cod fish, a scallywag, and a devious villain. Please enjoy the game.
            </p>
          </div>
        </footer>
          </div>
        </div>
      )}

      {/* ================= TAB 2: DECKBUILDER ================= */}
      {activeTab === 'deckbuilder' && (
        <Deckbuilder
          cards={allCardList}
        />
      )}

      {/* ================= TAB 4: PLAY TAB (Hotseat Turn System & Standees at Top Layer) ================= */}
      {activeTab === 'play' && (
        <div
          onWheel={(e) => {
            e.stopPropagation();
            markCameraChange();
            setBoardZoom((prev) => Math.min(200, Math.max(20, Math.round(prev - e.deltaY * 0.05))));
          }}
          className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col justify-between select-none"
        >
          {/* Battlefield Background */}
          {bgImageSrc ? (
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-300"
              style={{ backgroundImage: `url(${bgImageSrc})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-stone-950 pointer-events-none" />
          )}

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(50,40,30,0.25)_0%,transparent_80%)] pointer-events-none" />

          {/* Top Header inside Arena */}
          {/* Notices and Leave Match over the top of the battlefield: only the button takes clicks, so the hexes under
              this row stay clickable */}
          <div className="z-20 relative flex items-center justify-between p-6 pb-2 pointer-events-none">
            {/* Feedback Message */}
            <div className="flex items-center gap-3">
              {feedbackMessage && (
                <div className="px-5 py-2 bg-stone-900/95 border border-amber-400/90 text-amber-200 text-sm font-mono font-bold rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 pointer-events-none">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}
            </div>

            {/* Leave Match and Concede, together on the right (clear of the turn banner in the middle) */}
            <div className="flex items-center">
            <button
              data-input-always
              onClick={() => {
                // (online: leaving the match leaves the room too, and the other player is told; a new match is a new room)
                if (sessionRef.current || isOnline()) {
                  stopReconnecting(true);
                  return;
                }
                setActiveTab('gallery');
              }}
              className="pointer-events-auto flex items-center gap-2 px-4.5 py-2 bg-stone-900/80 hover:bg-stone-900 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-900/80 rounded-xl text-sm font-mono transition-all shadow-md cursor-pointer"
              title="Leave active match and unlock tabs"
            >
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Leave Match</span>
            </button>
            {(gamePhase === 'setup' || gamePhase === 'playing') && !winner && (
              <button
                data-input-always
                onClick={askConcede}
                className="pointer-events-auto ml-2 flex items-center gap-2 px-4 py-2 bg-stone-900/80 hover:bg-stone-900 text-stone-400 hover:text-amber-300 border border-stone-800 hover:border-amber-900/80 rounded-xl text-sm font-mono transition-all shadow-md cursor-pointer"
                title="Give up the match: your opponent wins"
              >
                <span>Concede</span>
              </button>
            )}
            </div>
          </div>

          {/* Battlefield and Hand UI Area */}
          <div 
            className="flex-1 min-h-0 w-full relative pointer-events-auto overflow-visible"
          >
            {/* Battlefield Arena Main Viewport with Flanking Graveyards AND Visual Deck Piles */}
           <div className="w-full h-full flex items-start justify-between px-6 pt-2 z-10 relative">
              {/* Left Flank: the other player's Deck & Graveyard on top, this view's own (the player whose hand is shown) just
                  above the hand, far enough up to stay clear of it */}
              <div className="z-20 self-stretch flex flex-col items-start justify-between py-1 pl-1 pointer-events-none shrink-0">
                {/* The other player's Deck & Graveyard (Top Left) */}
                <div className="flex flex-row items-start gap-3 pointer-events-auto">
                  <DeckPile
                    title={`${hiddenHandPlayer === 'player1' ? 'Player 1' : 'Player 2'} Deck`}
                    count={(hiddenHandPlayer === 'player1' ? player1Deck : player2Deck).length}
                    owner="opponent"
                  />

                  <GraveyardZone
                    title={`${hiddenHandPlayer === 'player1' ? 'Player 1' : 'Player 2'} Graveyard`}
                    owner="opponent"
                    cards={hiddenHandPlayer === 'player1' ? player1Graveyard : player2Graveyard}
                    customArtMap={customArtMap}
                    onHoverCard={setHoveredCard}
                  />
                </div>

                {/* This view's own Deck & Graveyard (Bottom Left, above the hand dock) */}
                <div className="flex flex-row items-start gap-3 mb-64 pointer-events-auto">
                  <DeckPile
                    title={`${shownHandPlayer === 'player1' ? 'Player 1' : 'Player 2'} Deck`}
                    count={(shownHandPlayer === 'player1' ? player1Deck : player2Deck).length}
                    owner="player"
                  />

                  <GraveyardZone
                    title={`${shownHandPlayer === 'player1' ? 'Player 1' : 'Player 2'} Graveyard`}
                    owner="player"
                    cards={shownHandPlayer === 'player1' ? player1Graveyard : player2Graveyard}
                    customArtMap={customArtMap}
                    onHoverCard={setHoveredCard}
                  />
                </div>
              </div>

              {/* Center: 8x6 Hexagonal Grid Arena justified to left under the top bar with padding space */}
              <div 
                className="flex-1 flex flex-col items-start justify-start overflow-visible pl-4 sm:pl-8 relative"
                style={{
                  perspective: '1400px',
                  perspectiveOrigin: '40% 30%'
                }}
              >
                {/* The other player's hand: how many cards, as card backs (their cards stay hidden) */}
                <div className="absolute top-0 left-4 flex items-center gap-2 select-none pointer-events-none z-30">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-xs border ${
                      hiddenHandPlayer === 'player2'
                        ? 'text-rose-300 bg-rose-950/80 border-rose-500/40'
                        : 'text-sky-300 bg-sky-950/80 border-sky-500/40'
                    }`}
                  >
                    {hiddenHandPlayer === 'player1' ? 'P1' : 'P2'} Hand ({hiddenHandCount})
                  </span>
                  <div className="flex -space-x-3" aria-hidden>
                    {Array.from({ length: Math.min(hiddenHandCount, 10) }, (_, i) => (
                      <div
                        key={i}
                        className="w-5 h-7 rounded-[3px] border border-stone-500/70 bg-gradient-to-br from-stone-800 to-stone-950 shadow flex items-center justify-center"
                      >
                        <span className="text-[5px] font-black text-stone-400 [writing-mode:vertical-rl]">EVIL</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Multi-Stage Targeting Banner Above Arena */}
                {multiStageState && multiStageTargetInfo && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-amber-950/95 border-2 border-amber-400 text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-xl select-none animate-in fade-in slide-in-from-top-2">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="flex flex-col text-xs min-w-0">
                      <span className="font-mono font-bold text-amber-300 truncate">
                        {multiStageState.ability.name}{' '}
                        {getMultiTargetSpec(multiStageState.ability)
                          ? `(${multiStageState.targets.length} selected)`
                          : `(Stage ${multiStageState.stage})`}
                      </span>
                      <span className="text-[11px] text-amber-100 font-sans leading-tight">
                        {multiStageTargetInfo.promptMessage}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      {multiStageTargetInfo.isOptional && (
                        <button
                          onClick={handleFinishMultiStage}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase cursor-pointer shadow-xs transition-colors"
                        >
                          {multiStageTargetInfo.finishButtonLabel || 'Finish'}
                        </button>
                      )}
                      <button
                        onClick={handleCancelMultiStage}
                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase cursor-pointer border border-stone-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Floating Move-Through (Rabble Rouse) Banner Above Arena */}
                {pendingRabbleMove && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-emerald-950/95 border-2 border-emerald-400 text-emerald-100 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-xl select-none animate-in fade-in slide-in-from-top-2">
                    <span className="text-xl shrink-0">🏃</span>
                    <div className="flex flex-col text-xs min-w-0">
                      <span className="font-mono font-bold text-emerald-300 truncate">{pendingRabbleMove.passiveName}</span>
                      <span className="text-[11px] font-sans leading-tight">
                        {pendingRabbleMove.mustMove
                          ? `Passing through ${pendingRabbleMove.throughHex}: click a highlighted empty tile to land on.`
                          : `Move 1 more tile in any direction (click a highlighted tile)? ${rabbleSecondsLeft}s`}
                      </span>
                    </div>
                    {!pendingRabbleMove.mustMove && (
                      <button
                        onClick={() => handleDeclineRabbleMove('skip')}
                        className="ml-auto px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase cursor-pointer border border-stone-600 transition-colors shrink-0"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}

                {/* Floating Momentum Charge Banner Above Arena */}
                {pendingMomentumCharge && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-amber-950/95 border-2 border-amber-400 text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-xl select-none animate-in fade-in slide-in-from-top-2">
                    <span className="text-xl shrink-0">⚡</span>
                    <div className="flex flex-col text-xs min-w-0">
                      <span className="font-mono font-bold text-amber-300 truncate">
                        Momentum Charge ({pendingMomentumCharge.unit.card.name})
                      </span>
                      <span className="text-[11px] text-amber-100 font-sans leading-tight">
                        You may move an additional tile in the same direction to <span className="font-black text-amber-300">{pendingMomentumCharge.nextHex}</span> for free!
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      <button
                        onClick={() => handleExecuteMomentumCharge()}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase cursor-pointer shadow-xs transition-colors"
                      >
                        Charge ({pendingMomentumCharge.nextHex})
                      </button>
                      <button
                        onClick={handleDeclineMomentumCharge}
                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase cursor-pointer border border-stone-600 transition-colors"
                      >
                        Stay Here
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera pan: the whole battlefield shifts opposite to the camera (no transition, so holding a d-pad
                    arrow moves it smoothly) */}
                {/* (both layers ignore the mouse: the board tilts away, so its far rows sit behind these layers' flat
                    planes, and the layers would otherwise catch every hover and click meant for units and tiles there.
                    The board turns the mouse back on for its own content.) */}
                <div
                  className="w-full pointer-events-none"
                  style={{ transformStyle: 'preserve-3d', transform: `translate(${-cameraPan.x}px, ${-cameraPan.y}px)` }}
                >
                <div
                  className="w-full flex items-start justify-start transition-transform duration-700 ease-in-out -mt-16 pointer-events-none"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${boardPitch}deg) rotateZ(${boardYaw}deg) scale(${((boardZoom / 100)* 0.6).toFixed(2)})`
                  }}
                >
                  <HexGridArena
                    hexColors={hexColors}
                    selectedHex={selectedHex}
                    onHexClick={handleHexClick}
                    unitsOnBoard={unitsOnBoard}
                    activeTurnUnitHex={abilityReinforcePending ? null : activeTurnUnitHex}
                    validMoveHexes={validMoveHexes}
                    validAttackHexes={
                      providerChain?.targetInstanceId && activeAbility?.inProviderChain
                        ? validAttackHexes.filter((h) => unitsOnBoard[h]?.instanceId === providerChain.targetInstanceId)
                        : validAttackHexes
                    }
                    pendingTargetHexes={
                      multiStageState ? multiStageState.targets : []
                    }
                    abilityRangeHexes={activeAbility ? abilityRangeHexes : previewRangeHexes}
                    isStraightLineAbility={isStraightLineAbility(activeAbility) || activeAbility?.id === 'reckless_leap'}
                    customArtMap={customArtMap}
                    selectedHandCard={selectedHandIndex !== null ? activeHand[selectedHandIndex] : null}
                    activePlayer={activePlayer}
                    validPromoteHexes={validPromoteHexes}
                    validFusionHexes={validFusionHexes}
                    fusionSelectedHexes={fusionSelectedHexes}
                    validTributeHexes={validTributeHexes}
                    tributeSacrificeHexes={tributeSacrificeHexes}
                    onUseAbility={handleAbilityClick}
                    onUniversalDrawClick={handleUniversalDraw}
                    canUniversalDraw={!isUnitMindless(activeTurnUnit) && !activeTurnUnit?.usedUniversalDrawThisTurn && activeDeck.length > 0}
                    boardPitch={boardPitch}
                    boardYaw={boardYaw}
                    gamePhase={gamePhase}
                    isMovingMode={isMovingMode}
                    onHoverUnitCard={(card, owner) => {
                      setHoveredStandeeCard(card);
                      setHoveredBoardUnit(card && owner ? { card, owner } : null);
                    }}
                    momentumChargeHex={pendingMomentumCharge?.nextHex || pendingRabbleMove?.throughHex}
                    assistDeployHexes={assistDeployHexes}
                    scorchedTiles={scorchedTiles}
                    sealedReinforceHexes={Array.from(sealedReinforceHexes)}
                  />
                </div>
                </div>
              </div>

              {/* Right Flank: Standee & Hand hover card preview */}
              <div className="z-20 flex flex-col items-center justify-start self-start pt-1 pr-2 pointer-events-none w-64 sm:w-72 md:w-80 h-[340px] sm:h-[380px] bg-transparent border-0 shadow-none outline-none">
                {previewStandee ? (
                  <StandeePreview
                    card={previewStandee.card}
                    owner={previewStandee.owner}
                    customArtUrl={customArtMap[previewStandee.card.id]}
                  />
                ) : (
                  hoveredCard &&
                  (hoveredBoardUnit && hoveredBoardUnit.card === hoveredCard && hoveredBoardUnit.owner !== (localPlayer ?? activePlayer) ? (
                    // An enemy unit: the same preview, outlined in red
                    <div className="relative inline-flex rounded-2xl ring-[3px] ring-red-600 shadow-[0_0_28px_rgba(220,38,38,0.55)]">
                      <CardPreview card={hoveredCard} customArtUrl={customArtMap[hoveredCard.id]} />
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-700 text-red-50 text-[10px] font-mono font-bold uppercase tracking-widest shadow">
                        Enemy
                      </span>
                    </div>
                  ) : (
                    <CardPreview card={hoveredCard} customArtUrl={customArtMap[hoveredCard.id]} />
                  ))
                )}
              </div>
            </div>

            {/* Bottom: Active Player's Hand dock bar with action menu on right; cards spill over the top */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-6 flex flex-col items-start justify-end pointer-events-none pb-2 overflow-visible">
              {/* Pregame Reinforcement Phase Controls directly above the hand */}
              {gamePhase === 'setup' && (
                <div className="absolute right-4 bottom-2.5 z-40 flex flex-col items-end gap-1.5 pointer-events-auto">
                  {/* Board Zoom & Rotate Controls above setup panel */}
                  {/* Two joined boxes, shrink-wrapped: the taller d-pad box, and beside it the label over the other controls.
                      They hide and show together (only the label and its arrow stay). */}
                  {/* The match log's button: left of the camera arrow while the controls are hidden, above them when shown */}
                  <div className={isCameraOpen ? 'flex flex-col items-end gap-1.5' : 'flex items-end gap-1.5'}>
                  {logControl}
                  <div data-input-always className="w-fit flex items-end drop-shadow-xl">
                  {isCameraOpen && (
                    <div className="bg-stone-900/90 border border-stone-800 rounded-l-xl rounded-tr-xl p-1 backdrop-blur-md">
                      {/* Camera pan d-pad (hold an arrow) */}
                      <CameraPanPad onPan={panCamera} />
                    </div>
                  )}
                  <div
                    className={`flex flex-col items-start gap-1 bg-stone-900/90 border border-stone-800 p-1 backdrop-blur-md ${
                      isCameraOpen ? '-ml-px rounded-r-xl' : 'rounded-xl'
                    }`}
                  >
                  {/* "Camera Controls:" and the arrow that hides or shows them */}
                  <div className="flex items-center gap-1.5 pl-1 pr-1 pt-0.5">
                    {isCameraOpen && (
                    <>
                    <span className="text-[11px] font-mono font-bold text-stone-300 drop-shadow">Camera Controls:</span>
                    {/* Cycle the battlefield background (default, each set's, none) */}
                    <button
                      onClick={() => cycleBoardBackground(-1)}
                      title={`Previous background (now: ${boardBackgroundName})`}
                      className="px-1.5 py-0.5 rounded-md bg-stone-900/90 border border-stone-800 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => cycleBoardBackground(1)}
                      title={`Next background (now: ${boardBackgroundName})`}
                      className="px-1.5 py-0.5 rounded-md bg-stone-900/90 border border-stone-800 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    </>
                    )}
                    <button
                      onClick={() => setIsCameraOpen((open) => !open)}
                      title={isCameraOpen ? 'Hide the camera controls' : 'Show the camera controls'}
                      className="px-1.5 py-0.5 rounded-md bg-stone-900/90 border border-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
                    >
                      {isCameraOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {isCameraOpen && (
                  <div className="flex items-end gap-1.5">
                    {/* Rotation Controls */}
                    <div className="flex items-center bg-stone-950/80 border border-stone-800 rounded-lg p-0.5 shadow-xs">
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardYawState((prev) => (prev - 45 + 360) % 360);
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Rotate Board Left 45°"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-stone-300 px-1.5 font-bold select-none min-w-[36px] text-center">
                        {boardYaw}°
                      </span>
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardYawState((prev) => (prev + 45) % 360);
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Rotate Board Right 45°"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center bg-stone-950/80 border border-stone-800 rounded-lg p-0.5 shadow-xs">
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardZoom((prev) => Math.min(200, Math.round(prev + 10)));
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Zoom In Board"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-stone-300 px-1.5 font-bold select-none min-w-[40px] text-center">
                        {boardZoom}%
                      </span>
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardZoom((prev) => Math.max(20, Math.round(prev - 10)));
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Zoom Out Board"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Reset to Original Perspective & Zoom button */}
                    {/* Always takes its space (hidden until the camera has moved), so the controls never shift under the cursor */}
                    <button
                      onClick={resetToOriginalPerspective}
                      disabled={!isRotated}
                      aria-hidden={!isRotated}
                      className={`flex items-center gap-1 px-2.5 py-1 bg-red-950 border border-red-700/80 hover:bg-red-900 text-red-400 text-xs font-mono font-bold rounded-lg shadow-xs cursor-pointer ${
                        isRotated ? '' : 'invisible'
                      }`}
                      title="Reset board to default perspective and zoom"
                    >
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <span>Reset</span>
                    </button>
                  </div>
                  )}
                  </div>
                  </div>
                  </div>

                  <div className="w-80 sm:w-96 md:w-[420px] bg-stone-900/95 border border-stone-700/80 rounded-xl shadow-xl p-3 backdrop-blur-md flex flex-col gap-2 select-none animate-in fade-in">
                    <div className="flex items-center justify-between gap-1">
                      <div
                        className={`self-start px-3 py-1 rounded-full text-[11px] font-mono font-black uppercase tracking-wider border shadow-md ${
                          activePlayer === 'player1'
                            ? 'bg-sky-950 border-sky-400 text-sky-200'
                            : 'bg-rose-950 border-rose-500 text-rose-200'
                        }`}
                      >
                        {activePlayer === 'player1' ? "Player 1's Setup Turn" : "Player 2's Setup Turn"}
                      </div>
                      {/* Indicator throughout reinforcement phase */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        <span>Reinforce Phase</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400 leading-snug">
                      Reinforce 1 unit to {activePlayer === 'player1' ? 'Row 1' : 'Row 6'}, Cycle, or Start Game
                    </span>
                    <button
                      onClick={() => setIsCycleModalOpen(true)}
                      disabled={activePlayer === 'player1' ? p1HasCycled : p2HasCycled}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        !(activePlayer === 'player1' ? p1HasCycled : p2HasCycled)
                          ? 'bg-stone-800 hover:bg-sky-950 text-sky-300 border-sky-600/60 hover:border-sky-400 shadow-sm'
                          : 'opacity-40 cursor-not-allowed bg-stone-900 border-stone-800 text-stone-500'
                      }`}
                      title="Put chosen cards on bottom of deck, draw that many (Rule 5.2, once per game)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Cycle Cards {(activePlayer === 'player1' ? p1HasCycled : p2HasCycled) ? '(Used)' : ''}</span>
                    </button>
                    <button
                      onClick={handleSetupStartClick}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-serif font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                        setupConsecutiveStarts === 1
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 ring-2 ring-emerald-300 animate-pulse'
                          : 'bg-amber-500 hover:bg-amber-400 text-stone-950 ring-1 ring-amber-300'
                      }`}
                      title={
                        setupConsecutiveStarts === 1
                          ? "Agree to start! (Both players chose Start in a row -> Game Begins!)"
                          : "Choose to Start the game"
                      }
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{setupConsecutiveStarts === 1 ? "Agree to Start" : "Start Game"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Menu (after reinforcement phase) placed in bottom right */}
              {gamePhase === 'playing' && (
                <div className="absolute right-4 bottom-2.5 z-40 flex flex-col items-end gap-1.5 pointer-events-auto">
                  {/* Board Zoom & Rotate Controls directly above the action panel */}
                  {/* Two joined boxes, shrink-wrapped: the taller d-pad box, and beside it the label over the other controls.
                      They hide and show together (only the label and its arrow stay). */}
                  {/* The match log's button: left of the camera arrow while the controls are hidden, above them when shown */}
                  <div className={isCameraOpen ? 'flex flex-col items-end gap-1.5' : 'flex items-end gap-1.5'}>
                  {logControl}
                  <div data-input-always className="w-fit flex items-end drop-shadow-xl">
                  {isCameraOpen && (
                    <div className="bg-stone-900/90 border border-stone-800 rounded-l-xl rounded-tr-xl p-1 backdrop-blur-md">
                      {/* Camera pan d-pad (hold an arrow) */}
                      <CameraPanPad onPan={panCamera} />
                    </div>
                  )}
                  <div
                    className={`flex flex-col items-start gap-1 bg-stone-900/90 border border-stone-800 p-1 backdrop-blur-md ${
                      isCameraOpen ? '-ml-px rounded-r-xl' : 'rounded-xl'
                    }`}
                  >
                  {/* "Camera Controls:" and the arrow that hides or shows them */}
                  <div className="flex items-center gap-1.5 pl-1 pr-1 pt-0.5">
                    {isCameraOpen && (
                    <>
                    <span className="text-[11px] font-mono font-bold text-stone-300 drop-shadow">Camera Controls:</span>
                    {/* Cycle the battlefield background (default, each set's, none) */}
                    <button
                      onClick={() => cycleBoardBackground(-1)}
                      title={`Previous background (now: ${boardBackgroundName})`}
                      className="px-1.5 py-0.5 rounded-md bg-stone-900/90 border border-stone-800 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => cycleBoardBackground(1)}
                      title={`Next background (now: ${boardBackgroundName})`}
                      className="px-1.5 py-0.5 rounded-md bg-stone-900/90 border border-stone-800 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    </>
                    )}
                    <button
                      onClick={() => setIsCameraOpen((open) => !open)}
                      title={isCameraOpen ? 'Hide the camera controls' : 'Show the camera controls'}
                      className="px-1.5 py-0.5 rounded-md bg-stone-900/90 border border-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
                    >
                      {isCameraOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {isCameraOpen && (
                  <div className="flex items-end gap-1.5">
                    {/* Rotation Controls */}
                    <div className="flex items-center bg-stone-950/80 border border-stone-800 rounded-lg p-0.5 shadow-xs">
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardYawState((prev) => (prev - 45 + 360) % 360);
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Rotate Board Left 45°"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-stone-300 px-1.5 font-bold select-none min-w-[36px] text-center">
                        {boardYaw}°
                      </span>
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardYawState((prev) => (prev + 45) % 360);
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Rotate Board Right 45°"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center bg-stone-950/80 border border-stone-800 rounded-lg p-0.5 shadow-xs">
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardZoom((prev) => Math.min(200, Math.round(prev + 10)));
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Zoom In Board"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-stone-300 px-1.5 font-bold select-none min-w-[40px] text-center">
                        {boardZoom}%
                      </span>
                      <button
                        onClick={() => {
                          markCameraChange();
                          setBoardZoom((prev) => Math.max(20, Math.round(prev - 10)));
                        }}
                        className="p-1.5 hover:bg-stone-800 rounded-md text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Zoom Out Board"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Reset to Original Perspective & Zoom button */}
                    {/* Always takes its space (hidden until the camera has moved), so the controls never shift under the cursor */}
                    <button
                      onClick={resetToOriginalPerspective}
                      disabled={!isRotated}
                      aria-hidden={!isRotated}
                      className={`flex items-center gap-1 px-2.5 py-1 bg-red-950 border border-red-700/80 hover:bg-red-900 text-red-400 text-xs font-mono font-bold rounded-lg shadow-xs cursor-pointer ${
                        isRotated ? '' : 'invisible'
                      }`}
                      title="Reset board to default perspective and zoom"
                    >
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <span>Reset</span>
                    </button>
                  </div>
                  )}
                  </div>
                  </div>
                  </div>

                  <TurnActionPanel
                    onHoverAbility={setHoveredActionAbility}
                    activePlayer={activePlayer}
                    activeTurnUnit={activeTurnUnit}
                    onUniversalMoveClick={handleUniversalMoveClick}
                    isMovingMode={isMovingMode}
                    onUniversalDrawClick={handleUniversalDraw}
                    canUniversalDraw={!isUnitMindless(activeTurnUnit) && !activeTurnUnit?.usedUniversalDrawThisTurn && activeDeck.length > 0}
                    onAbilityClick={handleAbilityClick}
                    activeAbility={activeAbility}
                    onPromotedAbilitySelect={handlePromotedAbilitySelect}
                    onPassTurn={() => switchTurn(true)}
                    passCount={consecutivePasses}
                    onAssistClick={handleAssistButtonClick}
                    isAssistLocked={!!lockedAssist}
                    pendingAssistDeployment={pendingAssistDeployment}
                    lockedAssistCard={lockedAssist?.card}
                    onCancelAssist={handleCancelAssist}
                    multiStageState={multiStageState}
                    multiStageTargetInfo={multiStageTargetInfo}
                    onFinishMultiStage={handleFinishMultiStage}
                    onCancelMultiStage={handleCancelMultiStage}
                    onHoverCard={setHoveredCard}
                    unitsOnBoard={unitsOnBoard}
                    onCancelPrepaidAbility={() => {
                      if (providerChain) {
                        endProviderChain(`Cancelled ${providerChain.parent.name}: remaining uses are lost (its AP was already spent).`, false);
                        return;
                      }
                      showNotification(`Cancelled ${activeAbility?.name || 'ability'} (its AP was already spent).`);
                      setActiveAbility(null);
                      if (activeTurnUnit && activeTurnUnit.currentAp <= 0) switchTurn(false);
                    }}
                    providerChainInfo={
                      providerChain
                        ? {
                            label:
                              providerChain.phase === 'choosing'
                                ? `Chosen ${providerChain.queue.length}/${providerChain.spec.uses}${
                                    providerChain.queue.length > 0 ? `: ${providerChain.queue.map((a) => a.name).join(', ')}` : ''
                                  }${providerChain.spec.upTo ? ' (choose up to, then Done)' : ''}`
                                : `Using ${providerChain.used.length}/${
                                    providerChain.spec.chooseFirst
                                      ? providerChain.used.length + providerChain.queue.length
                                      : providerChain.spec.uses
                                  }${providerChain.targetName ? ` vs ${providerChain.targetName}` : ''}${
                                    providerChain.spec.distinct ? ' (different abilities)' : ''
                                  }`,
                            candidateIds: getChainCandidates(providerChain, getChainQualifying(providerChain.parent)).map(
                              (c) => c.ability.id
                            ),
                            canFinishChoosing:
                              providerChain.spec.upTo &&
                              (providerChain.phase === 'choosing'
                                ? providerChain.queue.length > 0
                                : providerChain.used.length > 0 && !activeAbility?.inProviderChain)
                          }
                        : null
                    }
                    onFinishChainChoosing={handleFinishChainChoosing}
                  />
                </div>
              )}

              {/* Overlapping interactive cards scaled larger and spilling over the top of the dock container */}
              <div className="flex items-end justify-start -space-x-8 sm:-space-x-10 md:-space-x-12 lg:-space-x-14 max-w-[calc(100%-19.5rem)] w-full pl-1 sm:pl-2 overflow-visible pb-1 relative z-20 pointer-events-none">
                {shownHand.map((card, idx) => {
                  // (online, while waiting, this is this screen's own hand: clicks on it are blocked until its turn)
                  const isSelectedForDeploy = selectedHandIndex === idx && shownHandPlayer === activePlayer;

                  return (
                    <div
                      key={`hand-card-${card.id}-${idx}`}
                      onMouseEnter={() => {
                        setPreviewStandee({ card, owner: shownHandPlayer });
                      }}
                      onMouseLeave={() => {
                        setPreviewStandee(null);
                      }}
                      onClick={() => {
                        if (lockedAssist || pendingAssistDeployment) {
                          showNotification("Locked in to Assist deployment/action: Select target/placement or click Cancel Assist.");
                          return;
                        }
                        if (abilityReinforcePending) {
                          showNotification(`${abilityReinforcePending.sourceTitle}: Reinforce ${abilityReinforcePending.card.name} or click Skip first.`);
                          return;
                        }
                        if (activeTurnUnitHex) {
                          showNotification("Cannot reinforce while a unit is taking a turn. Finish or pass turn first.");
                          return;
                        }
                        const isP1 = activePlayer === 'player1';
                        const isBasic = card.basic !== false && (card.basic || card.reinforce?.mode === 'basic' || !card.reinforce);
                        // If an unoccupied back row tile is already selected and this is a basic card, reinforce onto it immediately!
                        if (
                          isBasic &&
                          selectedHex &&
                          (isP1 ? selectedHex.endsWith('1') : selectedHex.endsWith('6')) &&
                          !unitsOnBoard[selectedHex]
                        ) {
                          handleDeployCardToHex(selectedHex, idx);
                          return;
                        }
                        const isSelecting = selectedHandIndex !== idx;
                        setSelectedHandIndex((prev) => (prev === idx ? null : idx));
                        setActiveTurnUnitHex(null);
                        setDraggedUnitHex(null);
                        setActiveAbility(null);
                        setTributeSacrificeHexes([]);
                        setFusionSelectedHexes([]);

                        // Selecting a tribute unit from hand prompts to sacrifice required basic units (3 for Simian Sovereign, 2 for others)
                        if (isSelecting && card.reinforce?.mode === 'tribute') {
                          const reqCount = card.reinforce?.count || 2;
                          const friendlyBasicCount = Object.entries(unitsOnBoard).filter(([hexId, u]) => {
                            if (u.owner !== activePlayer || u.card.isWall) return false;
                            const isB = u.card.basic !== false && (u.card.basic || u.card.reinforce?.mode === 'basic' || !u.card.reinforce);
                            if (!isB) return false;
                            const rowNum = parseInt(hexId.slice(1), 10);
                            return isP1 ? (rowNum >= 1 && rowNum <= 3) : (rowNum >= 4 && rowNum <= 6);
                          }).length;

                          if (friendlyBasicCount < reqCount) {
                            showNotification(
                              `Cannot reinforce ${card.name}: You must control at least ${reqCount} friendly Basic units on your side of the board (${isP1 ? 'Rows 1-3' : 'Rows 4-6'}) to sacrifice to your Graveyard.`
                            );
                          } else {
                            showNotification(
                              `Prompt: Select ${reqCount} basic units from your side of the board (${isP1 ? 'Rows 1-3' : 'Rows 4-6'}) to sacrifice to your Graveyard to reinforce ${card.name}.`
                            );
                          }
                        }

                        // Selecting a fusion unit from hand prompts to select fusion materials if more than one possible set
                        if (isSelecting && card.reinforce?.mode === 'fusion') {
                          const fCheck = checkFusionMaterials(card, unitsOnBoard, activePlayer);
                          const requiredFusionCount = card.reinforce?.count || (Array.isArray(card.reinforce?.requirement) ? card.reinforce.requirement.length : 2);
                          if (!fCheck.canFuse) {
                            showNotification(
                              fCheck.reason || `Cannot fuse ${card.name}: You must control (${fCheck.requiredMaterials.join(' + ')}) in play on your side.`
                            );
                          } else if (fCheck.validCombinations.length > 1) {
                            showNotification(
                              `Prompt: Multiple material combinations available. Decide which ${requiredFusionCount} units (${fCheck.requiredMaterials.join(' + ')}) to fuse: Click your chosen units on the board.`
                            );
                          } else {
                            showNotification(
                              `Click one of your valid fusion material units (${fCheck.requiredMaterials.join(', ')}) to summon ${card.name}.`
                            );
                          }
                        }
                      }}
                      // While targeting or moving, the hand lets clicks through to the board under it (your back row
                      // sits behind the hand on screen, and a hand-card click there would try to reinforce)
                      className={`w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 aspect-[5/7] transition-all duration-200 transform cursor-pointer drop-shadow-2xl rounded-xl overflow-hidden border-2 bg-stone-950 select-none ${
                        !abilityReinforcePending &&
                        (activeAbility || multiStageState || isMovingMode || pendingFreeMove || pendingRabbleMove)
                          ? 'pointer-events-none'
                          : 'pointer-events-auto'
                      } ${
                        activeTurnUnitHex && !(abilityReinforcePending && isSelectedForDeploy)
                          ? 'opacity-40 grayscale-30 border-stone-800 cursor-not-allowed'
                          : isSelectedForDeploy
                          ? '-translate-y-8 scale-110 z-40 border-sky-400 ring-4 ring-sky-400/50 shadow-sky-500/30 shadow-2xl'
                          : 'hover:-translate-y-6 hover:scale-105 hover:z-30 border-stone-800 hover:border-sky-400 z-10'
                      }`}
                      style={{
                        transformOrigin: 'bottom center'
                      }}
                      title={
                        activeTurnUnitHex
                          ? "Reinforce is disallowed while a unit is taking a turn"
                          : `${card.name} (${card.hp} HP / ${card.ap} AP) - Click to select, then click back row tile to reinforce`
                      }
                    >
                      {cardImages[card.id] ? (
                        <div className="w-full h-full relative rounded-lg overflow-hidden bg-black flex items-center justify-center select-none shadow-md">
                          <img
                            src={cardImages[card.id]}
                            alt={card.name}
                            className="w-full h-full object-contain pointer-events-none select-none"
                            style={{
                              imageRendering: 'auto',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'translateZ(0)'
                            }}
                          />
                        </div>
                      ) : (
                        <CardThumbnail card={card} customArtUrl={customArtMap[card.id]} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
