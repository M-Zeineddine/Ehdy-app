import { useState, useEffect } from 'react';
import { View, Image, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import { getMerchantRedemptions, getMerchantRedemptionsSummary, getMerchantBranches, type RedemptionItem } from '@/src/services/merchantPortalService';

type Period = 'today' | 'month' | 'all';
type GiftType = 'all' | 'store_credit' | 'gift_item';
type Status = 'all' | 'partial' | 'completed' | 'failed';
const PAGE_SIZE = 30;

// Same glyph, filled vs outline — reads as "same action, not yet closed out"
// for partial vs. fully completed. Failed gets its own (red) glyph.
function statusIcon(status: RedemptionItem['status']) {
  if (status === 'failed') return 'close-circle';
  return status === 'partial' ? 'checkmark-circle-outline' : 'checkmark-circle';
}
function statusColor(status: RedemptionItem['status']) {
  return status === 'failed' ? Colors.error : Colors.primary;
}

function RedemptionRow({ item, onPress }: { item: RedemptionItem; onPress: () => void }) {
  const date = new Date(item.redeemed_at);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const amount = item.redeemed_amount != null ? parseFloat(item.redeemed_amount) : null;
  const failed = item.status === 'failed';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.rowIcon, failed && styles.rowIconFailed]}>
        <Ionicons name={statusIcon(item.status)} size={18} color={statusColor(item.status)} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" semiBold>{item.redemption_code}</AppText>
        <AppText variant="caption" color={failed ? Colors.error : Colors.text.secondary} numberOfLines={1}>
          {failed
            ? item.error_message
            : `${item.gift_card_name} · ${dateStr} · ${timeStr}${item.branch_name ? ` · ${item.branch_name}` : ''}`}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {failed ? null : amount != null ? (
          <AppText variant="body" semiBold color={Colors.primary}>
            {amount.toLocaleString()} {item.currency_code}
          </AppText>
        ) : (
          <View style={styles.itemBadge}>
            <AppText variant="caption" color={Colors.text.secondary}>Item</AppText>
          </View>
        )}
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

