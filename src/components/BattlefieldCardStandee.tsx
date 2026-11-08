import React, { useState } from 'react';
import { CardItem, CardAbility } from '../types/card';
import { PlayerId } from '../types/game';
import { useProcessedArt } from '../utils/artHalo';

interface BattlefieldCardStandeeProps {
  card: CardItem;
  owner: PlayerId;
  damageCounters: number;
  armour: number;
  currentAp: number;
  isActiveTurnUnit?: boolean;
  isSelected?: boolean;
  isCurrentPlayerTurn?: boolean;
  onUseAbility?: (ability: CardAbility) => void;
  onUniversalDrawClick?: () => void;
  canUniversalDraw?: boolean;
  customArtUrl?: string;
  boardPitch: number;
  boardYaw: number;
  promotedCardsCount?: number;
  grantedAbilitiesCount?: number;
  onHoverUnitCard?: (card: CardItem | null, owner?: PlayerId) => void;
  isFusionSelected?: boolean;
  isTributeSelected?: boolean;
  hasReflect?: boolean;
  hasFlawlessParry?: boolean;
  bonusRange?: number;
  hasMoveTax?: boolean;
  hasNoxiousBurst?: boolean;
  hasOverloadLock?: boolean;
  hasFlowingStance?: boolean;
  hasCannotPromoteOrFuse?: boolean;
  hasCannotMove?: boolean;
  hasSelfCannotMove?: boolean;
  hasPassivesRemoved?: boolean;
  hasReactImmunity?: boolean;
  isUntargetable?: boolean;
  sharesArmour?: boolean; // e.g. Battered Shield: surrounding friendly units may use its armour
  readiedAbilityName?: string; // e.g. Ready Spell: the ability it may interrupt with
  hasDeathMark?: boolean;
  leaderBonusHp?: number;
  hasCephalopodReach?: boolean;
  hasMagicalOmnipresence?: boolean;
  hasMovedThisTurn?: boolean;
}

