import { ChangeEvent, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { COMPLIANCE_MIME_TYPES, complianceDocumentUrl } from 'services/complianceDocumentsApi';
import { ComplianceDocument, ComplianceType } from 'types/complianceDocument';

/** Browsers differ on what `accept` matches, so both the MIME types and the extensions are given. */
const ACCEPT = [...COMPLIANCE_MIME_TYPES, '.pdf', '.jpg', '.jpeg', '.png'].join(',');

export interface ComplianceTypeSectionProps {
  type: ComplianceType;
  /** Newest first, as the API returns them. */
  documents: ComplianceDocument[];
  uploading: boolean;
  /** Anything that blocks a new upload right now (another one in flight). */
  disabled: boolean;
  error?: string;
  onFileSelected: (type: ComplianceType, file: File) => void;
  onRemove: (document: ComplianceDocument) => void;
}

/** One catalogue type: its files, newest first, and the button that adds another. */
const ComplianceTypeSection = ({
  type,
  documents,
  uploading,
  disabled,
  error,
  onFileSelected,
  onRemove,
}: ComplianceTypeSectionProps) => {
  const { t, locale } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Reset so choosing the same file again after a refusal still fires a change event.
    event.target.value = '';

    if (picked) {
      onFileSelected(type, picked);
    }
  };

  return (
    <SectionCard
      title={type.label}
      headerActions={
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            startIcon={
              uploading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <IconifyIcon icon="mingcute:upload-2-line" />
              )
            }
          >
            {uploading ? t('compliance.uploading') : t('compliance.upload')}
          </Button>
          {/* The styled Button is the control people see; the native input stays hidden and is
              opened through the ref. */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            aria-label={t('compliance.uploadLabel', { type: type.label })}
            onChange={handleChange}
            hidden
            tabIndex={-1}
          />
        </Stack>
      }
    >
      <FormHelperText
        error={Boolean(error)}
        role={error ? 'alert' : undefined}
        sx={{ mt: 0, mb: 1.5 }}
      >
        {error ?? t('compliance.file.help')}
      </FormHelperText>

      {documents.length === 0 ? (
        // A type with no file is the point of the screen: staff see at a glance what is missing.
        <Box sx={{ bgcolor: 'surface.alt', borderRadius: 2, px: 2, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t('compliance.empty')}
          </Typography>
        </Box>
      ) : (
        <Stack component="ul" direction="column" gap={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {documents.map((document) => {
            const url = complianceDocumentUrl(document);
            const filename = document.filename ?? t('common.none');

            return (
              <Stack
                key={document.id}
                component="li"
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1}
                sx={{ bgcolor: 'surface.alt', borderRadius: 2, px: 2, py: 1 }}
              >
                <Box minWidth={0}>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    {filename}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('compliance.sentOn', {
                      date: new Date(document.created_at).toLocaleDateString(locale),
                    })}
                  </Typography>
                </Box>

                <Stack direction="row" gap={0.5}>
                  {url && (
                    // A signed Active Storage URL on the API host: a real navigation that needs
                    // no bearer token, so it opens in its own tab. `component="a"` opts out of
                    // the theme routing every link through react-router.
                    <Button
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      aria-label={t('compliance.openLabel', { file: filename })}
                      startIcon={<IconifyIcon icon="mingcute:external-link-line" />}
                    >
                      {t('compliance.open')}
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onRemove(document)}
                    aria-label={t('compliance.removeLabel', { file: filename })}
                    startIcon={<IconifyIcon icon="mingcute:delete-2-line" />}
                  >
                    {t('compliance.remove')}
                  </Button>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </SectionCard>
  );
};

export default ComplianceTypeSection;
