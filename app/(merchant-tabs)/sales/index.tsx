import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import {
  getMerchantDashboard, getMerchantBranches,
  getMerchantRedemptionsSummary, getMerchantPurchasesSummary, getMerchantActiveCodesSummary,
} from '@/src/services/merchantPortalService';

function money(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyCompact(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return money(amount);
}

// Percent change vs the previous period. Null means "nothing to compare"
// (both periods empty) — showing "+0%" there would read as a real number
// when it's really just an absence of data.
function trend(current: number, previous: number): { text: string; up: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { text: 'New', up: true };
  const pct = ((current - previous) / previous) * 100;
  return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`, up: pct >= 0 };
}

function TrendBadge({ t }: { t: { text: string; up: boolean } | null }) {
  if (!t) return null;
  const color = t.up ? '#16A34A' : '#DC2626';
  return (
    <View style={[styles.trendBadge, { backgroundColor: t.up ? '#F0FDF4' : '#FEF2F2' }]}>
      <Ionicons name={t.up ? 'trending-up' : 'trending-down'} size={12} color={color} />
      <AppText variant="caption" style={{ color }}>{t.text}</AppText>
    </View>
  );
}

// One tile per period — count and revenue are two facets of the same list,
// so they share a single tap target instead of two tiles that both open the
// exact same screen. A trend badge compares against the prior period.
function PeriodTile({
  icon, label, count, countLabel, revenue, trendPct, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count: number;
  countLabel: string;
  revenue: number;
  trendPct: { text: string; up: boolean } | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.periodTile} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.periodTileHeader}>
        <View style={styles.periodIcon}>
          <Ionicons name={icon} size={16} color={Colors.primary} />
        </View>
        <AppText variant="body" semiBold style={{ flex: 1 }}>{label}</AppText>
        <TrendBadge t={trendPct} />
        <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
      </View>
      <View style={styles.periodStatsRow}>
        <View style={styles.periodStat}>
          <AppText variant="heading" style={styles.periodStatValue}>{count}</AppText>
          <AppText variant="caption" color={Colors.text.secondary}>{countLabel}</AppText>
        </View>
        <View style={styles.periodDivider} />
        <View style={styles.periodStat}>
          <AppText variant="heading" style={[styles.periodStatValue, { color: Colors.primary }]}>{money(revenue)}</AppText>
          <AppText variant="caption" color={Colors.text.secondary}>revenue</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// An all-time row that just links into the matching history/active-codes
// screen filtered to "All" — the number shown here is the exact same
// aggregate that screen's own summary bar shows, not a separately computed
// stat, so the two can never disagree.
function LifetimeRow({
  icon, label, countLabel, value, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  countLabel: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.insightCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.periodIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold>{label}</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>{countLabel}</AppText>
      </View>
      <AppText variant="body" semiBold color={Colors.primary}>{moneyCompact(value)}</AppText>
      <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
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

  function goToRedemptions(period: 'today' | 'month' | 'all', status?: 'failed') {
    router.push({ pathname: '/(merchant-tabs)/sales/redemption-history', params: { period, ...(status ? { status } : {}) } });
  }
  function goToPurchases(period: 'today' | 'month' | 'all') {
    router.push({ pathname: '/(merchant-tabs)/sales/purchase-history', params: { period } });
  }

  // All-time totals — deliberately just the same summary endpoints the
  // history/active-codes screens use with no period filter, not a separate
  // "lifetime" computation, so this can never drift from what those screens show.
  const isOwner = merchantUser?.role === 'owner';
  const lifetimeSales = useQuery({
    queryKey: ['merchant-purchases-summary', 'all'],
    queryFn: () => getMerchantPurchasesSummary(),
    enabled: isOwner,
  });
  const lifetimeRedeemed = useQuery({
    queryKey: ['merchant-redemptions-summary', 'all'],
    queryFn: () => getMerchantRedemptionsSummary(),
  });
  const lifetimeUnredeemed = useQuery({
    queryKey: ['merchant-active-codes-summary', 'all'],
    queryFn: () => getMerchantActiveCodesSummary(),
  });

  const isRefreshing = dashboard.isRefetching || lifetimeSales.isRefetching
    || lifetimeRedeemed.isRefetching || lifetimeUnredeemed.isRefetching;
  function onRefresh() {
    dashboard.refetch();
    lifetimeSales.refetch();
    lifetimeRedeemed.refetch();
    lifetimeUnredeemed.refetch();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
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

        {/* Failed attempts — a fraud/confusion signal, surfaced up front rather than buried in history */}
        {data && data.failed_attempts_today > 0 ? (
          <TouchableOpacity style={styles.alertCard} onPress={() => goToRedemptions('today', 'failed')} activeOpacity={0.7}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <AppText variant="body" semiBold style={{ flex: 1, color: '#991B1B' }}>
              {data.failed_attempts_today} failed redemption {data.failed_attempts_today === 1 ? 'attempt' : 'attempts'} today
            </AppText>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        ) : null}

        {/* Redemptions */}
        <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>REDEMPTIONS</AppText>
        <PeriodTile
          icon="checkmark-circle" label="Today"
          count={data?.today.redemptions ?? 0} countLabel="redemptions" revenue={data?.today.revenue ?? 0}
          trendPct={data ? trend(data.today.revenue, data.yesterday.revenue) : null}
          onPress={() => goToRedemptions('today')}
        />
        <PeriodTile
          icon="calendar" label="This month"
          count={data?.month.redemptions ?? 0} countLabel="redemptions" revenue={data?.month.revenue ?? 0}
          trendPct={data ? trend(data.month.revenue, data.last_month.revenue) : null}
          onPress={() => goToRedemptions('month')}
        />

        {/* Sales (purchases) — owner only; not branch-scoped since a sale isn't tied to a branch */}
        {data?.sales ? (
          <>
            <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>SALES</AppText>
            <PeriodTile
              icon="pricetag" label="Sold today"
              count={data.sales.today.sold} countLabel="sold" revenue={data.sales.today.revenue}
              trendPct={trend(data.sales.today.revenue, data.sales.yesterday.revenue)}
              onPress={() => goToPurchases('today')}
            />
            <PeriodTile
              icon="pricetag" label="Sold this month"
              count={data.sales.month.sold} countLabel="sold" revenue={data.sales.month.revenue}
              trendPct={trend(data.sales.month.revenue, data.sales.last_month.revenue)}
              onPress={() => goToPurchases('month')}
            />
          </>
        ) : null}

        {/* Insights — owner only */}
        {data?.best_seller || data?.branch_breakdown ? (
          <>
            <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>INSIGHTS</AppText>
            {data.best_seller ? (
              <View style={styles.insightCard}>
                <View style={styles.periodIcon}>
                  <Ionicons name="trophy" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" semiBold numberOfLines={1}>{data.best_seller.name}</AppText>
                  <AppText variant="caption" color={Colors.text.secondary}>Best seller · {data.best_seller.count} sold</AppText>
                </View>
              </View>
            ) : null}
            {data.branch_breakdown ? (
              <View style={styles.insightCard}>
                <AppText variant="caption" color={Colors.text.secondary} style={{ marginBottom: Spacing.xs }}>
                  Today's redemptions by branch
                </AppText>
                {data.branch_breakdown.map((b) => (
                  <View key={b.branch_id} style={styles.branchRow}>
                    <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>{b.branch_name}</AppText>
                    <AppText variant="body" semiBold color={Colors.primary}>{b.redemptions}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {/* Lifetime — each row is a shortcut into that screen's own "All"
            view, not a separately computed stat */}
        <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>LIFETIME</AppText>
        {lifetimeSales.data ? (
          <LifetimeRow
            icon="pricetag"
            label="Total sales"
            countLabel={`${lifetimeSales.data.count} sold`}
            value={lifetimeSales.data.revenue}
            onPress={() => goToPurchases('all')}
          />
        ) : null}
        {lifetimeRedeemed.data ? (
          <LifetimeRow
            icon="checkmark-circle"
            label="Total redeemed"
            countLabel={`${lifetimeRedeemed.data.completed_count + lifetimeRedeemed.data.partial_count} redemptions`}
            value={lifetimeRedeemed.data.revenue}
            onPress={() => goToRedemptions('all')}
          />
        ) : null}
        {lifetimeUnredeemed.data ? (
          <LifetimeRow
            icon="ticket-outline"
            label="Unredeemed"
            countLabel={`${lifetimeUnredeemed.data.count} active codes`}
            value={lifetimeUnredeemed.data.value}
            onPress={() => router.push('/(merchant-tabs)/sales/active-codes')}
          />
        ) : null}
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
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  periodTile: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  periodTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  periodStatsRow: { flexDirection: 'row', alignItems: 'center' },
  periodStat: { flex: 1, alignItems: 'center', gap: 2 },
  periodStatValue: { fontSize: 26 },
  periodDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  periodIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  branchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6,
  },
});
