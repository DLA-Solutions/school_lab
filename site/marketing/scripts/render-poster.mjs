import { mkdir, access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const assetsDirectory = join(projectDirectory, 'public', 'assets');
const distDirectory = join(projectDirectory, 'dist');
const chromeExecutable = findChromeExecutable();
const previewPort = await findAvailablePort();

await mkdir(assetsDirectory, { recursive: true });

const hasDist = await access(join(distDirectory, 'index.html'))
  .then(() => true)
  .catch(() => false);

if (!hasDist) {
  console.log('No dist/ build found — generating placeholder posters from lockup.');
  await generatePlaceholderPosters();
  process.exit(0);
}

const previewProcess = spawn(
  process.execPath,
  [
    join(projectDirectory, 'node_modules', 'vite', 'bin', 'vite.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(previewPort),
    '--strictPort',
  ],
  { cwd: projectDirectory, stdio: ['ignore', 'pipe', 'pipe'] },
);

const previewUrl = `http://127.0.0.1:${previewPort}/`;

try {
  await waitForPreview(previewUrl, previewProcess);
  const browser = await chromium.launch({
    executablePath: chromeExecutable,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(previewUrl, { waitUntil: 'load' });

    await page.waitForFunction(
      () =>
        globalThis.document.documentElement.classList.contains('scene-ready') ||
        globalThis.document.documentElement.classList.contains('scene-fallback'),
      undefined,
      { timeout: 15000 },
    );

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await page.waitForTimeout(300);
      await page.mouse.move(200 + attempt * 20, 300 + attempt * 10);
      const ready = await page.evaluate(() =>
        globalThis.document.documentElement.classList.contains('scene-ready'),
      );
      if (ready) {
        break;
      }
    }

    await page.waitForTimeout(1500);
    const stage = page.locator('.scene-stage');
    const desktopBuffer = await stage.screenshot({ type: 'png' });

    await writePosterVariants(desktopBuffer);
    await context.close();
    console.log('Posters rendered from live 3D scene stage.');
  } finally {
    await browser.close();
  }
} catch (error) {
  console.warn('3D poster capture failed; writing placeholder posters.', error);
  await generatePlaceholderPosters();
} finally {
  previewProcess.kill('SIGTERM');
}

async function writePosterVariants(desktopBuffer) {
  const desktopWebp = await sharp(desktopBuffer).webp({ quality: 88 }).toBuffer();
  const desktopPng = await sharp(desktopBuffer).png().toBuffer();
  const mobileWebp = await sharp(desktopBuffer)
    .resize({ width: 780, height: 680, fit: 'cover', position: 'right' })
    .webp({ quality: 86 })
    .toBuffer();
  const ogWebp = await sharp(desktopBuffer)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'right' })
    .webp({ quality: 90 })
    .toBuffer();

  const { writeFile } = await import('node:fs/promises');
  await Promise.all([
    writeFile(join(assetsDirectory, 'scholar-premium-cap-poster.webp'), desktopWebp),
    writeFile(join(assetsDirectory, 'scholar-premium-cap-poster.png'), desktopPng),
    writeFile(join(assetsDirectory, 'scholar-premium-cap-poster-mobile.webp'), mobileWebp),
    writeFile(join(assetsDirectory, 'scholar-premium-og.webp'), ogWebp),
  ]);
}

async function generatePlaceholderPosters() {
  const lockupPath = join(assetsDirectory, 'scholar-premium-lockup.png');
  const base = existsSync(lockupPath)
    ? sharp(lockupPath).resize(1200, 1000, { fit: 'contain', background: '#050b18' })
    : sharp({
        create: {
          width: 1200,
          height: 1000,
          channels: 3,
          background: '#050b18',
        },
      });

  const desktopPng = await base.png().toBuffer();
  await writePosterVariants(desktopPng);
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
  ].filter(Boolean);

  const candidate = candidates.find((path) => path && existsSync(path));
  if (!candidate) {
    throw new Error('Chrome executable was not found. Set CHROME_PATH and retry.');
  }
  return candidate;
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(() => (port ? resolve(port) : reject(new Error('No port'))));
    });
  });
}

async function waitForPreview(url, processHandle) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Preview exited with code ${processHandle.exitCode}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Preview did not become ready.');
}

console.log(`Posters written to ${assetsDirectory}`);
