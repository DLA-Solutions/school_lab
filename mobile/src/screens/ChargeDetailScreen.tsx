import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import StatusChip from '../components/charges/StatusChip';
import { t } from '../i18n';
import { BoletosStackParamList } from '../navigation/types';
import { useGuardianContext } from '../providers/GuardianContext';
import { ApiError } from '../services/api';
import { fetchCharge } from '../services/charges';
import { colors } from '../theme/colors';
import { Charge } from '../types/charges';
import { formatCalendarDateBR, formatCurrencyBRL } from '../utils/format';

type Props = NativeStackScreenProps<BoletosStackParamList, 'Detail'>;

type DetailPhase = 'loading' | 'ready' | 'not_found' | 'error' | 'offline';

type CopiedField = 'pix' | 'line';

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** The line is shown only when the detail JSON already includes it. */
const digitableLineFromCharge = (charge: Charge): string | null => {
  const topLevel = nonEmptyString(charge.digitable_line);
  if (topLevel) {
    return topLevel;
  }

  return nonEmptyString(charge.payment_methods?.digitable_line);
};

const pixCopyPaste = (charge: Charge): string | null => nonEmptyString(charge.payment_methods?.pix_copy_paste);

const boletoUrl = (charge: Charge): string | null => {
  const value = charge.payment_methods?.boleto_url;
  if (typeof value !== 'string' || value.length === 0 || !/^https?:\/\//i.test(value)) {
    return null;
  }

  return value;
};

const ChargeDetailScreen = ({ route }: Props) => {
  const { chargeId } = route.params;
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [charge, setCharge] = useState<Charge | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<CopiedField | null>(null);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}:${chargeId}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setCharge(null);
    setPhase('loading');
    setRefreshing(false);
    setCopied(null);
  }

  const loadCharge = useCallback(
    async (kind: 'focus' | 'refresh') => {
      const schoolId = activeSchoolId;
      const requestContext = `${generation}:${schoolId ?? ''}:${activeStudentId ?? ''}:${chargeId}`;
      const seq = ++requestSeq.current;

      const stale = () => requestSeq.current !== seq || contextKeyRef.current !== requestContext;

      const showNotFound = () => {
        if (stale()) {
          return;
        }
        setCharge(null);
        setCopied(null);
        setPhase('not_found');
        setRefreshing(false);
      };

      if (schoolId == null || !Number.isSafeInteger(chargeId) || chargeId <= 0) {
        showNotFound();
        return;
      }

      if (kind === 'focus') {
        setCharge(null);
        setCopied(null);
        setPhase('loading');
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await fetchCharge(schoolId, chargeId);
        if (stale()) {
          return;
        }

        const next = response?.data;
        if (next == null || next.id !== chargeId) {
          showNotFound();
          return;
        }

        setCharge(next);
        setCopied(null);
        setPhase('ready');
        setRefreshing(false);
      } catch (err) {
        if (stale()) {
          return;
        }
        setCharge(null);
        setCopied(null);
        setRefreshing(false);
        if (err instanceof ApiError && err.status === 404) {
          setPhase('not_found');
          return;
        }
        setPhase(err instanceof ApiError ? 'error' : 'offline');
      }
    },
    [activeSchoolId, activeStudentId, chargeId, generation],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCharge('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [loadCharge]),
  );

  const copyValue = async (kind: CopiedField, value: string) => {
    const requestContext = contextKeyRef.current;
    try {
      const saved = await Clipboard.setStringAsync(value);
      if (!saved || contextKeyRef.current !== requestContext) {
        return;
      }
      setCopied(kind);
    } catch {
      // Clipboard failure must not crash the screen.
    }
  };

  const openBoleto = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // Browser failure must not crash the screen.
    }
  };

  const visible = phase === 'ready' && charge != null && charge.id === chargeId ? charge : null;
  const amount =
    visible && typeof visible.total_amount_cents === 'number' && Number.isFinite(visible.total_amount_cents)
      ? formatCurrencyBRL(visible.total_amount_cents)
      : null;
  const dueDate = visible && typeof visible.due_date === 'string' ? formatCalendarDateBR(visible.due_date) : '';
  const pix = visible ? pixCopyPaste(visible) : null;
  const url = visible ? boletoUrl(visible) : null;
  const line = visible ? digitableLineFromCharge(visible) : null;

  return (
    <View style={styles.screen}>
      {phase === 'loading' ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : null}
      {phase === 'not_found' ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>{t('boletos.notFound')}</Text>
        </View>
      ) : null}
      {phase === 'error' || phase === 'offline' ? (
        <View style={styles.status}>
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('boletos.networkError') : t('boletos.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadCharge('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('boletos.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {visible ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCharge('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {amount ? (
            <View style={styles.block}>
              <Text style={styles.label}>{t('boletos.amount')}</Text>
              <Text style={styles.value}>{amount}</Text>
            </View>
          ) : null}
          {dueDate ? (
            <View style={styles.block}>
              <Text style={styles.label}>{t('boletos.dueDate')}</Text>
              <Text style={styles.value}>{dueDate}</Text>
            </View>
          ) : null}
          <StatusChip status={visible.status} />
          {pix ? (
            <View style={styles.block}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('boletos.copyPix')}
                onPress={() => {
                  void copyValue('pix', pix);
                }}
                style={styles.actionButton}
              >
                <Text style={styles.actionLabel}>{t('boletos.copyPix')}</Text>
              </Pressable>
              {copied === 'pix' ? <Text style={styles.copied}>{t('boletos.copied')}</Text> : null}
            </View>
          ) : null}
          {url ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('boletos.openBoleto')}
              onPress={() => {
                void openBoleto(url);
              }}
              style={styles.actionButton}
            >
              <Text style={styles.actionLabel}>{t('boletos.openBoleto')}</Text>
            </Pressable>
          ) : null}
          {line ? (
            <View style={styles.block}>
              <Text style={styles.label}>{t('boletos.digitableLine')}</Text>
              <Text selectable style={styles.line}>
                {line}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('boletos.copyDigitableLine')}
                onPress={() => {
                  void copyValue('line', line);
                }}
                style={styles.actionButton}
              >
                <Text style={styles.actionLabel}>{t('boletos.copyDigitableLine')}</Text>
              </Pressable>
              {copied === 'line' ? <Text style={styles.copied}>{t('boletos.copied')}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
  },
  status: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  block: {
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  line: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  copied: {
    color: colors.success,
    fontSize: 14,
  },
});

export default ChargeDetailScreen;
