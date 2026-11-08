import React, { useMemo, useRef, useState } from 'react';
import { CardItem, CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { BattlefieldCardStandee } from './BattlefieldCardStandee';
import { getSurroundingHexes, isTileScorched } from '../utils/hexGridMath';
import { hasColdFeetEffect } from '../utils/turnRestrictions';
import { hasNoxiousBurstEffect } from '../utils/noxiousBurst';
import { isFlowingStanceActive, hasCephalopodReach } from '../utils/flowingStance';
import { getLeaderOfTheBunchBonusHp } from '../utils/leaderOfTheBunch';
import { hasMagicalOmnipresence } from '../utils/movementAbilities';

interface HexGridArenaProps {
  hexColors: Record<string, string>;
  selectedHex?: string | null;
  onHexClick?: (hexId: string) => void;
  unitsOnBoard: Record<string, BattlefieldUnit>;
  activeTurnUnitHex?: string | null;
  validMoveHexes?: string[];
  validAttackHexes?: string[];
  pendingTargetHexes?: string[];
  abilityRangeHexes?: string[];
  isStraightLineAbility?: boolean;
  validPromoteHexes?: string[];
  validFusionHexes?: string[];
  fusionSelectedHexes?: string[];
  validTributeHexes?: string[];
  tributeSacrificeHexes?: string[];
  customArtMap: Record<string, string>;
  selectedHandCard: CardItem | null;
  activePlayer: PlayerId;
  onUseAbility?: (ability: CardAbility) => void;
  onUniversalDrawClick?: () => void;
  canUniversalDraw?: boolean;
  boardPitch?: number;
  boardYaw?: number;
  gamePhase?: 'setup' | 'playing' | 'ended';
  isMovingMode?: boolean;
  // (owner: whose unit it is, so the preview can mark an enemy's)
  onHoverUnitCard?: (card: CardItem | null, owner?: PlayerId) => void;
  momentumChargeHex?: string | null;
  assistDeployHexes?: string[];
  scorchedTiles?: Record<string, { expiresOnTurnEndFor?: string; casterPlayer?: string }>;
  sealedReinforceHexes?: string[]; // tiles the active player can't Reinforce onto (e.g. enemy Sealed Gate)
}

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // 8 columns (A-H)
const ROWS = [6, 5, 4, 3, 2, 1]; // 6 rows (1-6)

const EARTHY_OUTLINE = '#8e7960'; // Warm stone/ochre earthy stroke

export const HexGridArena: React.FC<HexGridArenaProps> = ({
  hexColors,
  selectedHex,
  onHexClick,
  unitsOnBoard,
  activeTurnUnitHex,
  validMoveHexes = [],
  validAttackHexes = [],
  pendingTargetHexes = [],
  abilityRangeHexes = [],
  isStraightLineAbility = false,
  validPromoteHexes = [],
  validFusionHexes = [],
  fusionSelectedHexes = [],
  validTributeHexes = [],
  tributeSacrificeHexes = [],
  customArtMap,
  selectedHandCard,
  activePlayer,
  onUseAbility,
  onUniversalDrawClick,
  canUniversalDraw = false,
  boardPitch = 35,
  boardYaw = 0,
  gamePhase = 'playing',
  isMovingMode = false,
  onHoverUnitCard,
  momentumChargeHex,
  assistDeployHexes = [],
  scorchedTiles,
  sealedReinforceHexes = []
}) => {

  // Dimensions
  const H = 92;
  const W = 106.23;
  const colSpacing = W * 0.75;
  const rowSpacing = H;

  const marginX = 35;
  const marginY = 45;
  const totalWidth = 7 * colSpacing + W + marginX * 2;
  const totalHeight = 5 * rowSpacing + H + H / 2 + marginY * 2;

  // Precalculate all 48 hexes across all 8 columns and 6 rows
  const hexCells = useMemo(() => {
    const cells = [];

    for (let colIdx = 0; colIdx < COLUMNS.length; colIdx++) {
      const colLetter = COLUMNS[colIdx];
      const isShiftedDown = colIdx % 2 === 1;

      for (let rowIdx = 0; rowIdx < ROWS.length; rowIdx++) {
        const rowNum = ROWS[rowIdx];
        const hexId = `${colLetter}${rowNum}`;

        const cx = marginX + W / 2 + colIdx * colSpacing;
        const cy = marginY + H / 2 + rowIdx * rowSpacing + (isShiftedDown ? H / 2 : 0);

        const points = [
          `${cx - W / 4},${cy - H / 2}`,
          `${cx + W / 4},${cy - H / 2}`,
          `${cx + W / 2},${cy}`,
          `${cx + W / 4},${cy + H / 2}`,
          `${cx - W / 4},${cy + H / 2}`,
          `${cx - W / 2},${cy}`
        ].join(' ');

        cells.push({
          id: hexId,
          colLetter,
          rowNum,
          cx,
          cy,
          points,
          color: hexColors[hexId] || '#332b24',
          isRow1: rowNum === 1,
          isRow6: rowNum === 6
        });
      }
    }

    return cells;
  }, [hexColors, colSpacing, rowSpacing, H, W]);

  const cellsById = useMemo(() => {
    const map = new Map<string, typeof hexCells[0]>();
    hexCells.forEach((c) => map.set(c.id, c));
    return map;
  }, [hexCells]);

  // Camera depth calculation for standees:
  // In isometric view with rotateX(boardPitch) and rotateZ(boardYaw),
  // projecting (cx, cy) onto the rotated viewing axis gives distance from camera.
  // Smaller depth = farther from camera (rendered first in DOM).
  // Larger depth = closer to camera (rendered last in DOM, so closest is drawn on top!).
  const getCameraDepth = useMemo(() => {
    const centerX = totalWidth / 2;
    const centerY = totalHeight / 2;
    const yawRad = (boardYaw * Math.PI) / 180;
    return (hexId: string) => {
      const cell = cellsById.get(hexId);
      if (!cell) return 0;
      const dx = cell.cx - centerX;
      const dy = cell.cy - centerY;
      return dx * Math.sin(yawRad) + dy * Math.cos(yawRad);
    };
  }, [cellsById, boardYaw, totalWidth, totalHeight]);

  // Standees sorted by distance from camera:
  // Farthest standees first, closest standees on top so their damage, armour, and badges are always visible!
  const sortedUnits = useMemo(() => {
    return Object.entries(unitsOnBoard).sort(([hexA], [hexB]) => {
      const depthA = getCameraDepth(hexA);
      const depthB = getCameraDepth(hexB);
      const diff = depthA - depthB;
      if (Math.abs(diff) > 0.1) return diff;
      const cellA = cellsById.get(hexA);
      const cellB = cellsById.get(hexB);
      return (cellA?.cx || 0) - (cellB?.cx || 0);
    });
  }, [unitsOnBoard, getCameraDepth, cellsById]);

  // Click resolver: Always routes clicks to the actual hex tile under the cursor.
  // Fixes the persistent bug where clicking on or near standees clicked the wrong hex.
  // What the pointer is on: the board is tilted in 3D and the units stand up from it, and the browser's own
  // hit-testing there is unreliable (a click on a unit's figure can land on a tile behind it, and units on the far side
  // may never see the mouse). So the board asks what is drawn on top at the point and goes by that:
  //   - neighbouring units' figures overlap, so when one of the figures under the pointer is a valid target right now
  //     (e.g. the enemy behind your own unit, for a melee attack), it is that one;
  //   - otherwise the figure drawn on top means that unit, unless the tile under the pointer is an empty tile that can
  //     be acted on right now (a move, a placement, an empty-tile target), which the figure only stands in front of;
  //   - with no figure there, the tile under the pointer.
  const boardTargetAt = (x: number, y: number): { hex: string; isUnit: boolean } | null => {
    const standees: string[] = [];
    let tile: string | null = null;
    for (const el of document.elementsFromPoint(x, y)) {
      const standeeHex = el.closest?.('[data-standee-hex]')?.getAttribute('data-standee-hex');
      if (standeeHex) {
        if (!standees.includes(standeeHex)) standees.push(standeeHex);
        continue;
      }
      const id = el.getAttribute('data-hex-id') || el.closest?.('[data-hex-id]')?.getAttribute('data-hex-id');
      if (id) {
        tile = id;
        break;
      }
    }
    const targets = new Set([...validAttackHexes, ...pendingTargetHexes]);
    const target = standees.find((h) => targets.has(h));
    if (target) return { hex: target, isUnit: true };
    if (standees.length > 0) {
      const actionable = [...validMoveHexes, ...pendingTargetHexes, ...assistDeployHexes, ...validAttackHexes];
      if (tile && !standees.includes(tile) && !unitsOnBoard[tile] && actionable.includes(tile)) return { hex: tile, isUnit: false };
      return { hex: standees[0], isUnit: true };
    }
    return tile ? { hex: tile, isUnit: Boolean(unitsOnBoard[tile]) } : null;
  };
  const handleBoardClick = (e: React.MouseEvent) => {
    const t = boardTargetAt(e.clientX, e.clientY);
    if (!t) return;
    // (the tiles' and figures' own handlers would otherwise act on what the browser picked)
    e.stopPropagation();
    onHexClick?.(t.hex);
  };
  const hoveredHexRef = useRef<string | null>(null);
  const handleBoardHover = (e: React.MouseEvent) => {
    const t = boardTargetAt(e.clientX, e.clientY);
    const hex = t && unitsOnBoard[t.hex] ? t.hex : null;
    if (hex === hoveredHexRef.current) return;
    hoveredHexRef.current = hex;
    const unit = hex ? unitsOnBoard[hex] : null;
    onHoverUnitCard?.(unit ? unit.card : null, unit?.owner);
  };
  const handleBoardLeave = () => {
    if (hoveredHexRef.current === null) return;
    hoveredHexRef.current = null;
    onHoverUnitCard?.(null);
  };

  // Check if hand card is basic
  const isCardBasic = selectedHandCard ? (selectedHandCard.basic || selectedHandCard.reinforce?.mode === 'basic') : true;

  // Reinforcement phase check: only throughout setup phase or before any unit is chosen to take a turn in playing phase
  const isReinforcementPhase = gamePhase === 'setup' || (!activeTurnUnitHex && gamePhase === 'playing');

  return (
   <div className="w-full flex items-center justify-center px-2 pb-2 pt-0 relative select-none">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full max-w-6xl h-auto drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] filter overflow-visible pointer-events-auto"
        preserveAspectRatio="xMidYMid meet"
        onClickCapture={handleBoardClick}
        onMouseMove={handleBoardHover}
        onMouseLeave={handleBoardLeave}
      >
        <defs>
          <filter id="hex-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* Distinct Back Row Header Indicators on the Board */}
        {/* Row 6: Player 2 Back Row Header Badge */}
        <g className="pointer-events-none" transform={`rotate(180 ${totalWidth / 2} ${marginY - 23})`}>
          <rect
            x={marginX + 10}
            y={marginY - 34}
            width={totalWidth - (marginX * 2) - 20}
            height={22}
            rx={6}
            fill="#4c0519"
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
          />
          <text
            x={totalWidth / 2}
            y={marginY - 20}
            textAnchor="middle"
            fill="#fecdd3"
            fontSize="15"
            fontWeight="900"
            fontFamily="monospace, sans-serif"
            letterSpacing="0.2em"
          >
            ▲ PLAYER 2 BACK ROW  ▲
          </text>
        </g>

        {/* Row 1: Player 1 Back Row Footer Badge */}
        <g className="pointer-events-none">
          <rect
            x={marginX + 10}
            y={totalHeight - marginY + 12}
            width={totalWidth - (marginX * 2) - 20}
            height={22}
            rx={6}
            fill="#082f49"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.85"
          />
          <text
            x={totalWidth / 2}
            y={totalHeight - marginY + 26}
            textAnchor="middle"
            fill="#bae6fd"
            fontSize="15"
            fontWeight="900"
            fontFamily="monospace, sans-serif"
            letterSpacing="0.2em"
          >
            ▲ PLAYER 1 BACK ROW  ▲
          </text>
        </g>

        {/* LAYER 1: Base Hexagonal Polygons and Coordinates */}
        <g id="hex-base-layer">
          {hexCells.map((cell) => {
            const isSelected = selectedHex === cell.id;
            const unitOnHex = unitsOnBoard[cell.id];
            const isMoveTarget = validMoveHexes.includes(cell.id);
            const isAttackTarget = validAttackHexes.includes(cell.id);
            const isPendingTarget = pendingTargetHexes.includes(cell.id);
            const isAbilityRange = abilityRangeHexes.includes(cell.id);
            const isTileTarget = isAttackTarget && !unitOnHex;
            const isScorched = isTileScorched(cell.id, unitsOnBoard, scorchedTiles);
            const isPromoteTarget = !activeTurnUnitHex && validPromoteHexes.includes(cell.id);
            const isFusionTarget = !activeTurnUnitHex && validFusionHexes.includes(cell.id);
            const isFusionSelected = !activeTurnUnitHex && fusionSelectedHexes.includes(cell.id);
            const isTributeTarget = !activeTurnUnitHex && validTributeHexes.includes(cell.id);
            const isTributeSelected = !activeTurnUnitHex && tributeSacrificeHexes.includes(cell.id);
            const isMomentumCharge = Boolean(momentumChargeHex && cell.id === momentumChargeHex);
            const isAssistDeploy = assistDeployHexes.includes(cell.id);
            const isSealed = sealedReinforceHexes.includes(cell.id);
            // Show the seal while the player could be reinforcing
            const showSeal = isSealed && !activeTurnUnitHex && isReinforcementPhase;

            // Reinforcement phase indicator on unoccupied back row tiles (Row 1 for P1, Row 6 for P2) - only when no unit taking turn
            const isReinforceTile =
              !activeTurnUnitHex &&
              isReinforcementPhase &&
              !unitOnHex &&
              !isSealed &&
              ((activePlayer === 'player1' && cell.isRow1) || (activePlayer === 'player2' && cell.isRow6));

            // Allow reinforcing to ALL 8 tiles on player's back row (A1-H1 for P1, A6-H6 for P2) when basic card is selected in hand and no unit taking turn
            const isDeployTarget =
              !activeTurnUnitHex &&
              selectedHandCard &&
              isCardBasic &&
              !unitOnHex &&
              !isSealed &&
              ((activePlayer === 'player1' && cell.isRow1) || (activePlayer === 'player2' && cell.isRow6));

            let strokeColor = EARTHY_OUTLINE;
            let strokeWidth = 1.25;

            // Distinguish Player Back Rows with subtle color outlines
            if (cell.isRow1 && !isAttackTarget && !isMoveTarget && !isDeployTarget && !isPromoteTarget && !isFusionTarget && !isTributeTarget && !isAbilityRange && !isReinforceTile && !isAssistDeploy) {
              strokeColor = '#0284c7'; // Player 1 Row 1 cyan outline
              strokeWidth = 1.8;
            } else if (cell.isRow6 && !isAttackTarget && !isMoveTarget && !isDeployTarget && !isPromoteTarget && !isFusionTarget && !isTributeTarget && !isAbilityRange && !isReinforceTile && !isAssistDeploy) {
              strokeColor = '#e11d48'; // Player 2 Row 6 crimson outline
              strokeWidth = 1.8;
            }

            if (isAssistDeploy) {
              strokeColor = '#facc15'; // Bright yellow-gold for assist deploy tile
              strokeWidth = 4.5;
            } else if (isMomentumCharge) {
              strokeColor = '#f59e0b'; // Vibrant amber for Momentum Charge tile
              strokeWidth = 4.5;
            } else if (isTributeSelected) {
              strokeColor = '#e11d48'; // Crimson for selected tribute sacrifice
              strokeWidth = 4;
            } else if (isFusionSelected) {
              strokeColor = '#a855f7'; // Purple for selected fusion material
              strokeWidth = 4.5;
            } else if (isTributeTarget) {
              strokeColor = '#f97316'; // Orange for tribute sacrifice candidates
              strokeWidth = 3.5;
            } else if (isFusionTarget) {
              strokeColor = '#c084fc'; // Light purple for fusion material candidates
              strokeWidth = 3.5;
            } else if (isPendingTarget) {
              strokeColor = '#facc15'; // Yellow for chosen multi-targets awaiting confirm
              strokeWidth = 5;
            } else if (isAttackTarget) {
              const isFriendlyTarget = Boolean(unitOnHex && unitOnHex.owner === activePlayer);
              strokeColor = isFriendlyTarget ? '#10b981' : isTileTarget ? '#38bdf8' : '#ef4444'; // Green for friendly heal, sky blue for tile, red for enemy attack
              strokeWidth = 3.5;
            } else if (isAbilityRange) {
              strokeColor = isStraightLineAbility ? '#f59e0b' : '#38bdf8'; // Amber for straight-line abilities, Blue for circular range
              strokeWidth = isStraightLineAbility ? 3.5 : 3;
            } else if (isMoveTarget) {
              strokeColor = '#10b981';
              strokeWidth = 3;
            } else if (isReinforceTile) {
              // Green indicator throughout reinforcement phase
              strokeColor = '#10b981';
              strokeWidth = 3;
            } else if (isPromoteTarget) {
              strokeColor = '#f59e0b'; // Amber / Gold for Promote
              strokeWidth = 3.5;
            } else if (isFusionTarget) {
              strokeColor = '#c084fc'; // Purple for Fusion
              strokeWidth = 3.5;
            } else if (isDeployTarget) {
              strokeColor = '#10b981';
              strokeWidth = 3;
            } else if (isSelected) {
              strokeColor = '#38bdf8';
              strokeWidth = 2.5;
            } else if (isScorched) {
              strokeColor = '#ea580c'; // Fiery orange border for scorched tiles
              strokeWidth = 2;
            }

            return (
              <g
                key={cell.id}
                data-hex-id={cell.id}
                onClick={() => onHexClick?.(cell.id)}
                className="cursor-pointer group transition-all duration-200"
              >
                {/* Hexagon Body */}
                <polygon
                  data-hex-id={cell.id}
                  points={cell.points}
                  fill={cell.color}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  className={`transition-colors duration-200 ${
                    isAssistDeploy
                      ? 'fill-yellow-950/80 brightness-140 animate-pulse'
                      : isMomentumCharge
                      ? 'fill-amber-950/90 brightness-150 animate-pulse'
                      : isFusionSelected
                      ? 'fill-purple-900/90 brightness-150'
                      : isTributeSelected
                      ? 'fill-rose-950/90 brightness-150'
                      : isTributeTarget
                      ? 'fill-orange-950/80 brightness-125'
                      : isPendingTarget
                      ? 'fill-yellow-900/80 brightness-150'
                      : isAttackTarget
                      ? isTileTarget
                        ? 'fill-sky-950/80 brightness-135'
                        : 'fill-red-950/70 brightness-125'
                      : isAbilityRange
                      ? isStraightLineAbility
                        ? 'fill-amber-950/80 brightness-135'
                        : 'fill-sky-950/70 brightness-125'
                      : isMoveTarget
                      ? 'fill-emerald-950/70 brightness-125'
                      : isReinforceTile
                      ? 'fill-emerald-950/70 brightness-125'
                      : isPromoteTarget
                      ? 'fill-amber-950/80 brightness-125'
                      : isFusionTarget
                      ? 'fill-purple-950/80 brightness-125'
                      : isDeployTarget
                      ? 'fill-emerald-950/70 brightness-125'
                      : isScorched
                      ? 'fill-orange-950/50 brightness-115'
                      : cell.isRow1
                      ? 'hover:brightness-125'
                      : cell.isRow6
                      ? 'hover:brightness-125'
                      : 'group-hover:brightness-125'
                  }`}
                  filter="url(#hex-shadow)"
                />

                {/* Sealed Tile Icon (can't Reinforce here, e.g. enemy Sealed Gate) */}
                {showSeal && (
                  <text
                    x={cell.cx}
                    y={cell.cy + 14}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="13"
                    className="pointer-events-none select-none opacity-85"
                    transform={`rotate(${-boardYaw}, ${cell.cx}, ${cell.cy + 14})`}
                  >
                    🔒
                  </text>
                )}

                {/* Scorched Tile Ember Flame Icon */}
                {isScorched && (
                  <text
                    x={cell.cx}
                    y={cell.cy - 10}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="13"
                    className="pointer-events-none select-none opacity-85"
                    transform={`rotate(${-boardYaw}, ${cell.cx}, ${cell.cy - 10})`}
                  >
                    🔥
                  </text>
                )}

                {/* Momentum Charge Surge Icon */}
                {isMomentumCharge && (
                  <g transform={`rotate(${-boardYaw}, ${cell.cx}, ${cell.cy - 8})`} className="pointer-events-none">
                    <text
                      x={cell.cx}
                      y={cell.cy - 12}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      className="select-none"
                    >
                      ⚡
                    </text>
                    <text
                      x={cell.cx}
                      y={cell.cy + 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="9"
                      fontWeight="900"
                      fill="#fde047"
                      fontFamily="sans-serif"
                    >
                      CHARGE
                    </text>
                  </g>
                )}

                {/* Assist Deploy Indicator */}
                {isAssistDeploy && !unitOnHex && (
                  <g transform={`rotate(${-boardYaw}, ${cell.cx}, ${cell.cy - 8})`} className="pointer-events-none">
                    <text
                      x={cell.cx}
                      y={cell.cy - 12}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      className="select-none animate-bounce"
                    >
                      ⭐
                    </text>
                    <text
                      x={cell.cx}
                      y={cell.cy + 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="8.5"
                      fontWeight="900"
                      fill="#fef08a"
                      fontFamily="sans-serif"
                      className="animate-pulse"
                    >
                      ASSIST
                    </text>
                  </g>
                )}

                {/* Path Step Indicator (Drawn Paths, Multi-target, Charge, Flight) */}
                {isPendingTarget && (
                  <g transform={`rotate(${-boardYaw}, ${cell.cx}, ${cell.cy - 8})`} className="pointer-events-none select-none">
                    <circle cx={cell.cx} cy={cell.cy - 10} r="10" fill="#d97706" stroke="#fef08a" strokeWidth="1.5" />
                    <text
                      x={cell.cx}
                      y={cell.cy - 9.5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="11"
                      fontWeight="900"
                      fill="#ffffff"
                      fontFamily="monospace, sans-serif"
                    >
                      {pendingTargetHexes.indexOf(cell.id) + 1}
                    </text>
                    {unitOnHex ? (
                      <text
                        x={cell.cx}
                        y={cell.cy + 5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="8.5"
                        fontWeight="900"
                        fill="#fca5a5"
                        fontFamily="sans-serif"
                      >
                        HIT 8
                      </text>
                    ) : cell.id === pendingTargetHexes[pendingTargetHexes.length - 1] ? (
                      <text
                        x={cell.cx}
                        y={cell.cy + 5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="8.5"
                        fontWeight="900"
                        fill="#fef08a"
                        fontFamily="sans-serif"
                      >
                        END
                      </text>
                    ) : null}
                  </g>
                )}

                {/* Coordinate label: Revolves around the center of its hex to ALWAYS face the camera flat on the tile */}
                <text
                  x={cell.cx}
                  y={cell.cy + 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={cell.isRow1 ? '#7dd3fc' : cell.isRow6 ? '#fda4af' : '#c7baa8'}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="monospace, ui-monospace, sans-serif"
                  letterSpacing="0.05em"
                  transform={`rotate(${-boardYaw}, ${cell.cx}, ${cell.cy})`}
                  className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-70 group-hover:opacity-100 group-hover:fill-sky-300"
                >
                  {cell.id}
                </text>
              </g>
            );
          })}
        </g>

        {/* LAYER 2: TOP VISUAL LAYER FOR STANDEES (Sorted by distance from camera, closest on top) */}
        <g id="standees-top-layer">
          {sortedUnits.map(([hexId, unit]) => {
            const cell = cellsById.get(hexId);
            if (!cell) return null;

            const isSelected = selectedHex === hexId;
            const isActiveTurnUnit = activeTurnUnitHex === hexId;
            const isCurrentPlayerTurn = unit.owner === activePlayer;
            const isMovingThisUnit = isMovingMode && isActiveTurnUnit;
            const depth = getCameraDepth(hexId);

            return (
              <foreignObject
                key={`standee-${unit.instanceId}-${hexId}`}
                x={cell.cx - 90}
                y={cell.cy - 165}
                width={180}
                height={180}
                className="overflow-visible pointer-events-none"
                style={{ zIndex: Math.round(depth + 1000) }}
              >
                <div
                  className="w-full h-full relative pointer-events-none flex items-end justify-center"
                >
                  <div
                    className={isMovingThisUnit ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}
                    data-standee-hex={hexId}
                  >
                    <BattlefieldCardStandee
                      card={unit.card}
                      owner={unit.owner}
                      damageCounters={unit.damageCounters}
                      armour={unit.armour}
                      currentAp={unit.currentAp}
                      isActiveTurnUnit={isActiveTurnUnit}
                      isSelected={isSelected}
                      isCurrentPlayerTurn={isCurrentPlayerTurn}
                      onUseAbility={onUseAbility}
                      onUniversalDrawClick={onUniversalDrawClick}
                      canUniversalDraw={canUniversalDraw}
                      customArtUrl={customArtMap[unit.card.id]}
                      boardPitch={boardPitch}
                      boardYaw={boardYaw}
                      promotedCardsCount={unit.promotedCards?.length || 0}
                      grantedAbilitiesCount={unit.grantedAbilities?.length || 0}
                      isFusionSelected={!activeTurnUnitHex && fusionSelectedHexes.includes(hexId)}
                      isTributeSelected={!activeTurnUnitHex && tributeSacrificeHexes.includes(hexId)}
                      hasReflect={Boolean(unit.reflectStance)}
                      hasFlawlessParry={Boolean(unit.reflectStance?.sourceAbilityName === 'Flawless Parry' || unit.reflectStance?.preventUpTo !== undefined)}
                      bonusRange={unit.bonusRangeThisTurn || 0}
                      hasMoveTax={hasColdFeetEffect(unit, unitsOnBoard) && !unit.movedThisTurn}
                      hasNoxiousBurst={hasNoxiousBurstEffect(unit)}
                      hasOverloadLock={Boolean(unit.lockedAbilities?.['overload_gemstone'] && unit.lockedAbilities['overload_gemstone'].turnsRemaining > 0)}
                      hasFlowingStance={isFlowingStanceActive(unit)}
                      hasCannotPromoteOrFuse={Boolean(unit.statuses?.includes('cannot_promote_or_fuse'))}
                      hasCannotMove={Boolean(unit.statuses?.includes('cannot_move'))}
                      hasSelfCannotMove={Boolean(unit.statuses?.includes('cant_move_self'))}
                      hasPassivesRemoved={Boolean(unit.statuses?.includes('passives_removed'))}
                      hasReactImmunity={Boolean(unit.statuses?.includes('immune_to_react'))}
                      isUntargetable={Boolean(unit.statuses?.includes('untargetable'))}
                      sharesArmour={Boolean(unit.statuses?.includes('shares_armour'))}
                      readiedAbilityName={unit.readySpell?.abilityName}
                      hasDeathMark={Boolean(unit.deathMark || unit.statuses?.includes('death_mark'))}
                      leaderBonusHp={getLeaderOfTheBunchBonusHp(unit, unitsOnBoard)}
                      hasCephalopodReach={hasCephalopodReach(unit)}
                      hasMagicalOmnipresence={hasMagicalOmnipresence(unit)}
                      hasMovedThisTurn={Boolean(unit.movedThisTurn)}
                    />
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </g>

        {/* LAYER 3: TOP INTERACTIVE TARGET OVERLAY LAYER */}
        {/* Ensures valid move targets, deploy targets, and attack targets are NEVER blocked by unit standees in front of or behind them */}
        <g id="interactive-target-overlay-layer">
          {hexCells.map((cell) => {
            const isMoveTarget = validMoveHexes.includes(cell.id);
            const isSealedTile = sealedReinforceHexes.includes(cell.id);
            const isReinforceTile =
              !activeTurnUnitHex &&
              isReinforcementPhase &&
              !unitsOnBoard[cell.id] &&
              !isSealedTile &&
              ((activePlayer === 'player1' && cell.isRow1) || (activePlayer === 'player2' && cell.isRow6));
            const isDeployTarget =
              !activeTurnUnitHex &&
              (selectedHandCard || isReinforceTile) &&
              !unitsOnBoard[cell.id] &&
              !isSealedTile &&
              ((activePlayer === 'player1' && cell.isRow1) || (activePlayer === 'player2' && cell.isRow6));
            const isAttackTarget = validAttackHexes.includes(cell.id);
            const isTributeTarget = !activeTurnUnitHex && validTributeHexes.includes(cell.id);
            const isFusionTarget = !activeTurnUnitHex && validFusionHexes.includes(cell.id);
            const isAssistDeploy = assistDeployHexes.includes(cell.id);

            if (!isMoveTarget && !isDeployTarget && !isAttackTarget && !isTributeTarget && !isFusionTarget && !isAssistDeploy) return null;

            return (
              <polygon
                key={`target-overlay-${cell.id}`}
                data-hex-id={cell.id}
                points={cell.points}
                fill="#000000"
                fillOpacity={0.001}
                stroke="transparent"
                strokeWidth={1}
                pointerEvents="all"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onHexClick?.(cell.id);
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
