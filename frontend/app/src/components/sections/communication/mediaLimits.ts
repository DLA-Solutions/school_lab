/** Allow-list shared with `CommunicationAttachment::ALLOWED_CONTENT_TYPES`. */
export const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'video/mp4',
  'video/webm',
]);

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const VIDEO_ACCEPT = 'video/mp4,video/webm';

export type AttachmentKind = 'image' | 'audio' | 'video';

export type AttachmentRejection =
  | 'file_too_large'
  | 'too_many_files'
  | 'unsupported_media_type';

/** `audio/webm;codecs=opus` is stored as `audio/webm`. The API matches the type exactly. */
export const baseContentType = (type: string) => type.split(';')[0].trim().toLowerCase();

export const kindForContentType = (type: string): AttachmentKind | null => {
  const base = baseContentType(type);
  if (!ALLOWED_CONTENT_TYPES.has(base)) {
    return null;
  }
  if (base.startsWith('image/')) return 'image';
  if (base.startsWith('audio/')) return 'audio';
  return 'video';
};

export const extensionFor = (type: string) => {
  const base = baseContentType(type);
  if (base === 'image/jpeg') return 'jpg';
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mp4' || base === 'video/mp4') return 'mp4';
  if (base === 'audio/webm' || base === 'video/webm') return 'webm';
  return 'bin';
};

export interface PendingMedia {
  localId: string;
  file: File;
  kind: AttachmentKind;
  /** Object URL for an image preview. Revoked when the file leaves the picker. */
  previewUrl?: string;
}

export const acceptFile = (
  file: File,
  already: number,
): { file: PendingMedia } | { rejection: AttachmentRejection } => {
  if (already >= MAX_ATTACHMENTS) {
    return { rejection: 'too_many_files' };
  }

  const kind = kindForContentType(file.type);
  if (!kind) {
    return { rejection: 'unsupported_media_type' };
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { rejection: 'file_too_large' };
  }

  return {
    file: {
      localId: `${file.name}-${file.size}-${file.lastModified}-${already}`,
      file,
      kind,
    },
  };
};
