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
const midnightBackground = '#050b18';

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
    const desktopBuffer = await captureCapPoster(browser, previewUrl, {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const mobileBuffer = await captureCapPoster(browser, previewUrl, {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });

    await writePosterVariants(desktopBuffer, mobileBuffer);
    console.log('Cap-only posters rendered from live 3D canvas crop.');
  } finally {
    await browser.close();
  }
} catch (error) {
  console.warn('3D poster capture failed; writing placeholder posters.', error);
  await generatePlaceholderPosters();
} finally {
  previewProcess.kill('SIGTERM');
}

async function captureCapPoster(browser, url, { viewport, deviceScaleFactor }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (
        query.includes('pointer: fine') ||
        query.includes('min-width: 64rem') ||
        query.includes('prefers-reduced-motion: reduce')
      ) {
        return {
          matches: query.includes('prefers-reduced-motion: reduce') ? false : true,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        };
      }

      return originalMatchMedia(query);
    };
  });

  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.mouse.move(720, 420);
    await page.mouse.move(760, 440);
    await page.waitForTimeout(1800);

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

    await page.waitForTimeout(800);

    const crop = await page.evaluate(() => {
      const poster = document.querySelector('.cap-poster');
      const canvas = document.querySelector('.scene-stage__canvas');
      if (!(poster instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
        return null;
      }

      const posterRect = poster.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      if (posterRect.width < 8 || posterRect.height < 8) {
        return null;
      }

      return {
        left: posterRect.left - canvasRect.left,
        top: posterRect.top - canvasRect.top,
        width: posterRect.width,
        height: posterRect.height,
        canvasWidth: canvasRect.width,
        canvasHeight: canvasRect.height,
      };
    });

    if (!crop) {
      throw new Error('Cap poster crop bounds were unavailable.');
    }

    const canvasBuffer = await page.locator('.scene-stage__canvas').screenshot({ type: 'png' });
    return cropCanvasToCapPoster(canvasBuffer, crop);
  } finally {
    await context.close();
  }
}

async function cropCanvasToCapPoster(canvasBuffer, crop) {
  const metadata = await sharp(canvasBuffer).metadata();
  const scaleX = metadata.width / crop.canvasWidth;
  const scaleY = metadata.height / crop.canvasHeight;

  const left = Math.max(0, Math.round(crop.left * scaleX));
  const top = Math.max(0, Math.round(crop.top * scaleY));
  const width = Math.min(metadata.width - left, Math.round(crop.width * scaleX));
  const height = Math.min(metadata.height - top, Math.round(crop.height * scaleY));

  if (width < 8 || height < 8) {
    throw new Error('Cap poster crop dimensions were too small.');
  }

  return sharp(canvasBuffer)
    .extract({ left, top, width, height })
    .flatten({ background: midnightBackground })
    .png()
    .toBuffer();
}

async function writePosterVariants(desktopBuffer, mobileBuffer = desktopBuffer) {
  const desktopMeta = await sharp(desktopBuffer).metadata();
  const desktopWebp = await sharp(desktopBuffer).webp({ quality: 88 }).toBuffer();
  const desktopPng = desktopBuffer;
  const mobileWebp = await sharp(mobileBuffer).webp({ quality: 86 }).toBuffer();
  const ogWebp = await sharp(desktopBuffer)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .webp({ quality: 90 })
    .toBuffer();

  const { writeFile } = await import('node:fs/promises');
  await Promise.all([
    writeFile(join(assetsDirectory, 'scholar-premium-cap-poster.webp'), desktopWebp),
    writeFile(join(assetsDirectory, 'scholar-premium-cap-poster.png'), desktopPng),
    writeFile(join(assetsDirectory, 'scholar-premium-cap-poster-mobile.webp'), mobileWebp),
    writeFile(join(assetsDirectory, 'scholar-premium-og.webp'), ogWebp),
  ]);

  return desktopMeta;
}

async function generatePlaceholderPosters() {
  const lockupPath = join(assetsDirectory, 'scholar-premium-lockup.png');
  const base = existsSync(lockupPath)
    ? sharp(lockupPath).resize(920, 800, { fit: 'contain', background: midnightBackground })
    : sharp({
        create: {
          width: 920,
          height: 800,
          channels: 3,
          background: midnightBackground,
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
