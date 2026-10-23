import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { ConfirmDialog, EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import { ApiError } from 'services/api';
import { useTranslation } from 'providers/I18nContext';
import useCurrentSchool from 'providers/useCurrentSchool';
import { membershipHasPermission } from 'utils/onboarding/access';
import type { MessageKey } from 'locales';
import {
  DocumentableType,
  PERSONAL_DOCUMENT_TYPES,
  documentDownloadUrl,
  documentTypeKey,
  inactivateDocument,
  listGuardianDocuments,
  listPersonDocuments,
  uploadPersonDocument,
} from 'services/documentsApi';
import { FamilyDocument, SchoolDocument } from 'types/document';

export interface PersonDocumentsDialogProps {
  open: boolean;
  schoolId: number;
  /** Who the documents belong to — a guardian, a student or a collaborator. */
  documentableType: DocumentableType;
  documentableId: number;
  /** Named in the heading, so the dialog says whose file is open. */
  title: string;
  subtitle?: string;
  /** Overrides the kinds on offer; the shared personal set by default. */
  documentTypes?: readonly { value: string; label: string }[];
  /** Shown in the empty state — what this owner is usually asked for. */
  emptyDescription?: string;
  onClose: () => void;
}

/** Inactivating (the product's "delete") is allowed to `manage_documents` only (BR-ARC14). */
const MANAGE_DOCUMENTS = 'manage_documents';

type DocumentsView = 'active' | 'inactive';

// `SemanticChip` speaks in intent, not in the API's status vocabulary.
const STATUS_VARIANTS: Record<SchoolDocument['status'], 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

/** Only the guardian listing carries the child and the sender, and only for child-bound files. */
const isChildBound = (
  document: SchoolDocument,
): document is FamilyDocument & { student_name: string } =>
  'student_name' in document && Boolean(document.student_name);

const formatBytes = (bytes: number | null) => {
  if (!bytes) {
    return '';
  }
  const units = ['B', 'KB', 'MB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;

  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const PersonDocumentsDialog = ({
  open,
  schoolId,
  documentableType,
  documentableId,
  title,
  subtitle,
  documentTypes = PERSONAL_DOCUMENT_TYPES,
  emptyDescription,
  onClose,
}: PersonDocumentsDialogProps) => {
  const { t, locale } = useTranslation();
  const school = useCurrentSchool();
  const canManage = school ? membershipHasPermission(school, MANAGE_DOCUMENTS) : false;
  const resolvedEmptyDescription = emptyDescription ?? t('documents.empty.default');
  // A type the API carries that this build does not know keeps its raw value: better an
  // unfamiliar word than an empty cell.
  const typeLabel = (value: string) => {
    const key = documentTypeKey(value);

    return key ? t(key as MessageKey) : value;
  };
  const senderLabel = (document: FamilyDocument) => {
    if (document.uploaded_by_kind === 'school') {
      return t('documents.sentBy.school');
    }

    if (document.uploaded_by_kind === null) {
      return t('documents.sentBy.system');
    }

    return document.uploaded_by_name
      ? t('documents.sentBy.guardian', { name: document.uploaded_by_name })
      : '';
  };
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState<string>(documentTypes[0].value);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<DocumentsView>('active');
  const [pendingInactivation, setPendingInactivation] = useState<SchoolDocument | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Without `manage_documents` the API answers 403 to `inactive=true`, so it is never requested.
  const showingInactive = canManage && view === 'inactive';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // A guardian's file also covers the children's documents the family sent, so the director
      // reads the whole picture here; students and collaborators keep the per-owner query.
      const response =
        documentableType === 'Guardian'
          ? await listGuardianDocuments(schoolId, documentableId, { inactive: showingInactive })
          : await listPersonDocuments(schoolId, documentableType, documentableId, {
              inactive: showingInactive,
            });
      setDocuments(response.data);
    } catch (err) {
      setDocuments([]);
      setError(err instanceof ApiError ? err.message : t('documents.error.load'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, documentableType, documentableId, showingInactive, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so re-picking the same file still fires a change event.
    e.target.value = '';
    if (!file) {
      return;
    }

    setUploading(true);
    setError('');

    try {
      await uploadPersonDocument(schoolId, documentableType, documentableId, {
        file,
        documentType,
      });
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        // The API reports a missing or unreadable file under `details.file`.
        const fileError = Array.isArray(err.details.file) ? String(err.details.file[0]) : null;
        setError(fileError ? t('documents.error.file', { detail: fileError }) : err.message);
      } else {
        setError(t('documents.error.upload'));
      }
    } finally {
      setUploading(false);
    }
  };

  // The file is never removed: the API inactivates the document and keeps it in the history.
  const handleConfirmInactivation = async () => {
    if (!pendingInactivation) {
      return;
    }

    setInactivating(true);
    setError('');

    try {
      await inactivateDocument(schoolId, pendingInactivation.id);
      setPendingInactivation(null);
      await load();
    } catch (err) {
      setPendingInactivation(null);
      setError(err instanceof ApiError ? err.message : t('documents.error.inactivate'));
    } finally {
      setInactivating(false);
    }
  };

  const inactivationLabel = (document: SchoolDocument) => {
    if (!document.discarded_at) {
      return '';
    }

    const date = new Date(document.discarded_at).toLocaleDateString(locale);

    return document.discarded_by_name
      ? t('documents.inactive.by', { name: document.discarded_by_name, date })
      : t('documents.inactive.on', { date });
  };

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('documents.title')}
        <Typography variant="body2" color="text.secondary">
          {subtitle ? `${title} — ${subtitle}` : title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack direction="column" gap={2.5} pt={0.5}>
          {canManage && (
            <Tabs
              value={view}
              onChange={(_, value: DocumentsView) => {
                // A message about the previous list does not belong to the one being opened.
                setError('');
                setView(value);
              }}
            >
              <Tab value="active" label={t('documents.tab.active')} />
              <Tab value="inactive" label={t('documents.tab.inactive')} />
            </Tabs>
          )}

          {!showingInactive && (
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems="stretch">
              <TextField
                id="document-type"
                label={t('documents.field.type')}
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={uploading}
                variant="filled"
                select
                fullWidth
              >
                {documentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {typeLabel(type.value)}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                startIcon={
                  uploading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <IconifyIcon icon="mingcute:upload-2-line" />
                  )
                }
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {uploading ? t('documents.uploading') : t('documents.upload')}
              </Button>
              {/* The styled Button is the control users see; the native input stays hidden and is
                triggered through the ref, which is what actually opens the file picker. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelected}
                hidden
                aria-hidden="true"
                tabIndex={-1}
              />
            </Stack>
          )}

          {error && <ErrorBanner message={error} />}

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : documents.length === 0 ? (
            <EmptyState
              title={
                showingInactive ? t('documents.inactive.empty.title') : t('documents.empty.title')
              }
              description={
                showingInactive
                  ? t('documents.inactive.empty.description')
                  : resolvedEmptyDescription
              }
            />
          ) : (
            <List disablePadding>
              {documents.map((document) => {
                const url = documentDownloadUrl(document);
                const fileName = document.filename ?? t('documents.fileFallback');

                return (
                  <ListItem
                    key={document.id}
                    disableGutters
                    secondaryAction={
                      // Inactive rows are history: they can still be opened, never inactivated
                      // again. The action itself is for `manage_documents` only.
                      canManage && !showingInactive ? (
                        <Tooltip title={t('documents.inactivate')}>
                          <span>
                            <IconButton
                              edge="end"
                              size="small"
                              aria-label={t('documents.inactivate.label', { file: fileName })}
                              onClick={() => setPendingInactivation(document)}
                            >
                              <IconifyIcon icon="mingcute:delete-2-line" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : undefined
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" gap={1} alignItems="center">
                          {url ? (
                            // `component="a"` opts out of the theme's default, which routes every
                            // MuiLink through react-router. This points at an Active Storage blob
                            // on the API host — a real navigation, not an in-app route.
                            <Link
                              component="a"
                              href={url}
                              target="_blank"
                              rel="noopener"
                              variant="body2"
                            >
                              {fileName}
                            </Link>
                          ) : (
                            <Typography variant="body2">{fileName}</Typography>
                          )}
                          {showingInactive ? (
                            <SemanticChip variant="warning" label={t('documents.inactive.chip')} />
                          ) : (
                            <SemanticChip
                              variant={STATUS_VARIANTS[document.status]}
                              label={t(`documents.status.${document.status}`)}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {typeLabel(document.document_type)}
                            {document.byte_size ? ` — ${formatBytes(document.byte_size)}` : ''}
                          </Typography>
                          {showingInactive && document.discarded_at && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                              display="block"
                            >
                              {inactivationLabel(document)}
                            </Typography>
                          )}
                          {isChildBound(document) && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                              display="block"
                            >
                              {[
                                t('documents.child', { name: document.student_name }),
                                senderLabel(document),
                              ]
                                .filter(Boolean)
                                .join(' — ')}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={uploading}>
          {t('common.close')}
        </Button>
      </DialogActions>

      <ConfirmDialog
        open={Boolean(pendingInactivation)}
        title={t('documents.inactivate.title')}
        message={t('documents.inactivate.message', {
          file: pendingInactivation?.filename ?? t('documents.fileFallback'),
        })}
        confirmLabel={
          inactivating ? t('documents.inactivate.confirming') : t('documents.inactivate.confirm')
        }
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmInactivation}
        onCancel={() => (inactivating ? undefined : setPendingInactivation(null))}
      />
    </Dialog>
  );
};

export default PersonDocumentsDialog;
