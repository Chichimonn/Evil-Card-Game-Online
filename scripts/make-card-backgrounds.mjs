// Prepares the set backgrounds: the full-size picture for the battlefield, and the small copy drawn behind each card's art.
//
// The full-size set backgrounds are public/assets/art/<set_name>.webp, the battlefield background in matches. A new or
// replaced background can be dropped in as <set_name>.png: it is turned into the .webp (no bigger than needed to cover a
// 4K screen, at least 3840 x 2160 keeping its shape) and the .png removed, so the large file isn't shipped twice.
//
// Every card face embeds its set's background when it is drawn, and faces only ever show it small, so each set also gets
// a copy of about 480p (at least 854 x 480, keeping its shape) in public/assets/art/card-backgrounds/<set_name>.webp,
// which keeps card loading quick.
//
// Run it after adding or changing a set's background:  npm run card-backgrounds
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const artDir = path.join(root, 'public/assets/art');
const outDir = path.join(artDir, 'card-backgrounds');

// Each set named in the card data, as the file name the game looks for (see getSetBackgroundPath in CardView.tsx)
const cardData = fs.readFileSync(path.join(root, 'src/data/cardsData.ts'), 'utf8');
const sets = [...new Set([...cardData.matchAll(/"set":\s*"([^"]+)"/g)].map((m) => m[1]))];
const slug = (set) => set.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;

fs.mkdirSync(outDir, { recursive: true });
for (const set of sets) {
  const full = path.join(artDir, `${slug(set)}.webp`);
  const png = path.join(artDir, `${slug(set)}.png`);

  // A .png dropped in: becomes the full-size .webp (replacing any older one)
  if (fs.existsSync(png)) {
    const before = fs.statSync(png).size;
    const info = await sharp(png)
      .resize({ width: 3840, height: 2160, fit: 'outside', withoutEnlargement: true })
      .webp({ quality: 92, smartSubsample: true })
      .toFile(full);
    fs.rmSync(png);
    console.log(`- ${set}: full size ${mb(before)} PNG -> ${mb(info.size)} WebP (${info.width} x ${info.height}), PNG removed`);
  }

  if (!fs.existsSync(full)) {
    console.log(`- ${set}: no background (${path.relative(root, full)} or .png), skipped`);
    continue;
  }
  const out = path.join(outDir, `${slug(set)}.webp`);
  const info = await sharp(full).resize({ width: 854, height: 480, fit: 'outside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  console.log(`- ${set}: card copy ${(info.size / 1e3).toFixed(0)} KB (${info.width} x ${info.height})`);
}

// The card gallery's and deckbuilder's background: the default battlefield background (art/background.png), small and
// blurred in the file (cheaper than blurring it live across the whole screen). It is darkened over in the page.
const menuSrc = path.join(artDir, 'background.png');
const menuOut = path.join(root, 'public/assets/backgrounds/menu_background.webp');
if (fs.existsSync(menuSrc)) {
  fs.mkdirSync(path.dirname(menuOut), { recursive: true });
  const info = await sharp(menuSrc).resize({ width: 1280, withoutEnlargement: true }).blur(8).webp({ quality: 80 }).toFile(menuOut);
  console.log(`- Gallery and deckbuilder background: ${(info.size / 1e3).toFixed(0)} KB (${info.width} x ${info.height}), blurred`);
}
