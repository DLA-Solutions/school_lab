/**
 * Loads the built catalog in jsdom and visits every route in a fresh document, failing on any
 * uncaught exception, React error or page that renders nothing. Catches the runtime problems tsc
 * cannot see. A fresh document per route matters: one thrown render unmounts the React root, and
 * every later route in the same document would then look broken for the wrong reason.
 *
 * Requires jsdom, which lives in ../app/node_modules (the SPA install).
 * Run with `node scripts/smoke-pages.mjs` after `npm run build`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(pathToFileURL(resolve(here, '../../app/package.json')));
const { JSDOM, VirtualConsole } = require('jsdom');

const distDir = resolve(here, '../../../docs/design-system');
const html = readFileSync(resolve(distDir, 'index.html'), 'utf8');
const bundle = readFileSync(resolve(distDir, 'assets/index.js'), 'utf8');
const appSource = readFileSync(resolve(here, '../src/App.tsx'), 'utf8');

const routes = [
  '/',
  ...[...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== '*')
    .map((path) => `/${path}`),
];

const renderRoute = async (route) => {
  const problems = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => problems.push(error.stack ?? error.message));
  virtualConsole.on('error', (...args) =>
    problems.push(args.map((arg) => (arg?.stack ? arg.stack : String(arg))).join(' ')),
  );

  const dom = new JSDOM(html, {
    // An http origin, not the real file:// one: jsdom refuses localStorage on opaque origins and
    // index.html reads it in the inline anti-flash script.
    url: `http://catalog.test/index.html#${route}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });

  const { window } = dom;
  window.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
  window.fetch = () => Promise.reject(new Error('network disabled in smoke test'));

  // The build emits a deferred script that jsdom will not fetch over file://.
  window.eval(bundle);
  await new Promise((done) => window.setTimeout(done, 80));

  const main = window.document.querySelector('main');
  const text = main?.textContent?.trim() ?? '';
  const headings = main ? main.querySelectorAll('h1, h2, h3, h4').length : 0;
  window.close();

  return { problems, text, headings };
};

let failures = 0;

for (const route of routes) {
  const { problems, text, headings } = await renderRoute(route);
  const ok = headings > 0 && text.length > 120 && problems.length === 0;
  if (!ok) failures += 1;

  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${route.padEnd(32)} headings=${headings} chars=${text.length}`,
  );
  problems.forEach((problem) => console.error(`       ${problem.split('\n').slice(0, 4).join('\n       ')}`));
}

console.log(`\n${routes.length - failures}/${routes.length} routes rendered`);
process.exit(failures ? 1 : 0);
