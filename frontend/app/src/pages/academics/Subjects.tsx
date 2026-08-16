import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
} from 'design-system';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { createSubject, deleteSubject, listSubjects, updateSubject } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import { Subject } from 'types/academics';

const PAGE_SIZE = 25;

export interface SubjectsProps {
  /**
   * Rendered as a tab inside the Aulas page rather than on its own route. The page above
   * already names itself and carries the tabs, so the heading is dropped and the toolbar is
   * laid out the way the sibling tabs lay theirs out.
   */
  embedded?: boolean;
}
const Subjects = ({ embedded = false }: SubjectsProps) => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);
  // Same shape as the other academic listings: the term lives in the URL, and the API does the
  // filtering, so it is debounced rather than sent per keystroke.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const debouncedSearch = useDebouncedValue(search);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listSubjects(schoolId, page + 1, debouncedSearch);
      setSubjects(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setSubjects([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('subjects.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, debouncedSearch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (subject: Subject | null) => {
    setEditing(subject);
    setName(subject?.name ?? '');
    setNameError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    if (!name.trim()) {
      setNameError(t('subjects.nameRequired'));
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await updateSubject(schoolId, editing.id, name.trim());
      } else {
        await createSubject(schoolId, name.trim());
      }

      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.details.name;
        setNameError(
          Array.isArray(detail) && typeof detail[0] === 'string' ? detail[0] : err.message,
        );
      } else {
        setNameError(t('common.saveConnectionError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    try {
      await deleteSubject(schoolId, pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('subjects.deleteError'));
      setPendingDelete(null);
    }
  };

  const columns: GridColDef<Subject>[] = useMemo(
    () => [
      { field: 'name', headerName: t('common.subject'), flex: 1, minWidth: 220 },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 110,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<Subject>) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                aria-label={t('subjects.editAria', { name: row.name })}
                onClick={() => openForm(row)}
              >
                <IconifyIcon icon="mingcute:edit-2-line" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                aria-label={t('subjects.deleteAria', { name: row.name })}
                onClick={() => setPendingDelete(row)}
              >
                <IconifyIcon icon="mingcute:delete-2-line" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [t],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('subjects.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('subjects.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      {embedded ? (
        // Same toolbar the Aulas tab lays out for itself, so the three tabs read as one
        // screen: ranged left rather than pushed right by `PageHeader`'s `space-between`,
        // and bottom-aligned because a labelled select is taller than a bare search box.
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
          <SearchField
            value={search}
            onChange={(e) => {
              setSearchParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  if (e.target.value) {
                    next.set('q', e.target.value);
                  } else {
                    next.delete('q');
                  }
                  return next;
                },
                { replace: true },
              );
              setPage(0);
            }}
            placeholder={t('subjects.searchPlaceholder')}
            ariaLabel={t('subjects.searchAria')}
            sx={{ width: 220 }}
          />
          <Button variant="contained" size="small" onClick={() => openForm(null)}>
            {t('subjects.new')}
          </Button>
        </Stack>
      ) : (
        <PageHeader
          title={t('subjects.title')}
          actions={
            <>
              <SearchField
                value={search}
                onChange={(e) => {
                  setSearchParams(
                    (current) => {
                      const next = new URLSearchParams(current);
                      if (e.target.value) {
                        next.set('q', e.target.value);
                      } else {
                        next.delete('q');
                      }
                      return next;
                    },
                    { replace: true },
                  );
                  setPage(0);
                }}
                placeholder={t('subjects.searchPlaceholder')}
                ariaLabel={t('subjects.searchAria')}
                sx={{ width: 220 }}
              />
              <Button variant="contained" size="small" onClick={() => openForm(null)}>
                {t('subjects.new')}
              </Button>
            </>
          }
        />
      )}

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && subjects.length === 0 && !error ? (
          <EmptyState
            title={t('subjects.empty.title')}
            description={t('subjects.empty.description')}
            action={
              <Button variant="contained" size="small" onClick={() => openForm(null)}>
                {t('subjects.new')}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={subjects}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
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

      <Dialog
        open={formOpen}
        onClose={saving ? undefined : () => setFormOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{editing ? t('subjects.edit') : t('subjects.new')}</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <TextField
              id="subject-name"
              name="name"
              label={t('common.name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              error={Boolean(nameError)}
              helperText={nameError}
              disabled={saving}
              variant="filled"
              fullWidth
              autoFocus
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)} color="inherit" disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('subjects.deleteTitle')}
        message={t('subjects.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Subjects;
