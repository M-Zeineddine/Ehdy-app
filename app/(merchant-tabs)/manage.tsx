import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function MenuRow({
  icon, title, subtitle, onPress,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.rowCard} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold>{title}</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>{subtitle}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
    </TouchableOpacity>
  );
}

export default function MerchantManageScreen() {
  const router = useRouter();
  const merchantUser = useMerchantAuthStore((s) => s.merchantUser);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText variant="heading">Manage</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>
          {merchantUser?.merchant_name}
        </AppText>
      </View>

      <View style={styles.menu}>
        <MenuRow
          icon="pricetags"
          title="Items"
          subtitle="Gift items, prices, and branch availability"
          onPress={() => router.push('/(merchant-tabs)/manage-items')}
        />
        <MenuRow
          icon="people"
          title="Staff"
          subtitle="Cashier and manager accounts, branch assignment"
          onPress={() => router.push('/(merchant-tabs)/manage-staff')}
        />
        <MenuRow
          icon="location"
          title="Branches"
          subtitle="Store locations and contact details"
          onPress={() => router.push('/(merchant-tabs)/manage-branches')}
        />
        <MenuRow
          icon="storefront"
          title="Store profile"
          subtitle="Description, images, and contact info"
          onPress={() => router.push('/(merchant-tabs)/manage-profile')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingBottom: Spacing.md },
  menu: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
