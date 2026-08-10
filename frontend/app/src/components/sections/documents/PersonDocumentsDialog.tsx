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
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import { ApiError } from 'services/api';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';
import {
  DocumentableType,
  PERSONAL_DOCUMENT_TYPES,
  deleteDocument,
  documentDownloadUrl,
  documentTypeKey,
  listPersonDocuments,
  uploadPersonDocument,
} from 'services/documentsApi';
import { SchoolDocument } from 'types/document';

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

const STATUS_LABELS: Record<SchoolDocument['status'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

// `SemanticChip` speaks in intent, not in the API's status vocabulary.
const STATUS_VARIANTS: Record<SchoolDocument['status'], 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

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
  emptyDescription = 'Envie CPF, RG ou comprovante de residência desta pessoa.',
  onClose,
}: PersonDocumentsDialogProps) => {
  const { t } = useTranslation();
  // A type the API carries that this build does not know keeps its raw value: better an
  // unfamiliar word than an empty cell.
  const typeLabel = (value: string) => {
    const key = documentTypeKey(value);

    return key ? t(key as MessageKey) : value;
  };
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentType, setDocumentType] = useState<string>(documentTypes[0].value);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listPersonDocuments(schoolId, documentableType, documentableId);
      setDocuments(response.data);
    } catch (err) {
      setDocuments([]);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os documentos. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, documentableType, documentableId]);

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
        setError(fileError ? `Arquivo ${fileError}.` : err.message);
      } else {
        setError('Não foi possível enviar o arquivo. Verifique sua conexão.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (document: SchoolDocument) => {
    setRemovingId(document.id);
    setError('');

    try {
      await deleteDocument(schoolId, document.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível remover o documento.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Documentos pessoais
        <Typography variant="body2" color="text.secondary">
          {subtitle ? `${title} — ${subtitle}` : title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack direction="column" gap={2.5} pt={0.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems="stretch">
            <TextField
              id="document-type"
              label="Tipo de documento"
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
              {uploading ? 'Enviando...' : 'Enviar arquivo'}
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

          {error && <ErrorBanner message={error} />}

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : documents.length === 0 ? (
            <EmptyState title="Nenhum documento enviado" description={emptyDescription} />
          ) : (
            <List disablePadding>
              {documents.map((document) => {
                const url = documentDownloadUrl(document);

                return (
                  <ListItem
                    key={document.id}
                    disableGutters
                    secondaryAction={
                      <Tooltip title="Remover">
                        <span>
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label={`Remover ${document.filename ?? 'documento'}`}
                            onClick={() => handleRemove(document)}
                            disabled={removingId === document.id}
                          >
                            {removingId === document.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <IconifyIcon icon="mingcute:delete-2-line" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
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
                              {document.filename ?? 'documento'}
                            </Link>
                          ) : (
                            <Typography variant="body2">
                              {document.filename ?? 'documento'}
                            </Typography>
                          )}
                          <SemanticChip
                            variant={STATUS_VARIANTS[document.status]}
                            label={STATUS_LABELS[document.status]}
                          />
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {typeLabel(document.document_type)}
                          {document.byte_size ? ` — ${formatBytes(document.byte_size)}` : ''}
                        </Typography>
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
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonDocumentsDialog;
