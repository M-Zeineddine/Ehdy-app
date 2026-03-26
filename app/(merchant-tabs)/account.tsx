import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';

export default function MerchantAccountScreen() {
  const { merchantUser, clearAuth } = useMerchantAuthStore();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/(merchant-auth)/login' as any);
        },
      },
    ]);
  }

  const initials = [merchantUser?.first_name?.[0], merchantUser?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AppText variant="heading" style={{ marginBottom: Spacing.xl }}>Account</AppText>

        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <AppText variant="heading" color={Colors.primary}>{initials}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" semiBold>
              {[merchantUser?.first_name, merchantUser?.last_name].filter(Boolean).join(' ') || 'Staff Member'}
            </AppText>
            <AppText variant="caption" color={Colors.text.secondary}>{merchantUser?.email}</AppText>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <InfoRow icon="storefront-outline" label="Store" value={merchantUser?.merchant_name ?? '—'} />
          <View style={styles.divider} />
          <InfoRow
            icon="shield-outline"
            label="Role"
            value={merchantUser?.role === 'owner' ? 'Owner' : 'Staff'}
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <AppText variant="body" color={Colors.error} semiBold>Sign out</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.text.secondary} />
      <AppText variant="body" color={Colors.text.secondary} style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="body" semiBold>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.md,
    justifyContent: 'center',
  },
});
