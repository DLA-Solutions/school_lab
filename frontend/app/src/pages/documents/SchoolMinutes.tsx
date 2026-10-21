import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
} from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import MinutesBookDialog from 'components/sections/documents/minutes/MinutesBookDialog';
import MinutesEntryDialog from 'components/sections/documents/minutes/MinutesEntryDialog';
import MinutesEntryFormDialog from 'components/sections/documents/minutes/MinutesEntryFormDialog';
import MinutesKindChooserDialog from 'components/sections/documents/minutes/MinutesKindChooserDialog';
import MinutesStatusChip from 'components/sections/documents/minutes/MinutesStatusChip';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import paths from 'routes/paths';
import { MINUTES_SYSTEM_KEYS } from 'routes/sitemap';
import { listAllMinutesBooks, listMinutesEntries } from 'services/minutesApi';
import {
  MINUTES_KINDS,
  MINUTES_STATUSES,
  MinutesBook,
  MinutesEntry,
  MinutesEntrySummary,
  MinutesKind,
  MinutesStatus,
} from 'types/minutes';
import { minutesErrorMessage } from 'utils/api/minutesErrors';
import { useDebouncedValue } from 'utils/useDebouncedValue';

const PAGE_SIZE = 25;

const isYear = (value: string) => /^\d{4}$/.test(value.trim());

/**
 * "Atas da Escola" (BC4 Livro Ata, `docs/prds/documents-and-archive/livro-ata.md`) — yearly books
 * of minutes, written here, rendered to PDF and signed through Autentique.
 *
 * Only the director, coordination and secretary role templates reach it (the API answers `403` to
 * anyone else); the old BC7 incident "Ata" screen stays one click away as "Notas de ocorrência"
 * (BR-LA08).
 */
