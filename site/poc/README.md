# Scholar Premium — Frame 01 hero POC

Isolated implementation of the `Arrival / legacy` hero. It does not replace the production
placeholder in `site/public`.

## Stack and assets

- Vite + TypeScript + Three.js, with native CSS and `requestAnimationFrame`.
- Self-hosted Inter and Cormorant Garamond font files supplied by Fontsource packages on desktop;
  constrained viewports use robust system serif/sans fallbacks to avoid font-driven LCP shifts.
- Optimized official lockup derivative sourced from `site/public/brand-lockup.png`.
- Repository-owned runtime copy of the supplied model at
  `public/assets/scholar-premium-graduation-cap.glb`.
- CSS poster is the intentional mobile, coarse-pointer, reduced-motion, and constrained-context
  composition. Those paths do not request Three.js or the GLB.
- On capable desktop/fine-pointer contexts, Three.js is armed only after `load`, two settled paint
  frames, and browser idle. Pointer intent accelerates initialization; otherwise a 1.6-second
  fallback timeout starts it automatically. The scene lives in a separate lazy module with named
  Three.js imports; rendering stops after each bounded interpolation.

## Run locally

```bash
cd site/poc
npm install
npm run dev
```

For the production artifact:

```bash
npm run check
npx playwright-core install firefox webkit
npm run evidence
npm run preview -- --host 127.0.0.1 --port 4173
```

`npm run check` runs ESLint, strict TypeScript checking, a production Vite build, and static
inspection of the built output. The inspection verifies the public brand boundary, one `h1`,
approved display copy, provisional demo mailto and platform CTA destinations,
skip/navigation/canvas semantics, SEO/social metadata,
relative hashed assets, manifest identity, the local model/lockup, and the absence of API and
analytics markers.

`npm run evidence` requires an installed Chrome (or `CHROME_PATH`) and writes repository-owned
screenshots, raw Lighthouse reports, `runtime-summary.json`, and the last ten concise run records in
`runtime-history.json` to `evidence/`. It launches its own preview on an available port; no
separately running server is required. If Playwright Firefox and WebKit binaries are installed,
exact-engine smoke screenshots are captured too. The command exits non-zero when any repeated
mobile LCP/CLS requirement, desktop render CPU requirement, or active-scene cadence requirement
fails.

## Browser and responsive verification

Use the production preview at `http://127.0.0.1:4173/`. Capture the complete first frame at:

- 320 × 720 and 390 × 844 in current Chrome responsive mode;
- 768 × 900 in current Chrome responsive mode;
- 1440 × 900 and 1920 × 1080 in current Chrome, Safari, and Firefox.

For each viewport:

1. Confirm there is no horizontal scroll with `document.documentElement.scrollWidth ===
   document.documentElement.clientWidth`.
2. Tab from the address bar. Order must be skip link, lockup, primary CTA, then secondary CTA.
   Every item must show a high-contrast outline and multiple outer box-shadow rings through
   `:focus` and `:focus-visible` paths.
3. Confirm the headline and CTAs are selectable live DOM text. At 320, 390, and coarse-pointer
   contexts, confirm the Network panel has no Three.js, GLTFLoader, or GLB request.
4. Confirm “Acessar plataforma” resolves to
   `https://scholarpremium.com.br/app/authentication/signin`, never the isolated preview fallback.
   “Agendar demonstração” intentionally retains its temporary POC mailto and must not be treated as
   the approved production conversion endpoint.
5. Inspect the Network panel and filter for `/api/v1`; the result must remain empty.
6. Verify the cap and gold thread settle after their bounded arrival and only respond subtly to
   pointer movement; neither may run continuously.

### Reduced motion

In Chrome DevTools, open **Rendering → Emulate CSS media feature prefers-reduced-motion:
reduce**, then reload. The cap must render in a settled static pose, pointer movement must not
change the camera, light, or thread, and navigation/content must remain unchanged.

### WebGL and model fallback

Run a second Chrome instance with WebGL disabled:

```bash
open -na "Google Chrome" --args --user-data-dir=/tmp/scholar-premium-poc-no-webgl \
  --disable-webgl http://127.0.0.1:4173/
```

The CSS graduation-cap poster must remain stable with all navigation and CTA interactions intact.
For a model-failure check, block `scholar-premium-graduation-cap.glb` in DevTools request blocking
and reload. For context-loss recovery, execute this in DevTools:

```js
const canvas = document.querySelector('#hero-canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
const extension = gl.getExtension('WEBGL_lose_context');
extension.loseContext();
setTimeout(() => extension.restoreContext(), 1500);
```

The poster must appear during context loss and the rendered cap may return after restoration.

## Lighthouse and frame-time evidence

Record browser version, operating system, viewport, DPR, CPU/network profile, commit SHA, and
timestamp with every result. Run Lighthouse against the production preview using:

- mobile: 390 × 844 CSS pixels, DPR 2, Fast 4G, 4× CPU slowdown;
- desktop: 1440 × 900 in current Chrome and Safari without throttling.

Targets are LCP ≤ 2.5 s, CLS ≤ 0.1, and field INP ≤ 200 ms. The harness runs three mobile Lighthouse
samples sequentially, stores each raw JSON report, and reports median, worst, spread, and stability.
Performance is not approved unless every LCP sample passes and the spread remains bounded. Desktop
Lighthouse and scene timing run separately, never concurrently. Screenshot/fallback captures force
SwiftShader for reproducibility; the dedicated timing browser uses Chrome's default GPU selection
and records the exact WebGL renderer instead of claiming hardware acceleration in advance.

The automated desktop scene measurement drives bounded trusted pointer input for 10 seconds and
records three separate signals:

- main-thread CPU duration immediately around each `renderer.render(scene, camera)` call;
- intervals between consecutive renders only while scene interpolation remains active;
- global headless `requestAnimationFrame` scheduler cadence as a visible, non-gating diagnostic.

All three report exact duration, sample count, GPU renderer where applicable, and nearest-rank
percentiles. The ≤ 20 ms automated gate applies to both p95 scene render CPU workload and p95
cadence between consecutive active interpolation renders. Inactive event-driven gaps reset the
cadence chain and are excluded. Neither metric pretends to measure GPU completion. The harness also
records trusted Playwright interaction entries through `PerformanceEventTiming` when supported.
That result is labelled a lab proxy and never reported as field INP.

For representative frame time, still use Chrome Performance with screenshots disabled:

1. Reload the production preview and let the arrival settle.
2. Record exactly 10 seconds while moving the pointer slowly across the visual bounds.
3. Export the trace and inspect animation frames in the Performance panel.
4. Report p95 frame time against ≤ 33.3 ms on mobile and ≤ 20 ms on desktop.
5. Repeat with the tab backgrounded for part of the recording and confirm animation work pauses.

Automated checks do not constitute real-device approval. Playwright Firefox and WebKit are exact
engine smokes, not physical Firefox, Safari, or iOS emulation. Physical Safari, iOS Safari, Android
Chrome and field INP remain required review artifacts. Headless scene workload and scheduler
cadence—even when Chrome selects Metal—do not replace a physical-device DevTools trace or
representative field measurement.
