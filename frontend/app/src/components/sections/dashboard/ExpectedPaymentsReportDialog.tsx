import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { listSchoolClasses } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { ExpectedPaymentsStatus, fetchExpectedPaymentsReport } from 'services/billingReportsApi';
import { SchoolClass } from 'types/academics';
import downloadBlob from 'utils/downloadBlob';
import { schoolClassLabel } from 'utils/schoolClassLabel';
import {
  EXPECTED_PAYMENTS_REPORT_COLUMNS,
  EXPECTED_PAYMENTS_REPORT_DEFAULTS,
} from 'pages/billing/expectedPaymentsReport';

export interface ExpectedPaymentsReportDialogProps {
  open: boolean;
  schoolId: number;
  onClose: () => void;
}

const ALL_CLASSES = 'all';

const STATUS_OPTIONS: {
  value: ExpectedPaymentsStatus;
  label: 'common.actives' | 'common.transferred' | 'common.allStatus';
}[] = [
  { value: 'active', label: 'common.actives' },
  { value: 'transferred', label: 'common.transferred' },
  { value: 'all', label: 'common.allStatus' },
];

/**
 * Picks the class, the situation and the columns, then downloads the expected payments PDF.
 *
 * A sibling of `RegisterReportDialog` rather than a use of it: that one is worded for the
 * guardians' register and filters by a search term, where this one filters by class and carries
 * no search. What they share — fetching a blob and handing it to the browser — is `downloadBlob`.
 */
const ExpectedPaymentsReportDialog = ({
  open,
  schoolId,
  onClose,
}: ExpectedPaymentsReportDialogProps) => {
  const { t } = useTranslation();

  const [chosen, setChosen] = useState<string[]>(EXPECTED_PAYMENTS_REPORT_DEFAULTS);
  const [classId, setClassId] = useState(ALL_CLASSES);
  const [status, setStatus] = useState<ExpectedPaymentsStatus>('active');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // The classes are listed page by page; the select needs all of them.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let current = true;

    const load = async () => {
      const all: SchoolClass[] = [];
      try {
        for (let page = 1; ; page += 1) {
          const response = await listSchoolClasses(schoolId, { page });
          all.push(...response.data);
          if (response.data.length === 0 || all.length >= response.meta.total) {
            break;
          }
        }
      } catch {
        // "Todas as turmas" still works; a list that failed to load only leaves the select short.
      }
      if (current) {
        setClasses(all);
      }
    };

    load();

    return () => {
      current = false;
    };
  }, [open, schoolId]);

  const toggle = (key: string) => {
    setChosen((existing) =>
      existing.includes(key) ? existing.filter((item) => item !== key) : [...existing, key],
    );
    setError('');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const blob = await fetchExpectedPaymentsReport(schoolId, {
        columns: chosen,
        schoolClassId: classId === ALL_CLASSES ? undefined : Number(classId),
        status,
      });

      downloadBlob(blob, 'valores-previstos.pdf');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.expectedPayments.error'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('dashboard.expectedPayments.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.expectedPayments.description')}
          </Typography>

          {error && <ErrorBanner message={error} />}

          <TextField
            select
            size="small"
            label={t('common.class')}
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            disabled={generating}
          >
            <MenuItem value={ALL_CLASSES}>{t('dashboard.expectedPayments.allClasses')}</MenuItem>
            {classes.map((schoolClass) => (
              <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                {schoolClassLabel(schoolClass, t)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={t('common.status')}
            value={status}
            onChange={(event) => setStatus(event.target.value as ExpectedPaymentsStatus)}
            disabled={generating}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.label)}
              </MenuItem>
            ))}
          </TextField>

          <FormGroup>
            {EXPECTED_PAYMENTS_REPORT_COLUMNS.map((column) => (
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

          {/* The API draws the subtotals and the grand total only with the amount column. */}
          {!chosen.includes('expected_amount') && (
            <Typography variant="caption" color="text.secondary">
              {t('dashboard.expectedPayments.totalsHint')}
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
          {generating
            ? t('dashboard.expectedPayments.generating')
            : t('dashboard.expectedPayments.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpectedPaymentsReportDialog;
