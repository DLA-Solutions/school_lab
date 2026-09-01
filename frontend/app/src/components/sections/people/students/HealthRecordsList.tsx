import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ConfirmDialog, EmptyState, ErrorBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import HealthRecordDialog from 'components/sections/people/students/HealthRecordDialog';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  StudentHealthRecord,
  deleteHealthRecord,
  healthRecordDocumentUrl,
  listHealthRecords,
} from 'services/healthRecordsApi';

export interface HealthRecordsListProps {
  schoolId: number;
  studentId: number;
  asGuardian?: boolean;
  readOnly?: boolean;
  onChanged?: () => void;
}

const HealthRecordsList = ({
  schoolId,
  studentId,
  asGuardian = false,
  readOnly = false,
  onChanged,
}: HealthRecordsListProps) => {
  const { t } = useTranslation();

  const [records, setRecords] = useState<StudentHealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogRecordId, setDialogRecordId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<StudentHealthRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setRecords(await listHealthRecords(schoolId, studentId, { asGuardian }));
    } catch (err) {
      setRecords([]);
      setError(err instanceof ApiError ? err.message : t('health.records.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, asGuardian, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setDialogRecordId(null);
    setDialogOpen(true);
  };

  const openRecord = (record: StudentHealthRecord) => {
    setDialogRecordId(record.id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setDialogRecordId(null);
  };

  const handleSaved = async () => {
    await load();
    onChanged?.();
  };

  const handleConfirmDelete = async () => {
    if (!removing) {
      return;
    }

    setError('');

    try {
      await deleteHealthRecord(schoolId, studentId, removing.id);
      setRemoving(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('health.records.deleteError'));
    }
  };

  const initialRecord =
    dialogRecordId !== null
      ? records.find((record) => record.id === dialogRecordId) ?? null
      : null;

  return (
    <>
      <Stack direction="column" gap={2}>
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2">{t('health.records.title')}</Typography>
          {!readOnly && asGuardian && (
            <Button size="small" variant="outlined" onClick={openCreate}>
              {t('health.records.add')}
            </Button>
          )}
        </Stack>

        {error && (
          <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />
        )}

        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : records.length === 0 ? (
          <EmptyState
            title={t('health.records.empty.title')}
            description={
              asGuardian && !readOnly
                ? t('health.records.empty.guardian')
                : t('health.records.empty.school')
            }
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" gap={1.5}>
            {records.map((record) => (
              <Stack
                key={record.id}
                direction="row"
                gap={1.5}
                alignItems="center"
                flexWrap="wrap"
              >
                <Stack direction="column" flex={1} minWidth={180}>
                  <Typography variant="body2">{record.title}</Typography>
                  {record.content && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {record.content}
                    </Typography>
                  )}
                </Stack>

                {record.has_document && record.document_url && (
                  <Button
                    size="small"
                    component="a"
                    href={healthRecordDocumentUrl(record) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {record.document_filename ?? t('health.records.viewDocument')}
                  </Button>
                )}

                <Button size="small" onClick={() => openRecord(record)}>
                  {readOnly ? t('health.records.view') : t('health.records.edit')}
                </Button>

                {!readOnly && asGuardian && (
                  <Tooltip title={t('common.delete')}>
                    <IconButton
                      size="small"
                      aria-label={t('health.records.deleteAria', { title: record.title })}
                      onClick={() => setRemoving(record)}
                    >
                      <IconifyIcon icon="mingcute:delete-2-line" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>

      {dialogOpen && (
        <HealthRecordDialog
          open
          schoolId={schoolId}
          studentId={studentId}
          recordId={dialogRecordId}
          initialRecord={initialRecord}
          asGuardian={asGuardian}
          readOnly={readOnly}
          onClose={handleDialogClose}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={t('health.records.deleteTitle')}
        message={
          removing
            ? t('health.records.deleteMessage', { title: removing.title })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
};

export default HealthRecordsList;
