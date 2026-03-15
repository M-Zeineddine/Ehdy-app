import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';

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

// ── GiftRow ───────────────────────────────────────────────────────────────────

function GiftRow({ gift, mode }: { gift: GiftSummary; mode: 'sent' | 'received' }) {
  const merchantName = getMerchantName(gift);
  const merchantLogo = getMerchantLogo(gift);
  const itemLabel    = getItemLabel(gift);

  const personLine = mode === 'sent'
    ? `To: ${gift.recipient_name ?? '—'}`
    : `From: ${gift.sender_name ?? [gift.sender_first_name, gift.sender_last_name].filter(Boolean).join(' ') ?? '—'}`;

  function onPress() {
    if (mode !== 'sent') return;
    router.push({
      pathname: '/gift/sent-receipt',
      params: {
        theme:            gift.theme ?? 'birthday',
        recipient_name:   gift.recipient_name ?? '',
        sender_name:      gift.sender_name ?? '',
        personal_message: gift.personal_message ?? '',
        sent_at:          gift.sent_at,
        merchant_name:    merchantName,
        merchant_logo:    merchantLogo ?? '',
        item_label:       itemLabel,
        item_image:       gift.item_image ?? '',
        price_label:      getPriceLabel(gift),
        share_link:       gift.unique_share_link ?? '',
      },
    });
  }

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={mode === 'sent' ? 0.7 : 1}>
      {/* Merchant logo */}
      <View style={styles.logoWrap}>
        {merchantLogo
          ? <Image source={{ uri: merchantLogo }} style={styles.logoImg} />
          : <AppText style={styles.logoFallback}>{(merchantName[0] ?? '🎁').toUpperCase()}</AppText>
        }
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <AppText style={styles.merchantText} numberOfLines={1}>{merchantName || 'Gift'}</AppText>
        <AppText style={styles.itemText} numberOfLines={1}>{itemLabel}</AppText>
        <AppText style={styles.metaText}>{personLine}</AppText>
      </View>

      {/* Chevron */}
      {mode === 'sent' && (
        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
      )}
    </TouchableOpacity>
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
    } catch {
      // silently fail — lists stay as-is
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll().finally(() => setLoading(false));
    }, [fetchAll])
  );

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
          renderItem={({ item }) => <GiftRow gift={item} mode={activeTab} />}
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

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
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
  logoImg: {
    width: 48,
    height: 48,
  },
  logoFallback: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.bold,
    color: Colors.text.secondary,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  merchantText: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  itemText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.regular,
    color: Colors.text.secondary,
  },
  metaText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.regular,
    color: Colors.text.tertiary,
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
});
