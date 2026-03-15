import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { getSentGifts, getReceivedGifts, type GiftSummary } from '@/src/services/giftService';

// ── helpers ───────────────────────────────────────────────────────────────────

function getItemLabel(gift: GiftSummary) {
  if (gift.store_credit_preset_id) {
    return `${gift.credit_currency ?? ''} ${gift.credit_amount ?? ''} Store Credit`.trim();
  }
  return gift.item_name ?? 'Gift';
}

function getMerchantName(gift: GiftSummary) {
  return (gift.store_credit_preset_id ? gift.credit_merchant_name : gift.merchant_name) ?? '';
}

function getMerchantLogo(gift: GiftSummary) {
  return (gift.store_credit_preset_id ? gift.merchant_logo : gift.merchant_logo) ?? null;
}

function getPriceLabel(gift: GiftSummary) {
  if (gift.store_credit_preset_id) {
    return `${gift.credit_currency ?? ''} ${gift.credit_amount ?? ''}`.trim();
  }
  if (gift.item_price && gift.item_currency) {
    return `${gift.item_currency} ${gift.item_price}`;
  }
  return '';
}

const GIFT_BASE_URL = 'https://kado-backend.onrender.com/gift';

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
      await Share.share({ message: `Open your gift here: ${url}`, url });
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
        <AppText style={styles.metaText}>To: {gift.recipient_name ?? '—'}</AppText>
        {priceLabel ? <AppText style={styles.priceText}>{priceLabel}</AppText> : null}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtnShare} onPress={onShareAgain} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={15} color={Colors.primary} />
            <AppText style={styles.actionBtnShareText}>Share Again</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnReceipt} onPress={onReceipt} activeOpacity={0.7}>
            <Ionicons name="receipt-outline" size={15} color={Colors.text.secondary} />
            <AppText style={styles.actionBtnReceiptText}>Receipt</AppText>
          </TouchableOpacity>
        </View>
    </View>
  );
}

// ── ReceivedGiftCard ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:             { label: 'Active',             bg: '#E6F4EA', color: '#2E7D32' },
  partially_redeemed: { label: 'Partially Redeemed', bg: '#FFF3E0', color: '#E65100' },
  redeemed:           { label: 'Redeemed',           bg: '#F5F5F5', color: '#757575' },
} as const;

function ReceivedGiftCard({ gift }: { gift: GiftSummary }) {
  const merchantName = getMerchantName(gift);
  const merchantLogo = getMerchantLogo(gift);
  const itemLabel    = getItemLabel(gift);
  const dateLabel    = new Date(gift.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const senderName   = gift.sender_name ?? [gift.sender_first_name, gift.sender_last_name].filter(Boolean).join(' ') ?? '—';
  const status       = gift.redemption_status ?? 'active';
  const statusCfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  const giftUrl      = gift.unique_share_link
    ? (gift.unique_share_link.startsWith('http') ? gift.unique_share_link : `https://kado-backend.onrender.com/gift/${gift.unique_share_link}`)
    : null;

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
              <AppText style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</AppText>
            </View>
          </View>
          <AppText style={styles.itemText} numberOfLines={1}>{itemLabel}</AppText>
        </View>
      </View>

      {/* From + date */}
      <View style={styles.cardMeta}>
        <AppText style={styles.metaText}>From: {senderName}</AppText>
        <AppText style={styles.metaText}>{dateLabel}</AppText>
      </View>

      {/* View Gift button */}
      {giftUrl ? (
        <TouchableOpacity
          style={styles.viewGiftBtn}
          onPress={() => Linking.openURL(giftUrl)}
          activeOpacity={0.7}
        >
          <AppText style={styles.viewGiftBtnText}>View Gift</AppText>
          <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ mode }: { mode: 'sent' | 'received' }) {
  return (
    <View style={styles.empty}>
      <AppText style={styles.emptyIcon}>{mode === 'sent' ? '🎁' : '📬'}</AppText>
      <AppText variant="subheading" style={styles.emptyTitle}>
        {mode === 'sent' ? 'No gifts sent yet' : 'No gifts received yet'}
      </AppText>
      <AppText variant="caption" style={styles.emptySubtitle}>
        {mode === 'sent'
          ? 'Send a gift to someone special from the home screen.'
          : 'Gifts sent to you will appear here once received.'}
      </AppText>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Tab = 'sent' | 'received';

export default function GiftsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('sent');
  const [sentGifts, setSentGifts] = useState<GiftSummary[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [sent, received] = await Promise.all([getSentGifts(), getReceivedGifts()]);
      setSentGifts(sent.data);
      setReceivedGifts(received.data);
    } catch (err) {
      console.warn('[GiftsScreen] fetch failed', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const data = activeTab === 'sent' ? sentGifts : receivedGifts;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="title">My Gifts</AppText>
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
              {tab === 'sent' ? 'Sent' : 'Received'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={data.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState mode={activeTab} />}
          renderItem={({ item }) => activeTab === 'sent'
            ? <GiftRow gift={item} />
            : <ReceivedGiftCard gift={item} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

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
