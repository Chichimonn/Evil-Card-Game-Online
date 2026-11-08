import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const ART_DIR = path.resolve(import.meta.dirname, 'public/assets/art');

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

/** While the dev server runs, adding, replacing or removing art restarts it, so the art fingerprint is recomputed. */
function restartOnArtChange(): Plugin {
  return {
    name: 'restart-on-art-change',
    configureServer(server) {
      server.watcher.add(ART_DIR);
      let timer: NodeJS.Timeout | null = null;
      const onChange = (file: string) => {
        if (!path.resolve(file).startsWith(ART_DIR)) return;
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
