import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, Switch, KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts, FontSize } from '@/src/constants/layout';

const SCREEN_WIDTH = Dimensions.get('window').width;

type DeliveryChannel = 'whatsapp' | 'sms' | 'email';

const THEMES = [
  { id: 'birthday', label: 'Birthday',  icon: 'gift-outline' as const,                color: '#F07856' },
  { id: 'thankyou', label: 'Thank You', icon: 'heart-circle-outline' as const,        color: '#2ECC71' },
  { id: 'love',     label: 'Love',      icon: 'heart' as const,                       color: '#E91E63' },
  { id: 'thinking', label: 'Thinking',  icon: 'chatbubble-ellipses-outline' as const, color: '#9B59B6' },
  { id: 'congrats', label: 'Congrats',  icon: 'trophy-outline' as const,              color: '#F0A500' },
  { id: 'sorry',    label: 'Sorry',     icon: 'sad-outline' as const,                 color: '#3498DB' },
];

const CHANNEL_OPTIONS: { id: DeliveryChannel; label: string; icon: any }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'sms',      label: 'SMS',      icon: 'chatbubble-outline' },
  { id: 'email',    label: 'Email',    icon: 'mail-outline' },
];

const STEP_TITLES = ['Review Gift', 'Customize', 'Checkout'];

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

  // ── Step state ──────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  function goToStep(next: number) {
    const direction = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: direction * -60, duration: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,               duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(direction * 60);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  function handleBack() {
    if (step === 1) router.back();
    else goToStep(step - 1);
  }

  // ── Form state (persists across steps) ──────────────────────
  const [fromName,       setFromName]       = useState('');
  const [toName,         setToName]         = useState('');
  const [message,        setMessage]        = useState('');
  const [selectedTheme,  setSelectedTheme]  = useState('birthday');
  const [channel,        setChannel]        = useState<DeliveryChannel>('whatsapp');
  const [phone,          setPhone]          = useState('');
  const [scheduleEnabled,setScheduleEnabled]= useState(false);

  // ── Step 1: Review ───────────────────────────────────────────
  function renderReview() {
    const FALLBACK = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80';
    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.itemCard}>
          <View style={styles.itemImageWrap}>
            {isCredit ? (
              params.merchantLogo ? (
                <Image source={{ uri: params.merchantLogo }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImage, styles.itemImageFallback]}>
                  <AppText style={{ fontSize: 28 }}>🏪</AppText>
                </View>
              )
            ) : (
              <Image
                source={{ uri: params.itemImage || FALLBACK }}
                style={styles.itemImage}
                resizeMode="cover"
              />
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
        {/* Future: additional bundle items listed here */}
      </ScrollView>
    );
  }

  // ── Step 2: Customize ────────────────────────────────────────
  function renderCustomize() {
    return (
      <ScrollView
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* FROM */}
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

        {/* TO */}
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

        {/* MESSAGE */}
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

        {/* THEME */}
        <View style={styles.field}>
          <View style={styles.rowBetween}>
            <AppText style={styles.fieldLabel}>SELECT THEME</AppText>
            <TouchableOpacity activeOpacity={0.6}>
              <AppText style={styles.viewAll}>View all</AppText>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeScroll}>
            {THEMES.map(theme => {
              const active = selectedTheme === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[styles.themeCard, active && styles.themeCardActive]}
                  onPress={() => setSelectedTheme(theme.id)}
                  activeOpacity={0.7}
                >
                  {active && (
                    <View style={styles.themeCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    </View>
                  )}
                  <Ionicons name={theme.icon} size={28} color={theme.color} />
                  <AppText style={styles.themeLabel}>{theme.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* DELIVERY CHANNEL */}
        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>DELIVERY CHANNEL</AppText>
          <View style={styles.channelRow}>
            {CHANNEL_OPTIONS.map(opt => {
              const active = channel === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.channelBtn, active && styles.channelBtnActive]}
                  onPress={() => setChannel(opt.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon} size={16} color={active ? Colors.primary : Colors.text.secondary} />
                  <AppText style={[styles.channelText, active && styles.channelTextActive]}>
                    {opt.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* RECEIVER CONTACT */}
        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>
            {channel === 'email' ? "RECEIVER'S EMAIL" : "RECEIVER'S NUMBER"}
          </AppText>
          {channel === 'email' ? (
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="email@example.com"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          ) : (
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
          )}
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.text.tertiary} />
            <AppText style={styles.hintText} color={Colors.text.tertiary}>
              The recipient will receive a link to redeem their gift.
            </AppText>
          </View>
        </View>

        {/* SCHEDULE */}
        <View style={styles.scheduleRow}>
          <AppText style={styles.scheduleLabel}>Schedule Delivery</AppText>
          <Switch
            value={scheduleEnabled}
            onValueChange={setScheduleEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {scheduleEnabled && (
          <View style={styles.schedulePlaceholder}>
            <Ionicons name="calendar-outline" size={18} color={Colors.text.tertiary} />
            <AppText style={styles.schedulePlaceholderText} color={Colors.text.tertiary}>
              Date & time picker coming soon
            </AppText>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Step 3: Checkout placeholder ────────────────────────────
  function renderCheckout() {
    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.checkoutPlaceholder}>
          <Ionicons name="card-outline" size={48} color={Colors.text.tertiary} />
          <AppText style={styles.checkoutPlaceholderText} color={Colors.text.tertiary}>
            Checkout coming soon
          </AppText>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.6} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{STEP_TITLES[step - 1]}</AppText>
        <View style={styles.backBtn} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s, i) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive, step > s && styles.stepDotDone]} />
            {i < 2 && (
              <View style={[styles.stepLine, step > s && styles.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <AppText style={styles.stepLabel}>Step {step} of 3</AppText>

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
          <AppText style={styles.totalLabel} color={Colors.text.secondary}>Total</AppText>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontFamily: Fonts.semiBold },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl * 2,
    marginTop: Spacing.xs,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.border,
  },
  stepDotActive: { backgroundColor: Colors.primary, width: 24, borderRadius: 5 },
  stepDotDone:   { backgroundColor: Colors.primary, opacity: 0.4 },
  stepLine:      { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineDone:  { backgroundColor: Colors.primary, opacity: 0.4 },
  stepLabel: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 6,
    marginBottom: Spacing.md,
    fontFamily: Fonts.regular,
  },

  animatedContainer: { flex: 1 },

  stepContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.lg },

  // Review step — item card
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemImageWrap: { width: 110, alignSelf: 'stretch' },
  itemImage:     { width: '100%', height: '100%' },
  itemImageFallback: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
    justifyContent: 'center',
  },
  itemName:     { fontSize: FontSize.base, lineHeight: 22 },
  itemDesc:     { fontSize: FontSize.sm, lineHeight: 18 },
  itemPrice:    { fontSize: FontSize.base, color: Colors.primary, marginTop: 2 },
  itemMerchant: { fontSize: FontSize.sm },

  // Customize step — fields
  field: { gap: Spacing.sm },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { fontSize: FontSize.sm, color: Colors.primary, fontFamily: Fonts.medium },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.sm,
  },
  inputIcon: { marginRight: 2 },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    fontFamily: Fonts.regular,
  },
  messageWrap: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 110,
  },
  messageInput: {
    fontSize: FontSize.base,
    color: Colors.text.primary,
    fontFamily: Fonts.regular,
    minHeight: 72,
  },
  charCount: { textAlign: 'right', fontSize: FontSize.xs, marginTop: 4 },

  themeScroll: { gap: Spacing.sm, paddingVertical: 4 },
  themeCard: {
    width: 80, height: 88,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeCardActive: { borderColor: Colors.primary, backgroundColor: '#FFF4F0' },
  themeCheck: { position: 'absolute', top: 6, right: 6 },
  themeLabel: { fontSize: FontSize.xs, fontFamily: Fonts.medium, color: Colors.text.secondary },

  channelRow: { flexDirection: 'row', gap: Spacing.sm },
  channelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border,
  },
  channelBtnActive: { borderColor: Colors.primary, backgroundColor: '#FFF4F0' },
  channelText:       { fontSize: FontSize.sm, fontFamily: Fonts.medium, color: Colors.text.secondary },
  channelTextActive: { color: Colors.primary },

  phoneRow:      { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 52,
  },
  flag:            { fontSize: 18 },
  countryCodeText: { fontSize: FontSize.base },
  phoneInput: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 52,
    fontSize: FontSize.base, color: Colors.text.primary, fontFamily: Fonts.regular,
  },
  hintRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
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
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, paddingTop: 80,
  },
  checkoutPlaceholderText: { fontSize: FontSize.base },

  // Bottom bar
  bottomBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:  { fontSize: FontSize.base },
  totalAmount: { fontSize: FontSize.lg },
  continueBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: FontSize.base },
});
