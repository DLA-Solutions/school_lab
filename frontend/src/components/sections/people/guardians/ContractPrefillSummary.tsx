import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SemanticChip } from 'design-system';
import { ContractPrefill } from 'types/contract';
import { formatCpf } from 'utils/documentNumber';
import { gradeLevelLabel } from 'utils/gradeLevels';

interface ContractPrefillSummaryProps {
  prefill: ContractPrefill;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Pai',
  mother: 'Mãe',
  other: 'Responsável',
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
          Dados que entram no contrato
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={2} mt={1}>
          <Field label="Aluno" value={student.name} />
          <Field label="CPF" value={student.cpf ? formatCpf(student.cpf) : ''} />
          <Field label="RG" value={student.rg ?? ''} />
          <Field label="Nascimento" value={formatDate(student.birth_date)} />
          <Field
            label="Turma"
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
          Responsáveis que vão assinar
        </Typography>

        <Stack direction="column" gap={0.75} mt={0.5}>
          {guardians.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum responsável vinculado a este aluno.
            </Typography>
          ) : (
            guardians.map((person) => (
              <Stack key={person.id} direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2">
                  {`${RELATIONSHIP_LABELS[person.relationship] ?? 'Responsável'}: ${person.name}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {person.cpf ? `CPF ${formatCpf(person.cpf)}` : 'sem CPF'}
                  {person.email ? ` — ${person.email}` : ' — sem e-mail'}
                </Typography>
                {/* Autentique reaches a signer by e-mail and identifies them by CPF, so a
                    guardian missing either cannot sign at all. */}
                <SemanticChip
                  variant={person.can_sign ? 'success' : 'error'}
                  label={person.can_sign ? 'Pode assinar' : 'Cadastro incompleto'}
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
