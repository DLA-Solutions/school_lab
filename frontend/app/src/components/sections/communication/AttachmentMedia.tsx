import { useEffect, useState } from 'react';
import { AttachmentReader, fetchAttachment } from 'services/communicationApi';
import { kindForContentType } from './mediaLimits';
import { useTranslation } from 'providers/I18nContext';

interface AttachmentMediaProps {
  schoolId: number;
  attachmentId: number;
  audience: AttachmentReader;
}

/** Loads the authorized file and plays it inline. A failure stays quiet: the text of the message remains. */
const AttachmentMedia = ({ schoolId, attachmentId, audience }: AttachmentMediaProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<'image' | 'audio' | 'video' | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    fetchAttachment(schoolId, attachmentId, audience)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setKind(kindForContentType(blob.type));
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [schoolId, attachmentId, audience]);

  if (!url || !kind) {
    return null;
  }

  if (kind === 'image') {
    return (
      <img
        src={url}
        alt={t('communication.attachment.image')}
        style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }}
      />
    );
  }

  if (kind === 'audio') {
    return <audio controls src={url} aria-label={t('communication.attachment.audio')} />;
  }

  return (
    <video
      controls
      src={url}
      aria-label={t('communication.attachment.video')}
      style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }}
    />
  );
};

export default AttachmentMedia;
