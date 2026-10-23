import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SuccessBanner,
} from 'design-system';
import type { MessageKey } from 'locales';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import {
  GUARDIAN_DOCUMENT_MAX_BYTES,
  GUARDIAN_DOCUMENT_MIME_TYPES,
  GUARDIAN_DOCUMENT_TYPES,
  SYSTEM_DOCUMENT_TYPES,
  guardianDocumentUrl,
  listMyDocuments,
  uploadMyDocument,
} from 'services/documentsApi';
import { listMyStudents } from 'services/studentsApi';
import { GuardianDocument } from 'types/document';
import { Student } from 'types/student';

const PAGE_SIZE = 25;

/** Browsers differ on what `accept` matches, so both the MIME types and the extensions are given. */
const ACCEPT = [...GUARDIAN_DOCUMENT_MIME_TYPES, '.pdf', '.jpg', '.jpeg', '.png'].join(',');

interface FieldErrors {
  documentType?: string;
  file?: string;
}

/** The API reports a field's problems as a list; the first is the one worth showing. */
const firstDetail = (value: unknown) => {
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0]);
  }

  return typeof value === 'string' && value ? value : null;
};

/**
 * The guardian's "Meus documentos": sending the family's and the child's papers to the school,
 * and seeing where each one has got to.
 *
 * Documents belong to the child, not to whichever parent sent them, so the mother and the father
 * read one and the same list. The API guarantees that; this page only has to not hide it, which
 * is why the page says so and the list names who sent each file.
 *
 * The file checks here (type, size) are a courtesy so a wrong pick is refused before a 10 MB
 * upload starts. The API detects the type from the bytes and stays the authority.
 */
