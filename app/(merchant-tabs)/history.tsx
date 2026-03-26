import { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { getMerchantRedemptions, type RedemptionItem } from '@/src/services/merchantPortalService';

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
          {dateStr} · {timeStr}
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

export default function MerchantHistoryScreen() {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['merchant-redemptions', page],
    queryFn: () => getMerchantRedemptions({ page, limit: 30 }),
  });

  const redemptions = data?.redemptions ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText variant="heading">Redemptions</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>
          {data?.pagination?.total ?? 0} total
        </AppText>
      </View>

      <FlatList
        data={redemptions}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <RedemptionRow item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm }}>
                No redemptions yet
              </AppText>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
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
  empty: { alignItems: 'center', paddingTop: 80 },
});