const SchoolMinutes = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const systemKey = school?.role_template?.system_key ?? null;
  const allowed =
    systemKey !== null && (MINUTES_SYSTEM_KEYS as readonly string[]).includes(systemKey);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [year, setYear] = useState('');
  const debouncedYear = useDebouncedValue(year);
  const [kind, setKind] = useState<MinutesKind | ''>('');
  const [status, setStatus] = useState<MinutesStatus | ''>('');
  const [bookFilter, setBookFilter] = useState('');
  const [page, setPage] = useState(0);

  const [entries, setEntries] = useState<MinutesEntrySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [books, setBooks] = useState<MinutesBook[]>([]);
  const [booksError, setBooksError] = useState('');

  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [formKind, setFormKind] = useState<MinutesKind | null>(null);
  const [editing, setEditing] = useState<MinutesEntry | null>(null);
  const [opened, setOpened] = useState<MinutesEntrySummary | null>(null);

  const yearFilter = isYear(debouncedYear) ? Number(debouncedYear.trim()) : undefined;
  const filtersActive = Boolean(
    debouncedSearch || yearFilter !== undefined || kind || status || bookFilter,
  );

  const loadBooks = useCallback(async () => {
    if (!schoolId || !allowed) {
      return;
    }

    setBooksError('');

    try {
      setBooks(await listAllMinutesBooks(schoolId));
    } catch (err) {
      setBooks([]);
      setBooksError(minutesErrorMessage(err, t, 'minutes.books.loadError'));
    }
  }, [schoolId, allowed, t]);

  const loadEntries = useCallback(async () => {
    if (!schoolId || !allowed) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMinutesEntries(schoolId, {
        page: page + 1,
        q: debouncedSearch || undefined,
        year: yearFilter,
        kind: kind || undefined,
        status: status || undefined,
        minutesBookId: bookFilter ? Number(bookFilter) : undefined,
      });
      setEntries(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setEntries([]);
      setTotal(0);
      setError(minutesErrorMessage(err, t, 'minutes.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, allowed, page, debouncedSearch, yearFilter, kind, status, bookFilter, t]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // A new search is a new result set — never stay on page 4 of a different one.
  const resetPage = () => setPage(0);

  const refresh = () => {
    loadEntries();
    loadBooks();
  };

  const handleSaved = (entry: MinutesEntry) => {
    setFormKind(null);
    setEditing(null);
    setOpened(entry);
    refresh();
  };

  const columns = useMemo<GridColDef<MinutesEntrySummary>[]>(
    () => [
      { field: 'title', headerName: t('minutes.column.title'), flex: 1.2, minWidth: 200 },
      {
        field: 'kind',
        headerName: t('minutes.column.kind'),
        width: 210,
        valueGetter: (_value, row) => t(`minutes.kind.${row.kind}`),
      },
      {
        field: 'book',
        headerName: t('minutes.column.book'),
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row) => `${row.book.name} (${row.book.year})`,
      },
      {
        field: 'held_on',
        headerName: t('minutes.column.heldOn'),
        width: 120,
        valueGetter: (_value, row) => new Date(`${row.held_on}T12:00:00`).toLocaleDateString(),
      },
      {
        field: 'participants',
        headerName: t('minutes.column.participants'),
        flex: 1,
        minWidth: 180,
        sortable: false,
        valueGetter: (_value, row) =>
          row.participants.map((participant) => participant.name).join(', '),
      },
      {
        field: 'status',
        headerName: t('common.status'),
        width: 200,
        renderCell: ({ row }: GridRenderCellParams<MinutesEntrySummary>) => (
          <MinutesStatusChip status={row.status} />
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<MinutesEntrySummary>) => (
          <Tooltip title={t('minutes.detail.open', { title: row.title })}>
            <IconButton
              size="small"
              aria-label={t('minutes.detail.open', { title: row.title })}
              onClick={() => setOpened(row)}
            >
              <IconifyIcon icon="mingcute:eye-line" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [t],
  );

  if (!school || !allowed) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.schoolMinutes')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('minutes.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('nav.schoolMinutes')}
        subtitle={t('minutes.subtitle')}
        actions={
          <>
            <Button component={RouterLink} to={paths.atas} size="small" color="inherit">
              {t('minutes.incidentNotesLink')}
            </Button>
            <Button variant="contained" size="small" onClick={() => setChooserOpen(true)}>
              {t('minutes.new')}
            </Button>
          </>
        }
      />

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <SearchField
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          placeholder={t('minutes.search.placeholder')}
          ariaLabel={t('minutes.search.label')}
          sx={{ width: 240 }}
        />
        <TextField
          id="minutes-filter-year"
          label={t('minutes.filter.year')}
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            resetPage();
          }}
          variant="filled"
          size="small"
          sx={{ width: 130 }}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
        />
        <TextField
          id="minutes-filter-kind"
          label={t('minutes.filter.kind')}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as MinutesKind | '');
            resetPage();
          }}
          variant="filled"
          size="small"
          select
          sx={{ width: 230 }}
        >
          <MenuItem value="">{t('minutes.filter.all')}</MenuItem>
          {MINUTES_KINDS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(`minutes.kind.${option}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="minutes-filter-status"
          label={t('minutes.filter.status')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as MinutesStatus | '');
            resetPage();
          }}
          variant="filled"
          size="small"
          select
          sx={{ width: 210 }}
        >
          <MenuItem value="">{t('minutes.filter.all')}</MenuItem>
          {MINUTES_STATUSES.map((option) => (
            <MenuItem key={option} value={option}>
              {t(`minutes.status.${option}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="minutes-filter-book"
          label={t('minutes.filter.book')}
          value={bookFilter}
          onChange={(e) => {
            setBookFilter(e.target.value);
            resetPage();
          }}
          variant="filled"
          size="small"
          select
          sx={{ width: 230 }}
        >
          <MenuItem value="">{t('minutes.filter.all')}</MenuItem>
          {books.map((book) => (
            <MenuItem key={book.id} value={String(book.id)}>
              {`${book.name} (${book.year})`}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && (
        <ErrorBanner message={error} onRetry={loadEntries} retryLabel={t('common.tryAgain')} />
      )}

      <SectionCard padding={0}>
        {!loading && entries.length === 0 && !error ? (
          <EmptyState
            title={t('minutes.empty.title')}
            description={
              filtersActive ? t('minutes.empty.filtered') : t('minutes.empty.description')
            }
            action={
              filtersActive ? undefined : (
                <Button variant="contained" size="small" onClick={() => setChooserOpen(true)}>
                  {t('minutes.new')}
                </Button>
              )
            }
          />
        ) : (
          <Box px={2} py={2.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={entries}
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

      <SectionCard
        title={t('minutes.books.title')}
        headerActions={
          <Button variant="outlined" size="small" onClick={() => setBookDialogOpen(true)}>
            {t('minutes.books.new')}
          </Button>
        }
      >
        {booksError && (
          <ErrorBanner message={booksError} onRetry={loadBooks} retryLabel={t('common.tryAgain')} />
        )}
        {!booksError && books.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('minutes.books.empty')}
          </Typography>
        ) : (
          <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {books.map((book) => (
              <Stack
                component="li"
                key={book.id}
                direction="row"
                spacing={2}
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography variant="body2">{`${book.name} (${book.year})`}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('minutes.books.entries', { count: book.entries_count })}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>

      <MinutesBookDialog
        open={bookDialogOpen}
        schoolId={school.school_id}
        onClose={() => setBookDialogOpen(false)}
        onCreated={() => {
          setBookDialogOpen(false);
          loadBooks();
        }}
      />

      <MinutesKindChooserDialog
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onChoose={(chosen) => {
          setChooserOpen(false);
          setEditing(null);
          setFormKind(chosen);
        }}
      />

      <MinutesEntryFormDialog
        open={formKind !== null}
        schoolId={school.school_id}
        books={books}
        kind={formKind ?? 'meeting'}
        entry={editing}
        onClose={() => {
          setFormKind(null);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <MinutesEntryDialog
        open={opened !== null && formKind === null}
        schoolId={school.school_id}
        summary={opened}
        onClose={() => setOpened(null)}
        onChanged={refresh}
        onEdit={(entry) => {
          setEditing(entry);
          setFormKind(entry.kind);
        }}
      />
    </Stack>
  );
};

export default SchoolMinutes;
