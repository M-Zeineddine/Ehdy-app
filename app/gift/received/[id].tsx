import React from 'react';
import {
  View, Image, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';

import { AppText } from '@/src/components/ui/AppText';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { GIFT_THEMES } from '@/src/constants/giftThemes';
import { BaseCard } from '@/src/components/gift/cards/BaseCard';
import {
  getReceivedGiftDetail,
  type ReceivedGiftDetail, type GiftBalance, type GiftBalanceEntry,
  type GiftItemStatus, type GiftBranch,
} from '@/src/services/giftService';
import { i18n } from '@/src/i18n';

function money(amount: string | number | null | undefined, currency: string | null | undefined) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount ?? '0') || 0;
  return currency === 'USD' ? `$${num.toFixed(2)}` : `${currency ?? ''} ${num.toFixed(2)}`.trim();
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function ReceivedGiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const cardWidth = width - Spacing.md * 2;
  const cardHeight = Math.round(cardWidth * 0.58);

  const { data: gift, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['received-gift', id],
    queryFn: () => getReceivedGiftDetail(id),
    enabled: !!id,
  });

  // Redemptions happen out-of-band at the merchant counter, so the app has no
  // event to invalidate this on — refetch on every focus (not just mount) so
  // a balance checked earlier in the session doesn't show stale numbers.
  const refetchRef = React.useRef(refetch);
  refetchRef.current = refetch;
  useFocusEffect(React.useCallback(() => {
    refetchRef.current();
  }, []));

  const [copied, setCopied] = React.useState(false);

  async function handleCopyCode() {
    if (!gift?.redemption_code) return;
    await Clipboard.setStringAsync(gift.redemption_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareCode() {
    if (!gift?.redemption_code) return;
    await Share.share({ message: i18n('viewGift.shareMessage', { code: gift.redemption_code }) });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="subheading">{i18n('viewGift.title')}</AppText>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>
      ) : isError || !gift ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <GiftCard gift={gift} cardWidth={cardWidth} cardHeight={cardHeight} />
          <ItemCard gift={gift} />
          {gift.redemption_code ? (
            <VoucherCard
              code={gift.redemption_code}
              qr={gift.redemption_qr_code}
              copied={copied}
              onCopy={handleCopyCode}
              onShare={handleShareCode}
            />
          ) : null}
          {gift.is_credit && gift.balance ? <BalanceCard balance={gift.balance} /> : null}
          {!gift.is_credit && gift.item_status ? <RedeemedCard status={gift.item_status} /> : null}
          {gift.branches.length > 0 ? (
            <BranchesCard branches={gift.branches} redeemableAt={gift.redeemable_at} merchantName={gift.merchant_name} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Themed gift card ─────────────────────────────────────────────────────────

function GiftCard({ gift, cardWidth, cardHeight }: { gift: ReceivedGiftDetail; cardWidth: number; cardHeight: number }) {
  const giftTheme = GIFT_THEMES.find(t => t.id === gift.theme) ?? GIFT_THEMES[0];
  const priceLabel = gift.is_credit
    ? `${money(gift.item_price, gift.item_currency)} Store Credit`
    : money(gift.item_price, gift.item_currency);
  return (
    <BaseCard
      theme={giftTheme}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      toName={gift.recipient_name ?? ''}
      fromName={gift.sender_name ?? ''}
      message={gift.personal_message ?? ''}
      merchantName={gift.merchant_name ?? ''}
      price={priceLabel}
    />
  );
}
// ── What's inside ────────────────────────────────────────────────────────────

function ItemCard({ gift }: { gift: ReceivedGiftDetail }) {
  const imageUri = gift.is_credit ? gift.merchant_logo : gift.item_image;
  const itemName = gift.is_credit
    ? `${money(gift.item_price, gift.item_currency)} Store Credit`
    : (gift.item_name ?? i18n('gifts.receipt'));
  const details = !gift.is_credit && gift.item_price ? money(gift.item_price, gift.item_currency) : null;

  return (
    <View style={styles.card}>
      <View style={styles.itemRow}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.itemImg} />
        ) : (
          <View style={[styles.itemImg, styles.itemImgFallback]}>
            <Ionicons name="gift-outline" size={24} color={Colors.text.tertiary} />
          </View>
        )}
        <View style={styles.itemInfo}>
          {gift.merchant_name ? <AppText style={styles.itemMerchant}>{gift.merchant_name}</AppText> : null}
          <AppText style={styles.itemName}>{itemName}</AppText>
          {gift.item_description ? (
            <AppText style={styles.itemDesc} numberOfLines={2}>{gift.item_description}</AppText>
          ) : null}
          {details ? <AppText style={styles.itemPrice}>{details}</AppText> : null}
        </View>
      </View>
    </View>
  );
}

// ── Voucher code + QR ────────────────────────────────────────────────────────

function VoucherCard({
  code, qr, copied, onCopy, onShare,
}: { code: string; qr: string | null; copied: boolean; onCopy: () => void; onShare: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.voucherRow}>
        <View>
          <AppText style={styles.voucherLabel}>{i18n('viewGift.voucherCode')}</AppText>
          <AppText style={styles.voucherCode}>{code}</AppText>
        </View>
        <View style={styles.voucherActions}>
          <TouchableOpacity onPress={onCopy} style={styles.voucherIconBtn} hitSlop={8}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? Colors.primary : Colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.voucherIconBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
      {qr ? (
        <View style={styles.qrWrap}>
          <Image source={{ uri: qr }} style={styles.qrImage} />
          <AppText style={styles.qrHint}>{i18n('viewGift.qrHint')}</AppText>
        </View>
      ) : null}
    </View>
  );
}

