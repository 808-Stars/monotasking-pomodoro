import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {runtimeAssetsPlugin} from '../jrpg/scripts/runtime-assets.mjs';

// Runs after the productivity build. Keep its assets and emit the independent
// game below /jrpg/ so SPA routes and game filenames cannot collide.
const frontend = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(frontend, 'jrpg');
await build({
  configFile: false,
  plugins:[runtimeAssetsPlugin()],
  root,
  base: '/jrpg/',
  publicDir: resolve(root, 'public'),
  build: {
    outDir: resolve(frontend, 'dist/jrpg'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(['index', 'wiki', 'battle-theatre', 'dungeon-departure']
        .map(name => [name, resolve(root, `${name}.html`)])),
    },
  },
});
