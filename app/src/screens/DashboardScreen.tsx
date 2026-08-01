import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthContext';

const DashboardScreen = () => {
  const { user } = useAuth();
  const membership = user?.memberships?.[0];
  const firstName = user?.email.split('@')[0] ?? 'there';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
      <Text style={styles.subtitle}>Bem-vindo(a) ao painel do School Lab.</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Conta</Text>
        <Text style={styles.cardValue}>{user?.email}</Text>
        <View style={styles.divider} />
        <Text style={styles.cardLabel}>Status</Text>
        <Text style={styles.cardValue}>{user?.status ?? '—'}</Text>
        {membership && (
          <>
            <View style={styles.divider} />
            <Text style={styles.cardLabel}>Vínculo</Text>
            <Text style={styles.cardValue}>
              {membership.role} · {membership.school_name}
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20 },
  greeting: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  cardLabel: { color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
});

export default DashboardScreen;
