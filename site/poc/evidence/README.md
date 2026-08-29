# Frame 01 review evidence

Generated from the production Vite build with:

```bash
cd site/poc
npm run check
npm run evidence
```

`npm run evidence` starts an isolated preview on an available localhost port and uses the installed
system Chrome through Playwright. It verifies CTA/text geometry, overflow, focus outline plus ring,
link destinations, constrained-mode network isolation, reduced motion, the model-blocked fallback,
and WebGL context restoration. Measurements run sequentially. It captures:

- `mobile-320-chrome.png` — Chrome at 320 × 720, DPR 2, intentional static mode;
- `mobile-chrome.png` — Chrome at 390 × 844, DPR 2;
- `focus-primary-cta-chrome.png` and `focus-secondary-cta-chrome.png` — persisted
  high-contrast outline plus multi-ring focus states;
- `tablet-chrome.png` — Chrome at 768 × 900;
- `desktop-chrome.png` — Chrome at 1440 × 900;
- `desktop-1920-chrome.png` — Chrome at 1920 × 1080;
- `desktop-auto-{static,arrival,settled}-chrome.png` — desktop state progression without
  pointer or keyboard input;
- `reduced-motion-chrome.png` — 1440 × 900 with reduced motion emulated;
- `fallback-chrome.png` — 1440 × 900 with the GLB request blocked;
- `runtime-summary.json` — machine-readable coordinates, focus/runtime checks, measurements, and
  environment details;
- `runtime-history.json` — concise records for the last ten evidence runs, including gating and
  non-gating performance signals;
- `lighthouse-mobile-{1,2,3}.json` — three sequential raw mobile Lighthouse samples;
- `lighthouse-desktop-1.json` — one raw desktop Lighthouse sample;
- `firefox-engine.png` and `webkit-engine.png` — exact Playwright engine smokes when available.

Screenshot and fallback evidence is captured in headless Chrome with forced SwiftShader. The
dedicated scene-timing browser uses Chrome's default GPU selection and records the exact renderer;
the current macOS run selected ANGLE Metal on Apple M1. The mobile Lighthouse profile uses
simulated throttling at 390 × 844, DPR 2, and 4× CPU slowdown. This is reproducible lab evidence,
not physical-device approval. `runtime-summary.json` reports every mobile sample, median, worst,
spread, and whether the result is stable enough for lab approval.

The desktop run drives bounded trusted pointer input for 10 seconds. It separately records
main-thread CPU duration around `renderer.render`, consecutive render intervals within active
interpolation bursts, and global headless `requestAnimationFrame` cadence. Both scene render CPU
workload p95 and active-scene cadence p95 gate the ≤ 20 ms target; inactive event-driven gaps reset
the cadence chain, while the global scheduler remains visible and non-gating. Sample counts, exact
recording durations, GPU renderer, and nearest-rank percentile method are persisted. Trusted
Playwright input is also observed through `PerformanceEventTiming` when available and labelled only
as a lab interaction-latency proxy.

The evidence command exits non-zero if repeated mobile LCP or CLS, desktop scene CPU workload,
active-scene cadence, or a core runtime assertion fails. It also asserts that automatic desktop
arrival visibly replaces the poster within five seconds and stops rendering after settlement.
Physical-device and field-INP absence remains a residual gap.

The Firefox and WebKit captures identify their engines and versions; WebKit is not labelled Safari.
Physical Safari, iOS Safari, Android Chrome, hardware-GPU frame timing, and field INP were not captured.
The runtime summary records these residual gaps rather than treating them as approved.
