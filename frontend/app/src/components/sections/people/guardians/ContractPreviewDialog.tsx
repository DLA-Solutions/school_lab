import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { SuccessBanner } from 'design-system';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import { ApiError } from 'services/api';
import { fetchSignedContract, previewContract } from 'services/contractsApi';
import downloadBlob from 'utils/downloadBlob';
import { Contract } from 'types/contract';
import { useTranslation } from 'providers/I18nContext';

/** An agreement rendered from a form that was never saved — there is no contract behind it yet. */
export interface ContractDraft {
  html: string;
  studentName: string;
}

interface ContractPreviewDialogProps {
  open: boolean;
  schoolId: number;
  contract: Contract | null;
  /** Read instead of `contract` when the agreement has not been created yet. */
  draft?: ContractDraft | null;
  onClose: () => void;
  /** Offered from the preview itself, so checking and sending are one movement. */
  onSend?: () => void;
  sending?: boolean;
}

/**
 * The agreement exactly as the family receives it — read before it is sent, and read again long
 * afterwards, which is when a contract is most often wanted. Once it is signed the provider's own
 * file is offered alongside: that one carries the signature page and is what proves anything.
 *
 * The document is rendered in a sandboxed iframe rather than injected into the page: it is a
 * whole HTML file with its own styles, and it carries school-authored markup. Sandboxing keeps
 * those styles off the app's own and denies the frame scripts and same-origin access, so a
 * template can never reach the session behind it.
 */
const ContractPreviewDialog = ({
  open,
  schoolId,
  contract,
  draft = null,
  onClose,
  onSend,
  sending = false,
}: ContractPreviewDialogProps) => {
  const { t } = useTranslation();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedFile, setSignedFile] = useState<Blob | null>(null);
  const [signedUrl, setSignedUrl] = useState('');
  const [signedError, setSignedError] = useState(false);

  const signed = contract?.signature_status === 'signed';
  // Nothing has been created yet, so there is nothing left to send only once it has gone out.
  const canSend = draft !== null || (contract !== null && !contract.sent_to_provider);

  const load = useCallback(async () => {
    // A draft arrives already rendered: it has no id to fetch it by.
    if (draft) {
      setHtml(draft.html);
      setError('');
      setLoading(false);
      return;
    }

    if (!contract) {
      return;
    }

    setLoading(true);
    setError('');
    setHtml('');

    // Once it is signed, the provider's file is the document: it carries the signature page and
    // it is the copy that proves anything. Our own render is what the family was sent, and is
    // still worth falling back to when the provider's file cannot be fetched.
    if (contract.signature_status === 'signed' && contract.signed_document_url) {
      try {
        const file = await fetchSignedContract(schoolId, contract.id);
        setSignedFile(file);
        setSignedUrl(URL.createObjectURL(file));
        setLoading(false);
        return;
      } catch {
        setSignedError(true);
      }
    }

    try {
      const preview = await previewContract(schoolId, contract.id);
      setHtml(preview.html);
    } catch (err) {
      if (err instanceof ApiError) {
        const base = err.details.base;
        setError(Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message);
      } else {
        setError(t('contract.preview.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [schoolId, contract, draft, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  // The object URL holds the whole file in memory until it is revoked, and these run to hundreds
  // of kilobytes. Releasing it as the dialog closes keeps that to one document at a time.
  useEffect(() => {
    if (open || !signedUrl) {
      return;
    }

    URL.revokeObjectURL(signedUrl);
    setSignedUrl('');
    setSignedFile(null);
    setSignedError(false);
  }, [open, signedUrl]);

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {signed ? t('contract.preview.signedTitle') : t('contract.preview.title')}
        {(draft || contract) && (
          <Typography variant="body2" color="text.secondary">
            {draft
              ? draft.studentName
              : (contract?.student_name ?? `Estudante #${contract?.student_id}`)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <ErrorBanner message={error} />}

        {/* Two different documents, and saying so matters: below is our render of the agreement
            that was sent; the provider's file is that same agreement plus the signature page it
            appends, and it is the one that proves anything. */}
        {signed && (
          <SuccessBanner
            message={
              signedError
                ? t('contract.preview.signedFileUnavailable')
                : signedUrl
                  ? t('contract.preview.showingSignedFile')
                  : t('contract.preview.signedWithoutFile')
            }
            sx={{ mb: 2 }}
          />
        )}

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={28} />
          </Stack>
        ) : signedUrl ? (
          <Box
            component="iframe"
            title={t('contract.preview.signedFrame')}
            src={signedUrl}
            sx={{
              width: 1,
              height: 520,
              border: 0,
              bgcolor: 'common.white',
              borderRadius: 1,
            }}
          />
        ) : (
          html && (
            <Box
              component="iframe"
              title={t('contract.preview.frame')}
              srcDoc={html}
              sandbox=""
              sx={{
                width: 1,
                height: 520,
                border: 0,
                // The document is a printed page; a white sheet is what it is designed against,
                // in either scheme.
                bgcolor: 'common.white',
                borderRadius: 1,
              }}
            />
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={sending}>
          {t('common.close')}
        </Button>
        {signedFile && (
          <Button
            variant="contained"
            startIcon={<IconifyIcon icon="mingcute:download-2-line" />}
            onClick={() =>
              downloadBlob(
                signedFile,
                `contrato-assinado-${(contract?.student_name ?? 'contrato')
                  .toLowerCase()
                  .replace(/\s+/g, '-')}.pdf`,
              )
            }
          >
            {t('contract.preview.downloadSigned')}
          </Button>
        )}
        {onSend && canSend && (
          <Button
            variant="contained"
            onClick={onSend}
            disabled={sending || loading || Boolean(error)}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {sending ? t('contract.preview.sending') : t('contract.preview.send')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContractPreviewDialog;
