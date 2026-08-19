import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { MembershipRoleInput, createMembership, listRoleTemplates } from 'services/peopleApi';
import { RoleTemplateDetail, TeamMembership } from 'types/people';

export interface UserFormDialogProps {
  open: boolean;
  schoolId: number;
  onClose: () => void;
  onCreated: (membership: TeamMembership) => void;
}

/** Um perfil de permissões só se aplica a quem trabalha na escola. */
const NEEDS_TEMPLATE: MembershipRoleInput[] = ['staff', 'teacher'];

type FieldErrors = Partial<Record<'email' | 'role' | 'role_template_id', string>>;

/**
 * Uma conta de acesso: quem entra no sistema, e como.
 *
 * O papel responde à pergunta de fora — trabalha aqui ou é família — e o perfil responde à de
 * dentro: Secretaria vê e faz uma coisa, Coordenação outra. Família não escolhe perfil porque não
 * há o que escolher: um responsável vê os próprios filhos e nada mais.
 *
 * A conta nasce convidada. Quem cadastra não define senha de ninguém: o e-mail sai daqui e o
 * acesso passa a existir quando a pessoa aceita.
 */
const UserFormDialog = ({ open, schoolId, onClose, onCreated }: UserFormDialogProps) => {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRoleInput>('staff');
  const [templateId, setTemplateId] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [templates, setTemplates] = useState<RoleTemplateDetail[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await listRoleTemplates(schoolId);
        if (!cancelled) {
          setTemplates(response.data);
        }
      } catch {
        // Um select vazio já é sinal; salvar mostraria qualquer coisa pior.
        if (!cancelled) {
          setTemplates([]);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, schoolId]);

  // O perfil de professor pertence a quem leciona; oferecê-lo à Secretaria só produziria um erro
  // do servidor depois de preenchido o formulário.
  const availableTemplates = templates.filter((template) =>
    role === 'teacher' ? template.system_key === 'teacher' : template.system_key !== 'teacher',
  );

  const handleRoleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRole(event.target.value as MembershipRoleInput);
    setTemplateId('');
    setFieldErrors({});
    setError('');
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = t('users.error.emailRequired');
    }

    if (NEEDS_TEMPLATE.includes(role) && !templateId) {
      errors.role_template_id = t('users.error.templateRequired');
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const membership = await createMembership(schoolId, {
        email: email.trim(),
        role,
        role_template_id: NEEDS_TEMPLATE.includes(role) ? Number(templateId) : null,
        display_title: displayTitle.trim() || null,
      });

      onCreated(membership);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('users.createError'));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('users.new')}</DialogTitle>

      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent dividers>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary">
                {t('users.description')}
              </Typography>
            </Grid>

            <Grid size={12}>
              <TextField
                id="user-email"
                label={t('common.email')}
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                disabled={saving}
                fullWidth
                required
                autoFocus
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="user-role"
                label={t('users.accessType')}
                value={role}
                onChange={handleRoleChange}
                disabled={saving}
                select
                fullWidth
              >
                <MenuItem value="staff">{t('users.role.staff')}</MenuItem>
                <MenuItem value="teacher">{t('users.role.teacher')}</MenuItem>
                <MenuItem value="guardian">{t('users.role.guardian')}</MenuItem>
              </TextField>
            </Grid>

            {NEEDS_TEMPLATE.includes(role) ? (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    id="user-role-template"
                    label={t('users.profile')}
                    value={templateId}
                    onChange={(event) => {
                      setTemplateId(event.target.value);
                      setFieldErrors((current) => ({ ...current, role_template_id: undefined }));
                    }}
                    error={Boolean(fieldErrors.role_template_id)}
                    helperText={fieldErrors.role_template_id ?? t('users.profileHint')}
                    disabled={saving || availableTemplates.length === 0}
                    select
                    fullWidth
                    required
                  >
                    {availableTemplates.map((template) => (
                      <MenuItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={12}>
                  <TextField
                    id="user-display-title"
                    label={t('common.position')}
                    value={displayTitle}
                    onChange={(event) => setDisplayTitle(event.target.value)}
                    disabled={saving}
                    fullWidth
                  />
                </Grid>
              </>
            ) : (
              <Grid size={12}>
                {/* Um responsável vê os próprios filhos; não há perfil a escolher. */}
                <Typography variant="body2" color="text.secondary">
                  {t('users.guardianHint')}
                </Typography>
              </Grid>
            )}

            {error && (
              <Grid size={12}>
                <ErrorBanner message={error} />
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? t('users.sending') : t('users.sendInvite')}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default UserFormDialog;
