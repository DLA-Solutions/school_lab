import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import ChargeListItem from '../components/charges/ChargeListItem';
import EmptyState from '../components/EmptyState';
import { t } from '../i18n';
import { BoletosStackParamList } from '../navigation/types';
import { useGuardianContext } from '../providers/GuardianContext';
import { ApiError } from '../services/api';
import { fetchOpenCharges } from '../services/charges';
import { colors } from '../theme/colors';
import { Charge } from '../types/charges';

type Props = NativeStackScreenProps<BoletosStackParamList, 'List'>;

type ListPhase = 'loading' | 'ready' | 'error' | 'offline';

const listedCharges = (rows: Charge[]): Charge[] =>
  rows.filter((row) => row != null && typeof row.id === 'number' && Number.isSafeInteger(row.id));

const BoletosScreen = ({ navigation }: Props) => {
  const { activeSchoolId, activeStudentId, generation } = useGuardianContext();
  const [phase, setPhase] = useState<ListPhase>('loading');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  const contextKey = `${generation}:${activeSchoolId ?? ''}:${activeStudentId ?? ''}`;
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const [seenContextKey, setSeenContextKey] = useState(contextKey);
  if (seenContextKey !== contextKey) {
    setSeenContextKey(contextKey);
    setCharges([]);
    setPhase('loading');
    setRefreshing(false);
  }

  const loadCharges = useCallback(
    async (kind: 'focus' | 'refresh') => {
      const schoolId = activeSchoolId;
      const studentId = activeStudentId;
      const requestContext = `${generation}:${schoolId ?? ''}:${studentId ?? ''}`;
      const seq = ++requestSeq.current;

      if (schoolId == null || studentId == null) {
        if (contextKeyRef.current === requestContext && requestSeq.current === seq) {
          setCharges([]);
          setPhase('ready');
          setRefreshing(false);
        }
        return;
      }

      if (kind === 'focus') {
        setCharges([]);
        setPhase('loading');
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }

      const apply = (nextPhase: ListPhase, nextRows: Charge[]) => {
        if (requestSeq.current !== seq || contextKeyRef.current !== requestContext) {
          return;
        }
        setCharges(nextRows);
        setPhase(nextPhase);
        setRefreshing(false);
      };

      try {
        const response = await fetchOpenCharges(schoolId, studentId);
        if (!Array.isArray(response?.data)) {
          apply('error', []);
          return;
        }
        apply('ready', listedCharges(response.data));
      } catch (err) {
        if (err instanceof ApiError) {
          apply('error', []);
          return;
        }
        apply('offline', []);
      }
    },
    [activeSchoolId, activeStudentId, generation],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCharges('focus');

      return () => {
        requestSeq.current += 1;
      };
    }, [loadCharges]),
  );

  const openDetail = (chargeId: number) => {
    if (typeof chargeId !== 'number' || !Number.isSafeInteger(chargeId)) {
      return;
    }
    navigation.navigate('Detail', { chargeId });
  };

  return (
    <View style={styles.screen}>
      {phase === 'loading' ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : null}
      {phase === 'error' || phase === 'offline' ? (
        <ScrollView
          contentContainerStyle={styles.status}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCharges('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Text style={styles.errorText}>
            {phase === 'offline' ? t('boletos.networkError') : t('boletos.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadCharges('focus');
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>{t('boletos.retry')}</Text>
          </Pressable>
        </ScrollView>
      ) : null}
      {phase === 'ready' ? (
        <FlatList
          data={charges}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={charges.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={<EmptyState messageKey="empty.boletos" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCharges('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => <ChargeListItem charge={item} onPress={openDetail} />}
        />
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
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
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
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
});

export default BoletosScreen;
