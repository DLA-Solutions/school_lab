import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef } from '@mui/x-data-grid';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { createMyRequest, listMyRequests } from 'services/requestsApi';
import { listMyStudents } from 'services/studentsApi';
import {
  GuardianRequest,
  GuardianRequestKind,
  GuardianRequestStatus,
} from 'types/guardianRequest';
import { Student } from 'types/student';

const PAGE_SIZE = 25;

const STATUS_VARIANT: Record<GuardianRequestStatus, 'info' | 'warning' | 'success' | 'error'> = {
  pending: 'info',
  in_progress: 'warning',
  fulfilled: 'success',
  rejected: 'error',
};

/**
 * The guardian's side of Solicitações: asking the school for something, and seeing where the ask
 * has got to.
 *
 * The form and the list share a page rather than sitting behind a dialog. A guardian arrives here
 * either to ask for something or to check on what they asked for last week, and both should be
 * answered by the page loading.
 *
 * Nothing here gates which kind may be asked for. Whether the school can grant a second sitting is
 * the school's answer to give, and a form that refused to send the question would have the family
 * telephoning to ask it anyway.
 */
const MyRequests = () => {
  const { t } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<GuardianRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [studentId, setStudentId] = useState('');
  const [kind, setKind] = useState<GuardianRequestKind>('declaration');
  const [referenceDate, setReferenceDate] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyRequests(schoolId, page + 1);
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('myRequests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

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
        // One child is the common case, and making that guardian pick from a list of one is
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

  const submit = async () => {
    if (!schoolId || !studentId || !details.trim()) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await createMyRequest(schoolId, {
        student_id: Number(studentId),
        kind,
        details: details.trim(),
        reference_date: kind === 'second_call' && referenceDate ? referenceDate : null,
      });
      setNotice(t('myRequests.sent'));
      setDetails('');
      setReferenceDate('');
      // A new ask belongs on the first page. Reloading the page already on screen would leave
      // it sitting on an older slice of the list.
      if (page === 0) {
        await load();
      } else {
        setPage(0);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('myRequests.sendError'));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<GridColDef<GuardianRequest>[]>(
    () => [
      {
        field: 'kind',
        headerName: t('requests.column.kind'),
        flex: 0.8,
        minWidth: 150,
        renderCell: ({ row }) => t(`requests.kind.${row.kind}`),
      },
      {
        field: 'status',
        headerName: t('requests.column.status'),
        width: 150,
        renderCell: ({ row }) => (
          <SemanticChip
            variant={STATUS_VARIANT[row.status]}
            label={t(`requests.status.${row.status}`)}
          />
        ),
      },
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 0.8,
        minWidth: 160,
      },
      {
        field: 'created_at',
        headerName: t('requests.column.openedOn'),
        width: 130,
        renderCell: ({ row }) => new Date(row.created_at).toLocaleDateString(),
      },
      {
        field: 'details',
        headerName: t('requests.field.details'),
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', py: 1 }}>
            {row.details}
          </Typography>
        ),
      },
      {
        field: 'resolution_note',
        headerName: t('requests.field.resolution'),
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) =>
          row.resolution_note ? (
            // The school's answer, where it has given one. A guardian refused reads why here
            // rather than telephoning to ask.
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', py: 1 }}>
              {row.resolution_note}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('common.none')}
            </Typography>
          ),
      },
    ],
    [t],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myRequests')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myRequests.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myRequests')} />

      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard>
        <Typography variant="subtitle1" component="h2" gutterBottom>
          {t('myRequests.new.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          {t('myRequests.new.description')}
        </Typography>

        <Stack direction="column" gap={2}>
          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <TextField
              id="my-request-student"
              label={t('common.student')}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              variant="filled"
              size="small"
              select
              required
              sx={{ minWidth: 240 }}
            >
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              id="my-request-kind"
              label={t('requests.column.kind')}
              value={kind}
              onChange={(event) => setKind(event.target.value as GuardianRequestKind)}
              variant="filled"
              size="small"
              select
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="declaration">{t('requests.kind.declaration')}</MenuItem>
              <MenuItem value="second_call">{t('requests.kind.second_call')}</MenuItem>
            </TextField>

            {kind === 'second_call' && (
              <TextField
                id="my-request-date"
                label={t('requests.field.referenceDate')}
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
                variant="filled"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 200 }}
              />
            )}
          </Stack>

          <TextField
            id="my-request-details"
            label={t('requests.field.details')}
            helperText={
              kind === 'second_call'
                ? t('myRequests.details.secondCallHelp')
                : t('myRequests.details.declarationHelp')
            }
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            variant="filled"
            size="small"
            multiline
            minRows={3}
            required
            fullWidth
          />

          <Box>
            <Button
              variant="contained"
              onClick={submit}
              disabled={saving || !studentId || !details.trim()}
            >
              {t('myRequests.send')}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard padding={0}>
        <Typography variant="subtitle1" component="h2" sx={{ px: 3.5, pt: 3.5 }} gutterBottom>
          {t('myRequests.list.title')}
        </Typography>

        {!loading && rows.length === 0 ? (
          <EmptyState
            title={t('myRequests.empty.title')}
            description={t('myRequests.empty.description')}
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

export default MyRequests;
