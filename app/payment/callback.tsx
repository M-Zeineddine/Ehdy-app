import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Share, Linking, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';

type PaymentStatus = 'loading' | 'success' | 'failed';

const GIFT_BASE_URL = 'https://kado-backend.onrender.com/gift';

export default function PaymentCallbackScreen() {
  const insets = useSafeAreaInsets();
  const { status, tap_id, share_code, recipient_name, gift_name } = useLocalSearchParams<{
    status?: string;
    tap_id?: string;
    share_code?: string;
    recipient_name?: string;
    gift_name?: string;
  }>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [copied, setCopied] = useState(false);

  const giftLink = share_code ? `${GIFT_BASE_URL}/${share_code}` : '';

  useEffect(() => {
    if (status === 'CAPTURED') {
      setPaymentStatus('success');
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      setPaymentStatus('failed');
    } else {
      setPaymentStatus('success');
    }
  }, [status]);

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
    router.back();
  }

  if (paymentStatus === 'loading') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <AppText style={styles.loadingText}>Confirming payment…</AppText>
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
          {isSuccess ? 'Gift Sent!' : 'Payment failed'}
        </AppText>
        <AppText style={styles.subtitle} color={Colors.text.secondary}>
          {isSuccess
            ? `${giftLabel}${recipientLabel} is on its way.`
            : 'Something went wrong with your payment. Please try again.'}
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
              <AppText semiBold style={styles.whatsappBtnText}>Share via WhatsApp</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={Colors.primary} />
              <AppText semiBold style={[styles.outlineBtnText, { color: Colors.primary }]}>Share Gift Link</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={Colors.text.secondary} />
              <AppText style={styles.ghostBtnText} color={Colors.text.secondary}>
                {copied ? 'Copied!' : 'Copy Link'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostBtn} onPress={handleDone} activeOpacity={0.8}>
              <AppText style={[styles.ghostBtnText, styles.underlineText]} color={Colors.text.tertiary}>Back to Home</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry} activeOpacity={0.8}>
              <AppText semiBold style={styles.primaryBtnText}>Try Again</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={handleDone} activeOpacity={0.8}>
              <AppText style={styles.ghostBtnText} color={Colors.text.secondary}>Cancel</AppText>
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
