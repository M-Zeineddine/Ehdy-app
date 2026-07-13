import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Share, Linking, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteRetryDraft, confirmGiftPayment, getGiftPaymentStatus, type GiftPaymentState } from '@/src/services/giftService';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { i18n } from '@/src/i18n';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'unknown';

const GIFT_BASE_URL = 'https://ehdy.app/gift';
const UNKNOWN_COLOR = '#D97706';

export default function PaymentCallbackScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    status?: string;
    tap_id?: string;
    gift_sent_id?: string;
    recipient_name?: string;
    gift_name?: string;
    draft_id?: string;
    item_id?: string;
    item_name?: string;
    item_description?: string;
    item_price?: string;
    item_currency?: string;
    item_image?: string;
    merchant_id?: string;
    merchant_name?: string;
    merchant_logo?: string;
    is_credit?: string;
  }>();
  const {
    status, tap_id, gift_sent_id, recipient_name, gift_name,
    draft_id,
    item_id, item_name, item_description, item_price, item_currency,
    item_image, merchant_id, merchant_name, merchant_logo, is_credit,
  } = params;
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [copied, setCopied] = useState(false);
  // Set only from the server's verified payment state — never from route params
  const [giftLink, setGiftLink] = useState('');

  useEffect(() => {
    async function confirm() {
      if (status === 'UNKNOWN') {
        // Payment browser closed before the Tap redirect — the outcome can't be
        // verified client-side yet (payment-status endpoint is pending, backend
        // C1). Keep the retry draft; the charge may still have gone through.
        setPaymentStatus('unknown');
        return;
      }
      if (status === 'FAILED' || status === 'CANCELLED') {
        setPaymentStatus('failed');
        return;
      }

      try {
        let state: GiftPaymentState | null = null;
        if (tap_id) {
          state = await confirmGiftPayment(tap_id);
        } else if (gift_sent_id) {
          // Redirect arrived without a tap_id — read the authoritative state
          // instead of assuming an outcome in either direction.
          state = await getGiftPaymentStatus(gift_sent_id);
        }

        if (state?.payment_status === 'paid') {
          const link = state.unique_share_link;
          const constructed = link ? (link.startsWith('http') ? link : `${GIFT_BASE_URL}/${link}`) : '';
          setGiftLink(constructed);
          setPaymentStatus('success');
          // Draft is only cleaned up on a server-verified paid state
          if (draft_id) deleteRetryDraft(draft_id).catch(() => {});
        } else if (state?.payment_status === 'pending') {
          // Charge may still complete via the Tap webhook — keep the draft
          setPaymentStatus('unknown');
        } else {
          // 'failed', or no charge reference at all — keep the draft for retry
          setPaymentStatus('failed');
        }
      } catch {
        // Backend rejected the charge or the check failed — keep the draft
        setPaymentStatus('failed');
      }
    }

    confirm();
  }, [status, tap_id, gift_sent_id]);

  function handleWhatsApp() {
    const name = recipient_name ? ` for ${recipient_name}` : '';
    const text = `I sent you a gift${name}! 🎁 Open it here: ${giftLink}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  }

  async function handleShare() {
    await Share.share({ message: giftLink, url: giftLink });
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(giftLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDone() {
    router.replace('/(tabs)');
  }

  function handleRetry() {
    if (draft_id && item_id) {
      router.replace({
        pathname: '/gift',
        params: {
          itemId: item_id,
          itemName: item_name ?? '',
          itemDescription: item_description ?? '',
          itemPrice: item_price ?? '',
          itemCurrency: item_currency ?? '',
          itemImage: item_image ?? '',
          merchantId: merchant_id ?? '',
          merchantName: merchant_name ?? '',
          merchantLogo: merchant_logo ?? '',
          isCredit: is_credit ?? 'false',
          draft_id,
          initial_step: '3',
        },
      });
    } else {
      router.back();
    }
  }

  if (paymentStatus === 'loading') {
    return (
      <View style={[styles.root, styles.rootCentered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <AppText style={styles.loadingText}>{i18n('payment.confirming')}</AppText>
      </View>
    );
  }

  const isSuccess = paymentStatus === 'success';
  const isUnknown = paymentStatus === 'unknown';
  const giftLabel = gift_name ? `Your gift of ${gift_name}` : 'Your gift';
  const recipientLabel = recipient_name ? ` to ${recipient_name}` : '';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.xl * 1.5 }]}>
      <View style={styles.content}>
        <View style={[
          styles.iconCircle,
          isSuccess ? styles.iconCircleSuccess : isUnknown ? styles.iconCircleUnknown : styles.iconCircleFailed,
        ]}>
          <Ionicons
            name={isSuccess ? 'checkmark' : isUnknown ? 'help' : 'close'}
            size={44}
            color={isSuccess ? Colors.primary : isUnknown ? UNKNOWN_COLOR : Colors.error}
          />
        </View>

        <AppText semiBold style={styles.title}>
          {isSuccess
            ? i18n('payment.successTitle')
            : isUnknown ? i18n('payment.unknownTitle') : i18n('payment.failureTitle')}
        </AppText>
        <AppText style={styles.subtitle} color={Colors.text.secondary}>
          {isSuccess
            ? `${giftLabel}${recipientLabel} is on its way.`
            : isUnknown ? i18n('payment.unknownMessage') : i18n('payment.failureMessage')}
        </AppText>

        {tap_id ? (
          <AppText style={styles.refText} color={Colors.text.tertiary}>
            Ref: {tap_id}
          </AppText>
        ) : isUnknown && gift_sent_id ? (
          <AppText style={styles.refText} color={Colors.text.tertiary}>
            Ref: {gift_sent_id}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {isSuccess ? (
          <>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <AppText semiBold style={styles.whatsappBtnText}>{i18n('payment.shareWhatsApp')}</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={Colors.primary} />
              <AppText semiBold style={[styles.outlineBtnText, { color: Colors.primary }]}>{i18n('payment.shareGiftLink')}</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={Colors.text.secondary} />
              <AppText style={styles.ghostBtnText} color={Colors.text.secondary}>
                {copied ? i18n('payment.copied') : i18n('payment.copyLink')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostBtn} onPress={handleDone} activeOpacity={0.8}>
              <AppText style={[styles.ghostBtnText, styles.underlineText]} color={Colors.text.tertiary}>{i18n('payment.backToHome')}</AppText>
            </TouchableOpacity>
          </>
        ) : isUnknown ? (
          <>
            {/* Deliberately no "Try Again" — the charge may have succeeded; retrying could double-charge */}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/gifts')} activeOpacity={0.8}>
              <AppText semiBold style={styles.primaryBtnText}>{i18n('payment.checkMyGifts')}</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={handleDone} activeOpacity={0.8}>
              <AppText style={styles.ghostBtnText} color={Colors.text.secondary}>{i18n('payment.backToHome')}</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry} activeOpacity={0.8}>
              <AppText semiBold style={styles.primaryBtnText}>{i18n('payment.tryAgain')}</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={handleDone} activeOpacity={0.8}>
              <AppText style={styles.ghostBtnText} color={Colors.text.secondary}>{i18n('common.cancel')}</AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  rootCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconCircleSuccess: { backgroundColor: Colors.primary + '18' },
  iconCircleFailed: { backgroundColor: '#E5393518' },
  iconCircleUnknown: { backgroundColor: UNKNOWN_COLOR + '18' },
  title: { fontSize: FontSize.xl, fontFamily: Fonts.semiBold, textAlign: 'center' },
  subtitle: { fontSize: FontSize.base, textAlign: 'center', lineHeight: 22 },
  refText: { fontSize: FontSize.xs, marginBottom: 0 },
  loadingText: { marginTop: Spacing.md, color: Colors.text.secondary },
  actions: { width: '100%', gap: Spacing.sm },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  whatsappBtnText: { color: '#fff', fontSize: FontSize.base },
  outlineBtn: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineBtnText: { fontSize: FontSize.base },
  ghostBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  copyBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ghostBtnText: { fontSize: FontSize.base },
  underlineText: { textDecorationLine: 'underline' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: FontSize.base },
});
