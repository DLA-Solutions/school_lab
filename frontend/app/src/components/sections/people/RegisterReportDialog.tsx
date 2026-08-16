import { useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import type { MessageKey } from 'locales';

export interface ReportColumn {
  key: string;
  label: MessageKey;
}

export interface RegisterReportDialogProps {
  open: boolean;
  schoolId: number;
  /** The listing's own filters, so the report matches the screen it was asked for from. */
  search: string;
  status: string;
  /** Mirrors the service's own `COLUMNS`, which decides what may actually be drawn. */
  columns: ReportColumn[];
  defaultColumns: string[];
  fetchReport: (
    schoolId: number,
    params: { columns: string[]; q?: string; status?: string },
  ) => Promise<Blob>;
  filename: string;
  onClose: () => void;
}

/**
 * Picks the columns and downloads a register as a PDF.
 *
 * Shared by the guardian and student registers: they differ in which columns they offer and which
 * endpoint they call, and in nothing else.
 *
 * Fetched rather than linked: the endpoint needs the bearer token, which an `<a href>` cannot
 * carry. The bytes arrive as a blob and are handed to the browser through a temporary object URL,
 * revoked straight after so the file is not held in memory.
 */
const RegisterReportDialog = ({
  open,
  schoolId,
  search,
  status,
  columns,
  defaultColumns,
  fetchReport,
  filename,
  onClose,
}: RegisterReportDialogProps) => {
  const { t } = useTranslation();

  const [chosen, setChosen] = useState<string[]>(defaultColumns);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key: string) => {
    setChosen((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
    setError('');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const blob = await fetchReport(schoolId, { columns: chosen, q: search, status });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('guardians.report.error'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('guardians.report.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('guardians.report.description')}
          </Typography>

          {error && <ErrorBanner message={error} />}

          <FormGroup>
            {columns.map((column) => (
              <FormControlLabel
                key={column.key}
                control={
                  <Checkbox
                    checked={chosen.includes(column.key)}
                    onChange={() => toggle(column.key)}
                    disabled={generating}
                  />
                }
                label={t(column.label)}
              />
            ))}
          </FormGroup>

          {/* A guardian with two children enrolled prints as two rows, so the class column means
              something on each of them. */}
          {(chosen.includes('student_name') || chosen.includes('student_class')) && (
            <Typography variant="caption" color="text.secondary">
              {t('guardians.report.perChildHint')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={generating}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generating || chosen.length === 0}
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {generating ? t('guardians.report.generating') : t('guardians.report.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegisterReportDialog;
