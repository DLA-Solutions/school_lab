import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import { ApiError } from 'services/api';
import {
  dispatchContract,
  listBillingPlans,
  listContracts,
  listPlanDiscounts,
  sendContract,
  signContract,
} from 'services/contractsApi';
import { listStudents } from 'services/studentsApi';
import { BillingPlan, Contract, PlanDiscount } from 'types/contract';
import { Guardian } from 'types/guardian';
import { Student } from 'types/student';
import { formatCpf } from 'utils/documentNumber';
import { formatCents, formatCentsInput, parseCents } from 'utils/money';

export interface GuardianContractsDialogProps {
  open: boolean;
  schoolId: number;
  guardian: Guardian;
  onClose: () => void;
}

type FormField =
  | 'student_id'
  | 'billing_plan_id'
  | 'plan_discount_id'
  | 'payer_guardian_id'
  | 'amount'
  | 'due_day';

type FormState = Record<FormField, string>;

type FieldErrors = Partial<Record<FormField, string>>;

// The 5th is the school's usual due date, so it is what the form starts on.
const emptyForm: FormState = {
  student_id: '',
  billing_plan_id: '',
  plan_discount_id: '',
  payer_guardian_id: '',
  amount: '',
  due_day: '5',
};

/** The API reports errors against `negotiated_amount_cents`; the field here is `amount`. */
const API_FIELD_TO_FORM: Record<string, FormField> = {
  student_id: 'student_id',
  billing_plan_id: 'billing_plan_id',
  negotiated_amount_cents: 'amount',
  due_day: 'due_day',
};

/**
 * A contract that was never dispatched is not waiting on the family — it is waiting on us, and
 * saying "aguardando assinatura" for it would send the school looking in the wrong place.
 */
const signatureChip = (contract: Contract) => {
  if (contract.signature_status === 'signed') {
    return { variant: 'success' as const, label: 'Assinado' };
  }

  return contract.sent_to_provider
    ? { variant: 'warning' as const, label: 'Aguardando assinatura' }
    : { variant: 'error' as const, label: 'Não enviado' };
};

const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString('pt-BR');
};

