/**
 * Hands a fetched blob to the browser as a download.
 *
 * The API sends its PDFs as bytes rather than as a URL, because every one of those endpoints is
 * behind a bearer token — a plain link would arrive unauthenticated and 401. So the file is
 * fetched, wrapped in an object URL, and clicked on the user's behalf.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default downloadBlob;
