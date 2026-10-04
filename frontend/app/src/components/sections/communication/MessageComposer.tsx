import { FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'providers/I18nContext';
import { MessageAudience, newClientRequestId, uploadAttachment } from 'services/communicationApi';
import { communicationErrorText } from 'utils/communicationError';
import { MessageKey } from 'locales';
import MediaPicker from './MediaPicker';
import { PendingMedia } from './mediaLimits';

interface MessageComposerProps {
  schoolId: number;
  audience: MessageAudience;
  placeholder: string;
  submitLabel: string;
  onSend: (input: { body: string; attachmentIds: number[]; clientRequestId: string }) => Promise<void>;
  disabled?: boolean;
}

const REJECTION_KEYS: Record<string, MessageKey> = {
  file_too_large: 'communication.errors.fileTooLarge',
  too_many_files: 'communication.errors.tooManyFiles',
  unsupported_media_type: 'communication.errors.unsupportedMediaType',
  recording_unavailable: 'communication.errors.recordingUnavailable',
};

/** Text plus photo, recorded audio, and a short video. Upload happens when the message is sent. */
const MessageComposer = ({
  schoolId,
  audience,
  placeholder,
  submitLabel,
  onSend,
  disabled = false,
}: MessageComposerProps) => {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<PendingMedia[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text && files.length === 0) {
      setError(t('communication.errors.emptyContent'));
      return;
    }

    setSending(true);
    setError('');

    try {
      const attachmentIds: number[] = [];
      for (const item of files) {
        const uploaded = await uploadAttachment(schoolId, audience, item.file);
        attachmentIds.push(uploaded.id);
      }

      await onSend({
        body: text,
        attachmentIds,
        clientRequestId: newClientRequestId(),
      });
      setBody('');
      setFiles([]);
    } catch (err) {
      setError(communicationErrorText(err, t, 'communication.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack component="form" direction="column" gap={1.5} onSubmit={submit}>
      <TextField
        label={t('communication.compose.label')}
        placeholder={placeholder}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        multiline
        minRows={2}
        disabled={disabled || sending}
        error={Boolean(error)}
        helperText={error || undefined}
      />
      <MediaPicker
        files={files}
        onChange={setFiles}
        disabled={disabled || sending}
        onReject={(reason) => setError(t(REJECTION_KEYS[reason]))}
      />
      <Stack direction="row">
        <Button type="submit" variant="contained" disabled={disabled || sending}>
          {sending ? t('communication.compose.sending') : submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
};

export default MessageComposer;
