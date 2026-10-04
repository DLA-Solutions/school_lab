import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'providers/I18nContext';
import {
  IMAGE_ACCEPT,
  PendingMedia,
  VIDEO_ACCEPT,
  acceptFile,
  AttachmentRejection,
  baseContentType,
  extensionFor,
  kindForContentType,
} from './mediaLimits';

interface MediaPickerProps {
  files: PendingMedia[];
  onChange: (files: PendingMedia[]) => void;
  onReject: (reason: AttachmentRejection | 'recording_unavailable') => void;
  disabled?: boolean;
  /** Existing server files count toward the limit of five. */
  reserved?: number;
}

const withPreview = (item: PendingMedia): PendingMedia =>
  item.kind === 'image' ? { ...item, previewUrl: URL.createObjectURL(item.file) } : item;

const preferredAudioType = () => {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
};

/**
 * Photo, a clip recorded in the browser, and a short video file. Nothing is uploaded here:
 * the caller sends the files with the message or the routine.
 */
const MediaPicker = ({ files, onChange, onReject, disabled = false, reserved = 0 }: MediaPickerProps) => {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const filesRef = useRef(files);

  useEffect(() => {
    const previous = filesRef.current;
    const current = new Set(files.map((item) => item.localId));
    previous.forEach((item) => {
      if (!current.has(item.localId) && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      filesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) {
      return;
    }

    const next = [...files];
    Array.from(list).forEach((file) => {
      const result = acceptFile(file, next.length + reserved);
      if ('rejection' in result) {
        onReject(result.rejection);
        return;
      }
      next.push(withPreview(result.file));
    });
    onChange(next);
  };

  const remove = (localId: string) => {
    onChange(files.filter((item) => item.localId !== localId));
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onReject('recording_unavailable');
      return;
    }

    const mimeType = preferredAudioType();
    if (!mimeType || !kindForContentType(mimeType)) {
      onReject('recording_unavailable');
      return;
    }

    if (files.length + reserved >= 5) {
      onReject('too_many_files');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const contentType = baseContentType(recorder.mimeType || mimeType);
        const blob = new Blob(chunks, { type: contentType });
        const file = new File([blob], `audio-${Date.now()}.${extensionFor(contentType)}`, {
          type: contentType,
        });
        const current = filesRef.current;
        const result = acceptFile(file, current.length + reserved);
        if ('rejection' in result) {
          onReject(result.rejection);
          return;
        }
        onChange([...current, withPreview(result.file)]);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      onReject('recording_unavailable');
    }
  };

  return (
    <Stack direction="column" gap={1.5}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button component="label" variant="outlined" disabled={disabled || recording}>
          {t('communication.photo')}
          <input
            hidden
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </Button>
        <Button
          variant="outlined"
          disabled={disabled}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? t('communication.stopRecording') : t('communication.recordAudio')}
        </Button>
        <Button component="label" variant="outlined" disabled={disabled || recording}>
          {t('communication.video')}
          <input
            hidden
            type="file"
            accept={VIDEO_ACCEPT}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </Button>
      </Stack>

      {files.length > 0 && (
        <Stack direction="column" gap={1}>
          {files.map((item) => (
            <Stack key={item.localId} direction="row" gap={1.5} alignItems="center">
              {item.kind === 'image' && item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={t('communication.attachment.image')}
                  width={72}
                  height={72}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              ) : (
                <Typography variant="body2">{item.file.name}</Typography>
              )}
              <Button size="small" onClick={() => remove(item.localId)} disabled={disabled}>
                {t('communication.removeFile')}
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default MediaPicker;
