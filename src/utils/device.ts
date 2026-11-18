// What kind of device and screen the game is running on, for the loading screen and the game's starting size.

/**
 * Whether this is a phone or tablet. Going by what the browser says it is, not the screen size, so a small desktop window
 * or a touchscreen laptop isn't counted. An iPad asks for desktop sites and says it's a Mac, so a "Mac" with a touchscreen
 * counts too (real Macs have none).
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Opera Mini|IEMobile/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

export const IS_MOBILE_DEVICE = isMobileDevice();

/**
 * The game's starting size by screen height, the way Chrome's zoom would set it: 1 is the game as designed (made to look
 * right on a 2560 x 1440 screen). Heights between two entries get a size in between; a screen shorter or taller than
 * every entry gets the nearest one's size.
 *
 * - 1440p: as designed.
 * - 1080p: 80%, which looked right in Chrome on a 1920 x 1080 screen.
 * - 720p: a first guess (in line with the two above); to be checked on a Chromebook.
 * - Above 1440p (4K) stays as designed until it's been tried. A 4K screen with Windows set to 150% already counts as 1440.
 */
const SIZE_BY_SCREEN_HEIGHT: { height: number; scale: number }[] = [
  { height: 720, scale: 0.6 },
  { height: 1080, scale: 0.8 },
  { height: 1440, scale: 1 }
];

/**
 * The screen's height as the game sees it, in the page's own pixels (so a screen with Windows display scaling counts
 * smaller), taken as a 16:9 screen: a wider screen goes by its height, a squarer one (e.g. 1920 x 1200) by its width.
 */
function screenHeight16By9(): number {
  if (typeof window === 'undefined' || !window.screen) return 1440;
  const { width, height } = window.screen;
  if (!width || !height) return 1440;
  // (whichever way round the screen is held)
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  return Math.min(short, (long * 9) / 16);
}

/** The scale the game starts at on this screen (1 on phones and tablets, which size pages their own way). */
export function getStartingScale(): number {
  if (IS_MOBILE_DEVICE) return 1;
  const h = screenHeight16By9();
  const table = SIZE_BY_SCREEN_HEIGHT;
  if (h <= table[0].height) return table[0].scale;
  for (let i = 1; i < table.length; i++) {
    const a = table[i - 1];
    const b = table[i];
    if (h <= b.height) return a.scale + ((h - a.height) / (b.height - a.height)) * (b.scale - a.scale);
  }
  return table[table.length - 1].scale;
}

/** The game's starting size on this screen (worked out once, when the game loads). */
export const STARTING_SCALE = getStartingScale();

/**
 * How sharply card faces are drawn on this screen: the face (750 x 1050 page pixels) is drawn at this many pixels per
 * page pixel. 2 (1500 x 2100) is what looks right on a 1440p screen. A smaller screen shows cards smaller (the game's
 * starting size), so needs fewer; a screen with display scaling (e.g. a Chromebook at 150%) packs more real pixels into
 * each page pixel, so needs more. Never above 2, so no screen draws more than before; never below 1.
 *
 * Fewer pixels make the faces much quicker to draw and save: 1.2 is about a third of the pixels of 2.
 */
const MAX_FACE_PIXEL_RATIO = 2;
export function getFacePixelRatio(): number {
  const density = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const ratio = MAX_FACE_PIXEL_RATIO * STARTING_SCALE * density;
  return Math.round(Math.min(MAX_FACE_PIXEL_RATIO, Math.max(1, ratio)) * 10) / 10;
}

/** The face sharpness this screen starts with (worked out once, when the game loads, with its starting size). */
export const FACE_PIXEL_RATIO = getFacePixelRatio();
