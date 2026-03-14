import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts, FontSize } from '@/src/constants/layout';
import { GiftCardPreview } from '@/src/components/gift/GiftCardPreview';
import { GIFT_THEMES } from '@/src/constants/giftThemes';

const STEP_TITLES = ['Review Gift', 'Customize Gift', 'Checkout'];
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80';

export default function GiftFlowScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    itemId: string;
    itemName: string;
    itemDescription: string;
    itemPrice: string;
    itemCurrency: string;
    itemImage: string;
    merchantId: string;
    merchantName: string;
    merchantLogo: string;
    isCredit: string;
  }>();

  const isCredit = params.isCredit === 'true';
  const price = params.itemPrice
    ? `${params.itemCurrency} ${parseFloat(params.itemPrice).toLocaleString()}`
    : '';

  // ── Step & animation ────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function goToStep(next: number) {
    const direction = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: direction * -60, duration: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(direction * 60);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  function handleBack() {
    if (step === 1) router.back();
    else goToStep(step - 1);
  }

  // ── Form state (persists across all steps) ──────────────────────────────────
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('birthday');
  const [phone, setPhone] = useState('');

  // ── Step 1: Review ──────────────────────────────────────────────────────────
  function renderReview() {
    const imageUri = isCredit ? params.merchantLogo : (params.itemImage || FALLBACK_IMAGE);
    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.itemCard}>
          <View style={styles.itemImageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={[styles.itemImage, styles.itemImageFallback]}>
                <AppText style={{ fontSize: 28 }}>🏪</AppText>
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <AppText semiBold style={styles.itemName} numberOfLines={2}>
              {params.itemName}
            </AppText>
            {params.itemDescription ? (
              <AppText style={styles.itemDesc} numberOfLines={2} color={Colors.text.secondary}>
                {params.itemDescription}
              </AppText>
            ) : null}
            <AppText semiBold style={styles.itemPrice}>{price}</AppText>
            <AppText style={styles.itemMerchant} color={Colors.text.tertiary}>
              {params.merchantName}
            </AppText>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Step 2: Customize ───────────────────────────────────────────────────────
  function renderCustomize() {
    return (
      <ScrollView
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GiftCardPreview
          themeId={selectedTheme}
          toName={toName}
          fromName={fromName}
          message={message}
          merchantName={params.merchantName ?? ''}
          price={price}
        />

        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>FROM</AppText>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={Colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={fromName}
              onChangeText={setFromName}
              placeholder="Your Name"
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>TO</AppText>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={Colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={toName}
              onChangeText={setToName}
              placeholder="Recipient's Name"
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>MESSAGE</AppText>
          <View style={styles.messageWrap}>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={t => t.length <= 200 && setMessage(t)}
              placeholder="Write a sweet note..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              textAlignVertical="top"
            />
            <AppText style={styles.charCount} color={Colors.text.tertiary}>
              {message.length}/200
            </AppText>
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.rowBetween}>
            <AppText style={styles.fieldLabel}>SELECT THEME</AppText>
            <TouchableOpacity activeOpacity={0.6}>
              <AppText style={styles.viewAll}>View all</AppText>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeScroll}>
            {GIFT_THEMES.map(theme => {
              const active = selectedTheme === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => setSelectedTheme(theme.id)}
                  activeOpacity={0.8}
                  style={[styles.themeCard, active && styles.themeCardActive]}
                >
                  {active && (
                    <View style={styles.themeCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    </View>
                  )}
                  <View style={[styles.themeIconCircle, { backgroundColor: theme.gradient[0] + '22' }]}>
                    <Ionicons name={theme.icon} size={26} color={theme.gradient[0]} />
                  </View>
                  <AppText style={styles.themeLabel}>{theme.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>RECIPIENT'S PHONE</AppText>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <AppText style={styles.flag}>🇱🇧</AppText>
              <AppText semiBold style={styles.countryCodeText}>+961</AppText>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="3123 456"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.text.tertiary} />
            <AppText style={styles.hintText} color={Colors.text.tertiary}>
              Used to identify your recipient if they sign up.
            </AppText>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Step 3: Checkout (design coming soon) ───────────────────────────────────
  function renderCheckout() {
    return (
      <View style={styles.checkoutPlaceholder}>
        <Ionicons name="card-outline" size={48} color={Colors.text.tertiary} />
        <AppText color={Colors.text.tertiary}>Checkout design coming soon</AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.6} style={styles.headerSide}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{STEP_TITLES[step - 1]}</AppText>
        <View style={styles.headerSide} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s, i) => (
          <React.Fragment key={s}>
            <View style={[
              styles.stepDot,
              step === s && styles.stepDotActive,
              step > s && styles.stepDotDone,
            ]} />
            {i < 2 && (
              <View style={[styles.stepLine, step > s && styles.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <AppText style={styles.stepSubLabel}>Step {step} of 3</AppText>

      {/* Animated step content */}
      <Animated.View
        style={[styles.animatedContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
      >
        {step === 1 && renderReview()}
        {step === 2 && renderCustomize()}
        {step === 3 && renderCheckout()}
      </Animated.View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.totalRow}>
          <AppText color={Colors.text.secondary}>Total</AppText>
          <AppText semiBold style={styles.totalAmount}>{price}</AppText>
        </View>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => step < 3 ? goToStep(step + 1) : undefined}
          activeOpacity={0.8}
        >
          <AppText semiBold style={styles.continueBtnText}>
            {step === 3 ? 'Confirm & Pay' : 'Continue'}
          </AppText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  headerSide: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontFamily: Fonts.semiBold },

  stepIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 80, marginTop: Spacing.xs,
  },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  stepDotActive: { width: 24, borderRadius: 5, backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.primary, opacity: 0.4 },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: Colors.primary, opacity: 0.4 },
  stepSubLabel: {
    textAlign: 'center', fontSize: FontSize.sm, color: Colors.text.tertiary,
    marginTop: 6, marginBottom: Spacing.md, fontFamily: Fonts.regular,
  },

  animatedContainer: { flex: 1 },
  stepContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.lg },

  // Review
  itemCard: {
    flexDirection: 'row', backgroundColor: Colors.card,
    borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  itemImageWrap: { width: 110, alignSelf: 'stretch' },
  itemImage: { width: '100%', height: '100%' },
  itemImageFallback: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, padding: Spacing.md, gap: 4, justifyContent: 'center' },
  itemName: { fontSize: FontSize.base, lineHeight: 22 },
  itemDesc: { fontSize: FontSize.sm, lineHeight: 18 },
  itemPrice: { fontSize: FontSize.base, color: Colors.primary, marginTop: 2 },
  itemMerchant: { fontSize: FontSize.sm },

  // Customize fields
  field: { gap: Spacing.sm },
  fieldLabel: {
    fontSize: FontSize.xs, fontFamily: Fonts.semiBold,
    color: Colors.text.tertiary, letterSpacing: 0.8,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { fontSize: FontSize.sm, color: Colors.primary, fontFamily: Fonts.medium },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 52,
  },
  inputIcon: { marginRight: 2 },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.text.primary, fontFamily: Fonts.regular },

  messageWrap: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, minHeight: 110,
  },
  messageInput: {
    fontSize: FontSize.base, color: Colors.text.primary,
    fontFamily: Fonts.regular, minHeight: 72,
  },
  charCount: { textAlign: 'right', fontSize: FontSize.xs, marginTop: 4 },

  // Theme picker
  themeScroll: { gap: Spacing.sm, paddingVertical: 4 },
  themeCard: {
    width: 84, paddingVertical: 12, borderRadius: Radius.lg,
    alignItems: 'center', gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  themeCardActive: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  themeIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  themeCheck: { position: 'absolute', top: 5, right: 5 },
  themeLabel: { fontSize: FontSize.xs, fontFamily: Fonts.semiBold, color: Colors.text.primary },

  // Delivery
  channelRow: { flexDirection: 'row', gap: Spacing.sm },
  channelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border,
  },
  channelBtnActive: { borderColor: Colors.primary, backgroundColor: '#FFF4F0' },
  channelText: { fontSize: FontSize.sm, fontFamily: Fonts.medium, color: Colors.text.secondary },
  channelTextActive: { color: Colors.primary },

  phoneRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 52,
  },
  flag: { fontSize: 18 },
  countryCodeText: { fontSize: FontSize.base },
  phoneInput: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 52,
    fontSize: FontSize.base, color: Colors.text.primary, fontFamily: Fonts.regular,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hintText: { fontSize: FontSize.xs, flex: 1 },

  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  scheduleLabel: { fontSize: FontSize.base, fontFamily: Fonts.medium },
  schedulePlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    marginTop: -Spacing.sm,
  },
  schedulePlaceholderText: { fontSize: FontSize.sm },

  // Checkout placeholder
  checkoutPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: FontSize.lg },
  continueBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: FontSize.base },
});
