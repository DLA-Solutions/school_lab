import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = join(projectDirectory, 'public', 'product-captures');
const spaUrl = process.env.SPA_URL ?? 'http://127.0.0.1:5173/app/';
const targets = [
  { id: 'boletos', path: '/billing', note: 'Billing / boletos list' },
  { id: 'boletins', path: '/academic', note: 'Academic / boletins' },
  { id: 'portal-familia', path: '/guardian', note: 'Guardian portal' },
  { id: 'preceptoria', path: '/preceptory', note: 'Preceptory' },
];

await mkdir(outputDirectory, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const reachable = await page
    .goto(spaUrl, { waitUntil: 'domcontentloaded', timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (!reachable) {
    await writeFile(
      join(outputDirectory, 'capture-status.json'),
      `${JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          status: 'skipped',
          reason: `SPA not reachable at ${spaUrl}`,
          instruction:
            'Start frontend/app locally and rerun npm run capture:product with SPA_URL set.',
        },
        null,
        2,
      )}\n`,
    );
    console.log(`SPA not reachable at ${spaUrl}; placeholder SVGs remain. See product-captures/README.md`);
    process.exit(0);
  }

  const results = [];
  for (const target of targets) {
    const screenshotPath = join(outputDirectory, `${target.id}.png`);
    try {
      await page.goto(new URL(target.path, spaUrl).href, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });
      await page.screenshot({ path: screenshotPath, fullPage: false });
      results.push({ id: target.id, status: 'captured', file: `${target.id}.png` });
    } catch (error) {
      results.push({
        id: target.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeFile(
    join(outputDirectory, 'capture-status.json'),
    `${JSON.stringify({ capturedAt: new Date().toISOString(), status: 'partial', results }, null, 2)}\n`,
  );
  console.log('Product capture attempt finished:', results);
} catch (error) {
  await writeFile(
    join(outputDirectory, 'capture-status.json'),
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    )}\n`,
  );
  console.warn('Product capture failed:', error);
} finally {
  await browser?.close();
}