const GuardianContractsDialog = ({
  open,
  schoolId,
  guardian,
  onClose,
}: GuardianContractsDialogProps) => {
  const [tab, setTab] = useState<Contract['signature_status']>('signed');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [discounts, setDiscounts] = useState<PlanDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The dialog was opened from this guardian, so they are the obvious payer — the boletos go
  // out on the CPF of whoever answers for the contract.
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    payer_guardian_id: String(guardian.id),
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [signingId, setSigningId] = useState<number | null>(null);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  const loadContracts = useCallback(
    async (signatureStatus: Contract['signature_status']) => {
      setLoading(true);

      try {
        const response = await listContracts({
          schoolId,
          guardianId: guardian.id,
          signatureStatus,
        });
        setContracts(response.data);
      } catch (err) {
        setContracts([]);
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar os contratos. Verifique sua conexão.',
        );
      } finally {
        setLoading(false);
      }
    },
    [schoolId, guardian.id],
  );

  useEffect(() => {
    loadContracts(tab);
  }, [loadContracts, tab]);

  // The children of this guardian and the school's plans drive the form's two selects. Loaded
  // once per mount: neither changes while the dialog is open.
  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [studentList, planList, discountList] = await Promise.all([
          listStudents({ schoolId, guardianId: guardian.id }),
          listBillingPlans(schoolId),
          listPlanDiscounts(schoolId),
        ]);
        setStudents(studentList.data);
        setPlans(planList.data);
        setDiscounts(discountList.data);
      } catch {
        // The list above already reports connectivity problems; leaving the selects empty is
        // enough of a signal here, and the send attempt would surface anything else.
        setStudents([]);
        setPlans([]);
        setDiscounts([]);
      }
    };

    loadFormOptions();
  }, [schoolId, guardian.id]);

  /**
   * The amount follows the plan's full price and the band granted, so it is explainable rather
   * than typed from memory. It stays editable: a negotiated figure is still a real case.
   */
  const amountFor = (planId: string, discountId: string) => {
    const plan = plans.find((option) => String(option.id) === planId);
    if (!plan?.base_amount_cents) {
      return null;
    }

    const discount = discounts.find((option) => String(option.id) === discountId);
    const percent = discount?.percent ?? 0;

    return Math.round((plan.base_amount_cents * (100 - percent)) / 100);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as FormField;

    setForm((current) => {
      const next = {
        ...current,
        [field]: field === 'amount' ? formatCentsInput(value) : value,
      };

      if (field === 'billing_plan_id' || field === 'plan_discount_id') {
        const cents = amountFor(next.billing_plan_id, next.plan_discount_id);
        if (cents !== null) {
          next.amount = formatCentsInput(String(cents));
        }
      }

      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  };

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: FieldErrors = {};
    if (!form.student_id) {
      errors.student_id = 'Selecione o filho.';
    }
    if (!form.billing_plan_id) {
      errors.billing_plan_id = 'Selecione o plano.';
    }

    const cents = parseCents(form.amount);
    if (!cents) {
      errors.amount = 'Informe o valor da mensalidade.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSending(true);
    setError('');

    try {
      const contract = await sendContract(schoolId, {
        student_id: Number(form.student_id),
        billing_plan_id: Number(form.billing_plan_id),
        negotiated_amount_cents: cents as number,
        plan_discount_id: form.plan_discount_id ? Number(form.plan_discount_id) : null,
        payer_guardian_id: form.payer_guardian_id ? Number(form.payer_guardian_id) : null,
        due_day: form.due_day ? Number(form.due_day) : null,
      });

      setForm({ ...emptyForm, payer_guardian_id: String(guardian.id) });

      // The contract exists now; dispatching it is the step that puts it in the family's inbox.
      // A failure there leaves a contract to resend rather than losing the whole thing, so it is
      // reported without undoing the creation.
      let dispatchFailure = '';
      try {
        await dispatchContract(schoolId, contract.id);
      } catch (dispatchError) {
        dispatchFailure =
          dispatchError instanceof ApiError
            ? dispatchMessage(dispatchError)
            : 'Contrato criado, mas o envio para assinatura falhou. Use "Reenviar".';
      }

      setTab('pending_signature');
      await loadContracts('pending_signature');

      if (dispatchFailure) {
        setError(dispatchFailure);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = Object.entries(err.details).reduce<FieldErrors>((acc, [key, value]) => {
          const field = API_FIELD_TO_FORM[key];
          if (field && Array.isArray(value) && typeof value[0] === 'string') {
            acc[field] = value[0];
          }
          return acc;
        }, {});

        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) {
          setError(err.message);
        }
      } else {
        setError('Não foi possível enviar o contrato. Verifique sua conexão.');
      }
    } finally {
      setSending(false);
    }
  };

  // The API reports what the operator has to fix under `base`.
  const dispatchMessage = (error: ApiError) => {
    const base = error.details.base;

    return Array.isArray(base) && typeof base[0] === 'string' ? base[0] : error.message;
  };

  const handleDispatch = async (contract: Contract) => {
    setDispatchingId(contract.id);
    setError('');

    try {
      await dispatchContract(schoolId, contract.id);
      await loadContracts(tab);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? dispatchMessage(err)
          : 'Não foi possível enviar o contrato para assinatura.',
      );
    } finally {
      setDispatchingId(null);
    }
  };

  const handleSign = async (contract: Contract) => {
    setSigningId(contract.id);
    setError('');

    try {
      await signContract(schoolId, contract.id);
      await loadContracts(tab);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível registrar a assinatura.',
      );
    } finally {
      setSigningId(null);
    }
  };

  const fieldProps = (field: FormField) => ({
    id: `contract-${field}`,
    name: field,
    value: form[field],
    onChange: handleChange,
    error: Boolean(fieldErrors[field]),
    helperText: fieldErrors[field],
    disabled: sending,
    variant: 'filled' as const,
    fullWidth: true,
  });

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Contratos
        <Typography variant="body2" color="text.secondary">
          {guardian.name} — CPF {formatCpf(guardian.cpf)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack direction="column" gap={2.5}>
          <Tabs
            value={tab}
            onChange={(_, value) => {
              // A message about the previous action does not belong to the tab being opened.
              setError('');
              setTab(value);
            }}
          >
            <Tab value="signed" label="Assinados" />
            <Tab value="pending_signature" label="Aguardando assinatura" />
          </Tabs>

          {error && <ErrorBanner message={error} />}

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : contracts.length === 0 ? (
            <EmptyState
              title={
                tab === 'signed' ? 'Nenhum contrato assinado' : 'Nenhum contrato aguardando'
              }
              description={
                tab === 'signed'
                  ? 'Os contratos devolvidos assinados pela família aparecem aqui.'
                  : 'Envie um contrato abaixo para que a família assine.'
              }
            />
          ) : (
            <List disablePadding>
              {contracts.map((contract) => (
                <ListItem
                  key={contract.id}
                  disableGutters
                  secondaryAction={
                    contract.signature_status === 'pending_signature' ? (
                      <Stack direction="row" gap={0.5}>
                        {!contract.sent_to_provider && (
                          <Button
                            size="small"
                            onClick={() => handleDispatch(contract)}
                            disabled={dispatchingId === contract.id}
                            startIcon={
                              dispatchingId === contract.id ? <CircularProgress size={14} /> : null
                            }
                          >
                            Reenviar
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => handleSign(contract)}
                          disabled={signingId === contract.id}
                          startIcon={
                            signingId === contract.id ? <CircularProgress size={14} /> : null
                          }
                        >
                          Marcar assinado
                        </Button>
                      </Stack>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2">
                          {contract.student_name ?? `Estudante #${contract.student_id}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatCents(contract.negotiated_amount_cents)}/mês
                        </Typography>
                        {contract.payer_name && (
                          <Typography variant="caption" color="text.secondary">
                            Boletos: {contract.payer_name}
                          </Typography>
                        )}
                        <SemanticChip
                          variant={signatureChip(contract).variant}
                          label={signatureChip(contract).label}
                        />
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {contract.signature_status === 'signed'
                          ? `Assinado em ${formatDate(contract.signed_at) ?? '—'}`
                          : contract.sent_to_provider
                            ? `Enviado em ${formatDate(contract.sent_at) ?? '—'}`
                            : 'Ainda não enviado para assinatura'}
                        {contract.due_day ? ` — vence dia ${contract.due_day}` : ''}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Divider />

          <Stack component="form" onSubmit={handleSend} direction="column" gap={2} noValidate>
            <Typography variant="body2" color="text.secondary">
              Enviar novo contrato para assinatura
            </Typography>

            {students.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Este responsável não tem filhos vinculados. Vincule um estudante a ele antes de
                emitir um contrato.
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* Only the children linked to this guardian — the API filters by guardian_id. */}
                <TextField
                  {...fieldProps('student_id')}
                  label="Filho"
                  select
                  required
                  disabled={sending || students.length === 0}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={String(student.id)}>
                      {student.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...fieldProps('billing_plan_id')} label="Plano" select required>
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={String(plan.id)}>
                      {plan.name}
                      {plan.base_amount_cents ? ` — ${formatCents(plan.base_amount_cents)}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...fieldProps('plan_discount_id')} label="Desconto" select>
                  <MenuItem value="">Sem desconto</MenuItem>
                  {discounts.map((discount) => (
                    <MenuItem key={discount.id} value={String(discount.id)}>
                      {discount.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  {...fieldProps('amount')}
                  label="Mensalidade"
                  required
                  inputMode="numeric"
                  // The hint gives way to the field's own error; a static one would hide it.
                  helperText={
                    fieldErrors.amount ?? 'Calculada do plano e do desconto; pode ser ajustada.'
                  }
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* Only this guardian can be the payer here: the dialog belongs to them, and the
                    other parent's contracts are reached from their own row. */}
                <TextField {...fieldProps('payer_guardian_id')} label="Recebe os boletos" select>
                  <MenuItem value={String(guardian.id)}>{guardian.name}</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  {...fieldProps('due_day')}
                  label="Dia do vencimento"
                  type="number"
                  slotProps={{ htmlInput: { min: 1, max: 28 } }}
                />
              </Grid>
            </Grid>

            <Stack direction="row" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={sending || students.length === 0}
                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {sending ? 'Enviando...' : 'Enviar para assinatura'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={sending}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GuardianContractsDialog;
