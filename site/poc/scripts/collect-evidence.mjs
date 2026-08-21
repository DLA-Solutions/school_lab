import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir, platform, release } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright-core';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const evidenceDirectory = join(projectDirectory, 'evidence');
const chromeExecutable = findChromeExecutable();
const previewPort = await findAvailablePort();
const previewUrl = `http://127.0.0.1:${previewPort}/`;
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
  {
    cwd: projectDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

await mkdir(evidenceDirectory, { recursive: true });

try {
  await waitForPreview(previewUrl, previewProcess);

  const browser = await launchEvidenceChrome();

  const browserVersion = await browser.version();
  const captures = {};

  try {
    captures.mobile320 = await captureFrame(browser, {
      name: 'mobile-320-chrome',
      viewport: { width: 320, height: 720 },
      deviceScaleFactor: 2,
    });
    captures.mobile = await captureFrame(browser, {
      name: 'mobile-chrome',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      captureFocusStates: true,
    });
    captures.tablet = await captureFrame(browser, {
      name: 'tablet-chrome',
      viewport: { width: 768, height: 900 },
    });
    captures.automaticArrival = await captureAutomaticArrival(browser);
    captures.desktop = await captureFrame(browser, {
      name: 'desktop-chrome',
      viewport: { width: 1440, height: 900 },
      testContextRestoration: true,
      activate3d: true,
    });
    captures.desktopWide = await captureFrame(browser, {
      name: 'desktop-1920-chrome',
      viewport: { width: 1920, height: 1080 },
    });
    captures.reducedMotion = await captureFrame(browser, {
      name: 'reduced-motion-chrome',
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    captures.fallback = await captureFrame(browser, {
      name: 'fallback-chrome',
      viewport: { width: 1440, height: 900 },
      blockModel: true,
      activate3d: true,
    });
  } finally {
    await browser.close();
  }

  const performanceBrowser = await launchEvidenceChrome(false);
  try {
    const performanceCapture = await captureFrame(performanceBrowser, {
      name: 'desktop-performance-chrome',
      viewport: { width: 1440, height: 900 },
      measureFrames: true,
      activate3d: true,
    });
    captures.desktop.frameTiming = performanceCapture.frameTiming;
    captures.desktop.labInteractionLatency =
      performanceCapture.labInteractionLatency;
    captures.desktop.performanceCapture =
      'evidence/desktop-performance-chrome.png';
  } finally {
    await performanceBrowser.close();
  }

  const engineSmoke = {
    firefox: await captureEngineSmoke(firefox, 'firefox-engine'),
    webkit: await captureEngineSmoke(webkit, 'webkit-engine'),
  };
  const mobileLighthouseSamples = [];
  for (let sample = 1; sample <= 3; sample += 1) {
    mobileLighthouseSamples.push(
      await runLighthouse('mobile', previewUrl, chromeExecutable, sample),
    );
  }
  const lighthouse = {
    mobile: summarizeMobileLighthouse(mobileLighthouseSamples),
    desktop: await runLighthouse('desktop', previewUrl, chromeExecutable, 1),
  };
  const verification = buildVerification(captures, lighthouse);
  const lazySceneChunk = await readLazySceneChunk();

  const summary = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    environment: {
      browser: browserVersion,
      operatingSystem: `${platform()} ${release()}`,
      node: process.version,
      previewUrl,
      headless: true,
      chromeGpuRenderer: captures.desktop.gpuRenderer,
      chromeCaptureFlags: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      performanceGpuRenderer:
        captures.desktop.frameTiming?.scene.gpuRenderer ?? 'unavailable',
      performanceChromeFlags:
        'Default Chrome GPU selection; renderer recorded from WebGL.',
      lighthouseGpuMode: 'SwiftShader forced through Chrome flags',
    },
    measurementSchedule: [
      'Chrome screenshots and runtime checks',
      'Dedicated fresh Chrome SwiftShader scene timing',
      'Firefox engine smoke',
      'WebKit engine smoke',
      'Three sequential mobile Lighthouse samples',
      'One desktop Lighthouse sample',
    ],
    captures,
    engineSmoke,
    lighthouse,
    bundle: {
      lazySceneChunk,
    },
    verification,
    residualGaps: [
      'Physical Safari, iOS Safari, and Android Chrome were not exercised by this harness.',
      'Headless SwiftShader evidence does not replace physical-device GPU and frame-time review.',
      'Lighthouse mobile throttling is simulated and must be identified as such in review.',
      'The scene workload is a main-thread CPU submission measurement around renderer.render, not GPU completion time or a DevTools trace.',
      'Global headless requestAnimationFrame cadence is retained as a non-gating scheduler diagnostic.',
      'The lab interaction measurement uses trusted Playwright input and Event Timing when supported; it is not field INP.',
      ...Object.entries(engineSmoke)
        .filter(([, result]) => !result.available)
        .map(
          ([engine, result]) =>
            `${engine} engine smoke was unavailable: ${result.error}`,
        ),
    ],
  };

  await writeFile(
    join(evidenceDirectory, 'runtime-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  await appendRuntimeHistory(summary);

  console.log(`Evidence written to ${evidenceDirectory}`);
  console.log(
    `390×844 CTAs: ${formatCoordinates(captures.mobile.ctas)}`,
  );
  console.log(
    `768×900 CTAs: ${formatCoordinates(captures.tablet.ctas)}`,
  );
  console.log(
    `1920×1080 CTAs: ${formatCoordinates(captures.desktopWide.ctas)}`,
  );

  if (!verification.corePassed || !verification.performancePassed) {
    const failedChecks = [
      ...verification.coreChecks,
      ...Object.values(verification.performanceTargets).filter(
        (target) => 'passed' in target,
      ),
    ].filter((check) => check.passed === false);
    throw new Error(
      `Required verification failed: ${failedChecks
        .map((check) => check.name ?? check.metric)
        .join(', ')}`,
    );
  }
} finally {
  previewProcess.kill('SIGTERM');
}

function launchEvidenceChrome(forceSwiftShader = true) {
  return chromium.launch({
    executablePath: chromeExecutable,
    headless: true,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      ...(forceSwiftShader
        ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        : []),
    ],
  });
}

async function captureFrame(browser, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: options.reducedMotion ?? 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const apiRequests = [];
  const sceneAssetRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('request', (request) => {
    if (request.url().includes('/api/v1')) {
      apiRequests.push(request.url());
    }
    if (
      /\/scene-[^/]+\.js|three\.module|GLTFLoader|scholar-premium-graduation-cap\.glb/i.test(
        request.url(),
      )
    ) {
      sceneAssetRequests.push(request.url());
    }
  });

  if (options.blockModel) {
    await page.route('**/scholar-premium-graduation-cap.glb', (route) => route.abort());
  }

  await page.goto(previewUrl, { waitUntil: 'load' });
  await page.waitForFunction(
    () =>
      document.documentElement.classList.contains('scene-ready') ||
      document.documentElement.classList.contains('scene-fallback') ||
      document.documentElement.classList.contains('scene-static'),
    undefined,
    { timeout: 10_000 },
  );

  if (options.activate3d) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await page.waitForTimeout(250);
      await page.mouse.move(24 + attempt * 3, 24 + attempt * 2);
      const activated = await page.evaluate(
        () =>
          document.documentElement.classList.contains('scene-ready') ||
          document.documentElement.classList.contains('scene-fallback'),
      );
      if (activated) {
        break;
      }
    }
    await page.waitForFunction(
      () =>
        document.documentElement.classList.contains('scene-ready') ||
        document.documentElement.classList.contains('scene-fallback'),
      undefined,
      { timeout: 10_000 },
    );
  }
  await page.waitForTimeout(250);

  const runtime = await page.evaluate(() => {
    const rectangle = (selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const bounds = element.getBoundingClientRect();
      return {
        x: round(bounds.x),
        y: round(bounds.y),
        width: round(bounds.width),
        height: round(bounds.height),
        right: round(bounds.right),
        bottom: round(bounds.bottom),
        fullyInViewport:
          bounds.top >= 0 &&
          bounds.left >= 0 &&
          bounds.right <= window.innerWidth &&
          bounds.bottom <= window.innerHeight,
      };
    };

    const textSize = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).fontSize : null;
    };

    const textSelectors = [
      'h1',
      '.hero__lead',
      '.hero__evidence',
      '.hero__evidence span:first-child',
      '.hero__evidence span:last-child',
      '.hero__signature',
    ];

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      headline: rectangle('h1'),
      supportingCopy: rectangle('.hero__lead'),
      evidence: rectangle('.hero__evidence'),
      textBounds: Object.fromEntries(
        textSelectors.map((selector) => [selector, rectangle(selector)]),
      ),
      ctas: {
        primary: rectangle('.button--primary'),
        secondary: rectangle('.button--secondary'),
      },
      fontSizes: {
        headline: textSize('h1'),
        supportingCopy: textSize('.hero__lead'),
        buttons: textSize('.button'),
      },
      rootClasses: [...document.documentElement.classList],
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      platformTarget: document.querySelector('.button--secondary')?.getAttribute('href'),
      visibleHeaderFragments: [...document.querySelectorAll('.site-header a')]
        .map((element) => element.getAttribute('href'))
        .filter((href) => href?.startsWith('#')),
      thread: {
        present: Boolean(document.querySelector('.legacy-thread')),
        animationName: getComputedStyle(
          document.querySelector('.legacy-thread__path--wide'),
        ).animationName,
      },
      gpuRenderer: (() => {
        if (!document.documentElement.classList.contains('scene-ready')) {
          return 'not initialized (intentional static mode)';
        }
        const canvas = document.querySelector('#hero-canvas');
        const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
        const debug = gl?.getExtension('WEBGL_debug_renderer_info');
        return debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : 'WebGL renderer unavailable';
      })(),
    };

    function round(value) {
      return Math.round(value * 100) / 100;
    }
  });

  const focusOrder = [];
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab');
    focusOrder.push(
      await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement)) {
          return null;
        }
        const style = getComputedStyle(element);
        return {
          text: element.textContent?.trim() || element.getAttribute('aria-label'),
          href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
        };
      }),
    );
  }

  let focusStates = null;
  if (options.captureFocusStates) {
    focusStates = {};
    for (const [name, selector] of [
      ['primary', '.button--primary'],
      ['secondary', '.button--secondary'],
    ]) {
      await page.focus(selector);
      await page.waitForTimeout(100);
      const computed = await page.evaluate((targetSelector) => {
        const element = document.querySelector(targetSelector);
        if (!(element instanceof HTMLElement)) {
          return null;
        }
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          boxShadow: style.boxShadow,
        };
      }, selector);
      const focusScreenshot = `focus-${name}-cta-chrome.png`;
      await page.screenshot({
        path: join(evidenceDirectory, focusScreenshot),
        fullPage: false,
      });
      focusStates[name] = {
        screenshot: `evidence/${focusScreenshot}`,
        computed,
      };
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  }

  let frameTiming = null;
  let labInteractionLatency = null;
  if (options.measureFrames) {
    labInteractionLatency = await measureLabInteractionLatency(
      page,
      options.viewport,
    );
    await page.waitForTimeout(500);
    frameTiming = await measureSceneAndScheduler(page, options.viewport);
  }

  let contextRestoration = null;
  if (options.testContextRestoration) {
    contextRestoration = await page.evaluate(async () => {
      const canvas = document.querySelector('#hero-canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const extension = gl?.getExtension('WEBGL_lose_context');

      if (!extension) {
        return { supported: false };
      }

      extension.loseContext();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const duringLoss = [...document.documentElement.classList];
      extension.restoreContext();
      await new Promise((resolve) => setTimeout(resolve, 750));
      const afterRestoration = [...document.documentElement.classList];

      return {
        supported: true,
        duringLoss,
        afterRestoration,
        staleFallback:
          afterRestoration.includes('scene-fallback') ||
          !afterRestoration.includes('scene-ready'),
      };
    });
  }

  const screenshotPath = join(evidenceDirectory, `${options.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await context.close();

  return {
    screenshot: `evidence/${options.name}.png`,
    mode: options.blockModel
      ? 'GLB request blocked; CSS fallback'
      : options.reducedMotion === 'reduce'
        ? 'prefers-reduced-motion: reduce'
        : 'default',
    ...runtime,
    ctas: runtime.ctas,
    noHorizontalOverflow: runtime.scrollWidth === runtime.clientWidth,
    focusOrder,
    focusStates,
    contextRestoration,
    frameTiming,
    labInteractionLatency,
    apiRequests,
    sceneAssetRequests,
    consoleErrors,
  };
}

async function captureAutomaticArrival(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__scholarRootStateTimeline = [];
    const record = () => {
      window.__scholarRootStateTimeline.push({
        at: performance.now(),
        classes: [...document.documentElement.classList],
      });
    };
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        record();
        new MutationObserver(record).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
      },
      { once: true },
    );
    window.addEventListener(
      'load',
      () => {
        window.__scholarLoadAt = performance.now();
        record();
      },
      { once: true },
    );
  });

  await page.goto(previewUrl, { waitUntil: 'load' });
  const initial = await visualSceneState(page);
  await page.screenshot({
    path: join(evidenceDirectory, 'desktop-auto-static-chrome.png'),
    fullPage: false,
  });

  await page.waitForFunction(
    () =>
      document.documentElement.classList.contains('scene-ready') ||
      document.documentElement.classList.contains('scene-fallback'),
    undefined,
    { timeout: 5000 },
  );
  await page.waitForTimeout(600);
  const arrived = await visualSceneState(page);
  await page.screenshot({
    path: join(evidenceDirectory, 'desktop-auto-arrival-chrome.png'),
    fullPage: false,
  });

  await page.waitForFunction(
    () => {
      const state = window.__scholarSceneState?.snapshot();
      return Boolean(state?.arrivalSettledAt && !state.renderScheduled);
    },
    undefined,
    { timeout: 5000 },
  );
  const settled = await visualSceneState(page);
  await page.screenshot({
    path: join(evidenceDirectory, 'desktop-auto-settled-chrome.png'),
    fullPage: false,
  });

  await page.waitForTimeout(1000);
  const afterQuietWindow = await visualSceneState(page);
  const timing = await page.evaluate(() => ({
    loadAt: window.__scholarLoadAt,
    rootStateTimeline: window.__scholarRootStateTimeline,
  }));
  await context.close();

  return {
    viewport: { width: 1440, height: 900 },
    input: 'No pointer or keyboard input before scene readiness and settlement.',
    finiteWindowTargetMs: 5000,
    screenshots: {
      static: 'evidence/desktop-auto-static-chrome.png',
      arrival: 'evidence/desktop-auto-arrival-chrome.png',
      settled: 'evidence/desktop-auto-settled-chrome.png',
    },
    initial,
    arrived,
    settled,
    afterQuietWindow,
    timing: {
      ...timing,
      initialisedAfterLoadMs:
        arrived.sceneState.initialisedAt - timing.loadAt,
      modelReadyAfterLoadMs: arrived.sceneState.modelReadyAt - timing.loadAt,
      settledAfterLoadMs: settled.sceneState.arrivalSettledAt - timing.loadAt,
    },
    visualStateChanged:
      initial.canvasOpacity !== arrived.canvasOpacity &&
      initial.posterOpacity !== arrived.posterOpacity,
    renderLoopStopped:
      settled.sceneState.renderScheduled === false &&
      settled.sceneState.totalRenderCount ===
        afterQuietWindow.sceneState.totalRenderCount,
  };
}

async function visualSceneState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.hero__canvas');
    const poster = document.querySelector('.cap-poster');
    return {
      at: performance.now(),
      rootClasses: [...document.documentElement.classList],
      canvasOpacity: canvas ? getComputedStyle(canvas).opacity : null,
      posterOpacity: poster ? getComputedStyle(poster).opacity : null,
      sceneState: window.__scholarSceneState?.snapshot() ?? null,
    };
  });
}

async function measureLabInteractionLatency(page, viewport) {
  const setup = await page.evaluate(() => {
    const supported =
      typeof PerformanceEventTiming !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes.includes('event');
    if (!supported) {
      return {
        supported: false,
        status: 'PerformanceEventTiming is not supported by this engine.',
      };
    }

    window.__scholarLabEventEntries = [];
    window.__scholarLabEventStartedAt = performance.now();
    window.__scholarLabEventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime < window.__scholarLabEventStartedAt) {
          continue;
        }
        window.__scholarLabEventEntries.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          interactionId: entry.interactionId,
        });
      }
    });
    window.__scholarLabEventObserver.observe({
      type: 'event',
      buffered: false,
      durationThreshold: 16,
    });
    return { supported: true };
  });

  if (!setup.supported) {
    return {
      ...setup,
      label: 'Lab interaction-latency proxy; not field INP.',
    };
  }

  await page.mouse.click(viewport.width * 0.74, viewport.height * 0.72);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  const entries = await page.evaluate(() => {
    window.__scholarLabEventObserver?.disconnect();
    return window.__scholarLabEventEntries ?? [];
  });
  const interactionEntries = entries.filter(
    (entry) => entry.interactionId > 0 || entry.name === 'keydown',
  );
  const durations = interactionEntries.map((entry) => entry.duration);
  const inputDelays = interactionEntries.map(
    (entry) => entry.processingStart - entry.startTime,
  );

  return {
    supported: true,
    status:
      interactionEntries.length > 0
        ? 'measured'
        : 'supported, but no qualifying PerformanceEventTiming entries were emitted',
    label:
      'Lab interaction-latency proxy from trusted Playwright mouse/keyboard input and PerformanceEventTiming; not field INP.',
    input: 'Trusted Playwright mouse click followed by keyboard Tab.',
    durationThresholdMs: 16,
    sampleCount: interactionEntries.length,
    duration: statisticsForNumbers(durations),
    inputDelay: statisticsForNumbers(inputDelays),
    entries: interactionEntries,
    target: 'Diagnostic only; field INP remains unmeasured.',
  };
}

async function measureSceneAndScheduler(page, viewport) {
  const measurementPromise = page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const sceneMetrics = window.__scholarSceneMetrics;
        if (!sceneMetrics) {
          reject(new Error('Scene metrics controller is unavailable.'));
          return;
        }

        const schedulerDeltas = [];
        const schedulerStartedAt = performance.now();
        let previousTimestamp;
        let running = true;

        const sampleScheduler = (timestamp) => {
          if (!running) {
            return;
          }
          if (previousTimestamp !== undefined) {
            schedulerDeltas.push(timestamp - previousTimestamp);
          }
          previousTimestamp = timestamp;
          requestAnimationFrame(sampleScheduler);
        };

        sceneMetrics.start();
        requestAnimationFrame(sampleScheduler);
        setTimeout(() => {
          running = false;
          const schedulerStoppedAt = performance.now();
          resolve({
            scene: sceneMetrics.stop(),
            globalScheduler: {
              label:
                'Global headless requestAnimationFrame scheduler cadence during the same measurement window; non-gating diagnostic.',
              recordingDurationMs: schedulerStoppedAt - schedulerStartedAt,
              cadence: browserStatistics(schedulerDeltas),
              percentileCalculation:
                'Nearest-rank percentile: sort ascending and select index max(0, ceil(p × n) - 1).',
            },
          });
        }, 10_000);

        function browserStatistics(samples) {
          if (samples.length === 0) {
            return {
              sampleCount: 0,
              minimumMs: null,
              medianMs: null,
              p95Ms: null,
              maximumMs: null,
              meanMs: null,
            };
          }
          const ordered = [...samples].sort((left, right) => left - right);
          const nearestRank = (percentile) =>
            ordered[Math.max(0, Math.ceil(percentile * ordered.length) - 1)];
          return {
            sampleCount: ordered.length,
            minimumMs: ordered[0],
            medianMs: nearestRank(0.5),
            p95Ms: nearestRank(0.95),
            maximumMs: ordered.at(-1),
            meanMs:
              ordered.reduce((sum, value) => sum + value, 0) / ordered.length,
          };
        }
      }),
  );

  const inputStartedAt = performance.now();
  let pointerMoves = 0;
  while (performance.now() - inputStartedAt < 10_000) {
    const elapsed = performance.now() - inputStartedAt;
    const progress = Math.min(elapsed / 10_000, 1);
    await page.mouse.move(
      120 + progress * (viewport.width - 240),
      viewport.height * (0.35 + Math.sin(progress * Math.PI * 4) * 0.2),
    );
    pointerMoves += 1;
    const remaining = 10_000 - (performance.now() - inputStartedAt);
    if (remaining > 0) {
      await page.waitForTimeout(Math.min(250, remaining));
    }
  }
  const pointerInputDurationMs = performance.now() - inputStartedAt;
  const measurements = await measurementPromise;

  return {
    pointerInput: {
      targetDurationMs: 10_000,
      observedDurationMs: pointerInputDurationMs,
      trusted: true,
      pointerMoves,
      path: 'Bounded four-arc path inside the desktop viewport.',
    },
    ...measurements,
  };
}

async function captureEngineSmoke(browserType, name) {
  let browser;

  try {
    browser = await browserType.launch({ headless: true });
    const version = browser.version();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(previewUrl, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.documentElement.classList.contains('scene-static'),
      undefined,
      { timeout: 5000 },
    );

    const result = await page.evaluate(() => {
      const bounds = (selector) => {
        const rectangle = document
          .querySelector(selector)
          ?.getBoundingClientRect();
        return rectangle
          ? {
              left: rectangle.left,
              right: rectangle.right,
              top: rectangle.top,
              bottom: rectangle.bottom,
            }
          : null;
      };

      return {
        headline: bounds('h1'),
        primaryCta: bounds('.button--primary'),
        secondaryCta: bounds('.button--secondary'),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        platformTarget: document
          .querySelector('.button--secondary')
          ?.getAttribute('href'),
      };
    });

    await page.screenshot({
      path: join(evidenceDirectory, `${name}.png`),
      fullPage: false,
    });
    await context.close();

    return {
      available: true,
      engine: name.startsWith('firefox') ? 'Firefox' : 'WebKit',
      version,
      screenshot: `evidence/${name}.png`,
      viewport: { width: 390, height: 844 },
      ...result,
      noHorizontalOverflow: result.scrollWidth === result.clientWidth,
    };
  } catch (error) {
    return {
      available: false,
      engine: name.startsWith('firefox') ? 'Firefox' : 'WebKit',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser?.close();
  }
}

async function runLighthouse(profile, url, chromePath, sampleNumber) {
  const outputPath = join(
    evidenceDirectory,
    `lighthouse-${profile}-${sampleNumber}.json`,
  );
  const lighthouseExecutable = join(
    projectDirectory,
    'node_modules',
    'lighthouse',
    'cli',
    'index.js',
  );
  const commonArguments = [
    lighthouseExecutable,
    url,
    '--quiet',
    `--chrome-path=${chromePath}`,
    '--output=json',
    `--output-path=${outputPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader',
  ];
  const profileArguments =
    profile === 'desktop'
      ? ['--preset=desktop']
      : [
          '--form-factor=mobile',
          '--screenEmulation.mobile=true',
          '--screenEmulation.width=390',
          '--screenEmulation.height=844',
          '--screenEmulation.deviceScaleFactor=2',
          '--throttling-method=simulate',
          '--throttling.cpuSlowdownMultiplier=4',
        ];

  await run(process.execPath, [...commonArguments, ...profileArguments], projectDirectory);
  const report = JSON.parse(await readFile(outputPath, 'utf8'));

  return {
    sample: sampleNumber,
    report: `evidence/lighthouse-${profile}-${sampleNumber}.json`,
    profile:
      profile === 'desktop'
        ? 'Lighthouse desktop preset'
        : '390×844, DPR 2, simulated throttling, 4× CPU slowdown',
    scores: Object.fromEntries(
      Object.entries(report.categories).map(([key, category]) => [key, category.score]),
    ),
    metrics: {
      firstContentfulPaintMs:
        report.audits['first-contentful-paint']?.numericValue ?? null,
      largestContentfulPaintMs:
        report.audits['largest-contentful-paint']?.numericValue ?? null,
      cumulativeLayoutShift:
        report.audits['cumulative-layout-shift']?.numericValue ?? null,
      totalBlockingTimeMs:
        report.audits['total-blocking-time']?.numericValue ?? null,
      speedIndexMs: report.audits['speed-index']?.numericValue ?? null,
    },
  };
}

function summarizeMobileLighthouse(samples) {
  const lcpSamples = samples.map(
    (sample) => sample.metrics.largestContentfulPaintMs,
  );
  const tbtSamples = samples.map(
    (sample) => sample.metrics.totalBlockingTimeMs,
  );
  const clsSamples = samples.map(
    (sample) => sample.metrics.cumulativeLayoutShift,
  );
  const lcpMedian = median(lcpSamples);
  const lcpWorst = Math.max(...lcpSamples);
  const lcpBest = Math.min(...lcpSamples);
  const lcpStable = lcpWorst - lcpBest <= 750;
  const allLcpSamplesPass = lcpSamples.every((value) => value <= 2500);

  return {
    profile: '390×844, DPR 2, simulated throttling, 4× CPU slowdown',
    samples,
    summary: {
      lcpMs: {
        values: lcpSamples,
        median: lcpMedian,
        worst: lcpWorst,
        best: lcpBest,
        spread: lcpWorst - lcpBest,
        target: '≤ 2500 ms',
        allSamplesPass: allLcpSamplesPass,
        stable: lcpStable,
      },
      tbtMs: {
        values: tbtSamples,
        median: median(tbtSamples),
        worst: Math.max(...tbtSamples),
      },
      cls: {
        values: clsSamples,
        median: median(clsSamples),
        worst: Math.max(...clsSamples),
        target: '≤ 0.1',
      },
      performanceApproved: allLcpSamplesPass && lcpStable,
    },
  };
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[midpoint - 1] + ordered[midpoint]) / 2
    : ordered[midpoint];
}