const MyDocuments = () => {
  const { t, locale } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<GuardianDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterDocumentType, setFilterDocumentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [studentId, setStudentId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyDocuments(schoolId, {
        studentId: filterStudentId ? Number(filterStudentId) : null,
        documentType: filterDocumentType || undefined,
        page: page + 1,
      });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('myDocuments.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, filterStudentId, filterDocumentType, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadStudents = async () => {
      try {
        const response = await listMyStudents(schoolId);
        setStudents(response.data);
        // One child is the common case, and asking that guardian to pick from a list of one is
        // asking a question whose answer is already known.
        if (response.data.length === 1) {
          setStudentId(String(response.data[0].id));
        }
      } catch {
        setStudents([]);
      }
    };

    loadStudents();
  }, [schoolId]);

  const fileProblem = (candidate: File): string | null => {
    // Some browsers report an empty type for a file they do not recognise; that is refused too,
    // since the allowed three are all ones every browser knows.
    if (!(GUARDIAN_DOCUMENT_MIME_TYPES as readonly string[]).includes(candidate.type)) {
      return t('myDocuments.error.unsupportedMediaType');
    }

    if (candidate.size > GUARDIAN_DOCUMENT_MAX_BYTES) {
      return t('myDocuments.error.fileTooLarge');
    }

    return null;
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Reset so choosing the same file again after a refusal still fires a change event.
    event.target.value = '';

    if (!picked) {
      return;
    }

    const problem = fileProblem(picked);
    setNotice('');
    setError('');

    if (problem) {
      setFile(null);
      setFieldErrors((current) => ({ ...current, file: problem }));
      return;
    }

    setFile(picked);
    setFieldErrors((current) => ({ ...current, file: undefined }));
  };

  /** Maps the API's failure, by `error.code` rather than status: 422 and 409 both occur. */
  const applyUploadError = (err: unknown) => {
    if (!(err instanceof ApiError)) {
      setError(t('myDocuments.error.generic'));
      return;
    }

    switch (err.code) {
      case 'validation_error': {
        const documentTypeDetail = firstDetail(err.details.document_type);
        const fileDetail = firstDetail(err.details.file);

        if (documentTypeDetail || fileDetail) {
          setFieldErrors({
            documentType: documentTypeDetail ?? undefined,
            file: fileDetail ?? undefined,
          });
        } else {
          setError(err.message || t('myDocuments.error.generic'));
        }
        return;
      }
      case 'unsupported_media_type':
        setFieldErrors({ file: t('myDocuments.error.unsupportedMediaType') });
        return;
      case 'file_too_large':
        setFieldErrors({ file: t('myDocuments.error.fileTooLarge') });
        return;
      case 'student_inactive':
        setError(t('myDocuments.error.studentInactive'));
        return;
      case 'not_found':
        setError(t('myDocuments.error.notFound'));
        return;
      default:
        setError(
          err.status === 403 ? t('myDocuments.error.forbidden') : t('myDocuments.error.generic'),
        );
    }
  };

  const submit = async () => {
    if (!schoolId) {
      return;
    }

    const missing: FieldErrors = {
      documentType: documentType ? undefined : t('myDocuments.error.documentTypeRequired'),
      file: file ? undefined : t('myDocuments.error.fileRequired'),
    };

    if (!file || !documentType || !studentId) {
      setFieldErrors(missing);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    setFieldErrors({});

    try {
      await uploadMyDocument(schoolId, {
        studentId: Number(studentId),
        documentType,
        file,
      });
      setNotice(t('myDocuments.sent'));
      setDocumentType('');
      setFile(null);
      // A new file belongs on the first page; reloading the page on screen would leave the list
      // on an older slice that does not show it.
      if (page === 0) {
        await load();
      } else {
        setPage(0);
      }
    } catch (err) {
      applyUploadError(err);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<GridColDef<GuardianDocument>[]>(
    () => [
      {
        field: 'document_type',
        headerName: t('myDocuments.column.type'),
        flex: 0.9,
        minWidth: 180,
        renderCell: ({ row }) => {
          // The upload list plus the kinds only the system files (the signed contract), which
          // a guardian cannot send and so are not offered in the form.
          const known = [...GUARDIAN_DOCUMENT_TYPES, ...SYSTEM_DOCUMENT_TYPES].find(
            (type) => type.value === row.document_type,
          );

          // A type the API carries that this build does not know keeps its raw value: better an
          // unfamiliar word than an empty cell.
          return known ? t(known.label as MessageKey) : row.document_type;
        },
      },
      {
        field: 'student_name',
        headerName: t('myDocuments.column.student'),
        flex: 0.8,
        minWidth: 150,
      },
      {
        field: 'filename',
        headerName: t('myDocuments.column.file'),
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere', py: 1 }}>
            {row.filename ?? t('common.none')}
          </Typography>
        ),
      },
      {
        field: 'created_at',
        headerName: t('myDocuments.column.sentOn'),
        width: 130,
        renderCell: ({ row }) => new Date(row.created_at).toLocaleDateString(locale),
      },
      {
        field: 'uploaded_by_name',
        headerName: t('myDocuments.column.sentBy'),
        flex: 0.8,
        minWidth: 150,
        renderCell: ({ row }) => {
          // No uploader at all: the system filed it (the e-signed contract).
          if (row.uploaded_by_kind === null) {
            return t('myDocuments.sentBy.system');
          }

          return row.uploaded_by_kind === 'school'
            ? t('myDocuments.sentBy.school')
            : (row.uploaded_by_name ?? t('common.none'));
        },
      },
      {
        field: 'file_url',
        headerName: t('common.actions'),
        width: 120,
        sortable: false,
        renderCell: ({ row }) => {
          const url = guardianDocumentUrl(row);

          return url ? (
            // A signed Active Storage URL on the API host: a real navigation that needs no bearer
            // token, so it opens in its own tab. `component="a"` opts out of the theme routing
            // every link through react-router.
            <Button
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              aria-label={t('myDocuments.openLabel', { file: row.filename ?? '' })}
              startIcon={<IconifyIcon icon="mingcute:external-link-line" />}
            >
              {t('myDocuments.open')}
            </Button>
          ) : null;
        },
      },
    ],
    [t, locale],
  );

  const filtered = Boolean(filterStudentId || filterDocumentType);

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myDocuments')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myDocuments.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myDocuments')} />

      <InfoBanner message={t('myDocuments.info')} />

      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard>
        <Typography variant="subtitle1" component="h2" gutterBottom>
          {t('myDocuments.new.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          {t('myDocuments.new.description')}
        </Typography>

        <Stack direction="column" gap={2}>
          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <TextField
              id="my-document-student"
              label={t('myDocuments.field.student')}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              variant="filled"
              size="small"
              select
              required
              disabled={saving}
              sx={{ minWidth: 240 }}
            >
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              id="my-document-type"
              label={t('myDocuments.field.documentType')}
              value={documentType}
              onChange={(event) => {
                setDocumentType(event.target.value);
                setFieldErrors((current) => ({ ...current, documentType: undefined }));
              }}
              variant="filled"
              size="small"
              select
              required
              disabled={saving}
              error={Boolean(fieldErrors.documentType)}
              helperText={fieldErrors.documentType}
              sx={{ minWidth: 280 }}
            >
              {GUARDIAN_DOCUMENT_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {t(type.label as MessageKey)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Box>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                startIcon={<IconifyIcon icon="mingcute:attachment-line" />}
              >
                {t('myDocuments.file.choose')}
              </Button>
              <Typography
                variant="body2"
                color={file ? 'text.primary' : 'text.secondary'}
                sx={{ overflowWrap: 'anywhere' }}
              >
                {file ? file.name : t('myDocuments.file.none')}
              </Typography>
              {/* The styled Button is the control people see; the native input stays hidden and
                  is opened through the ref. */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                aria-label={t('myDocuments.field.file')}
                onChange={handleFileSelected}
                hidden
                tabIndex={-1}
              />
            </Stack>
            <FormHelperText
              error={Boolean(fieldErrors.file)}
              role={fieldErrors.file ? 'alert' : undefined}
            >
              {fieldErrors.file ?? t('myDocuments.file.help')}
            </FormHelperText>
          </Box>

          <Box>
            <Button
              variant="contained"
              onClick={submit}
              disabled={saving || !studentId}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? t('myDocuments.sending') : t('myDocuments.send')}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard padding={0}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          sx={{ px: 3.5, pt: 3.5 }}
        >
          <Typography variant="subtitle1" component="h2">
            {t('myDocuments.list.title')}
          </Typography>

          <Stack direction="row" gap={1.5} flexWrap="wrap">
            {students.length > 1 && (
              <TextField
                id="my-document-filter"
                label={t('myDocuments.filter.student')}
                value={filterStudentId}
                onChange={(event) => {
                  setFilterStudentId(event.target.value);
                  setPage(0);
                }}
                variant="filled"
                size="small"
                select
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">{t('myDocuments.filter.all')}</MenuItem>
                {students.map((student) => (
                  <MenuItem key={student.id} value={String(student.id)}>
                    {student.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              id="my-document-type-filter"
              label={t('myDocuments.filter.type')}
              value={filterDocumentType}
              onChange={(event) => {
                setFilterDocumentType(event.target.value);
                setPage(0);
              }}
              variant="filled"
              size="small"
              select
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">{t('myDocuments.filter.allTypes')}</MenuItem>
              {[...GUARDIAN_DOCUMENT_TYPES, ...SYSTEM_DOCUMENT_TYPES].map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {t(type.label as MessageKey)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        {!loading && rows.length === 0 ? (
          <EmptyState
            title={t(filtered ? 'myDocuments.empty.filtered.title' : 'myDocuments.empty.title')}
            description={t(
              filtered ? 'myDocuments.empty.filtered.description' : 'myDocuments.empty.description',
            )}
            headingLevel={3}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              getRowHeight={() => 'auto'}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
            />
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

export default MyDocuments;
