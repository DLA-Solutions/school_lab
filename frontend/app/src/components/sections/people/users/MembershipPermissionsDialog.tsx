import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { ApiError } from 'services/api';
import {
  listPermissionDefinitions,
  listRoleTemplates,
  updateMembershipPermissions,
} from 'services/peopleApi';
import { PermissionDefinition, RoleTemplateDetail, TeamMembership } from 'types/people';
import {
  PermissionToggleState,
  buildFormState,
  buildOverridesPayload,
} from 'utils/permissions/buildOverridesPayload';
import { deriveOverrides } from 'utils/permissions/deriveOverrides';
import { permissionDomainLabel, permissionLabel } from 'utils/permissions/permissionLabels';

export interface MembershipPermissionsDialogProps {
  open: boolean;
  schoolId: number;
  membership: TeamMembership;
  onClose: () => void;
  onSaved: (membership: TeamMembership) => void;
}

const sourceBadge = (source: string | undefined) => {
  switch (source) {
    case 'template':
      return 'Template';
    case 'grant':
      return 'Concedido';
    case 'owner':
      return 'Proprietário';
    default:
      return null;
  }
};

const isTeachGrantDisabled = (membership: TeamMembership, templateKeys: string[]) =>
  membership.role === 'staff' && !templateKeys.includes('teach');

const MembershipPermissionsDialog = ({
  open,
  schoolId,
  membership,
  onClose,
  onSaved,
}: MembershipPermissionsDialogProps) => {
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [template, setTemplate] = useState<RoleTemplateDetail | null>(null);
  const [formState, setFormState] = useState<Record<string, PermissionToggleState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const templateKeys = useMemo(
    () => template?.permissions.map((entry) => entry.permission_key) ?? [],
    [template],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [definitionsResponse, templatesResponse] = await Promise.all([
          listPermissionDefinitions(schoolId),
          listRoleTemplates(schoolId),
        ]);

        if (cancelled) {
          return;
        }

        const defs = definitionsResponse.data.definitions;
        const roleTemplate =
          templatesResponse.data.find((entry) => entry.id === membership.role_template?.id) ?? null;

        const { grants, denies } = deriveOverrides(
          membership.permission_sources,
          roleTemplate?.permissions.map((entry) => entry.permission_key) ?? [],
          membership.permissions,
        );

        setDefinitions(defs);
        setTemplate(roleTemplate);
        setFormState(
          buildFormState(
            roleTemplate?.permissions.map((entry) => entry.permission_key) ?? [],
            defs.map((entry) => entry.key),
            grants,
            denies,
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Não foi possível carregar as permissões. Verifique sua conexão.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, schoolId, membership]);

  const groupedDefinitions = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();

    definitions.forEach((definition) => {
      const current = groups.get(definition.domain) ?? [];
      current.push(definition);
      groups.set(definition.domain, current);
    });

    return [...groups.entries()];
  }, [definitions]);

  const handleToggle = (key: string, checked: boolean) => {
    setFormState((current) => {
      const inTemplate = templateKeys.includes(key);

      if (inTemplate) {
        return { ...current, [key]: checked ? 'inherit' : 'deny' };
      }

      return { ...current, [key]: checked ? 'grant' : 'off' };
    });
  };

  const isChecked = (key: string) => {
    const state = formState[key];

    if (templateKeys.includes(key)) {
      return state === 'inherit';
    }

    return state === 'grant';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const updated = await updateMembershipPermissions(
        schoolId,
        membership.id,
        buildOverridesPayload(formState, templateKeys),
      );
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível salvar as permissões. Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Permissões da conta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={0.5}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {membership.email}
            </Typography>
            {membership.role_template && (
              <Chip
                size="small"
                variant="outlined"
                label={`Template: ${membership.role_template.name}`}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
          </Stack>

          {error && <ErrorBanner message={error} />}

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            groupedDefinitions.map(([domain, entries]) => (
              <Box key={domain}>
                <Typography variant="subtitle2" color="text.secondary" pb={1}>
                  {permissionDomainLabel(domain)}
                </Typography>
                <Stack spacing={0.5} divider={<Divider flexItem />}>
                  {entries.map((definition) => {
                    const key = definition.key;
                    const disabled =
                      key === 'teach' && isTeachGrantDisabled(membership, templateKeys);
                    const effectiveSource = membership.permission_sources[key];
                    const badge = sourceBadge(effectiveSource);

                    return (
                      <Stack key={key} spacing={0.5}>
                        <FormControlLabel
                          sx={{ justifyContent: 'space-between', ml: 0, mr: 0 }}
                          labelPlacement="start"
                          control={
                            <Switch
                              checked={isChecked(key)}
                              disabled={disabled}
                              onChange={(event) => handleToggle(key, event.target.checked)}
                              inputProps={{ 'aria-label': permissionLabel(key) }}
                            />
                          }
                          label={
                            <Typography variant="body2">{permissionLabel(key)}</Typography>
                          }
                        />
                        {(badge || formState[key] === 'deny') && (
                          <Stack direction="row" spacing={1} pl={0.5}>
                            {badge && (
                              <Chip size="small" label={badge} variant="outlined" />
                            )}
                            {formState[key] === 'deny' && (
                              <Chip size="small" label="Negado" color="warning" variant="outlined" />
                            )}
                          </Stack>
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MembershipPermissionsDialog;
