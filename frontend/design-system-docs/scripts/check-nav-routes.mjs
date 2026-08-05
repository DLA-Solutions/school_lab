/**
 * Verifies the catalog's nav and router agree: every nav entry resolves to a declared route,
 * and every declared route is reachable from nav. Run with `node scripts/check-nav-routes.mjs`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(resolve(here, '..', file), 'utf8');

const navPaths = [...read('src/components/DocLayout.tsx').matchAll(/path:\s*'([^']+)'/g)].map(
  (match) => match[1],
);

const routePaths = [...read('src/App.tsx').matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => path !== '*')
  .map((path) => `/${path}`);

// <Route index> is the '/' entry.
if (/<Route\s+index\b/.test(read('src/App.tsx'))) {
  routePaths.unshift('/');
}

const missingRoutes = navPaths.filter((path) => !routePaths.includes(path));
const orphanRoutes = routePaths.filter((path) => !navPaths.includes(path));
const duplicateNav = navPaths.filter((path, index) => navPaths.indexOf(path) !== index);

console.log(`nav entries: ${navPaths.length}`);
console.log(`routes:      ${routePaths.length}`);

let failed = false;

for (const [label, list] of [
  ['nav entries with no route (dead links)', missingRoutes],
  ['routes not reachable from nav', orphanRoutes],
  ['duplicate nav paths', duplicateNav],
]) {
  if (list.length) {
    failed = true;
    console.error(`\n${label}:`);
    list.forEach((path) => console.error(`  ${path}`));
  }
}

if (failed) {
  process.exit(1);
}

console.log('nav and routes agree');
