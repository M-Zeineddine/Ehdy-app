import { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { getMerchantRedemptions, type RedemptionItem } from '@/src/services/merchantPortalService';

type Period = 'today' | 'month' | 'all';
const PAGE_SIZE = 30;

function RedemptionRow({ item }: { item: RedemptionItem }) {
  const date = new Date(item.redeemed_at);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const amount = item.redeemed_amount != null ? parseFloat(item.redeemed_amount) : null;

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold>{item.redemption_code}</AppText>
        <AppText variant="caption" color={Colors.text.secondary} numberOfLines={1}>
          {item.gift_card_name} · {dateStr} · {timeStr}{item.branch_name ? ` · ${item.branch_name}` : ''}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {amount != null ? (
          <AppText variant="body" semiBold color={Colors.primary}>
            {amount.toLocaleString()} {item.currency_code}
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

export default function RedemptionHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<Period>((params.period as Period) ?? 'all');

  const history = useInfiniteQuery({
    queryKey: ['merchant-redemptions', period],
    queryFn: ({ pageParam }) => getMerchantRedemptions({
      page: pageParam,
      limit: PAGE_SIZE,
      ...(period === 'all' ? {} : { period }),
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, pages } = last.pagination ?? {};
      return page && pages && page < pages ? page + 1 : undefined;
    },
  });

  const redemptions = history.data?.pages.flatMap((p) => p.redemptions) ?? [];
  const total = history.data?.pages[0]?.pagination?.total ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading">Redemption History</AppText>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.filterRow}>
        {(['today', 'month', 'all'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterChip, period === p && styles.filterChipActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <AppText variant="caption" color={period === p ? '#fff' : Colors.text.secondary} semiBold={period === p}>
              {p === 'today' ? 'Today' : p === 'month' ? 'This month' : 'All'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={redemptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RedemptionRow item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={history.isRefetching && !history.isFetchingNextPage} onRefresh={() => history.refetch()} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <AppText variant="caption" color={Colors.text.tertiary} style={{ marginBottom: Spacing.xs }}>
            {total} total
          </AppText>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  backBtn: { width: 36 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  rowIcon: {
    width: 36, height: 36, borderRadius: Radius.full, backgroundColor: '#FFF0EC',
    alignItems: 'center', justifyContent: 'center',
  },
  itemBadge: { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 40 },
});
