import { forwardRef, useImperativeHandle, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { t, type MessageKey } from '../../i18n';
import { useGuardianContext } from '../../providers/GuardianContext';
import { fetchFamilyDocuments } from '../../services/documents';
import { colors } from '../../theme/colors';
import { FamilyDocument, FamilyDocumentStatus } from '../../types/documents';
import { collectPages, PAGE_LIMIT } from '../../utils/collectPages';
import { formatDateBR } from '../../utils/format';
import { absoluteStorageUrl } from '../../utils/fileUrl';
import { isPositiveId } from '../../utils/ids';
import { SectionFailure } from '../../utils/sectionFailure';
import ChildSectionFrame from './ChildSectionFrame';
import { ChildSectionHandle, SectionPhase, useChildSection } from './useChildSection';

const TYPE_KEYS: Record<string, MessageKey> = {
  address_proof: 'child.documents.type.address_proof',
  school_transcript: 'child.documents.type.school_transcript',
  guardian_identity: 'child.documents.type.guardian_identity',
  vaccination_card: 'child.documents.type.vaccination_card',
  medical_report: 'child.documents.type.medical_report',
  school_transfer: 'child.documents.type.school_transfer',
  other: 'child.documents.type.other',
  signed_contract: 'child.documents.type.signed_contract',
};

const STATUS_KEYS: Record<FamilyDocumentStatus, MessageKey> = {
  pending: 'child.documents.status.pending',
  approved: 'child.documents.status.approved',
  rejected: 'child.documents.status.rejected',
};

const typeLabel = (documentType: string): string => {
  const key = TYPE_KEYS[documentType];
  return key ? t(key) : documentType;
};

const statusLabel = (status: string): string | null => {
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    return t(STATUS_KEYS[status]);
  }
  return null;
};

const createdLabel = (iso: string): string => {
  if (typeof iso !== 'string' || Number.isNaN(new Date(iso).getTime())) {
    return '';
  }
  return formatDateBR(iso);
};

/**
 * Display guard. Listing is already narrowed by `student_id`; drop any other child anyway.
 */
export const documentsForStudent = (
  rows: FamilyDocument[],
  schoolId: number,
  studentId: number,
): FamilyDocument[] =>
  rows.filter(
    (row) =>
      !!row &&
      isPositiveId(row.id) &&
      row.school_id === schoolId &&
      row.student_id === studentId,
  );

const loadDocuments = async (schoolId: number, studentId: number): Promise<FamilyDocument[]> => {
  const rows = await collectPages((page) => fetchFamilyDocuments(schoolId, studentId, page, PAGE_LIMIT));
  if (!Array.isArray(rows)) {
    throw new SectionFailure();
  }
  return documentsForStudent(rows, schoolId, studentId);
};

const DocumentsSection = forwardRef<ChildSectionHandle>(function DocumentsSection(_props, ref) {
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const { phase, rows, reload } = useChildSection(loadDocuments);
  useImperativeHandle(ref, () => ({ reload }), [reload]);
  const [openFailedId, setOpenFailedId] = useState<number | null>(null);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setOpenFailedId(null);
  }

  const visible =
    activeSchoolId != null && activeStudentId != null
      ? documentsForStudent(rows, activeSchoolId, activeStudentId)
      : [];
  const shownPhase: SectionPhase = phase === 'ready' && visible.length === 0 ? 'empty' : phase;

  const openFile = (document: FamilyDocument) => {
    const url = absoluteStorageUrl(document.file_url);
    if (!url) {
      return;
    }
    setOpenFailedId(null);
    void Linking.openURL(url).catch(() => {
      setOpenFailedId(document.id);
    });
  };

  return (
    <ChildSectionFrame
      titleKey="child.documents.title"
      phase={shownPhase}
      emptyKey="child.documents.empty"
      notFoundKey="child.notFound"
      loadErrorKey="child.documents.loadError"
      networkErrorKey="child.documents.networkError"
      retryKey="child.retry"
      onRetry={() => {
        void reload('focus');
      }}
    >
      {visible.map((document) => {
        const label = typeLabel(typeof document.document_type === 'string' ? document.document_type : '');
        const filename = typeof document.filename === 'string' && document.filename.trim() ? document.filename.trim() : '';
        const title = filename || label;
        const status = typeof document.status === 'string' ? statusLabel(document.status) : null;
        const created = createdLabel(document.created_at);
        const canOpen = absoluteStorageUrl(document.file_url) != null;
        return (
          <View key={document.id} style={styles.card}>
            <Text style={styles.primary}>{title}</Text>
            {label ? <Text style={styles.secondary}>{label}</Text> : null}
            {created ? <Text style={styles.secondary}>{created}</Text> : null}
            {status ? <Text style={styles.secondary}>{status}</Text> : null}
            {canOpen ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openFile(document)}
                style={styles.openButton}
              >
                <Text style={styles.openLabel}>{t('child.documents.open')}</Text>
              </Pressable>
            ) : null}
            {openFailedId === document.id ? (
              <Text style={styles.errorText}>{t('child.documents.openError')}</Text>
            ) : null}
          </View>
        );
      })}
    </ChildSectionFrame>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  primary: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  openButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  openLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
});

export default DocumentsSection;
