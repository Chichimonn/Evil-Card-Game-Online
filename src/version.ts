/**
 * Which version of the game this is. Online players must match exactly, or their games would play out differently.
 *
 * GAME_VERSION: bump this by hand every time you publish a changed version for players (e.g. '0.1.0' -> '0.2.0').
 * BUILD_ID: made automatically from all of the game's code and card data (see vite.config.ts), so two copies with any
 * rules difference never match even if GAME_VERSION wasn't bumped. The dev server makes it when it starts, so restart
 * it after editing to get the new fingerprint.
 */
export const GAME_VERSION = '0.1.0';

declare const __BUILD_ID__: string;
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'unknown';

export interface VersionInfo {
  gameVersion: string;
  buildId: string;
}

export const LOCAL_VERSION: VersionInfo = { gameVersion: GAME_VERSION, buildId: BUILD_ID };

/** How the version is shown to players, e.g. "v0.1.0 (3fa9c21b04de)". */
export const formatVersion = (v: VersionInfo = LOCAL_VERSION): string => `v${v.gameVersion} (${v.buildId})`;

/**
 * Whether another copy of the game can play against this one. Both the published version and the build fingerprint
 * must match: the version catches players on an older release, the fingerprint catches any other difference.
 */
export function checkVersionMatch(remote: VersionInfo, local: VersionInfo = LOCAL_VERSION): { ok: boolean; reason?: string } {
  if (remote.gameVersion !== local.gameVersion) {
    return {
      ok: false,
      reason: `Different game versions: you have ${formatVersion(local)}, they have ${formatVersion(remote)}. Both players need the same version.`
    };
  }
  if (remote.buildId !== local.buildId) {
    return {
      ok: false,
      reason: `Same version number (v${local.gameVersion}) but different game files (${local.buildId} vs ${remote.buildId}). One copy has changes the other doesn't.`
    };
  }
  return { ok: true };
}
