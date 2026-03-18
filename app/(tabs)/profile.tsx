import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useAuthStore } from '@/src/store/authStore';
import { i18n } from '@/src/i18n';

export default function ProfileScreen() {
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    Alert.alert(i18n('profile.signOutConfirmTitle'), i18n('profile.signOutConfirmMessage'), [
      { text: i18n('common.cancel'), style: 'cancel' },
      { text: i18n('profile.signOut'), style: 'destructive', onPress: () => clearAuth() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <AppText variant="heading" style={styles.title}>{i18n('profile.title')}</AppText>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>
              {user?.first_name?.[0]?.toUpperCase()}{user?.last_name?.[0]?.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="subheading">{user?.first_name} {user?.last_name}</AppText>
          <AppText variant="body" color={Colors.text.secondary}>{user?.email}</AppText>
        </View>

        {/* Menu items */}
        <View style={styles.menu}>
          <MenuItem icon="person-outline" label={i18n('profile.editProfile')} onPress={() => {}} />
          <MenuItem icon="notifications-outline" label={i18n('profile.notifications')} onPress={() => {}} />
          <MenuItem icon="shield-checkmark-outline" label={i18n('profile.privacySecurity')} onPress={() => {}} />
          <MenuItem icon="help-circle-outline" label={i18n('profile.helpSupport')} onPress={() => {}} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.55}>
          <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          <AppText variant="body" color="#E53E3E" semiBold>{i18n('profile.signOut')}</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.55}>
      <Ionicons name={icon} size={20} color={Colors.text.secondary} />
      <AppText variant="body" style={styles.menuLabel}>{label}</AppText>
      <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  title: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
  avatarSection: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 26, color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  menu: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  menuLabel: { flex: 1 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#E53E3E',
  },
});