// ── Balance + redemption history (store credit) ─────────────────────────────

function BalanceCard({ balance }: { balance: GiftBalance }) {
  const initialNum = parseFloat(balance.initial) || 0;
  const currentNum = parseFloat(balance.current) || 0;
  const spentNum = Math.max(0, initialNum - currentNum);
  const pct = initialNum > 0 ? Math.max(0, Math.min(100, (currentNum / initialNum) * 100)) : 100;

  return (
    <View style={styles.card}>
      <View style={styles.balancePad}>
        <AppText style={styles.balanceLabel}>{i18n('viewGift.remaining')}</AppText>
        <AppText style={styles.balanceMain}>{money(currentNum, balance.currency)}</AppText>

        <View style={styles.balanceBarTrack}>
          <View style={[styles.balanceBarFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.balanceSubstats}>
          <View>
            <AppText style={styles.balanceMiniLabel}>{i18n('viewGift.original')}</AppText>
            <AppText style={styles.balanceMiniValue}>{money(initialNum, balance.currency)}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText style={styles.balanceMiniLabel}>{i18n('viewGift.totalSpent')}</AppText>
            <AppText style={styles.balanceMiniValue}>{money(spentNum, balance.currency)}</AppText>
          </View>
        </View>

        {balance.history.length > 0 ? (
          <View style={styles.historyList}>
            <AppText style={styles.historyTitle}>{i18n('viewGift.history')}</AppText>
            {balance.history.map((h: GiftBalanceEntry, i: number) => (
              <View key={i} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.historyEntryTitle} numberOfLines={1}>
                    {[balance.merchantName, h.branch_name].filter(Boolean).join(' — ')}
                  </AppText>
                  <AppText style={styles.historyEntryDate}>{formatDateTime(h.redeemed_at)}</AppText>
                </View>
                <AppText style={styles.historyAmount}>-{money(Math.abs(parseFloat(h.amount)), h.currency_code)}</AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Redeemed status (gift item — one-shot, not a ledger) ─────────────────────

function RedeemedCard({ status }: { status: GiftItemStatus }) {
  const where = [status.merchantName, status.branchName].filter(Boolean).join(' — ');
  return (
    <View style={styles.redeemedCard}>
      <View style={styles.redeemedIconCircle}>
        <Ionicons name="checkmark" size={16} color="#fff" />
      </View>
      <View>
        <AppText style={styles.redeemedTitle}>{i18n('viewGift.redeemed')}</AppText>
        <AppText style={styles.redeemedDetail}>
          {formatDateTime(status.redeemedAt)}{where ? ` ${i18n('viewGift.at')} ${where}` : ''}
        </AppText>
      </View>
    </View>
  );
}

// ── Branches (plain list — no map) ───────────────────────────────────────────

function BranchesCard({
  branches, redeemableAt, merchantName,
}: {
  branches: GiftBranch[];
  redeemableAt: string[] | null;
  merchantName: string | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.branchPad}>
        <AppText style={styles.sectionLabel}>
          {redeemableAt
            ? i18n('viewGift.redeemableAtSome', { branches: redeemableAt.join(', ') })
            : i18n('viewGift.redeemableAtAny', { merchant: merchantName ?? '' })}
        </AppText>
        {branches.map((b, i) => (
          <View key={b.id} style={[styles.branchRow, i < branches.length - 1 && styles.branchRowBorder]}>
            <Ionicons name="location-outline" size={16} color={Colors.text.tertiary} />
            <View style={{ flex: 1 }}>
              <AppText style={styles.branchName}>{b.name}</AppText>
              {b.address ? <AppText style={styles.branchAddress}>{b.address}</AppText> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },

  card: { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden' },

  // Item card
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  itemImg: { width: 64, height: 64, borderRadius: Radius.md, flexShrink: 0 },
  itemImgFallback: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, gap: 2 },
  itemMerchant: {
    fontSize: FontSize.xs, fontFamily: Fonts.bold, color: Colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  itemName: { fontSize: FontSize.base, fontFamily: Fonts.semiBold, color: Colors.text.primary },
  itemDesc: { fontSize: FontSize.xs, fontFamily: Fonts.regular, color: Colors.text.secondary, marginTop: 1 },
  itemPrice: { fontSize: FontSize.sm, fontFamily: Fonts.medium, color: Colors.text.secondary },

  // Voucher
  voucherRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md,
  },
  voucherLabel: {
    fontSize: 10, fontFamily: Fonts.bold, color: Colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3,
  },
  voucherCode: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.text.primary, letterSpacing: 2 },
  voucherActions: { flexDirection: 'row', gap: Spacing.sm },
  voucherIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  qrWrap: { alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.md },
  qrImage: { width: 160, height: 160, borderRadius: Radius.md, backgroundColor: Colors.surface },
  qrHint: { fontSize: FontSize.xs, color: Colors.text.tertiary },

  // Balance
  balancePad: { padding: Spacing.md },
  balanceLabel: {
    fontSize: 10, fontFamily: Fonts.bold, color: Colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3,
  },
  balanceMain: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.primary, marginBottom: Spacing.sm },
  balanceBarTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden', marginBottom: 10 },
  balanceBarFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  balanceSubstats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  balanceMiniLabel: {
    fontSize: 10, fontFamily: Fonts.bold, color: Colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  balanceMiniValue: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.text.secondary },
  historyList: { paddingTop: Spacing.sm },
  historyTitle: {
    fontSize: 12, fontFamily: Fonts.bold, color: Colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.sm, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  historyEntryTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.text.primary },
  historyEntryDate: { fontSize: 12, color: Colors.text.tertiary, marginTop: 1 },
  historyAmount: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.text.secondary, flexShrink: 0 },

  // Redeemed status
  redeemedCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: Radius.lg, padding: Spacing.md,
  },
  redeemedIconCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#166534',
    alignItems: 'center', justifyContent: 'center',
  },
  redeemedTitle: { fontSize: 14, fontFamily: Fonts.bold, color: '#166534' },
  redeemedDetail: { fontSize: 12, color: '#166534', opacity: 0.85, marginTop: 1 },

  // Branches
  branchPad: { padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: {
    fontSize: FontSize.sm, fontFamily: Fonts.medium, color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  branchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm },
  branchRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  branchName: { fontSize: FontSize.sm, fontFamily: Fonts.semiBold, color: Colors.text.primary },
  branchAddress: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 1 },
});
