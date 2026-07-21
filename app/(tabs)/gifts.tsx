import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { AppText } from '@/src/components/ui/AppText';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { getSentGifts, getReceivedGifts, getDrafts, type GiftSummary } from '@/src/services/giftService';
import { GIFT_BASE_URL } from '@/src/services/api';
import { i18n } from '@/src/i18n';

// ── helpers ───────────────────────────────────────────────────────────────────

function getItemLabel(gift: GiftSummary) {
  if (gift.credit_amount) {
    return `${gift.credit_currency ?? ''} ${gift.credit_amount} Store Credit`.trim();
  }
  return gift.item_name ?? 'Gift';
}

function getMerchantName(gift: GiftSummary) {
  return (gift.merchant_name ?? gift.credit_merchant_name) ?? '';
}

function getMerchantLogo(gift: GiftSummary) {
  return gift.merchant_logo ?? null;
}

function getPriceLabel(gift: GiftSummary) {
  if (gift.credit_amount) {
    return `${gift.credit_currency ?? ''} ${gift.credit_amount}`.trim();
  }
  if (gift.item_price && gift.item_currency) {
    return `${gift.item_currency} ${gift.item_price}`;
  }
  return '';
}

// ── GiftRow ───────────────────────────────────────────────────────────────────

function GiftRow({ gift }: { gift: GiftSummary }) {
  const merchantName = getMerchantName(gift);
  const merchantLogo = getMerchantLogo(gift);
  const itemLabel = getItemLabel(gift);
  const priceLabel = getPriceLabel(gift);

  const receiptParams = {
    theme: gift.theme ?? 'birthday',
    recipient_name: gift.recipient_name ?? '',
    sender_name: gift.sender_name ?? '',
    personal_message: gift.personal_message ?? '',
    sent_at: gift.sent_at,
    merchant_name: merchantName,
    merchant_logo: merchantLogo ?? '',
    item_label: itemLabel,
    item_image: gift.item_image ?? '',
    price_label: priceLabel,
    share_link: gift.unique_share_link ?? '',
  };

  const dateLabel = new Date(gift.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  async function onShareAgain() {
    const link = gift.unique_share_link;
    if (!link) return;
    const url = link.startsWith('http') ? link : `${GIFT_BASE_URL}/${link}`;
    try {
      await Share.share({ message: i18n('gifts.shareMessage', { url }), url });
    } catch { }
  }

  function onReceipt() {
    router.push({ pathname: '/gift/sent-receipt', params: receiptParams });
  }

  return (
    <View style={styles.card}>
      {/* Top: logo + info */}
      <View style={styles.cardTop}>
        <View style={styles.logoWrap}>
          {merchantLogo
            ? <Image source={{ uri: merchantLogo }} style={styles.logoImg} />
            : <AppText style={styles.logoFallback}>{(merchantName[0] ?? '🎁').toUpperCase()}</AppText>
          }
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardInfoTop}>
            <AppText style={styles.merchantText} numberOfLines={1}>{merchantName || 'Gift'}</AppText>
            <AppText style={styles.dateText}>{dateLabel}</AppText>
          </View>
          <AppText style={styles.itemText} numberOfLines={1}>{itemLabel}</AppText>
        </View>
      </View>

      {/* Meta: "To:" + price */}
      <View style={styles.cardMeta}>
        <AppText style={styles.metaText}>{i18n('gifts.to', { name: gift.recipient_name ?? '—' })}</AppText>
        {priceLabel ? <AppText style={styles.priceText}>{priceLabel}</AppText> : null}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtnShare} onPress={onShareAgain} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={15} color={Colors.primary} />
            <AppText style={styles.actionBtnShareText}>{i18n('gifts.shareAgain')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnReceipt} onPress={onReceipt} activeOpacity={0.7}>
            <Ionicons name="receipt-outline" size={15} color={Colors.text.secondary} />
            <AppText style={styles.actionBtnReceiptText}>{i18n('gifts.receipt')}</AppText>
          </TouchableOpacity>
        </View>
    </View>
  );
}

