import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';

type PaymentStatus = 'loading' | 'success' | 'failed';

export default function PaymentCallbackScreen() {
  const insets = useSafeAreaInsets();
  const { status, tap_id } = useLocalSearchParams<{ status?: string; tap_id?: string }>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');

  useEffect(() => {
    // Tap redirects with ?status=CAPTURED or ?status=FAILED
    if (status === 'CAPTURED') {
      setPaymentStatus('success');
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      setPaymentStatus('failed');
    } else {
      // No status param — treat as success and let the webhook confirm
      setPaymentStatus('success');
    }
  }, [status]);

  function handleDone() {
    // Navigate to wallet/home after success
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

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={[styles.iconCircle, isSuccess ? styles.iconCircleSuccess : styles.iconCircleFailed]}>
        <Ionicons
          name={isSuccess ? 'checkmark' : 'close'}
          size={44}
          color={isSuccess ? Colors.primary : Colors.error ?? '#E53935'}
        />
      </View>

      <AppText semiBold style={styles.title}>
        {isSuccess ? 'Gift sent!' : 'Payment failed'}
      </AppText>
      <AppText style={styles.subtitle} color={Colors.text.secondary}>
        {isSuccess
          ? 'Your gift is on its way. Share the link with your recipient.'
          : 'Something went wrong with your payment. Please try again.'}
      </AppText>

      {tap_id ? (
        <AppText style={styles.refText} color={Colors.text.tertiary}>
          Ref: {tap_id}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {isSuccess ? (
          <View
            style={styles.primaryBtn}
            onTouchEnd={handleDone}
          >
            <AppText semiBold style={styles.primaryBtnText}>Go to Wallet</AppText>
          </View>
        ) : (
          <>
            <View style={styles.primaryBtn} onTouchEnd={handleRetry}>
              <AppText semiBold style={styles.primaryBtnText}>Try Again</AppText>
            </View>
            <View style={styles.secondaryBtn} onTouchEnd={handleDone}>
              <AppText style={styles.secondaryBtnText} color={Colors.text.secondary}>Cancel</AppText>
            </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
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
  refText: { fontSize: FontSize.xs },
  loadingText: { marginTop: Spacing.md, color: Colors.text.secondary },
  actions: { width: '100%', marginTop: Spacing.lg, gap: Spacing.sm },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: FontSize.base },
  secondaryBtn: {
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: FontSize.base },
});
