import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const ART_DIR = path.resolve(import.meta.dirname, 'public/assets/art');
const SRC_DIR = path.resolve(import.meta.dirname, 'src');

/**
 * Whether file is inside dir. By path.relative, not by comparing the text: on Windows the watcher may name the same
 * folder with a different drive letter case or slashes (c:/users/... vs C:\Users\...), which a text comparison misses.
 */
const isInside = (file: string, dir: string): boolean => {
  const rel = path.relative(dir, path.resolve(file));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
};

/**
 * A fingerprint of the card art and set backgrounds (every file under public/assets/art: its path, size and time
 * modified). Saved card images are drawn again when it changes, so new or replaced art shows up. It is kept apart from
 * the build fingerprint below, so adding art never makes two players' versions mismatch.
 */
function computeArtId(): string {
  const hash = crypto.createHash('sha256');
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const stat = fs.statSync(full);
        hash.update(`${path.relative(ART_DIR, full).split(path.sep).join('/')}|${stat.size}|${stat.mtimeMs}\n`);
      }
    }
  };
  walk(ART_DIR);
  return hash.digest('hex').slice(0, 12);
}

/**
 * Each art file's stamp (its size and time modified), by its path under public/assets/art, e.g. "skeleton_fighter.png".
 * A saved card face is drawn again when the stamp of its art or set background changes (see src/context/CardImageContext).
 */
function computeArtStamps(): Record<string, string> {
  const stamps: Record<string, string> = {};
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const stat = fs.statSync(full);
        stamps[path.relative(ART_DIR, full).split(path.sep).join('/')] = `${stat.size}-${Math.round(stat.mtimeMs)}`;
      }
    }
  };
  walk(ART_DIR);
  return stamps;
}

/**
 * A fingerprint of the code and styles that draw a card face: CardView and every file it imports (followed through their
 * own imports), the stylesheet and the card fonts. Saved card faces are drawn again when it changes; a change anywhere
 * else in the game leaves them alone.
 */
function computeFaceCodeId(): string {
  const srcDir = path.resolve(import.meta.dirname, 'src');
  const seen = new Set<string>();
  const queue = [path.join(srcDir, 'components/CardView.tsx')];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:import|export)[^;]*?from\s+['"](\.[^'"]+)['"]/g)) {
      const base = path.resolve(path.dirname(file), m[1]);
      const found = ['.ts', '.tsx', '/index.ts', ''].map((ext) => base + ext).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
      if (found) queue.push(found);
    }
  }
  seen.add(path.join(srcDir, 'index.css'));
  const fontDir = path.resolve(import.meta.dirname, 'public/assets/fonts');
  const hash = crypto.createHash('sha256');
  [...seen]
    .map((f) => path.relative(srcDir, f).split(path.sep).join('/'))
    .sort()
    .forEach((rel) => {
      hash.update(rel);
      hash.update(fs.readFileSync(path.join(srcDir, rel), 'utf8').replace(/\r\n/g, '\n'));
    });
  if (fs.existsSync(fontDir)) {
    fs.readdirSync(fontDir)
      .sort()
      .forEach((f) => hash.update(`${f}|${fs.statSync(path.join(fontDir, f)).size}`));
  }
  return hash.digest('hex').slice(0, 12);
}

/**
 * While the dev server runs, adding, replacing or removing art, or editing the code or styles that draw a card face,
 * restarts it, so the fingerprints are worked out again and the changed faces are drawn again on the next refresh
 * (otherwise the browser keeps showing the faces it saved before the edit).
 */
function restartOnArtChange(): Plugin {
  return {
    name: 'restart-on-art-change',
    configureServer(server) {
      server.watcher.add(ART_DIR);
      let timer: NodeJS.Timeout | null = null;
      let faceCodeId = computeFaceCodeId();
      const isFaceCodeChange = (file: string) => {
        if (!/\.(tsx?|css)$/.test(file) || !isInside(file, SRC_DIR)) return false;
        const id = computeFaceCodeId();
        if (id === faceCodeId) return false;
        faceCodeId = id;
        return true;
      };
      const onChange = (file: string) => {
        if (!isInside(file, ART_DIR) && !isFaceCodeChange(file)) return;
        // (a copy of several files at once restarts once)
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => server.restart(), 500);
      };
      server.watcher.on('add', onChange);
      server.watcher.on('change', onChange);
      server.watcher.on('unlink', onChange);
    }
  };
}

/**
 * A fingerprint of the game's code and card data (everything under src/), made when the app is built or the dev
 * server starts. Two copies of the game with any difference in their rules get different fingerprints, so online
 * players can tell they aren't running the same game (see src/version.ts). Line endings are normalised so the same
 * files give the same fingerprint on every operating system.
 */
function computeBuildId(): string {
  const srcDir = path.resolve(import.meta.dirname, 'src');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|json|css)$/.test(entry.name)) files.push(full);
    }
  };
  walk(srcDir);
  const hash = crypto.createHash('sha256');
  files
    .map((f) => path.relative(srcDir, f).split(path.sep).join('/'))
    .sort()
    .forEach((rel) => {
      hash.update(rel);
      hash.update(fs.readFileSync(path.join(srcDir, rel), 'utf8').replace(/\r\n/g, '\n'));
    });
  return hash.digest('hex').slice(0, 12);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), restartOnArtChange()],
    define: {
      __BUILD_ID__: JSON.stringify(computeBuildId()),
      __ART_ID__: JSON.stringify(computeArtId()),
      __ART_STAMPS__: JSON.stringify(computeArtStamps()),
      __FACE_CODE_ID__: JSON.stringify(computeFaceCodeId()),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