export const BattlefieldCardStandee: React.FC<BattlefieldCardStandeeProps> = ({
  card,
  owner,
  damageCounters,
  armour,
  currentAp,
  isActiveTurnUnit = false,
  isSelected = false,
  isCurrentPlayerTurn = false,
  onUseAbility,
  onUniversalDrawClick,
  canUniversalDraw = false,
  customArtUrl,
  boardPitch,
  boardYaw,
  promotedCardsCount = 0,
  grantedAbilitiesCount = 0,
  onHoverUnitCard,
  isFusionSelected = false,
  isTributeSelected = false,
  hasReflect = false,
  hasFlawlessParry = false,
  bonusRange = 0,
  hasMoveTax = false,
  hasNoxiousBurst = false,
  hasOverloadLock = false,
  hasFlowingStance = false,
  hasCannotPromoteOrFuse = false,
  hasCannotMove = false,
  hasSelfCannotMove = false,
  hasPassivesRemoved = false,
  hasReactImmunity = false,
  isUntargetable = false,
  sharesArmour = false,
  readiedAbilityName,
  hasDeathMark = false,
  leaderBonusHp = 0,
  hasCephalopodReach = false,
  hasMagicalOmnipresence = false,
  hasMovedThisTurn = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Art to try, in order (custom art alone when given), with the white halo drawn around the figure and its feet moved
  // to the bottom edge, so it stands on the middle of its pedestal
  const art = useProcessedArt(
    customArtUrl ? [customArtUrl] : [`/assets/art/${card.id}.png`, `/assets/${card.art || `art/${card.id}.png`}`],
    true
  );

  const isPlayer1 = owner === 'player1';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full h-full relative flex flex-col items-center justify-end select-none pointer-events-none"
    >
      {/* 3D Rotated Standee Body (Crisp native resolution positioned precisely on hex center) */}
      <div
        onMouseEnter={() => {
          setIsHovered(true);
          onHoverUnitCard?.(card, owner);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onHoverUnitCard?.(null);
        }}
        className="w-[140px] h-[170px] relative flex flex-col items-center justify-end pointer-events-auto"
        style={{
          transformOrigin: '50% 100%',
          transform: `rotateZ(${-boardYaw}deg) rotateX(${-(boardPitch - 75)}deg)`,
          transformStyle: 'preserve-3d',
          WebkitFontSmoothing: 'antialiased',
          backfaceVisibility: 'hidden'
        }}
      >
        {/* Ground Pedestal / Base Ring on Hex (Player Color) */}
        <div
          className={`w-20 h-5 rounded-full absolute bottom-0 border-2 shadow-2xl transition-all ${
            isActiveTurnUnit
              ? 'bg-amber-400/90 border-amber-200 ring-4 ring-amber-400/60 animate-pulse'
              : isSelected
              ? 'bg-sky-400/90 border-white ring-2 ring-sky-300'
              : isPlayer1
              ? 'bg-sky-950/90 border-sky-400 shadow-sky-950/80'
              : 'bg-rose-950/90 border-rose-500 shadow-rose-950/80'
          }`}
        />

        {/* High-Resolution PNG card art container: its bottom (the figure's feet) on the middle of the pedestal. Not clipped,
            so a halo reaching past the art's edge shows in full. */}
        <div
          className={`w-[116px] h-[162px] mb-[10px] rounded-xl flex items-center justify-center relative transition-all drop-shadow-[0_16px_32px_rgba(0,0,0,0.95)] ${
            isFusionSelected
              ? 'ring-4 ring-purple-400 shadow-purple-500/80 scale-105 animate-pulse'
              : isTributeSelected
              ? 'ring-4 ring-rose-500 shadow-rose-500/80 scale-105 animate-pulse'
              : isActiveTurnUnit
              ? 'ring-4 ring-amber-400 shadow-amber-500/50 scale-105'
              : isSelected
              ? 'ring-4 ring-sky-400'
              : isHovered
              ? 'brightness-110 scale-105'
              : ''
          }`}
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          {art.status === 'pending' ? null : art.status === 'ready' ? (
            <img
              src={art.src}
              alt={card.name}
              className="w-full h-full object-contain object-bottom pointer-events-none select-none"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900/95 border-2 border-stone-700/80 rounded-lg p-2 text-center">
              <span className="text-sm font-serif font-bold text-stone-200 leading-tight line-clamp-2">
                {card.name}
              </span>
              <span className="text-[10px] font-mono text-stone-500 mt-2">
                {card.id}.png
              </span>
            </div>
          )}
        </div>

        {/* Floating Badges for HP / Damage and Armour */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none z-30">
          {/* Damage / HP Badge */}
          <div
            className={`px-2 py-0.5 rounded-md text-sm font-mono font-black shadow-lg flex items-center gap-1 border-2 ${
              damageCounters > 0
                ? 'bg-red-600 border-red-300 text-white animate-pulse'
                : isPlayer1
                ? 'bg-sky-950/90 border-sky-500 text-sky-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}
            title={
              leaderBonusHp > 0
                ? `HP: ${card.hp - damageCounters} / ${card.hp} (+${leaderBonusHp} from Leader of the Bunch)`
                : `HP: ${card.hp - damageCounters} / ${card.hp}`
            }
          >
            {damageCounters > 0 ? (
              <span>💥{damageCounters}/{card.hp}</span>
            ) : (
              <span>{card.hp}HP</span>
            )}
          </div>

          {/* Leader of the Bunch Bonus HP Badge */}
          {leaderBonusHp > 0 && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-emerald-950/95 border-2 border-emerald-400 text-emerald-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title={`Leader of the Bunch: +${leaderBonusHp} HP from ${leaderBonusHp} surrounding friendly unit${leaderBonusHp > 1 ? 's' : ''}`}
            >
              👑+{leaderBonusHp}HP
            </div>
          )}

          {/* Armour Badge (if armoured) */}
          {armour > 0 && (
            <div
              className="px-2 py-0.5 rounded-md bg-amber-950/90 border-2 border-amber-400 text-amber-200 text-sm font-mono font-black shadow-lg"
              title={`Armour: ${armour}`}
            >
              🛡️{armour}
            </div>
          )}

          {/* Reflect / Flawless Parry Stance Badge */}
          {hasFlawlessParry ? (
            <div
              className="px-1.5 py-0.5 rounded-md bg-amber-950/95 border-2 border-amber-400 text-amber-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Flawless Parry: Prevents up to 4 damage from the next attack. If attacker is within Range 1, reflects the attack back!"
            >
              ⚔️Parry (4+R1)
            </div>
          ) : hasReflect ? (
            <div
              className="px-1.5 py-0.5 rounded-md bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Reflect Active: Reflects incoming attacks back at the attacker!"
            >
              🪞Reflect
            </div>
          ) : null}

          {/* Promoted / Fusion Cards Badge */}
          {promotedCardsCount > 0 && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-purple-950/90 border-2 border-purple-400 text-purple-200 text-xs font-mono font-black shadow-lg"
              title={`Contains ${promotedCardsCount} promoted/fusion card${promotedCardsCount > 1 ? 's' : ''}`}
            >
              ★{promotedCardsCount}
            </div>
          )}

          {/* Inspired / Granted Abilities Badge */}
          {grantedAbilitiesCount > 0 && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-purple-900/90 border-2 border-purple-400 text-purple-200 text-xs font-mono font-black shadow-lg"
              title={`Inspired: Has ${grantedAbilitiesCount} temporary ability until end of turn`}
            >
              ✨{grantedAbilitiesCount}
            </div>
          )}

          {/* Broaden Search / Bonus Range Badge */}
          {bonusRange > 0 && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-teal-950/95 border-2 border-teal-400 text-teal-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title={`Broaden Search: +${bonusRange} Range to abilities this turn!`}
            >
              🔭+{bonusRange}R
            </div>
          )}

          {/* Cephalopod Reach Badge */}
          {hasCephalopodReach && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-teal-950/95 border-2 border-teal-400 text-teal-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5"
              title="Cephalopod Reach: Melee attacks have +1 Range"
            >
              🐙+1R
            </div>
          )}

          {/* Magical Omnipresence Badge */}
          {hasMagicalOmnipresence && (
            <div
              className={`px-1.5 py-0.5 rounded-md text-xs font-mono font-black shadow-lg flex items-center gap-0.5 border-2 ${
                hasMovedThisTurn
                  ? 'bg-stone-900/90 border-stone-700 text-stone-500 line-through'
                  : 'bg-purple-950/95 border-purple-400 text-purple-200 animate-pulse'
              }`}
              title={
                hasMovedThisTurn
                  ? "Magical Omnipresence: Range 2 Move (1/Turn) - Already moved this turn"
                  : "Magical Omnipresence: May move to any empty tile within Range 2 (1/Turn)"
              }
            >
              ✨R2 Move{hasMovedThisTurn ? ' ✓' : ''}
            </div>
          )}

          {/* Cold Feet / Gravity Move Tax Badge */}
          {hasMoveTax && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Cold Feet / Gravity: First move costs an additional 1 AP this turn"
            >
              ❄️Cold Feet
            </div>
          )}

          {/* Noxious Burst (-1 AP) Badge */}
          {hasNoxiousBurst && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-purple-950/95 border-2 border-purple-400 text-purple-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Noxious Burst: Starts its next turn with 1 less AP"
            >
              ☠️-1AP
            </div>
          )}

          {/* Overload Gemstone Lock Badge */}
          {hasOverloadLock && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-stone-900/95 border-2 border-amber-500 text-amber-300 text-xs font-mono font-black shadow-lg flex items-center gap-0.5"
              title="Overload Gemstone: Locked during this turn"
            >
              🔒Overload
            </div>
          )}

          {/* Flowing Stance (Range 1-2 Melee) Badge */}
          {hasFlowingStance && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-blue-950/95 border-2 border-blue-400 text-blue-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Flowing Stance: Melee attacks have Range 1-2 (has not moved this turn)"
            >
              🌊Flowing (R1-2)
            </div>
          )}

          {/* Cannot Promote or Fuse (Ice Lance) Badge */}
          {hasCannotPromoteOrFuse && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Ice Lance: Cannot be promoted or fused during this turn"
            >
              🧊Frostbound
            </div>
          )}

          {/* Cannot Move (Pincer Clamp) Badge */}
          {hasCannotMove && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-amber-950/95 border-2 border-amber-500 text-amber-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Pincer Clamp: Cannot move during this turn"
            >
              🦀Clamped
            </div>
          )}

          {/* Self Cannot Move (e.g. Human Cannonball) Badge */}
          {hasSelfCannotMove && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-amber-950/95 border-2 border-amber-500 text-amber-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Can't move until the end of the opponent's next turn"
            >
              ⛓️Can't move
            </div>
          )}

          {/* No passives (e.g. Silencing Strike) Badge */}
          {hasPassivesRemoved && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-slate-950/95 border-2 border-slate-400 text-slate-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Silenced: has no passives until the end of its owner's next turn"
            >
              🔇Silenced
            </div>
          )}

          {/* Can't be targeted by react effects (e.g. Runic Vanish) Badge */}
          {hasReactImmunity && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-violet-950/95 border-2 border-violet-400 text-violet-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Cannot be targeted by enemy react effects until the end of the opponent's next turn"
            >
              ✴️Untouchable
            </div>
          )}

          {/* Can't be targeted at all (e.g. Vanish) Badge */}
          {isUntargetable && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-slate-900/95 border-2 border-slate-300 text-slate-100 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Cannot be targeted until the end of the opponent's next turn"
            >
              👻Vanished
            </div>
          )}

          {/* Shares its armour with surrounding friendly units (e.g. Battered Shield) Badge */}
          {sharesArmour && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-sky-950/95 border-2 border-sky-400 text-sky-100 text-xs font-mono font-black shadow-lg flex items-center gap-0.5"
              title="Surrounding friendly units may use this unit's armour until the end of the opponent's next turn"
            >
              🛡️Shared
            </div>
          )}

          {/* Readied ability to interrupt with (e.g. Ready Spell) Badge */}
          {readiedAbilityName && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-violet-950/95 border-2 border-violet-400 text-violet-100 text-xs font-mono font-black shadow-lg flex items-center gap-0.5"
              title={`Ready: may use ${readiedAbilityName} for free to interrupt enemy abilities during the opponent's next turn`}
            >
              ⚡Ready
            </div>
          )}

          {/* Death Mark Badge */}
          {hasDeathMark && (
            <div
              className="px-1.5 py-0.5 rounded-md bg-rose-950/95 border-2 border-rose-500 text-rose-200 text-xs font-mono font-black shadow-lg flex items-center gap-0.5 animate-pulse"
              title="Death Mark: Next attack from caster deals +5 damage on first hit; Noxious Burst triggers on death"
            >
              💀Death Mark
            </div>
          )}

          {/* Only track/show AP while this unit is taking a turn */}
          {isActiveTurnUnit && (
            <div
              className="px-2 py-0.5 rounded-md bg-amber-950/90 border-2 border-amber-400 text-amber-300 text-sm font-mono font-black shadow-lg"
              title={`AP remaining: ${currentAp}`}
            >
              ⚡{currentAp}AP
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
