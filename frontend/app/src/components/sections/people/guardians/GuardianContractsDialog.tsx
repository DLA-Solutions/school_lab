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
import { ConfirmDialog, EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import { ApiError } from 'services/api';
import {
  cancelContractSignature,
  dispatchContract,
  getContractPrefill,
  listBillingPlans,
  listContracts,
  listPlanDiscounts,
  previewDraftContract,
  sendContract,
} from 'services/contractsApi';
import { listStudents } from 'services/studentsApi';
import {
  BillingPlan,
  Contract,
  ContractPayload,
  ContractPrefill,
  PlanDiscount,
} from 'types/contract';
import ContractPrefillSummary from './ContractPrefillSummary';
import ContractPreviewDialog, { ContractDraft } from './ContractPreviewDialog';
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

  // Called off before anyone signed — on the record, but owed by nobody.
  if (contract.signature_status === 'cancelled') {
    return { variant: 'info' as const, label: 'Cancelado' };
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
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [dispatchingDraft, setDispatchingDraft] = useState(false);

  // What the register already holds about the chosen student, and what would stop the send.
  const [prefill, setPrefill] = useState<ContractPrefill | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [previewing, setPreviewing] = useState<Contract | null>(null);
  const [cancelling, setCancelling] = useState<Contract | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // The agreement as generated, before anything was recorded. It becomes a contract only when the
  // school sends it from here.
  const [draft, setDraft] = useState<(ContractDraft & { payload: ContractPayload }) | null>(null);

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
   * Choosing the child is all the operator should have to do: the API returns what the register
   * already holds about them, and the form fills itself in from it. Every suggestion stays
   * editable — a negotiated figure and a different due date are real cases.
   */
  useEffect(() => {
    if (!form.student_id) {
      setPrefill(null);
      return;
    }

    let current = true;
    const studentId = Number(form.student_id);

    const loadPrefill = async () => {
      setPrefilling(true);

      try {
        const data = await getContractPrefill(schoolId, studentId);
        if (!current) {
          return;
        }

        setPrefill(data);
        setForm((state) => ({
          ...state,
          payer_guardian_id:
            state.payer_guardian_id || String(data.suggested.payer_guardian_id ?? ''),
          billing_plan_id: state.billing_plan_id || String(data.suggested.billing_plan_id ?? ''),
          due_day: String(data.suggested.due_day),
          amount:
            state.amount ||
            (data.suggested.negotiated_amount_cents
              ? formatCentsInput(String(data.suggested.negotiated_amount_cents))
              : ''),
        }));
      } catch {
        // The contract can still be filled in by hand; losing the summary is not worth an error
        // banner over the form the operator is in the middle of.
        if (current) {
          setPrefill(null);
        }
      } finally {
        if (current) {
          setPrefilling(false);
        }
      }
    };

    loadPrefill();

    return () => {
      current = false;
    };
  }, [schoolId, form.student_id]);

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

  const applyApiErrors = (err: unknown, fallback: string) => {
    if (!(err instanceof ApiError)) {
      setError(fallback);
      return;
    }

    const mapped = Object.entries(err.details).reduce<FieldErrors>((acc, [key, value]) => {
      const field = API_FIELD_TO_FORM[key];
      if (field && Array.isArray(value) && typeof value[0] === 'string') {
        acc[field] = value[0];
      }
      return acc;
    }, {});

    setFieldErrors(mapped);
    if (Object.keys(mapped).length === 0) {
      setError(dispatchMessage(err));
    }
  };

  /**
   * Generating is reading, not committing. The agreement is rendered from the form and shown as
   * the family would receive it; nothing is recorded, so a draft the school decides against
   * leaves no contract behind — only sending it does.
   */
  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
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

    const payload: ContractPayload = {
      student_id: Number(form.student_id),
      billing_plan_id: Number(form.billing_plan_id),
      negotiated_amount_cents: cents as number,
      plan_discount_id: form.plan_discount_id ? Number(form.plan_discount_id) : null,
      payer_guardian_id: form.payer_guardian_id ? Number(form.payer_guardian_id) : null,
      due_day: form.due_day ? Number(form.due_day) : null,
    };

    try {
      const preview = await previewDraftContract(schoolId, payload);

      setDraft({
        payload,
        html: preview.html,
        studentName: students.find((student) => String(student.id) === form.student_id)?.name ?? '',
      });
    } catch (err) {
      applyApiErrors(err, 'Não foi possível gerar o contrato. Verifique sua conexão.');
    } finally {
      setSending(false);
    }
  };

  /**
   * The one step that puts a contract on record. It is created and dispatched together: if the
   * provider refuses it nothing is kept, so the listing only ever holds agreements the family
   * actually received. The form stays filled in so the school can fix and try again.
   */
  const handleSendDraft = async () => {
    if (!draft) {
      return;
    }

    setDispatchingDraft(true);
    setError('');

    try {
      await sendContract(schoolId, draft.payload);

      setDraft(null);
      setForm({ ...emptyForm, payer_guardian_id: String(guardian.id) });
      setPrefill(null);
      setTab('pending_signature');
      await loadContracts('pending_signature');
    } catch (err) {
      // The banner lives on the dialog behind this one, so the preview gives way to it.
      setDraft(null);
      applyApiErrors(err, 'Não foi possível enviar o contrato. Verifique sua conexão.');
    } finally {
      setDispatchingDraft(false);
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
      setPreviewing(null);
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

  // The document is withdrawn at the provider before anything is recorded here, so a failure
  // leaves the contract awaiting signature rather than dead on our side and live on theirs.
  const handleCancel = async () => {
    if (!cancelling) {
      return;
    }

    const target = cancelling;
    setCancellingId(target.id);
    setCancelling(null);
    setError('');

    try {
      await cancelContractSignature(schoolId, target.id);
      await loadContracts(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar o contrato.');
    } finally {
      setCancellingId(null);
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
            <Tab value="cancelled" label="Cancelados" />
          </Tabs>

          {error && <ErrorBanner message={error} />}

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : contracts.length === 0 ? (
            <EmptyState
              title={tab === 'signed' ? 'Nenhum contrato assinado' : 'Nenhum contrato aguardando'}
              description={
                tab === 'signed'
                  ? 'Os contratos devolvidos assinados pela família aparecem aqui.'
                  : 'Envie um contrato abaixo para que a família assine.'
              }
            />
          ) : (
            <List disablePadding>
              {contracts.map((contract) => (
                <ListItem key={contract.id} disableGutters sx={{ display: 'block', py: 1.5 }}>
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

                  <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                    {/* Reading the document is never destructive, and a signed contract is the one
                        people most often need to reread — so this is offered whatever state the
                        contract is in. Weighted like "Gerar contrato", being the action a school
                        reaches for most from this list. */}
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => setPreviewing(contract)}
                    >
                      Pré-visualizar
                    </Button>

                    {/* The provider's own file used to be linked from here. That link answered
                        403: the URL is only served against the school's API token, which the
                        browser does not hold. The preview above fetches it through the API and
                        shows it, so a signed contract is read and downloaded in one place. */}

                    {/* Marking a contract signed by hand is gone: the provider reports the
                        signature, and a button that contradicted it left the record saying one
                        thing and the provider another. */}
                    {contract.signature_status === 'pending_signature' &&
                      !contract.sent_to_provider && (
                        <Button
                          size="small"
                          onClick={() => handleDispatch(contract)}
                          disabled={dispatchingId === contract.id}
                          startIcon={
                            dispatchingId === contract.id ? <CircularProgress size={14} /> : null
                          }
                        >
                          Enviar para assinatura
                        </Button>
                      )}

                    {/* A wrong figure to reissue, or a family that decided not to go ahead. Only
                        before it is signed: undoing a signed agreement is a rescission, and the
                        provider would leave the signatures standing anyway. */}
                    {contract.signature_status === 'pending_signature' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setCancelling(contract)}
                        disabled={cancellingId === contract.id}
                        startIcon={
                          cancellingId === contract.id ? <CircularProgress size={14} /> : null
                        }
                      >
                        Cancelar
                      </Button>
                    )}
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}

          <Divider />

          <Stack component="form" onSubmit={handleGenerate} direction="column" gap={2} noValidate>
            <Typography variant="body2" color="text.secondary">
              Novo contrato — escolha o filho e o restante é preenchido do cadastro
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
                <TextField
                  {...fieldProps('plan_discount_id')}
                  label="Desconto"
                  select
                  helperText="Aplicado na geração mensal a partir do valor base do plano."
                >
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

            {prefilling && (
              <Stack alignItems="center" py={1}>
                <CircularProgress size={18} />
              </Stack>
            )}

            {prefill && <ContractPrefillSummary prefill={prefill} />}

            <Stack direction="row" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={sending || students.length === 0}
                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {sending ? 'Gerando...' : 'Gerar contrato'}
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

      <ContractPreviewDialog
        open={previewing !== null}
        schoolId={schoolId}
        contract={previewing}
        onClose={() => setPreviewing(null)}
        onSend={previewing ? () => handleDispatch(previewing) : undefined}
        sending={dispatchingId !== null}
      />

      {/* The generated agreement, read before it is anything: closing it discards the draft. */}
      <ContractPreviewDialog
        open={draft !== null}
        schoolId={schoolId}
        contract={null}
        draft={draft}
        onClose={() => setDraft(null)}
        onSend={handleSendDraft}
        sending={dispatchingDraft}
      />

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar este contrato?"
        message={
          cancelling
            ? `${cancelling.student_name ?? 'Este contrato'} — o documento é retirado da ` +
              'Autentique e o link enviado à família para de colher assinaturas. O contrato ' +
              'permanece na lista, marcado como cancelado.'
            : ''
        }
        destructive
        confirmLabel="Cancelar contrato"
        cancelLabel="Manter"
        onConfirm={handleCancel}
        onCancel={() => setCancelling(null)}
      />
    </Dialog>
  );
};

export default GuardianContractsDialog;
