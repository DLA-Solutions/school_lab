import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  createHelpTaxonomyCategory,
  deleteHelpTaxonomyCategory,
  listHelpTaxonomyCategories,
  updateHelpTaxonomyCategory,
} from 'services/helpTaxonomyApi';
import {
  HelpTaxonomyCategory,
  HelpTaxonomyPersonaTag,
} from 'types/helpTaxonomy';
import { SCHOOL_MODULE_KEYS, SchoolModuleKey } from 'types/modules';

const PAGE_SIZE = 25;

const PERSONA_TAGS: HelpTaxonomyPersonaTag[] = ['secretary', 'director', 'teacher', 'guardian'];

type FormState = {
  name: string;
  module_key: string;
  persona_tags: HelpTaxonomyPersonaTag[];
  position: string;
};

const emptyForm = (): FormState => ({
  name: '',
  module_key: '',
  persona_tags: [],
  position: '0',
});

/**
 * Help taxonomy CMS — categories with persona tags and optional module scope.
 */
const HelpTaxonomy = () => {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<HelpTaxonomyCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HelpTaxonomyCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HelpTaxonomyCategory | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listHelpTaxonomyCategories(page + 1);
      setCategories(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setCategories([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof ApiError ? err.message : t('backoffice.helpTaxonomy.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (category: HelpTaxonomyCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      module_key: category.module_key ?? '',
      persona_tags: [...category.persona_tags],
      position: String(category.position),
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const togglePersonaTag = (tag: HelpTaxonomyPersonaTag) => {
    setForm((current) => ({
      ...current,
      persona_tags: current.persona_tags.includes(tag)
        ? current.persona_tags.filter((entry) => entry !== tag)
        : [...current.persona_tags, tag],
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      module_key: form.module_key.trim() || null,
      persona_tags: form.persona_tags,
      position: Number(form.position) || 0,
    };

    try {
      if (editing) {
        await updateHelpTaxonomyCategory(editing.id, payload);
      } else {
        await createHelpTaxonomyCategory(payload);
        setPage(0);
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : t('backoffice.helpTaxonomy.saveError'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleteError('');

    try {
      await deleteHelpTaxonomyCategory(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : t('backoffice.helpTaxonomy.deleteError'),
      );
    }
  };

  const columns: GridColDef<HelpTaxonomyCategory>[] = [
    {
      field: 'name',
      headerName: t('backoffice.helpTaxonomy.name'),
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'slug',
      headerName: t('backoffice.helpTaxonomy.slug'),
      width: 140,
    },
    {
      field: 'module_key',
      headerName: t('backoffice.helpTaxonomy.moduleKey'),
      width: 130,
      renderCell: ({ row }: GridRenderCellParams<HelpTaxonomyCategory>) =>
        row.module_key && SCHOOL_MODULE_KEYS.includes(row.module_key as SchoolModuleKey) ? (
          <Typography variant="body2">
            {t(`backoffice.modules.${row.module_key as SchoolModuleKey}`)}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'persona_tags',
      headerName: t('backoffice.helpTaxonomy.personaTags'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<HelpTaxonomyCategory>) => (
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {row.persona_tags.map((tag) => (
            <SemanticChip
              key={tag}
              variant="info"
              label={t(`backoffice.helpTaxonomy.persona.${tag}`)}
            />
          ))}
        </Stack>
      ),
    },
    {
      field: 'position',
      headerName: t('backoffice.helpTaxonomy.position'),
      width: 90,
    },
    {
      field: 'actions',
      headerName: t('backoffice.helpTaxonomy.actions'),
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<HelpTaxonomyCategory>) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t('backoffice.helpTaxonomy.edit')}>
            <IconButton size="small" aria-label={t('backoffice.helpTaxonomy.edit')} onClick={() => openEdit(row)}>
              <IconifyIcon icon="mingcute:edit-2-line" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('backoffice.helpTaxonomy.delete')}>
            <IconButton
              size="small"
              aria-label={t('backoffice.helpTaxonomy.delete')}
              onClick={() => {
                setDeleteError('');
                setPendingDelete(row);
              }}
            >
              <IconifyIcon icon="mingcute:delete-2-line" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.helpTaxonomy.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.helpTaxonomy.noAccess.title')}
            description={t('backoffice.helpTaxonomy.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.helpTaxonomy.title')}
        subtitle={t('backoffice.helpTaxonomy.subtitle')}
        actions={
          <Button variant="contained" size="small" onClick={openCreate}>
            {t('backoffice.helpTaxonomy.create')}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && categories.length === 0 && !error ? (
          <EmptyState
            title={t('backoffice.helpTaxonomy.empty')}
            description={t('backoffice.helpTaxonomy.subtitle')}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={categories}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Box>
        )}
      </SectionCard>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editing
              ? t('backoffice.helpTaxonomy.editTitle')
              : t('backoffice.helpTaxonomy.createTitle')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {formError && <ErrorBanner message={formError} />}
              <TextField
                label={t('backoffice.helpTaxonomy.name')}
                value={form.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                fullWidth
                variant="filled"
              />
              <TextField
                label={t('backoffice.helpTaxonomy.moduleKey')}
                value={form.module_key}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, module_key: event.target.value }))
                }
                select
                fullWidth
                variant="filled"
              >
                <MenuItem value="">{t('backoffice.helpTaxonomy.moduleKeyNone')}</MenuItem>
                {SCHOOL_MODULE_KEYS.map((key) => (
                  <MenuItem key={key} value={key}>
                    {t(`backoffice.modules.${key}`)}
                  </MenuItem>
                ))}
              </TextField>
              <Stack>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('backoffice.helpTaxonomy.personaTags')}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {PERSONA_TAGS.map((tag) => (
                    <FormControlLabel
                      key={tag}
                      control={
                        <Checkbox
                          checked={form.persona_tags.includes(tag)}
                          onChange={() => togglePersonaTag(tag)}
                        />
                      }
                      label={t(`backoffice.helpTaxonomy.persona.${tag}`)}
                    />
                  ))}
                </Stack>
              </Stack>
              <TextField
                label={t('backoffice.helpTaxonomy.position')}
                value={form.position}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, position: event.target.value }))
                }
                fullWidth
                variant="filled"
                type="number"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm} disabled={saving}>
              {t('backoffice.helpTaxonomy.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={saving || !form.name.trim()}>
              {t('backoffice.helpTaxonomy.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('backoffice.helpTaxonomy.deleteConfirmTitle')}
        message={t('backoffice.helpTaxonomy.deleteConfirmMessage', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('backoffice.helpTaxonomy.delete')}
        onConfirm={handleDelete}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError('');
        }}
        destructive
      />

      {deleteError && <ErrorBanner message={deleteError} />}
    </Stack>
  );
};

export default HelpTaxonomy;
