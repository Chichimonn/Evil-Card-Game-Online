// Makes the small copies of the set backgrounds that are drawn behind each card's art.
//
// The full-size set backgrounds (public/assets/art/<set_name>.png) are thousands of pixels across and many megabytes;
// every card face embeds its set's background when it is drawn, so the full files made the card loading slow. Card
// faces only ever show the background small, so each one gets a copy of about 480p (at least 854 x 480, keeping its
// shape) in public/assets/art/card-backgrounds/<set_name>.webp. The full-size files stay as they are, for the
// battlefield background in matches.
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

fs.mkdirSync(outDir, { recursive: true });
for (const set of sets) {
  const src = path.join(artDir, `${slug(set)}.png`);
  if (!fs.existsSync(src)) {
    console.log(`- ${set}: no background (${path.relative(root, src)}), skipped`);
    continue;
  }
  const out = path.join(outDir, `${slug(set)}.webp`);
  const info = await sharp(src).resize({ width: 854, height: 480, fit: 'outside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  const before = fs.statSync(src).size;
  console.log(`- ${set}: ${(before / 1e6).toFixed(1)} MB -> ${(info.size / 1e3).toFixed(0)} KB (${info.width} x ${info.height})`);
}
