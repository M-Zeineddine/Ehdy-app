import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import { getMerchantDashboard, getMerchantBranches } from '@/src/services/merchantPortalService';

function formatAmount(amount: number, currency: string) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
  return `${amount.toLocaleString()} ${currency}`;
}

function StatTile({
  icon, label, value, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <AppText variant="caption" color={Colors.text.secondary}>{label}</AppText>
      <View style={styles.statValueRow}>
        <AppText variant="heading" style={styles.statValue}>{value}</AppText>
        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function MerchantSalesScreen() {
  const router = useRouter();
  const merchantUser = useMerchantAuthStore((s) => s.merchantUser);

  const dashboard = useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: getMerchantDashboard,
    refetchInterval: 60_000,
  });
  const data = dashboard.data;

  // Branch-scoped users see stats for their branches only — say so in the header
  const scopedIds = merchantUser?.branch_ids;
  const { data: branches } = useQuery({
    queryKey: ['merchant-branches'],
    queryFn: getMerchantBranches,
    staleTime: 5 * 60_000,
    enabled: !!scopedIds?.length,
  });
  const scopeNames = scopedIds?.length
    ? (branches ?? []).filter((b) => scopedIds.includes(b.id)).map((b) => b.name).join(', ')
    : null;

  function goToRedemptions(period: 'today' | 'month') {
    router.push({ pathname: '/(merchant-tabs)/redemption-history', params: { period } });
  }
  function goToPurchases(period: 'today' | 'month') {
    router.push({ pathname: '/(merchant-tabs)/purchase-history', params: { period } });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={() => dashboard.refetch()} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Sales</AppText>
            <AppText variant="caption" color={Colors.text.secondary}>
              {merchantUser?.merchant_name}
              {scopeNames ? ` · ${scopeNames}` : ''}
            </AppText>
          </View>
          <View style={styles.roleBadge}>
            <AppText variant="caption" color={Colors.primary} semiBold>
              {merchantUser?.role === 'owner' ? 'Owner' : merchantUser?.role === 'manager' ? 'Manager' : 'Staff'}
            </AppText>
          </View>
        </View>

        {/* Redemptions */}
        <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>REDEMPTIONS</AppText>
        <View style={styles.statsGrid}>
          <StatTile icon="checkmark-circle" label="Today" value={String(data?.today.redemptions ?? 0)} onPress={() => goToRedemptions('today')} />
          <StatTile icon="cash" label="Today rev." value={formatAmount(data?.today.revenue ?? 0, 'USD')} onPress={() => goToRedemptions('today')} />
        </View>
        <View style={styles.statsGrid}>
          <StatTile icon="calendar" label="This month" value={String(data?.month.redemptions ?? 0)} onPress={() => goToRedemptions('month')} />
          <StatTile icon="wallet" label="Month rev." value={formatAmount(data?.month.revenue ?? 0, 'USD')} onPress={() => goToRedemptions('month')} />
        </View>

        {/* Sales (purchases) — owner only; not branch-scoped since a sale isn't tied to a branch */}
        {data?.sales ? (
          <>
            <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>SALES</AppText>
            <View style={styles.statsGrid}>
              <StatTile icon="pricetag" label="Sold today" value={String(data.sales.today.sold)} onPress={() => goToPurchases('today')} />
              <StatTile icon="cash" label="Today rev." value={formatAmount(data.sales.today.revenue, 'USD')} onPress={() => goToPurchases('today')} />
            </View>
            <View style={styles.statsGrid}>
              <StatTile icon="calendar" label="Sold this month" value={String(data.sales.month.sold)} onPress={() => goToPurchases('month')} />
              <StatTile icon="wallet" label="Month rev." value={formatAmount(data.sales.month.revenue, 'USD')} onPress={() => goToPurchases('month')} />
            </View>
          </>
        ) : null}

        {/* Active codes */}
        <TouchableOpacity
          style={styles.activeCodesCard}
          onPress={() => router.push('/(merchant-tabs)/active-codes')}
          activeOpacity={0.7}
        >
          <Ionicons name="ticket-outline" size={18} color={Colors.primary} />
          <AppText variant="caption" color={Colors.text.secondary} style={{ flex: 1 }}>
            {data?.active_codes ?? 0} active gift codes
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  roleBadge: {
    backgroundColor: '#FFF0EC',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  sectionLabel: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statValue: { fontSize: 20 },
  activeCodesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
});