function statisticsForNumbers(values) {
  if (values.length === 0) {
    return {
      sampleCount: 0,
      minimumMs: null,
      medianMs: null,
      p95Ms: null,
      maximumMs: null,
      meanMs: null,
    };
  }

  const ordered = [...values].sort((left, right) => left - right);
  const nearestRank = (percentile) =>
    ordered[Math.max(0, Math.ceil(percentile * ordered.length) - 1)];
  return {
    sampleCount: ordered.length,
    minimumMs: ordered[0],
    medianMs: nearestRank(0.5),
    p95Ms: nearestRank(0.95),
    maximumMs: ordered.at(-1),
    meanMs: ordered.reduce((sum, value) => sum + value, 0) / ordered.length,
  };
}

async function readLazySceneChunk() {
  const manifestPath = join(projectDirectory, 'dist', '.vite', 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry =
    manifest['src/scene.ts'] ??
    Object.values(manifest).find(
      (candidate) =>
        candidate.src === 'src/scene.ts' || candidate.file.includes('scene-'),
    );
  if (!entry) {
    throw new Error('The lazy scene chunk was not found in the Vite manifest.');
  }

  const chunkPath = join(projectDirectory, 'dist', entry.file);
  const chunkStat = await stat(chunkPath);
  return {
    file: entry.file,
    bytes: chunkStat.size,
    kibibytes: chunkStat.size / 1024,
    isDynamicEntry: entry.isDynamicEntry === true,
    source: entry.src ?? 'src/scene.ts',
  };
}

async function appendRuntimeHistory(summary) {
  const historyPath = join(evidenceDirectory, 'runtime-history.json');
  let history;
  try {
    const existing = JSON.parse(await readFile(historyPath, 'utf8'));
    history = Array.isArray(existing.runs) ? existing.runs : [];
  } catch {
    history = [];
  }

  history.push({
    generatedAt: summary.generatedAt,
    passed: summary.verification.corePassed && summary.verification.performancePassed,
    mobileLcp: summary.verification.performanceTargets.mobileLcp,
    mobileCls: summary.verification.performanceTargets.mobileCls,
    desktopSceneFrameWorkload:
      summary.verification.performanceTargets.desktopSceneFrameWorkload,
    activeSceneRenderCadence:
      summary.verification.performanceTargets.activeSceneRenderCadence,
    globalHeadlessScheduler:
      summary.verification.performanceTargets.globalHeadlessScheduler,
    automaticArrival: summary.captures.automaticArrival,
    labInteractionLatency: summary.captures.desktop.labInteractionLatency,
    lazySceneChunk: summary.bundle.lazySceneChunk,
  });

  await writeFile(
    historyPath,
    `${JSON.stringify({ schemaVersion: 1, runs: history.slice(-10) }, null, 2)}\n`,
  );
}

async function waitForPreview(url, processHandle) {
  let lastError;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Preview exited with code ${processHandle.exitCode}.`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Preview did not become ready: ${String(lastError)}`);
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
    join(homedir(), '.cache', 'ms-playwright', 'chromium', 'chrome-mac', 'Chromium.app'),
  ].filter(Boolean);

  const candidate = candidates.find((path) => {
    return Boolean(path && existsSync(path) && dirname(path));
  });

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
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error('Could not allocate a preview port.'));
        }
      });
    });
  });
}

