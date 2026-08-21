const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas');
const visual = document.querySelector<HTMLElement>('.hero__visual');

if (canvas && visual) {
  document.documentElement.classList.add('scene-static');

  if (hasInteractiveThreePath()) {
    armSceneAfterLoad(() =>
      import('./scene')
        .then(({ initialiseHeroScene }) =>
          initialiseHeroScene(canvas, visual),
        )
        .catch((error: unknown) => {
          console.warn('Os recursos da experiência 3D não puderam ser carregados.', error);
          showFallback();
        }),
    );
  }
}

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
        callback: () => void,
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
