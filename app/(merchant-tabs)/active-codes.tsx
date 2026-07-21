import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { getMerchantActiveCodes, type ActiveCodeItem } from '@/src/services/merchantPortalService';

const PAGE_SIZE = 30;

function ActiveCodeRow({ item }: { item: ActiveCodeItem }) {
  const isCredit = item.type === 'store_credit';
  const current = item.current_balance != null ? parseFloat(item.current_balance) : null;
  const initial = item.initial_balance != null ? parseFloat(item.initial_balance) : null;
  const createdStr = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const expiresStr = item.expiration_date
    ? new Date(item.expiration_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="ticket-outline" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold>{item.redemption_code}</AppText>
        <AppText variant="caption" color={Colors.text.secondary} numberOfLines={1}>
          {item.gift_card_name} · Issued {createdStr}{expiresStr ? ` · Expires ${expiresStr}` : ''}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {isCredit && current != null ? (
          <>
            <AppText variant="body" semiBold color={Colors.primary}>
              {current.toLocaleString()} {item.currency_code}
            </AppText>
            {initial != null && initial !== current ? (
              <AppText variant="caption" color={Colors.text.tertiary}>of {initial.toLocaleString()}</AppText>
            ) : null}
          </>
        ) : (
          <View style={styles.itemBadge}>
            <AppText variant="caption" color={Colors.text.secondary}>Item</AppText>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ActiveCodesScreen() {
  const router = useRouter();

  const codes = useInfiniteQuery({
    queryKey: ['merchant-active-codes'],
    queryFn: ({ pageParam }) => getMerchantActiveCodes({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, pages } = last.pagination ?? {};
      return page && pages && page < pages ? page + 1 : undefined;
    },
  });

  const data = codes.data?.pages.flatMap((p) => p.codes) ?? [];
  const total = codes.data?.pages[0]?.pagination?.total ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading">Active Codes</AppText>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActiveCodeRow item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => {
          if (codes.hasNextPage && !codes.isFetchingNextPage) codes.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={codes.isRefetching && !codes.isFetchingNextPage} onRefresh={() => codes.refetch()} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <AppText variant="caption" color={Colors.text.tertiary} style={{ marginBottom: Spacing.xs }}>
            {total} total
          </AppText>
        }
        ListEmptyComponent={
          codes.isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm }}>
                No active codes
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          codes.isFetchingNextPage ? (
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
