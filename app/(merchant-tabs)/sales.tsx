import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import {
  getMerchantDashboard,
  getMerchantRedemptions,
  getMerchantBranches,
  type RedemptionItem,
} from '@/src/services/merchantPortalService';

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <AppText variant="caption" color={Colors.text.secondary}>{label}</AppText>
      <AppText variant="heading" style={styles.statValue}>{value}</AppText>
    </View>
  );
}

function RedemptionRow({ item }: { item: RedemptionItem }) {
  const date = new Date(item.redeemed_at);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold>{item.redemption_code}</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>
          {item.gift_card_name} · {dateStr} · {timeStr}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {item.redeemed_amount != null ? (
          <AppText variant="body" semiBold color={Colors.primary}>
            {item.redeemed_amount.toLocaleString()} {item.currency_code}
          </AppText>
        ) : (
          <View style={styles.itemBadge}>
            <AppText variant="caption" color={Colors.text.secondary}>Item</AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const PAGE_SIZE = 30;

export default function MerchantSalesScreen() {
  const merchantUser = useMerchantAuthStore((s) => s.merchantUser);

  const dashboard = useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: getMerchantDashboard,
    refetchInterval: 60_000,
  });

  const history = useInfiniteQuery({
    queryKey: ['merchant-redemptions'],
    queryFn: ({ pageParam }) => getMerchantRedemptions({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, pages } = last.pagination ?? {};
      return page && pages && page < pages ? page + 1 : undefined;
    },
  });

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

  const redemptions = history.data?.pages.flatMap((p) => p.redemptions) ?? [];
  const total = history.data?.pages[0]?.pagination?.total ?? 0;
  const data = dashboard.data;

  const formatAmount = (amount: number, currency: string) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
    return `${amount.toLocaleString()} ${currency}`;
  };

  const refetchAll = () => {
    dashboard.refetch();
    history.refetch();
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={redemptions}
        keyExtractor={(item, i) => `${item.redemption_code}-${item.redeemed_at}-${i}`}
        renderItem={({ item }) => <RedemptionRow item={item} />}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefetching || history.isRefetching}
            onRefresh={refetchAll}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
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

            {/* Stats */}
            <View style={styles.statsGrid}>
              <StatCard icon="checkmark-circle" label="Today" value={String(data?.today.redemptions ?? 0)} />
              <StatCard icon="cash" label="Today rev." value={formatAmount(data?.today.revenue ?? 0, 'USD')} />
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon="calendar" label="This month" value={String(data?.month.redemptions ?? 0)} />
              <StatCard icon="wallet" label="Month rev." value={formatAmount(data?.month.revenue ?? 0, 'USD')} />
            </View>

            <View style={styles.activeCodesCard}>
              <Ionicons name="ticket-outline" size={18} color={Colors.primary} />
              <AppText variant="caption" color={Colors.text.secondary} style={{ flex: 1 }}>
                {data?.active_codes ?? 0} active gift codes
              </AppText>
            </View>

            <View style={styles.historyHeader}>
              <AppText variant="label" color={Colors.text.secondary}>HISTORY</AppText>
              <AppText variant="caption" color={Colors.text.tertiary}>{total} total</AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          history.isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm }}>
                No redemptions yet
              </AppText>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          history.isFetchingNextPage ? (
            <AppText variant="caption" color={Colors.text.tertiary} style={{ textAlign: 'center', padding: Spacing.md }}>
              Loading more…
            </AppText>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
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
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 40 },
});
