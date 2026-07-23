import { useState, useEffect } from 'react';
import { View, Image, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { getMerchantPurchases, getMerchantPurchasesSummary, type PurchaseItem } from '@/src/services/merchantPortalService';

type Period = 'today' | 'month' | 'all';
type GiftType = 'all' | 'store_credit' | 'gift_item';
const PAGE_SIZE = 30;

function PurchaseRow({ item, onPress }: { item: PurchaseItem; onPress: () => void }) {
  const date = new Date(item.sent_at);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const amount = item.amount != null ? parseFloat(item.amount) : null;
  const icon = item.type === 'store_credit' ? 'wallet' : 'gift';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold numberOfLines={1}>{item.gift_card_name}</AppText>
        <AppText variant="caption" color={Colors.text.secondary} numberOfLines={1}>
          To {item.recipient_name ?? '—'} · {dateStr} · {timeStr}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {amount != null ? (
          <AppText variant="body" semiBold color={Colors.primary}>
            {amount.toLocaleString()} {item.currency_code}
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={sheet.row}>
      <AppText variant="caption" color={Colors.text.tertiary} style={sheet.rowLabel}>{label}</AppText>
      <AppText variant="body" style={sheet.rowValue}>{value}</AppText>
    </View>
  );
}

function PurchaseDetailSheet({ item, onClose }: { item: PurchaseItem | null; onClose: () => void }) {
  if (!item) return null;
  const date = new Date(item.sent_at);
  const dateStr = date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const amount = item.amount != null ? parseFloat(item.amount) : null;
  const hasCustomerInfo = item.sender_name || item.recipient_name || item.recipient_phone;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheet.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={sheet.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ gap: Spacing.sm }}>
            <View style={sheet.header}>
              {item.item_image ? (
                <Image source={{ uri: item.item_image }} style={sheet.itemImg} />
              ) : (
                <View style={[sheet.itemImg, sheet.itemImgFallback]}>
                  <Ionicons name={item.type === 'store_credit' ? 'wallet' : 'gift'} size={22} color={Colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppText variant="heading" numberOfLines={2}>{item.gift_card_name}</AppText>
                {item.item_description ? (
                  <AppText variant="caption" color={Colors.text.secondary} numberOfLines={2}>{item.item_description}</AppText>
                ) : null}
              </View>
            </View>

            <View style={sheet.divider} />

            {amount != null ? <DetailRow label="Amount" value={`${amount.toLocaleString()} ${item.currency_code}`} /> : null}
            <DetailRow label="Purchased" value={dateStr} />
            <DetailRow
              label="Status"
              value={
                item.redemption_status === 'redeemed' ? 'Fully redeemed'
                : item.redemption_status === 'partially_redeemed' ? 'Partially redeemed'
                : 'Not yet redeemed'
              }
            />
            {item.type === 'store_credit' && item.current_balance != null && item.initial_balance != null ? (
              <DetailRow
                label={item.redemption_status === 'active' ? 'Available' : 'Remaining'}
                value={`${parseFloat(item.current_balance).toLocaleString()} of ${parseFloat(item.initial_balance).toLocaleString()} ${item.currency_code}`}
              />
            ) : null}

            {hasCustomerInfo ? (
              <>
                <View style={sheet.divider} />
                <AppText variant="label" color={Colors.text.secondary}>CUSTOMER</AppText>
                {item.sender_name ? <DetailRow label="From" value={item.sender_name} /> : null}
                {item.recipient_name ? <DetailRow label="To" value={item.recipient_name} /> : null}
                {item.recipient_phone ? <DetailRow label="Phone" value={item.recipient_phone} /> : null}
                {item.personal_message ? <DetailRow label="Message" value={item.personal_message} /> : null}
              </>
            ) : null}

            <TouchableOpacity style={sheet.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <AppText variant="body" semiBold color={Colors.text.primary}>Close</AppText>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function SummaryBar({ count, revenue }: { count: number; revenue: number }) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryStat}>
        <AppText variant="body" semiBold>{count}</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>sold</AppText>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryStat}>
        <AppText variant="body" semiBold color={Colors.primary}>{revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>revenue</AppText>
      </View>
    </View>
  );
}

export default function PurchaseHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<Period>((params.period as Period) ?? 'all');
  const [giftType, setGiftType] = useState<GiftType>('all');
  const [selected, setSelected] = useState<PurchaseItem | null>(null);

  // Debounced so typing doesn't fire a request per keystroke — search always
  // runs server-side (sender/recipient name, phone, or redemption code),
  // never as a client-side filter over whatever page happens to be loaded.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // This screen is a hidden tab (not a stack push), so the tab navigator keeps
  // it mounted and reuses the same instance across visits — re-sync the local
  // filter whenever the Sales tile navigates here with a new period, instead
  // of only reading it once at first mount.
  useEffect(() => {
    if (params.period) setPeriod(params.period as Period);
  }, [params.period]);

  const history = useInfiniteQuery({
    queryKey: ['merchant-purchases', period, giftType, search],
    queryFn: ({ pageParam }) => getMerchantPurchases({
      page: pageParam,
      limit: PAGE_SIZE,
      ...(period === 'all' ? {} : { period }),
      ...(giftType === 'all' ? {} : { type: giftType }),
      ...(search ? { search } : {}),
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, pages } = last.pagination ?? {};
      return page && pages && page < pages ? page + 1 : undefined;
    },
  });

  const purchases = history.data?.pages.flatMap((p) => p.purchases) ?? [];

  const summary = useQuery({
    queryKey: ['merchant-purchases-summary', period, giftType, search],
    queryFn: () => getMerchantPurchasesSummary({
      ...(period === 'all' ? {} : { period }),
      ...(giftType === 'all' ? {} : { type: giftType }),
      ...(search ? { search } : {}),
    }),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading">Purchase History</AppText>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone, or code"
          placeholderTextColor={Colors.text.tertiary}
          value={searchInput}
          onChangeText={setSearchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput ? (
          <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
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

      <View style={styles.filterRow}>
        {(['all', 'store_credit', 'gift_item'] as GiftType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, giftType === t && styles.filterChipActive]}
            onPress={() => setGiftType(t)}
            activeOpacity={0.7}
          >
            <AppText variant="caption" color={giftType === t ? '#fff' : Colors.text.secondary} semiBold={giftType === t}>
              {t === 'all' ? 'All types' : t === 'store_credit' ? 'Store credit' : 'Items'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {summary.data ? <SummaryBar count={summary.data.count} revenue={summary.data.revenue} /> : null}

      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PurchaseRow item={item} onPress={() => setSelected(item)} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={history.isRefetching && !history.isFetchingNextPage} onRefresh={() => history.refetch()} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          history.isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="gift-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm }}>
                No purchases yet
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

      <PurchaseDetailSheet item={selected} onClose={() => setSelected(null)} />
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.text.primary, padding: 0 },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  rowIcon: {
    width: 36, height: 36, borderRadius: Radius.full, backgroundColor: '#FFF0EC',
    alignItems: 'center', justifyContent: 'center',
  },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { alignItems: 'center', paddingTop: 40 },
});

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemImg: { width: 56, height: 56, borderRadius: Radius.md, flexShrink: 0 },
  itemImgFallback: { backgroundColor: '#FFF0EC', alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
  rowLabel: { width: 120, flexShrink: 0 },
  rowValue: { flex: 1, textAlign: 'right', fontFamily: Fonts.medium },
  closeBtn: {
    marginTop: Spacing.sm, paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: Colors.surface, alignItems: 'center',
  },
});
