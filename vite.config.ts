import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * A fingerprint of the game's code and card data (everything under src/), made when the app is built or the dev
 * server starts. Two copies of the game with any difference in their rules get different fingerprints, so online
 * players can tell they aren't running the same game (see src/version.ts). Line endings are normalised so the same
 * files give the same fingerprint on every operating system.
 */
function computeBuildId(): string {
  const srcDir = path.resolve(__dirname, 'src');
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
    plugins: [react(), tailwindcss()],
    define: {
      __BUILD_ID__: JSON.stringify(computeBuildId()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
