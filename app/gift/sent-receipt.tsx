import React from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { GIFT_THEMES } from '@/src/constants/giftThemes';
import { BaseCard } from '@/src/components/gift/cards/BaseCard';
import { i18n } from '@/src/i18n';

export default function SentReceiptScreen() {
  const { width } = useWindowDimensions();
  const {
    theme,
    recipient_name,
    sender_name,
    personal_message,
    sent_at,
    merchant_name,
    merchant_logo,
    item_label,
    item_image,
    price_label,
    share_link,
  } = useLocalSearchParams<{
    theme: string;
    recipient_name: string;
    sender_name: string;
    personal_message: string;
    sent_at: string;
    merchant_name: string;
    merchant_logo: string;
    item_label: string;
    item_image: string;
    price_label: string;
    share_link: string;
  }>();

  const giftTheme = GIFT_THEMES.find(t => t.id === theme) ?? GIFT_THEMES[0];
  const cardPadding = Spacing.md * 2;
  const cardWidth = width - cardPadding;
  const cardHeight = Math.round(cardWidth * 0.58);

  const formattedDate = sent_at
    ? new Date(sent_at).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  // Items array — when bundles ship, pass a JSON array via params and parse here
  const items = [{
    image: item_image || null,
    merchantName: merchant_name || '',
    merchantLogo: merchant_logo || null,
    name: item_label || '',
    price: price_label || '',
  }];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="subheading">{i18n('receipt.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Themed gift card */}
        <BaseCard
          theme={giftTheme}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          toName={recipient_name ?? ''}
          fromName={sender_name ?? ''}
          message={personal_message ?? ''}
          merchantName={merchant_name ?? ''}
          price={price_label ?? ''}
        />

        {/* What's inside */}
        <View style={styles.card}>
          <AppText style={styles.sectionTitle}>{i18n('receipt.whatsInside')}</AppText>
          {items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i < items.length - 1 && styles.itemRowBorder]}>
              {item.image || item.merchantLogo ? (
                <Image
                  source={{ uri: (item.image || item.merchantLogo)! }}
                  style={styles.itemImg}
                />
              ) : (
                <View style={[styles.itemImg, styles.itemImgFallback]}>
                  <Ionicons name="gift-outline" size={24} color={Colors.text.tertiary} />
                </View>
              )}
              <View style={styles.itemInfo}>
                {item.merchantName ? (
                  <AppText style={styles.itemMerchant}>{item.merchantName}</AppText>
                ) : null}
                <AppText style={styles.itemName}>{item.name}</AppText>
                {item.price ? (
                  <AppText style={styles.itemPrice}>{item.price}</AppText>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Receipt details */}
        <View style={styles.card}>
          <ReceiptRow label={i18n('receipt.toLabel')} value={recipient_name || i18n('receipt.emptyFallback')} />
          {personal_message ? <ReceiptRow label={i18n('receipt.messageLabel')} value={`"${personal_message}"`} italic /> : null}
          <ReceiptRow label={i18n('receipt.sentOnLabel')} value={formattedDate} last />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function ReceiptRow({
  label,
  value,
  italic = false,
  last = false,
}: {
  label: string;
  value: string;
  italic?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.receiptRow, !last && styles.receiptRowBorder]}>
      <AppText style={styles.receiptLabel}>{label}</AppText>
      <AppText style={[styles.receiptValue, italic && styles.receiptValueItalic]} numberOfLines={3}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36 },

  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },

  // What's inside
  sectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemImg: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    flexShrink: 0,
  },
  itemImgFallback: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 2 },
  itemMerchant: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: FontSize.base,
    fontFamily: Fonts.semiBold,
    color: Colors.text.primary,
  },
  itemPrice: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.medium,
    color: Colors.text.secondary,
  },

  // Receipt rows
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  receiptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  receiptLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.text.tertiary,
    width: 72,
    flexShrink: 0,
  },
  receiptValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: Fonts.medium,
    color: Colors.text.primary,
    textAlign: 'right',
  },
  receiptValueItalic: {
    fontStyle: 'italic',
    color: Colors.text.secondary,
  },

});