// ── ReceivedGiftCard ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:             { labelKey: 'gifts.filterActive',            bg: '#E6F4EA', color: '#2E7D32' },
  partially_redeemed: { labelKey: 'gifts.filterPartiallyRedeemed', bg: '#FFF3E0', color: '#E65100' },
  redeemed:           { labelKey: 'gifts.filterRedeemed',          bg: '#F5F5F5', color: '#757575' },
} as const;

function ReceivedGiftCard({ gift }: { gift: GiftSummary }) {
  const merchantName = getMerchantName(gift);
  const merchantLogo = getMerchantLogo(gift);
  const itemLabel    = getItemLabel(gift);
  const dateLabel    = new Date(gift.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const senderName   = gift.sender_name ?? [gift.sender_first_name, gift.sender_last_name].filter(Boolean).join(' ') ?? '—';
  const status       = gift.redemption_status ?? 'active';
  const statusCfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;

  return (
    <View style={styles.card}>
      {/* Top: logo + info + status */}
      <View style={styles.cardTop}>
        <View style={styles.logoWrap}>
          {merchantLogo
            ? <Image source={{ uri: merchantLogo }} style={styles.logoImg} />
            : <AppText style={styles.logoFallback}>{(merchantName[0] ?? '🎁').toUpperCase()}</AppText>
          }
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardInfoTop}>
            <AppText style={styles.merchantText} numberOfLines={1}>{merchantName || 'Gift'}</AppText>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <AppText style={[styles.statusText, { color: statusCfg.color }]}>{i18n(statusCfg.labelKey)}</AppText>
            </View>
          </View>
          <AppText style={styles.itemText} numberOfLines={1}>{itemLabel}</AppText>
        </View>
      </View>

      {/* From + date */}
      <View style={styles.cardMeta}>
        <AppText style={styles.metaText}>{i18n('gifts.from', { name: senderName })}</AppText>
        <AppText style={styles.metaText}>{dateLabel}</AppText>
      </View>

      {/* View Gift button */}
      <TouchableOpacity
        style={styles.viewGiftBtn}
        onPress={() => router.push({ pathname: '/gift/received/[id]', params: { id: gift.id } })}
        activeOpacity={0.7}
      >
        <AppText style={styles.viewGiftBtnText}>{i18n('gifts.viewGift')}</AppText>
        <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ mode }: { mode: 'sent' | 'received' }) {
  return (
    <View style={styles.empty}>
      <AppText style={styles.emptyIcon}>{mode === 'sent' ? '🎁' : '📬'}</AppText>
      <AppText variant="subheading" style={styles.emptyTitle}>
        {mode === 'sent' ? i18n('gifts.emptySentTitle') : i18n('gifts.emptyReceivedTitle')}
      </AppText>
      <AppText variant="caption" style={styles.emptySubtitle}>
        {mode === 'sent' ? i18n('gifts.emptySentSubtitle') : i18n('gifts.emptyReceivedSubtitle')}
      </AppText>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Tab = 'sent' | 'received';
type SortOrder = 'desc' | 'asc';
type StatusFilter = 'active' | 'partially_redeemed' | 'redeemed' | null;

export default function GiftsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('sent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  // One cache entry per sort/filter combination — a slow response for an old
  // combination can never overwrite a newer one (the old hand-rolled fetch raced)
  const sentQuery = useInfiniteQuery({
    queryKey: ['gifts', 'sent', sortOrder],
    queryFn: ({ pageParam }) => getSentGifts(pageParam, sortOrder),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
  });
  const receivedQuery = useInfiniteQuery({
    queryKey: ['gifts', 'received', sortOrder, statusFilter],
    queryFn: ({ pageParam }) => getReceivedGifts(pageParam, sortOrder, statusFilter ?? undefined),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
  });

  const activeQuery = activeTab === 'sent' ? sentQuery : receivedQuery;
  const data = activeQuery.data?.pages.flatMap(p => p.data) ?? [];

  const draftsQuery = useQuery({ queryKey: ['gift-drafts'], queryFn: getDrafts });
  const draftCount = draftsQuery.data?.length ?? 0;

  // Refresh on focus so a gift sent moments ago appears without pull-to-refresh.
  // refetch goes through a ref because its identity isn't guaranteed stable —
  // putting it in the deps could re-run the effect every render while focused.
  const refetchRef = useRef(activeQuery.refetch);
  refetchRef.current = activeQuery.refetch;
  const refetchDraftsRef = useRef(draftsQuery.refetch);
  refetchDraftsRef.current = draftsQuery.refetch;
  useFocusEffect(useCallback(() => {
    refetchRef.current();
    refetchDraftsRef.current();
  }, []));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="title" style={{ flex: 1 }}>{i18n('gifts.title')}</AppText>
        <TouchableOpacity
          style={styles.draftsBtn}
          onPress={() => router.push('/gift/drafts')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="document-text-outline" size={22} color={Colors.text.primary} />
          {draftCount > 0 && (
            <View style={styles.draftsBadge}>
              <AppText style={styles.draftsBadgeText}>{draftCount > 99 ? '99+' : draftCount}</AppText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['sent', 'received'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <AppText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'sent' ? i18n('gifts.tabSent') : i18n('gifts.tabReceived')}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort + Filter bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={13}
            color={Colors.text.secondary}
          />
          <AppText style={styles.sortBtnText}>
            {sortOrder === 'desc' ? i18n('gifts.sortNewest') : i18n('gifts.sortOldest')}
          </AppText>
        </TouchableOpacity>

        {activeTab === 'received' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {([null, 'active', 'partially_redeemed', 'redeemed'] as StatusFilter[]).map(s => (
              <TouchableOpacity
                key={s ?? 'all'}
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                onPress={() => setStatusFilter(s)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                  {s === null ? i18n('gifts.filterAll') : i18n(STATUS_CONFIG[s].labelKey)}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {activeQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : activeQuery.isError ? (
        <ErrorState message={activeQuery.error?.message} onRetry={() => activeQuery.refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={data.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching && !activeQuery.isFetchingNextPage}
              onRefresh={() => activeQuery.refetch()}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={<EmptyState mode={activeTab} />}
          renderItem={({ item }) => activeTab === 'sent'
            ? <GiftRow gift={item} />
            : <ReceivedGiftCard gift={item} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={() => {
            if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) activeQuery.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            activeQuery.isFetchingNextPage
              ? <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
              : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  draftsBtn: { padding: 4 },
  draftsBadge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  draftsBadgeText: { color: '#fff', fontSize: 10, fontFamily: Fonts.semiBold },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  // List
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  listEmpty: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footerLoader: { paddingVertical: Spacing.md },
  separator: { height: Spacing.sm },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  logoImg: { width: 48, height: 48 },
  logoFallback: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.bold,
    color: Colors.text.secondary,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.regular,
    color: Colors.text.tertiary,
    flexShrink: 0,
  },
  merchantText: {
    fontSize: FontSize.base,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  itemText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.regular,
    color: Colors.text.secondary,
  },
  cardMeta: { gap: 2 },
  metaText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.regular,
    color: Colors.text.tertiary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: 2,
  },
  actionBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: '#FEF0EB',
  },
  actionBtnShareText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  actionBtnReceipt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  actionBtnReceiptText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
  },

  // Sort + Filter bar
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  sortBtnText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
  },
  filterScrollContent: {
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { textAlign: 'center', color: Colors.text.primary },
  emptySubtitle: { textAlign: 'center', color: Colors.text.secondary, lineHeight: 20 },

  // Received card
  receivedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },
  viewGiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: '#FEF0EB',
  },
  viewGiftBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  priceText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
});
