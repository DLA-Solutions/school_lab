import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SemanticChip } from 'design-system';
import { ContractPrefill } from 'types/contract';
import { formatCpf } from 'utils/documentNumber';
import { gradeLevelLabel } from 'utils/gradeLevels';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';

interface ContractPrefillSummaryProps {
  prefill: ContractPrefill;
}

const RELATIONSHIP_KEYS: Record<string, MessageKey> = {
  father: 'contract.prefill.relationship.father',
  mother: 'contract.prefill.relationship.mother',
  other: 'contract.prefill.relationship.other',
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }

  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="column" minWidth={140}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value || '—'}</Typography>
  </Stack>
);

/**
 * What the register already knows about the chosen student, laid out as it will reach the
 * agreement. Nothing here is typed by the operator — the point is to show what the contract will
 * carry, and to name what is missing before it goes out rather than after.
 */
const ContractPrefillSummary = ({ prefill }: ContractPrefillSummaryProps) => {
  const { t } = useTranslation();
  const { student, guardians, blocking_issues: blocking, warnings } = prefill;

  return (
    <Stack direction="column" gap={1.5}>
      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t('contract.prefill.heading')}
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={2} mt={1}>
          <Field label={t('common.student')} value={student.name} />
          <Field label={t('contract.prefill.cpf')} value={student.cpf ? formatCpf(student.cpf) : ''} />
          <Field label={t('contract.prefill.rg')} value={student.rg ?? ''} />
          <Field label={t('contract.prefill.birthDate')} value={formatDate(student.birth_date)} />
          <Field
            label={t('contract.prefill.class')}
            value={
              student.school_class_name
                ? `${gradeLevelLabel(student.grade_level)} ${student.school_class_name}${
                    student.year ? ` — ${student.year}` : ''
                  }`
                : ''
            }
          />
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          {t('contract.prefill.signers')}
        </Typography>

        <Stack direction="column" gap={0.75} mt={0.5}>
          {guardians.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('contract.prefill.noSigners')}
            </Typography>
          ) : (
            guardians.map((person) => (
              <Stack key={person.id} direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2">
                  {`${t(RELATIONSHIP_KEYS[person.relationship] ?? 'contract.prefill.relationship.other')}: ${person.name}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {person.cpf ? `CPF ${formatCpf(person.cpf)}` : t('contract.prefill.noCpf')}
                  {person.email ? ` — ${person.email}` : ` — ${t('contract.prefill.noEmail')}`}
                </Typography>
                {/* Autentique reaches a signer by e-mail and identifies them by CPF, so a
                    guardian missing either cannot sign at all. */}
                <SemanticChip
                  variant={person.can_sign ? 'success' : 'error'}
                  label={person.can_sign ? t('contract.prefill.canSign') : t('contract.prefill.cannotSign')}
                />
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      {blocking.map((issue) => (
        <Alert key={issue} severity="error">
          {issue}
        </Alert>
      ))}

      {warnings.map((warning) => (
        <Alert key={warning} severity="warning">
          {warning}
        </Alert>
      ))}
    </Stack>
  );
};

export default ContractPrefillSummary;
