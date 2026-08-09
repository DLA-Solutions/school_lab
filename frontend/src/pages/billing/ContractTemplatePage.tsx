import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  fetchContractTemplate,
  previewContractTemplate,
  saveContractTemplate,
} from 'services/contractTemplateApi';
import { ContractTemplate } from 'types/contractTemplate';
import { useDebouncedValue } from 'utils/useDebouncedValue';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ContractTemplatePage = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [bodyHtml, setBodyHtml] = useState('');
  const [signatureX, setSignatureX] = useState('10');
  const [signatureY, setSignatureY] = useState('85');
  const [signaturePage, setSignaturePage] = useState('1');
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [preview, setPreview] = useState<{ html: string; sample: boolean } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The preview redraws once typing settles rather than on every keystroke.
  const debouncedBody = useDebouncedValue(bodyHtml, 500);

  const applyTemplate = (loaded: ContractTemplate) => {
    setTemplate(loaded);
    setBodyHtml(loaded.body_html);
    setSignatureX(String(loaded.signature_x));
    setSignatureY(String(loaded.signature_y));
    setSignaturePage(String(loaded.signature_page));
  };

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        applyTemplate(await fetchContractTemplate(schoolId));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar o modelo de contrato.',
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [schoolId]);

  const loadPreview = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setPreviewing(true);

    try {
      setPreview(await previewContractTemplate(schoolId));
    } catch {
      // The editor keeps working without a preview; the save call reports anything real.
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }, [schoolId]);

  // The preview comes from the server, so it shows exactly what the family will receive —
  // including the sanitisation. It therefore reflects what was saved, not what is being typed.
  useEffect(() => {
    if (tab === 'preview') {
      loadPreview();
    }
  }, [tab, loadPreview, debouncedBody]);

  const handleLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('A logo precisa ser uma imagem.');
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setError('A logo precisa ter no máximo 2 MB.');
      return;
    }

    setError('');
    setLogo(file);
    // Choosing a new image supersedes a pending removal.
    setRemoveLogo(false);
  };

  /** Drops the token at the cursor, which is where someone typing expects it to land. */
  const insertVariable = (token: string) => {
    const field = bodyRef.current;
    const snippet = `{{${token}}}`;

    if (!field) {
      setBodyHtml((current) => current + snippet);
      return;
    }

    const start = field.selectionStart ?? bodyHtml.length;
    const end = field.selectionEnd ?? start;

    setBodyHtml(`${bodyHtml.slice(0, start)}${snippet}${bodyHtml.slice(end)}`);

    // Put the caret after what was just inserted.
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const handleSave = async () => {
    if (!schoolId) {
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const updated = await saveContractTemplate(
        schoolId,
        {
          body_html: bodyHtml,
          signature_x: Number(signatureX),
          signature_y: Number(signatureY),
          signature_page: Number(signaturePage),
        },
        logo,
        removeLogo,
      );

      applyTemplate(updated);
      setLogo(null);
      setRemoveLogo(false);
      setSaved(true);

      if (tab === 'preview') {
        await loadPreview();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = Object.values(err.details).flat().find((v) => typeof v === 'string');
        setError(typeof detail === 'string' ? detail : err.message);
      } else {
        setError('Não foi possível salvar o modelo. Verifique sua conexão.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Contrato" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O modelo de contrato está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Contrato"
        subtitle="Modelo enviado às famílias para assinatura"
        actions={
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving || loading}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? 'Salvando...' : 'Salvar modelo'}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {saved && !error && (
        <Typography variant="body2" color="success.main">
          Modelo salvo. Os próximos contratos enviados usarão esta versão.
        </Typography>
      )}

      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab value="editor" label="Editor" />
        <Tab value="preview" label="Pré-visualização" />
      </Tabs>

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress size={28} />
        </Stack>
      ) : tab === 'editor' ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard title="Corpo do contrato (HTML)" padding={3.5}>
              <TextField
                inputRef={bodyRef}
                id="contract-body-html"
                value={bodyHtml}
                onChange={(e) => {
                  setBodyHtml(e.target.value);
                  setSaved(false);
                }}
                multiline
                minRows={20}
                fullWidth
                variant="filled"
                slotProps={{
                  htmlInput: {
                    'aria-label': 'Corpo do contrato em HTML',
                    spellCheck: false,
                    style: { fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 },
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                Tags como script, iframe e atributos de evento são removidos ao salvar.
              </Typography>
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack direction="column" gap={3}>
              <SectionCard title="Variáveis" padding={3.5}>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  Clique para inserir no ponto onde o cursor está.
                </Typography>
                <Stack direction="row" gap={0.75} flexWrap="wrap">
                  {(template?.variables ?? []).map((variable) => (
                    <Tooltip key={variable.token} title={variable.description}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`{{${variable.token}}}`}
                        onClick={() => insertVariable(variable.token)}
                      />
                    </Tooltip>
                  ))}
                </Stack>
              </SectionCard>

              <SectionCard title="Logo da escola" padding={3.5}>
                <Stack direction="column" gap={1.5}>
                  {template?.logo_url && !logo && !removeLogo && (
                    <Box
                      component="img"
                      src={template.logo_url}
                      alt="Logo atual"
                      sx={{ width: 1, borderRadius: 1, border: 1, borderColor: 'divider' }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {removeLogo
                      ? 'A logo será removida ao salvar'
                      : logo
                        ? `${logo.name} — será salva com o modelo`
                        : (template?.logo_filename ?? 'Nenhuma imagem enviada')}
                  </Typography>
                  <Stack direction="row" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => fileRef.current?.click()}
                      startIcon={<IconifyIcon icon="mingcute:upload-2-line" />}
                    >
                      Escolher imagem
                    </Button>
                    {(template?.logo_url || logo) && !removeLogo && (
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={() => {
                          setLogo(null);
                          setRemoveLogo(true);
                          setSaved(false);
                        }}
                        startIcon={<IconifyIcon icon="mingcute:delete-2-line" />}
                      >
                        Remover
                      </Button>
                    )}
                    {removeLogo && (
                      <Button variant="text" size="small" onClick={() => setRemoveLogo(false)}>
                        Desfazer
                      </Button>
                    )}
                  </Stack>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogo}
                    hidden
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Aparece acima do título do contrato, com a proporção preservada. Máximo de 2 MB.
                  </Typography>
                </Stack>
              </SectionCard>

              <SectionCard title="Posição da assinatura" padding={3.5}>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Em porcentagem da página, a partir do canto superior esquerdo.
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <TextField
                      id="signature-x"
                      label="X (%)"
                      type="number"
                      value={signatureX}
                      onChange={(e) => setSignatureX(e.target.value)}
                      variant="filled"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      id="signature-y"
                      label="Y (%)"
                      type="number"
                      value={signatureY}
                      onChange={(e) => setSignatureY(e.target.value)}
                      variant="filled"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      id="signature-page"
                      label="Página"
                      type="number"
                      value={signaturePage}
                      onChange={(e) => setSignaturePage(e.target.value)}
                      variant="filled"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </SectionCard>
            </Stack>
          </Grid>
        </Grid>
      ) : (
        <SectionCard padding={3.5}>
          <Stack direction="column" gap={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {preview?.sample
                  ? 'Nenhum contrato emitido ainda — exibindo com dados de exemplo.'
                  : 'Exibindo com os dados do contrato mais recente.'}
              </Typography>
              <Button size="small" onClick={loadPreview} disabled={previewing}>
                Atualizar
              </Button>
            </Stack>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              A pré-visualização mostra o que foi salvo. Salve para ver as edições em andamento.
            </Typography>

            {previewing && (
              <Stack alignItems="center" py={4}>
                <CircularProgress size={24} />
              </Stack>
            )}

            {preview && !previewing && (
              // Sandboxed with no permissions at all: the HTML is sanitised on the server, and
              // this makes the preview inert even if something ever slipped through.
              <Box
                component="iframe"
                title="Pré-visualização do contrato"
                srcDoc={preview.html}
                sandbox=""
                sx={{
                  width: 1,
                  height: 720,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  background: '#fff',
                }}
              />
            )}
          </Stack>
        </SectionCard>
      )}
    </Stack>
  );
};

export default ContractTemplatePage;
