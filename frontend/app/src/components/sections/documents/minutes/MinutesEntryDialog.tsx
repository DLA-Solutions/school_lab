import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ConfirmDialog, ErrorBanner, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  cancelMinutesEntry,
  getMinutesEntry,
  sendMinutesEntryForSignature,
} from 'services/minutesApi';
import { MinutesEntry, MinutesEntrySummary } from 'types/minutes';
import { minutesErrorMessage } from 'utils/api/minutesErrors';
import { sanitizeMinutesHtml } from 'utils/sanitizeMinutesHtml';
import MinutesPdfPreviewDialog from './MinutesPdfPreviewDialog';
import MinutesStatusChip from './MinutesStatusChip';

export interface MinutesEntryDialogProps {
  open: boolean;
  schoolId: number;
  /** The list row that was opened — the full ata is fetched for it. */
  summary: MinutesEntrySummary | null;
  onClose: () => void;
  /** Called after any action that changed the ata, so the list can refresh. */
  onChanged: () => void;
  onEdit: (entry: MinutesEntry) => void;
}

type Pending = 'send' | 'cancel' | null;

/**
 * One ata, read and acted on: PDF preview, edit (drafts only), "Enviar para assinatura"
 * (Autentique) and cancel, each of the last two behind a confirmation. The buttons shown follow
 * the status as UX; the API enforces the lifecycle (`409 invalid_state_transition`, BR-LA05).
 */
const MinutesEntryDialog = ({
  open,
  schoolId,
  summary,
  onClose,
  onChanged,
  onEdit,
}: MinutesEntryDialogProps) => {
  const { t } = useTranslation();
  const [entry, setEntry] = useState<MinutesEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [acting, setActing] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const entryId = summary?.id ?? null;
  // The row is enough to head the dialog while the full ata loads.
  const head = entry ?? summary;

  const load = useCallback(
    async ({ keepError = false }: { keepError?: boolean } = {}) => {
      if (entryId === null) {
        return;
      }

      setLoading(true);
      if (!keepError) {
        setError('');
      }

      try {
        setEntry(await getMinutesEntry(schoolId, entryId));
      } catch (err) {
        setEntry(null);
        setError(minutesErrorMessage(err, t, 'minutes.detail.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [schoolId, entryId, t],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setEntry(null);
    setNotice('');
    setPending(null);
    load();
  }, [open, load]);

  const bodyHtml = useMemo(() => sanitizeMinutesHtml(entry?.body ?? ''), [entry?.body]);
  const signers = entry?.participants.filter((participant) => participant.signs) ?? [];

  const run = async (kind: 'send' | 'cancel') => {
    if (!entry) {
      return;
    }

    setPending(null);
    setActing(true);
    setError('');
    setNotice('');

    try {
      const updated =
        kind === 'send'
          ? await sendMinutesEntryForSignature(schoolId, entry.id)
          : await cancelMinutesEntry(schoolId, entry.id);

      setEntry(updated);
      setNotice(t(kind === 'send' ? 'minutes.send.success' : 'minutes.cancel.success'));
      onChanged();
    } catch (err) {
      setError(
        minutesErrorMessage(
          err,
          t,
          kind === 'send' ? 'minutes.send.error' : 'minutes.cancel.error',
        ),
      );
      // A 409 means the ata moved on elsewhere — show it as it is now, keeping the message.
      if (err instanceof ApiError && err.status === 409) {
        load({ keepError: true });
      }
    } finally {
      setActing(false);
    }
  };

  const isDraft = entry?.status === 'draft';
  const canCancel = entry?.status === 'draft' || entry?.status === 'pending_signature';

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <span>{head?.title}</span>
            {head && <MinutesStatusChip status={head.status} />}
          </Stack>
          {head && (
            <Typography variant="body2" color="text.secondary">
              {`${t(`minutes.kind.${head.kind}`)} · ${head.book.name} (${head.book.year}) · ${new Date(
                `${head.held_on}T12:00:00`,
              ).toLocaleDateString()}`}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <ErrorBanner message={error} />}
            {notice && <SuccessBanner message={notice} />}

            {loading && (
              <Stack alignItems="center" py={4}>
                <CircularProgress size={28} />
              </Stack>
            )}

            {entry && (
              <>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('minutes.detail.body')}
                  </Typography>
                  {bodyHtml ? (
                    <Box
                      sx={{ '& h1, & h2, & h3, & h4': { m: 0, mb: 1 }, '& p': { m: 0, mb: 1 } }}
                      // Sanitized to the API's allowlist (no attributes, no scripts) just above.
                      dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('minutes.detail.noBody')}
                    </Typography>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('minutes.detail.participants')}
                  </Typography>
                  <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {entry.participants.map((participant) => (
                      <Stack
                        component="li"
                        key={participant.id}
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        alignItems="baseline"
                      >
                        <Typography variant="body2">
                          {participant.role_label
                            ? `${participant.name} — ${participant.role_label}`
                            : participant.name}
                        </Typography>
                        {participant.signs && (
                          <Typography variant="caption" color="text.secondary">
                            {participant.signed_at
                              ? t('minutes.detail.signedAt', {
                                  date: new Date(participant.signed_at).toLocaleDateString(),
                                })
                              : entry.status === 'pending_signature'
                                ? t('minutes.detail.awaitingSignature')
                                : t('minutes.detail.signs')}
                          </Typography>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Box>

                {!isDraft && (
                  <Typography variant="caption" color="text.secondary">
                    {t('minutes.detail.lockedHint')}
                  </Typography>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose} color="inherit">
            {t('common.close')}
          </Button>
          {entry && canCancel && (
            <Button color="error" disabled={acting} onClick={() => setPending('cancel')}>
              {t('minutes.action.cancel')}
            </Button>
          )}
          {entry && (
            <Button disabled={acting} onClick={() => setPreviewing(true)}>
              {entry.has_signed_pdf ? t('minutes.action.signedCopy') : t('minutes.action.preview')}
            </Button>
          )}
          {entry && isDraft && (
            <Button disabled={acting} onClick={() => onEdit(entry)}>
              {t('minutes.action.edit')}
            </Button>
          )}
          {entry && isDraft && (
            <Button
              variant="contained"
              disabled={acting}
              onClick={() => setPending('send')}
              startIcon={acting ? <CircularProgress size={14} /> : undefined}
            >
              {t('minutes.action.send')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={pending === 'send'}
        title={t('minutes.send.confirmTitle')}
        message={t('minutes.send.confirmMessage', {
          title: entry?.title ?? '',
          count: signers.length,
        })}
        confirmLabel={t('minutes.send.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => run('send')}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending === 'cancel'}
        title={t('minutes.cancel.confirmTitle')}
        message={t('minutes.cancel.confirmMessage', { title: entry?.title ?? '' })}
        confirmLabel={t('minutes.cancel.confirm')}
        cancelLabel={t('minutes.cancel.keep')}
        destructive
        onConfirm={() => run('cancel')}
        onCancel={() => setPending(null)}
      />

      <MinutesPdfPreviewDialog
        open={previewing}
        schoolId={schoolId}
        entryId={entryId}
        title={entry?.title}
        onClose={() => setPreviewing(false)}
      />
    </>
  );
};

export default MinutesEntryDialog;
