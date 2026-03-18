import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Share, Linking, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/src/services/api';
import { deleteRetryDraft } from '@/src/services/giftService';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { i18n } from '@/src/i18n';

type PaymentStatus = 'loading' | 'success' | 'failed';

const GIFT_BASE_URL = 'https://kado-backend.onrender.com/gift';

export default function PaymentCallbackScreen() {
  const insets = useSafeAreaInsets();
  const {
    status, tap_id, share_code, recipient_name, gift_name,
    draft_id,
    item_id, item_name, item_description, item_price, item_currency,
    item_image, merchant_id, merchant_name, merchant_logo, is_credit,
  } = useLocalSearchParams<{
    status?: string;
    tap_id?: string;
    share_code?: string;
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [copied, setCopied] = useState(false);

  const giftLink = share_code ? `${GIFT_BASE_URL}/${share_code}` : '';

  useEffect(() => {
    async function confirm() {
      if (status === 'FAILED' || status === 'CANCELLED') {
        setPaymentStatus('failed');
        return;
      }

      if (tap_id) {
        try {
          await api.post('/gifts/confirm-payment', { tap_id });
          setPaymentStatus('success');
          // Clean up draft now that payment succeeded
          if (draft_id) deleteRetryDraft(draft_id).catch(() => {});
        } catch {
          // Backend rejected the charge — treat as failed
          setPaymentStatus('failed');
        }
      } else {
        // No tap_id (e.g. alternate payment method) — go straight to success
        setPaymentStatus('success');
        if (draft_id) deleteRetryDraft(draft_id).catch(() => {});
      }
    }

    confirm();
  }, [status, tap_id]);

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
  const giftLabel = gift_name ? `Your gift of ${gift_name}` : 'Your gift';
  const recipientLabel = recipient_name ? ` to ${recipient_name}` : '';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.xl * 1.5 }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, isSuccess ? styles.iconCircleSuccess : styles.iconCircleFailed]}>
          <Ionicons
            name={isSuccess ? 'checkmark' : 'close'}
            size={44}
            color={isSuccess ? Colors.primary : Colors.error}
          />
        </View>

        <AppText semiBold style={styles.title}>
          {isSuccess ? i18n('payment.successTitle') : i18n('payment.failureTitle')}
        </AppText>
        <AppText style={styles.subtitle} color={Colors.text.secondary}>
          {isSuccess
            ? `${giftLabel}${recipientLabel} is on its way.`
            : i18n('payment.failureMessage')}
        </AppText>

        {tap_id ? (
          <AppText style={styles.refText} color={Colors.text.tertiary}>
            Ref: {tap_id}
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
