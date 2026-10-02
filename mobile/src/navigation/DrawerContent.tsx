import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthContext';

const logo = require('../../assets/icon.png');

/** Mirrors frontend/app's sidebar: logo header, single Dashboard item, Logout footer. */
const DrawerContent = ({ state, navigation }: DrawerContentComponentProps) => {
  const { user, logout } = useAuth();
  const activeRoute = state.routeNames[state.index];
  const userName = user?.email.split('@')[0] ?? 'User';

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} />
        <Text style={styles.brandText}>School Lab</Text>
      </View>

      <Pressable
        style={[styles.item, activeRoute === 'Dashboard' && styles.itemActive]}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Ionicons
          name="home"
          size={20}
          color={activeRoute === 'Dashboard' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.itemLabel, activeRoute === 'Dashboard' && styles.itemLabelActive]}>
          Dashboard
        </Text>
      </Pressable>

      <Pressable
        style={[styles.item, activeRoute === 'Boletos' && styles.itemActive]}
        onPress={() => navigation.navigate('Boletos')}
      >
        <Ionicons
          name="document-text-outline"
          size={20}
          color={activeRoute === 'Boletos' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.itemLabel, activeRoute === 'Boletos' && styles.itemLabelActive]}>
          Boletos
        </Text>
      </Pressable>

      <Pressable
        style={[styles.item, activeRoute === 'ReportCards' && styles.itemActive]}
        onPress={() => navigation.navigate('ReportCards')}
      >
        <Ionicons
          name="ribbon-outline"
          size={20}
          color={activeRoute === 'ReportCards' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.itemLabel, activeRoute === 'ReportCards' && styles.itemLabelActive]}>
          Boletins
        </Text>
      </Pressable>

      <View style={styles.spacer} />

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, paddingHorizontal: 4 },
  logo: { width: 24, height: 24, borderRadius: 6, marginRight: 8 },
  brandText: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemActive: { backgroundColor: colors.surface },
  itemLabel: { color: colors.textSecondary, fontSize: 15, marginLeft: 14 },
  itemLabelActive: { color: colors.primary, fontWeight: '600' },
  spacer: { flex: 1 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: { color: colors.textPrimary, fontWeight: '700' },
  profileText: { flex: 1 },
  profileName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  profileEmail: { color: colors.textSecondary, fontSize: 12 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 24,
  },
  logoutText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginLeft: 8 },
});

export default DrawerContent;
