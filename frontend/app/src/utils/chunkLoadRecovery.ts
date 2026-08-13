const RELOAD_KEY = 'school-lab:chunk-reload';

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.message.includes('Loading chunk')
  );
}

export function reloadOnceForStaleChunks(): void {
  if (sessionStorage.getItem(RELOAD_KEY)) {
    return;
  }

  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
}

/** Recover from stale JS chunks after a deploy (cached entry bundle, missing lazy chunk). */
export function installChunkLoadRecovery(): void {
  sessionStorage.removeItem(RELOAD_KEY);

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForStaleChunks();
  });
}
