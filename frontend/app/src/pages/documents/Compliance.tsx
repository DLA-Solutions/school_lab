import { useCallback, useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  COMPLIANCE_MAX_BYTES,
  COMPLIANCE_MIME_TYPES,
  deleteComplianceDocument,
  listAllComplianceDocuments,
  uploadComplianceDocument,
} from 'services/complianceDocumentsApi';
import { ComplianceDocument, ComplianceType } from 'types/complianceDocument';
import { membershipHasPermission } from 'utils/onboarding/access';
import ComplianceTypeSection from './ComplianceTypeSection';

/** The API reports a field's problems as a list; the first is the one worth showing. */
const firstDetail = (value: unknown) => {
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0]);
  }

  return typeof value === 'string' && value ? value : null;
};

/**
 * Compliance: the school's own regulatory documents (health inspection, fire-department
 * certificate, council resolutions...), kept ready for an audit.
 *
 * One card per catalogue type, in the order and with the labels the API ships in the list
 * `meta.types` — so a type with no file yet still shows, and staff see what is missing. The whole
 * set comes from one (paged) list call and is grouped here. File checks (type, size) are a
 * courtesy so a wrong pick is refused before a 10 MB upload starts; the API stays the authority.
 */
const Compliance = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  // Same permission `DocumentPolicy#manage_compliance?` checks — the page never asks the API for
  // what it would only refuse with a 403.
  const canManage = school !== null && membershipHasPermission(school, 'manage_documents');

  const [types, setTypes] = useState<ComplianceType[]>([]);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [forbidden, setForbidden] = useState<'forbidden' | 'module_disabled' | null>(null);

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState<ComplianceDocument | null>(null);

  const load = useCallback(async () => {
    if (!schoolId || !canManage) {
      return;
    }

    setLoadError('');
    setForbidden(null);

    try {
      const result = await listAllComplianceDocuments(schoolId);
      setTypes(result.types);
      setDocuments(result.documents);
    } catch (err) {
      setTypes([]);
      setDocuments([]);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(err.code === 'module_disabled' ? 'module_disabled' : 'forbidden');
      } else {
        setLoadError(err instanceof ApiError ? err.message : t('compliance.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [schoolId, canManage, t]);

  useEffect(() => {
    load();
  }, [load]);

  const setTypeError = (typeKey: string, message: string | undefined) =>
    setUploadErrors((current) => {
      const next = { ...current };
      if (message) {
        next[typeKey] = message;
      } else {
        delete next[typeKey];
      }

      return next;
    });

  /** Maps the API's failure by `error.code`: 422 carries three different reasons. */
  const uploadErrorMessage = (err: unknown): string => {
    if (!(err instanceof ApiError)) {
      return t('compliance.error.generic');
    }

    switch (err.code) {
      case 'unsupported_media_type':
        return t('compliance.error.unsupportedMediaType');
      case 'file_too_large':
        return t('compliance.error.fileTooLarge');
      case 'validation_error':
        return (
          firstDetail(err.details.file) ??
          firstDetail(err.details.document_type) ??
          t('compliance.error.validation')
        );
      case 'module_disabled':
        return t('compliance.error.moduleDisabled');
      case 'forbidden':
        return t('compliance.error.forbidden');
      case 'not_found':
        return t('compliance.error.notFound');
      default:
        return err.status === 403 ? t('compliance.error.forbidden') : t('compliance.error.generic');
    }
  };

  const handleFileSelected = async (type: ComplianceType, file: File) => {
    if (!schoolId) {
      return;
    }

    setNotice('');
    setActionError('');

    // Some browsers report an empty type for a file they do not recognise; that is refused too,
    // since the allowed three are all ones every browser knows.
    if (!(COMPLIANCE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setTypeError(type.key, t('compliance.error.unsupportedMediaType'));
      return;
    }

    if (file.size > COMPLIANCE_MAX_BYTES) {
      setTypeError(type.key, t('compliance.error.fileTooLarge'));
      return;
    }

    setTypeError(type.key, undefined);
    setUploadingType(type.key);

    try {
      await uploadComplianceDocument(schoolId, { documentType: type.key, file });
      setNotice(t('compliance.uploaded', { type: type.label }));
      await load();
    } catch (err) {
      setTypeError(type.key, uploadErrorMessage(err));
    } finally {
      setUploadingType(null);
    }
  };

  const handleConfirmRemove = async () => {
    const target = removing;
    setRemoving(null);

    if (!schoolId || !target) {
      return;
    }

    setNotice('');
    setActionError('');

    try {
      await deleteComplianceDocument(schoolId, target.id);
      setNotice(t('compliance.removed'));
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status !== 422 && err.message
          ? err.message
          : t('compliance.error.removeGeneric'),
      );
    }
  };

  if (!school || !canManage || forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.compliance')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={
              forbidden === 'module_disabled'
                ? t('compliance.moduleDisabled.description')
                : t('compliance.noAccess.description')
            }
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.compliance')} />

      <InfoBanner message={t('compliance.intro')} />

      {loadError && (
        <ErrorBanner message={loadError} onRetry={load} retryLabel={t('common.tryAgain')} />
      )}
      {actionError && <ErrorBanner message={actionError} />}
      {notice && <SuccessBanner message={notice} />}

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress aria-label={t('compliance.loading')} />
        </Stack>
      ) : (
        types.map((type) => (
          <ComplianceTypeSection
            key={type.key}
            type={type}
            documents={documents.filter((document) => document.document_type === type.key)}
            uploading={uploadingType === type.key}
            disabled={uploadingType !== null}
            error={uploadErrors[type.key]}
            onFileSelected={handleFileSelected}
            onRemove={setRemoving}
          />
        ))
      )}

      <ConfirmDialog
        open={removing !== null}
        title={t('compliance.removeTitle')}
        message={
          removing
            ? t('compliance.removeMessage', { file: removing.filename ?? t('common.none') })
            : ''
        }
        confirmLabel={t('compliance.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </Stack>
  );
};

export default Compliance;