function RedemptionDetailSheet({ item, onClose }: { item: RedemptionItem | null; onClose: () => void }) {
  if (!item) return null;
  const failed = item.status === 'failed';
  const date = new Date(item.redeemed_at);
  const dateStr = date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const amount = item.redeemed_amount != null ? parseFloat(item.redeemed_amount) : null;
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
                <View style={[sheet.itemImg, sheet.itemImgFallback, failed && { backgroundColor: '#FDECEA' }]}>
                  <Ionicons name={statusIcon(item.status)} size={22} color={statusColor(item.status)} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppText variant="heading" numberOfLines={2}>
                  {failed ? 'Redemption failed' : item.gift_card_name}
                </AppText>
                {item.item_description ? (
                  <AppText variant="caption" color={Colors.text.secondary} numberOfLines={2}>{item.item_description}</AppText>
                ) : null}
              </View>
            </View>

            <View style={sheet.divider} />

            {failed ? (
              <>
                <DetailRow label="Code attempted" value={item.redemption_code} />
                <DetailRow label="Reason" value={item.error_message ?? 'Unknown error'} />
                <DetailRow label="Date & time" value={dateStr} />
                {item.branch_name ? <DetailRow label="Branch" value={item.branch_name} /> : null}
              </>
            ) : (
              <>
                <DetailRow label="Redemption code" value={item.redemption_code} />
                <DetailRow label="Status" value={item.status === 'partial' ? 'Partial redemption' : 'Completed'} />
                <DetailRow label={amount != null ? 'Amount redeemed' : 'Type'} value={amount != null ? `${amount.toLocaleString()} ${item.currency_code}` : 'Item — fully claimed'} />
                {item.remaining_balance != null ? (
                  <>
                    <DetailRow label="Remaining" value={`${parseFloat(item.remaining_balance).toLocaleString()} ${item.currency_code}`} />
                    {item.initial_balance != null ? (
                      <DetailRow
                        label="Redeemed so far"
                        value={`${(parseFloat(item.initial_balance) - parseFloat(item.remaining_balance)).toLocaleString()} of ${parseFloat(item.initial_balance).toLocaleString()} ${item.currency_code}`}
                      />
                    ) : null}
                  </>
                ) : null}
                <DetailRow label="Date & time" value={dateStr} />
                {item.branch_name ? <DetailRow label="Branch" value={item.branch_name} /> : null}
                {item.notes ? <DetailRow label="Notes" value={item.notes} /> : null}
              </>
            )}

            {!failed && hasCustomerInfo ? (
              <>
                <View style={sheet.divider} />
                <AppText variant="label" color={Colors.text.secondary}>CUSTOMER</AppText>
                {item.recipient_name ? <DetailRow label="Recipient" value={item.recipient_name} /> : null}
                {item.recipient_phone ? <DetailRow label="Phone" value={item.recipient_phone} /> : null}
                {item.sender_name ? <DetailRow label="Gift from" value={item.sender_name} /> : null}
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

function ChipGroup<T extends string>({ label, options, optionLabels, value, onChange }: {
  label: string;
  options: T[];
  optionLabels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <AppText variant="label" color={Colors.text.secondary}>{label}</AppText>
      <View style={styles.filterRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.filterChip, value === opt && styles.filterChipActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <AppText variant="caption" color={value === opt ? '#fff' : Colors.text.secondary} semiBold={value === opt}>
              {optionLabels[opt]}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FilterSheet({
  visible, onClose, giftType, onGiftType, status, onStatus,
  branches, branchId, onBranch, onClearAll,
}: {
  visible: boolean;
  onClose: () => void;
  giftType: GiftType;
  onGiftType: (t: GiftType) => void;
  status: Status;
  onStatus: (s: Status) => void;
  branches: { id: string; name: string }[];
  branchId: string | null;
  onBranch: (id: string | null) => void;
  onClearAll: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheet.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={sheet.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ gap: Spacing.md }}>
            <View style={[sheet.header, { justifyContent: 'space-between' }]}>
              <AppText variant="heading">Filters</AppText>
              <TouchableOpacity onPress={onClearAll} hitSlop={8}>
                <AppText variant="body" color={Colors.primary} semiBold>Clear all</AppText>
              </TouchableOpacity>
            </View>

            <ChipGroup
              label="TYPE"
              options={['all', 'store_credit', 'gift_item'] as GiftType[]}
              optionLabels={{ all: 'All types', store_credit: 'Store credit', gift_item: 'Items' }}
              value={giftType}
              onChange={onGiftType}
            />

            <ChipGroup
              label="STATUS"
              options={['all', 'partial', 'completed', 'failed'] as Status[]}
              optionLabels={{ all: 'All', partial: 'Partial', completed: 'Completed', failed: 'Failed' }}
              value={status}
              onChange={onStatus}
            />

            {branches.length > 1 ? (
              <View style={{ gap: Spacing.xs }}>
                <AppText variant="label" color={Colors.text.secondary}>BRANCH</AppText>
                <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
                  <TouchableOpacity
                    style={[styles.filterChip, branchId === null && styles.filterChipActive]}
                    onPress={() => onBranch(null)}
                    activeOpacity={0.7}
                  >
                    <AppText variant="caption" color={branchId === null ? '#fff' : Colors.text.secondary} semiBold={branchId === null}>
                      All branches
                    </AppText>
                  </TouchableOpacity>
                  {branches.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.filterChip, branchId === b.id && styles.filterChipActive]}
                      onPress={() => onBranch(b.id)}
                      activeOpacity={0.7}
                    >
                      <AppText variant="caption" color={branchId === b.id ? '#fff' : Colors.text.secondary} semiBold={branchId === b.id}>
                        {b.name}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <TouchableOpacity style={sheet.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <AppText variant="body" semiBold color={Colors.text.primary}>Done</AppText>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function SummaryBar({ status, count, revenue, completedCount, partialCount, failedCount }: {
  status: Status;
  count: number;
  revenue: number;
  completedCount: number;
  partialCount: number;
  failedCount: number;
}) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryStat}>
        <AppText variant="body" semiBold>{count}</AppText>
        <AppText variant="caption" color={Colors.text.secondary}>
          {status === 'all' ? 'redemptions' : status === 'failed' ? 'failed' : status === 'partial' ? 'partial' : 'completed'}
        </AppText>
      </View>
      {revenue > 0 ? (
        <>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <AppText variant="body" semiBold color={Colors.primary}>{revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</AppText>
            <AppText variant="caption" color={Colors.text.secondary}>revenue</AppText>
          </View>
        </>
      ) : null}
      {status === 'all' ? (
        <>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <AppText variant="body" semiBold>{completedCount}/{partialCount}/{failedCount}</AppText>
            <AppText variant="caption" color={Colors.text.secondary}>done / partial / failed</AppText>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function RedemptionHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; status?: string }>();
  const [period, setPeriod] = useState<Period>((params.period as Period) ?? 'all');
  const [giftType, setGiftType] = useState<GiftType>('all');
  const [status, setStatus] = useState<Status>((params.status as Status) ?? 'all');
  const [selected, setSelected] = useState<RedemptionItem | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = (giftType !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0) + (branchId !== null ? 1 : 0);

  // This screen is a hidden tab (not a stack push), so the tab navigator keeps
  // it mounted and reuses the same instance across visits — re-sync the local
  // filters whenever the Sales screen navigates here with new params, instead
  // of only reading them once at first mount.
  useEffect(() => {
    setPeriod((params.period as Period) ?? 'all');
    setStatus((params.status as Status) ?? 'all');
  }, [params.period, params.status]);

  // Owners see every branch; a manager only ever sees their own assigned
  // branches here — anything else 403s server-side, so don't even offer it.
  const merchantUser = useMerchantAuthStore((s) => s.merchantUser);
  const scopedIds = merchantUser?.branch_ids;
  const { data: allBranches } = useQuery({
    queryKey: ['merchant-branches'],
    queryFn: getMerchantBranches,
    staleTime: 5 * 60_000,
  });
  const selectableBranches = scopedIds?.length
    ? (allBranches ?? []).filter((b) => scopedIds.includes(b.id))
    : (allBranches ?? []);

  const history = useInfiniteQuery({
    queryKey: ['merchant-redemptions', period, giftType, status, branchId],
    queryFn: ({ pageParam }) => getMerchantRedemptions({
      page: pageParam,
      limit: PAGE_SIZE,
      ...(period === 'all' ? {} : { period }),
      ...(giftType === 'all' ? {} : { type: giftType }),
      ...(status === 'all' ? {} : { status }),
      ...(branchId ? { branch_id: branchId } : {}),
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, pages } = last.pagination ?? {};
      return page && pages && page < pages ? page + 1 : undefined;
    },
  });

  const redemptions = history.data?.pages.flatMap((p) => p.redemptions) ?? [];

  // Aggregate stats for the exact filter set above the list — computed
  // server-side, not by summing loaded rows (pagination only ever holds one
  // page in memory, so a client-side sum would silently undercount).
  const summary = useQuery({
    queryKey: ['merchant-redemptions-summary', period, giftType, status, branchId],
    queryFn: () => getMerchantRedemptionsSummary({
      ...(period === 'all' ? {} : { period }),
      ...(giftType === 'all' ? {} : { type: giftType }),
      ...(status === 'all' ? {} : { status }),
      ...(branchId ? { branch_id: branchId } : {}),
    }),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* This is a hidden Tabs.Screen, not a stack push, so router.back()
            falls through to the tab navigator's first tab (Scan) instead of
            wherever this was actually opened from — navigate explicitly. */}
        <TouchableOpacity onPress={() => router.replace('/(merchant-tabs)/sales')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading">Redemption History</AppText>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.filterRow, { alignItems: 'center' }]}>
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
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.filterChip, styles.filtersBtn, activeFilterCount > 0 && styles.filterChipActive]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={14} color={activeFilterCount > 0 ? '#fff' : Colors.text.secondary} />
          <AppText variant="caption" color={activeFilterCount > 0 ? '#fff' : Colors.text.secondary} semiBold={activeFilterCount > 0}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </AppText>
        </TouchableOpacity>
      </View>

      {summary.data ? (
        <SummaryBar
          status={status}
          count={summary.data.count}
          revenue={summary.data.revenue}
          completedCount={summary.data.completed_count}
          partialCount={summary.data.partial_count}
          failedCount={summary.data.failed_count}
        />
      ) : null}

      <FlatList
        data={redemptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RedemptionRow item={item} onPress={() => setSelected(item)} />}
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

      <RedemptionDetailSheet item={selected} onClose={() => setSelected(null)} />
      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        giftType={giftType}
        onGiftType={setGiftType}
        status={status}
        onStatus={setStatus}
        branches={selectableBranches}
        branchId={branchId}
        onBranch={setBranchId}
        onClearAll={() => {
          setGiftType('all');
          setStatus('all');
          setBranchId(null);
        }}
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
  filtersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  rowIconFailed: { backgroundColor: '#FDECEA' },
  itemBadge: { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
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
