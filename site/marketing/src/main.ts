const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas');
const sceneStage = document.querySelector<HTMLElement>('.scene-stage');
const capPosterImage = document.querySelector<HTMLImageElement>('.cap-poster img');

document.documentElement.classList.add('scene-static');

if (capPosterImage) {
  const markPosterDecoded = (): void => {
    capPosterImage.classList.add('is-decoded');
  };

  if (capPosterImage.complete && capPosterImage.naturalWidth > 0) {
    markPosterDecoded();
  } else {
    capPosterImage.addEventListener('load', markPosterDecoded, { once: true });
    capPosterImage.addEventListener('error', markPosterDecoded, { once: true });
  }
}

let teardownScroll: (() => void) | undefined;

if (canvas && sceneStage && hasInteractiveThreePath()) {
  armSceneAfterLoad(async () => {
    try {
      const [{ createCapScene }, { initScrollNarrative }] = await Promise.all([
        import('./three/cap-scene'),
        import('./scroll/scroll-narrative'),
      ]);
      const capScene = await createCapScene(canvas, sceneStage);
      teardownScroll = initScrollNarrative(capScene);
    } catch (error: unknown) {
      console.warn('Os recursos da experiência 3D não puderem ser carregados.', error);
      showFallback();
      const { initScrollNarrative } = await import('./scroll/scroll-narrative');
      teardownScroll = initScrollNarrative(null);
    }
  });
} else {
  void import('./scroll/scroll-narrative').then(({ initScrollNarrative }) => {
    teardownScroll = initScrollNarrative(null);
  });
}

window.addEventListener('beforeunload', () => teardownScroll?.(), { once: true });

function hasInteractiveThreePath(): boolean {
  const navigatorWithHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };

  return Boolean(
    window.matchMedia('(min-width: 64rem)').matches &&
      window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !navigatorWithHints.connection?.saveData &&
      (navigatorWithHints.deviceMemory === undefined ||
        navigatorWithHints.deviceMemory >= 4) &&
      navigator.hardwareConcurrency >= 4,
  );
}

function armSceneAfterLoad(callback: () => Promise<void>): void {
  const armWhenSettled = (): void => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        idleCallback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let activated = false;
    let idleHandle: number | null = null;
    let idleDelay: number | null = null;
    let fallbackTimeout: number | null = null;

    const activate = (): void => {
      if (activated) {
        return;
      }
      activated = true;
      window.removeEventListener('pointermove', activate);
      window.removeEventListener('pointerdown', activate);
      if (idleDelay !== null) {
        window.clearTimeout(idleDelay);
      }
      if (fallbackTimeout !== null) {
        window.clearTimeout(fallbackTimeout);
      }
      if (idleHandle !== null) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      void callback();
    };

    window.addEventListener('pointermove', activate, { once: true, passive: true });
    window.addEventListener('pointerdown', activate, { once: true, passive: true });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        idleDelay = window.setTimeout(() => {
          if (typeof idleWindow.requestIdleCallback === 'function') {
            idleHandle = idleWindow.requestIdleCallback(activate, { timeout: 850 });
          } else {
            activate();
          }
        }, 350);
        fallbackTimeout = window.setTimeout(activate, 1600);
      });
    });
  };

  if (document.readyState === 'complete') {
    armWhenSettled();
  } else {
    window.addEventListener('load', armWhenSettled, { once: true });
  }
}

function showFallback(): void {
  document.documentElement.classList.add('scene-fallback');
  document.documentElement.classList.remove('scene-static');
  document.documentElement.classList.remove('scene-ready');
}