function run(command, arguments_, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

function formatCoordinates(ctas) {
  return ['primary', 'secondary']
    .map((name) => {
      const value = ctas[name];
      return `${name} (x=${value.x}, y=${value.y}, right=${value.right}, bottom=${value.bottom})`;
    })
    .join('; ');
}

function buildVerification(captures, lighthouse) {
  const requiredCaptures = [
    captures.mobile320,
    captures.mobile,
    captures.tablet,
    captures.desktop,
    captures.desktopWide,
    captures.reducedMotion,
    captures.fallback,
  ];
  const coreChecks = [
    {
      name: '320×720 text boxes remain inside the viewport',
      passed: Object.values(captures.mobile320.textBounds).every(
        (bounds) => bounds?.fullyInViewport,
      ),
    },
    {
      name: '390×844 text boxes remain inside the viewport',
      passed: Object.values(captures.mobile.textBounds).every(
        (bounds) => bounds?.fullyInViewport,
      ),
    },
    {
      name: '390×844 CTAs are fully inside the first viewport',
      passed:
        captures.mobile.ctas.primary.fullyInViewport &&
        captures.mobile.ctas.secondary.fullyInViewport,
    },
    {
      name: '768×900 CTAs are fully inside the first viewport',
      passed:
        captures.tablet.ctas.primary.fullyInViewport &&
        captures.tablet.ctas.secondary.fullyInViewport,
    },
    {
      name: '1920×1080 content and CTAs are fully inside the first viewport',
      passed:
        captures.desktopWide.headline.fullyInViewport &&
        captures.desktopWide.supportingCopy.fullyInViewport &&
        captures.desktopWide.ctas.primary.fullyInViewport &&
        captures.desktopWide.ctas.secondary.fullyInViewport,
    },
    {
      name: 'desktop scene starts automatically and visibly after load',
      passed:
        captures.automaticArrival.input.startsWith('No pointer') &&
        captures.automaticArrival.visualStateChanged &&
        captures.automaticArrival.arrived.rootClasses.includes('scene-ready') &&
        captures.automaticArrival.timing.initialisedAfterLoadMs >= 0 &&
        captures.automaticArrival.timing.settledAfterLoadMs <=
          captures.automaticArrival.finiteWindowTargetMs,
    },
    {
      name: 'automatic arrival settles without an endless render loop',
      passed: captures.automaticArrival.renderLoopStopped,
    },
    {
      name: 'all captures have no horizontal overflow',
      passed: requiredCaptures.every((capture) => capture.noHorizontalOverflow),
    },
    {
      name: 'focus order and outlines are robust',
      passed: requiredCaptures.every(
        (capture) =>
          capture.focusOrder.length === 4 &&
          capture.focusOrder.every(
            (focus) =>
              focus?.outlineStyle === 'solid' &&
              focus.outlineWidth === '4px' &&
              focus.boxShadow !== 'none',
          ),
      ),
    },
    {
      name: 'both CTA focus states have persisted multi-ring evidence',
      passed: ['primary', 'secondary'].every((name) => {
        const focusState = captures.mobile.focusStates?.[name];
        const shadow = focusState?.computed?.boxShadow ?? '';
        return (
          focusState?.screenshot &&
          focusState.computed.outlineStyle === 'solid' &&
          focusState.computed.outlineWidth === '4px' &&
          shadow !== 'none' &&
          shadow.split('rgb').length >= 4
        );
      }),
    },
    {
      name: 'constrained viewports avoid Three.js and GLB requests',
      passed: [captures.mobile320, captures.mobile, captures.tablet].every(
        (capture) =>
          capture.rootClasses.includes('scene-static') &&
          capture.sceneAssetRequests.length === 0,
      ),
    },
    {
      name: 'platform CTA bypasses the isolated preview fallback',
      passed: requiredCaptures.every(
        (capture) =>
          capture.platformTarget ===
          'https://scholarpremium.com.br/app/authentication/signin',
      ),
    },
    {
      name: 'header has no indistinct fragment destinations',
      passed: requiredCaptures.every(
        (capture) => capture.visibleHeaderFragments.length === 0,
      ),
    },
    {
      name: 'reduced motion disables thread animation',
      passed:
        captures.reducedMotion.reducedMotion &&
        captures.reducedMotion.thread.animationName === 'none',
    },
    {
      name: 'fallback remains stable when the model is blocked',
      passed: captures.fallback.rootClasses.includes('scene-fallback'),
    },
    {
      name: 'context restoration clears stale fallback state',
      passed:
        captures.desktop.contextRestoration?.supported === true &&
        captures.desktop.contextRestoration.staleFallback === false,
    },
    {
      name: 'no API requests are observed',
      passed: requiredCaptures.every(
        (capture) => capture.apiRequests.length === 0,
      ),
    },
  ];

  const performanceTargets = {
      mobileLcp: {
        metric: 'Repeated mobile LCP',
        samples: lighthouse.mobile.summary.lcpMs.values,
        median: `${lighthouse.mobile.summary.lcpMs.median} ms`,
        worst: `${lighthouse.mobile.summary.lcpMs.worst} ms`,
        target: '≤ 2.5 s',
        stable: lighthouse.mobile.summary.lcpMs.stable,
        passed: lighthouse.mobile.summary.performanceApproved,
      },
      mobileCls: {
        metric: 'Repeated mobile CLS',
        samples: lighthouse.mobile.summary.cls.values,
        observed: lighthouse.mobile.summary.cls.worst,
        target: '≤ 0.1',
        passed: lighthouse.mobile.summary.cls.worst <= 0.1,
      },
      mobileTbt: {
        metric: 'Mobile TBT diagnostic',
        samples: lighthouse.mobile.summary.tbtMs.values,
        median: `${lighthouse.mobile.summary.tbtMs.median} ms`,
        worst: `${lighthouse.mobile.summary.tbtMs.worst} ms`,
        target: 'reported diagnostic; no POC AC threshold',
      },
      desktopSceneFrameWorkload: {
        metric: 'Desktop scene renderer.render CPU workload',
        sampleCount:
          captures.desktop.frameTiming?.scene.renderCpuDuration.sampleCount ?? 0,
        recordingDurationMs:
          captures.desktop.frameTiming?.scene.recordingDurationMs ?? null,
        gpuRenderer:
          captures.desktop.frameTiming?.scene.gpuRenderer ?? 'unavailable',
        observed:
          captures.desktop.frameTiming?.scene.renderCpuDuration.p95Ms ?? null,
        target: '≤ 20 ms',
        passed:
          (captures.desktop.frameTiming?.scene.renderCpuDuration.sampleCount ?? 0) >
            0 &&
          (captures.desktop.frameTiming?.scene.renderCpuDuration.p95Ms ??
            Infinity) <= 20,
        method:
          'Nearest-rank p95 of main-thread CPU duration measured immediately around renderer.render during 10 seconds of bounded trusted pointer input. This measures CPU submission workload, not GPU completion.',
      },
      activeSceneRenderCadence: {
        metric: 'Active scene interpolation cadence',
        ...captures.desktop.frameTiming?.scene.activeRenderInterval,
        recordingDurationMs:
          captures.desktop.frameTiming?.scene.recordingDurationMs ?? null,
        target: '≤ 20 ms',
        passed:
          (captures.desktop.frameTiming?.scene.activeRenderInterval.sampleCount ??
            0) > 0 &&
          (captures.desktop.frameTiming?.scene.activeRenderInterval.p95Ms ??
            Infinity) <= 20,
        gating: true,
        method:
          'Nearest-rank p95 between consecutive renders within active interpolation bursts; inactive event-driven gaps reset the interval chain and are excluded.',
      },
      globalHeadlessScheduler: {
        metric: 'Global headless rAF scheduler diagnostic',
        ...captures.desktop.frameTiming?.globalScheduler.cadence,
        recordingDurationMs:
          captures.desktop.frameTiming?.globalScheduler.recordingDurationMs ??
          null,
        gating: false,
      },
      labInteractionLatency: {
        metric: 'Lab interaction-latency proxy',
        ...captures.desktop.labInteractionLatency,
        gating: false,
        fieldInpMeasured: false,
      },
    };

  return {
    corePassed: coreChecks.every((check) => check.passed),
    coreChecks,
    performancePassed: [
      performanceTargets.mobileLcp,
      performanceTargets.mobileCls,
      performanceTargets.desktopSceneFrameWorkload,
      performanceTargets.activeSceneRenderCadence,
    ].every((target) => target.passed),
    performanceTargets,
  };
}
