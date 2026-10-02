import { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthContext';
import { fetchOpenCharges, fetchChargeHistory } from '../services/charges';
import { Charge, ChargeHistoryItem } from '../types/charges';
import ChargeListItem from '../components/charges/ChargeListItem';

type Tab = 'open' | 'history';

const BoletosScreen = () => {
  const { user } = useAuth();
  const schoolId = user?.memberships?.[0]?.school_id;

  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [openCharges, setOpenCharges] = useState<Charge[]>([]);
  const [chargeHistory, setChargeHistory] = useState<ChargeHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (refresh = false) => {
      if (!schoolId) return;

      if (!refresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        if (activeTab === 'open') {
          const response = await fetchOpenCharges(schoolId);
          setOpenCharges(response.data);
        } else {
          const response = await fetchChargeHistory(schoolId);
          setChargeHistory(response.data);
        }
      } catch (err) {
        let message = 'Erro ao carregar boletos';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        console.error('Failed to fetch charges:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [schoolId, activeTab],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
  };

  const handleRefresh = () => {
    void fetchData(true);
  };

  const charges = activeTab === 'open' ? openCharges : chargeHistory;
  const isOpenTab = activeTab === 'open';
  const emptyMessage = isOpenTab ? 'Nenhum boleto em aberto' : 'Nenhum boleto pago ainda';

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={styles.errorText}>Erro ao carregar boletos</Text>
      <Text style={styles.errorDetail}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Tentar novamente</Text>
      </Pressable>
    </View>
  );

  const renderChargeList = () => (
    <FlatList
      data={charges}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <ChargeListItem charge={item} />}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmpty}
    />
  );

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => handleTabChange('open')}
        >
          <Text style={[styles.tabLabel, activeTab === 'open' && styles.tabLabelActive]}>
            Em aberto
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => handleTabChange('history')}
        >
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            Pagos
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {renderError()}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {renderChargeList()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  errorDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default BoletosScreen;
