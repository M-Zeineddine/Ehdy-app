import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Animated, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { initiateGiftPayment } from '@/src/services/giftService';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts, FontSize } from '@/src/constants/layout';
import { GiftCardPreview } from '@/src/components/gift/GiftCardPreview';
import { GIFT_THEMES } from '@/src/constants/giftThemes';
import { ContactPickerModal } from '@/src/components/gift/ContactPickerModal';

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
      // requestAnimationFrame lets the native thread commit opacity=0 before
      // the new step renders, preventing a 1-frame flicker of the old content
      requestAnimationFrame(() => {
        setStep(next);
        slideAnim.setValue(direction * 60);
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });
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
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'whish'>('card');
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    if (paying) return;
    setPaying(true);
    try {
      const result = await initiateGiftPayment({
        merchant_item_id: isCredit ? undefined : params.itemId,
        store_credit_preset_id: isCredit ? params.itemId : undefined,
        sender_name: fromName,
        recipient_name: toName,
        recipient_phone: phone,
        personal_message: message,
        theme: selectedTheme,
      });
      const browserResult = await WebBrowser.openAuthSessionAsync(result.tap_transaction_url, 'kado://');
      if (browserResult.type === 'success') {
        const url = browserResult.url;
        const params = new URL(url).searchParams;
        const status = params.get('status');
        const tap_id = params.get('tap_id');
        router.replace(`/payment/callback?status=${status ?? ''}&tap_id=${tap_id ?? ''}`);
      }
    } catch (err: any) {
      Alert.alert('Payment failed', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  // ── Back navigation guard ────────────────────────────────────────────────────
  const navigation = useNavigation();
  const isDirty = fromName !== '' || toName !== '' || message !== '' || phone !== '' || selectedTheme !== 'birthday';

  usePreventRemove(isDirty, ({ data }) => {
    Alert.alert(
      'Leave gift?',
      'Your customization will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ]
    );
  });

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
          <AppText style={styles.fieldLabel}>RECIPIENT'S PHONE</AppText>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <AppText style={styles.flag}>🇱🇧</AppText>
              <AppText semiBold style={styles.countryCodeText}>+961</AppText>
            </View>
            <View style={styles.phoneInputWrap}>
              <TextInput
                style={styles.phoneInputInner}
                value={phone}
                onChangeText={setPhone}
                placeholder="3123 456"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                onPress={() => setContactPickerVisible(true)}
                activeOpacity={0.7}
                style={styles.contactIconBtn}
              >
                <Ionicons name="people-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
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

  // ── Step 3: Checkout ────────────────────────────────────────────────────────
  function renderCheckout() {
    const recipientLabel = [toName, phone ? `+961 ${phone}` : null].filter(Boolean).join(' · ');

    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <GiftCardPreview
          themeId={selectedTheme}
          toName={toName}
          fromName={fromName}
          message={message}
          merchantName={params.merchantName ?? ''}
          price={price}
        />

        {/* Payment details */}
        <AppText style={styles.sectionLabel}>PAYMENT DETAILS</AppText>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <AppText color={Colors.text.secondary}>Recipient</AppText>
            <AppText semiBold style={styles.detailValue}>
              {recipientLabel || '—'}
            </AppText>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <AppText semiBold>Total</AppText>
            <AppText semiBold style={styles.detailTotal}>{price}</AppText>
          </View>
        </View>

        {/* Payment method */}
        <AppText style={styles.sectionLabel}>PAYMENT METHOD</AppText>
        <View style={styles.paymentOptions}>
          {([
            { key: 'card', icon: 'card-outline', label: 'Credit / Debit Card' },
            { key: 'whish', icon: 'wallet-outline', label: 'OMT / Whish Money' },
          ] as const).map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.paymentOption, paymentMethod === opt.key && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(opt.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={opt.icon}
                size={22}
                color={paymentMethod === opt.key ? Colors.primary : Colors.text.secondary}
              />
              <AppText
                semiBold={paymentMethod === opt.key}
                style={[styles.paymentLabel, paymentMethod === opt.key && styles.paymentLabelActive]}
              >
                {opt.label}
              </AppText>
              {paymentMethod === opt.key && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed-outline" size={12} color={Colors.text.tertiary} />
          <AppText style={styles.secureText} color={Colors.text.tertiary}>Secure Checkout via SSL</AppText>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
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
            <TouchableOpacity
              onPress={() => s !== step && goToStep(s)}
              activeOpacity={s !== step ? 0.6 : 1}
              disabled={s === step}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                step > s && styles.stepDotDone,
              ]} />
            </TouchableOpacity>
            {i < 2 && (
              <View style={[styles.stepLine, step > s && styles.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <AppText style={styles.stepSubLabel}>Step {step} of 3</AppText>

      {/* Animated step content — KAV wraps only this so bottom bar stays fixed */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View
          style={[styles.animatedContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
        >
          {step === 1 && renderReview()}
          {step === 2 && renderCustomize()}
          {step === 3 && renderCheckout()}
        </Animated.View>
      </KeyboardAvoidingView>

      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onSelect={(selectedPhone, name) => {
          setPhone(selectedPhone);
          setToName(name);
        }}
      />

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.totalRow}>
          <AppText color={Colors.text.secondary}>Total</AppText>
          <AppText semiBold style={styles.totalAmount}>{price}</AppText>
        </View>
        <TouchableOpacity
          style={[styles.continueBtn, paying && styles.continueBtnDisabled]}
          onPress={() => step < 3 ? goToStep(step + 1) : handlePay()}
          activeOpacity={0.8}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText semiBold style={styles.continueBtnText}>
              {step === 3 ? 'Confirm & Pay' : 'Continue'}
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 4,
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
  phoneInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, height: 52,
    paddingLeft: Spacing.md,
  },
  phoneInputInner: {
    flex: 1, fontSize: FontSize.base, color: Colors.text.primary, fontFamily: Fonts.regular,
  },
  contactIconBtn: {
    width: 48, height: 52, alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderLeftColor: Colors.border,
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

  // Checkout
  sectionLabel: {
    fontSize: FontSize.xs, fontFamily: Fonts.semiBold,
    color: Colors.text.tertiary, letterSpacing: 0.8,
  },
  detailsCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  detailValue: { fontSize: FontSize.base, maxWidth: '60%', textAlign: 'right' },
  detailDivider: { height: 1, backgroundColor: Colors.border },
  detailTotal: { fontSize: FontSize.lg, color: Colors.primary },
  paymentOptions: { gap: Spacing.sm },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  paymentOptionActive: { borderColor: Colors.primary },
  paymentLabel: { fontSize: FontSize.base, color: Colors.text.secondary },
  paymentLabelActive: { color: Colors.text.primary },
  secureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingBottom: Spacing.sm,
  },
  secureText: { fontSize: FontSize.xs },

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
  continueBtnDisabled: { opacity: 0.6 },
});
