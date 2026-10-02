/**
 * Opens a fetched blob in a new tab for the user to look at, instead of forcing it into their
 * Downloads folder the way `downloadBlob` does — a PDF preview is read, not kept.
 *
 * The object URL has to outlive the call (the new tab loads it asynchronously), so the caller
 * gets it back and is responsible for revoking it once the tab no longer needs it — typically on
 * unmount, via the cleanup helper below.
 */
export const previewBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  return url;
};

/** Revokes every object URL still tracked — call from a `useEffect` cleanup. */
export const revokeBlobUrls = (urls: string[]) => {
  urls.forEach((url) => URL.revokeObjectURL(url));
};

export default previewBlob;
