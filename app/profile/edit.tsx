import { useState, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts, FontSize } from '@/src/constants/layout';
import { useAuthStore } from '@/src/store/authStore';
import {
  uploadAvatar, updateProfile, sendPhoneOtp, verifyPhoneOtp,
} from '@/src/services/authService';
import { normalizeLebanesePhone } from '@/src/utils/phone';
import { i18n } from '@/src/i18n';

function toLocalPhone(phone?: string | null): string {
  if (!phone) return '';
  return phone.startsWith('+961') ? phone.slice(4) : phone;
}

// Accepts YYYY-MM-DD and rejects anything that isn't a real calendar date
// (e.g. 2024-02-30) rather than just pattern-matching the shape.
function isValidDob(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [phone, setPhone] = useState(toLocalPhone(user?.phone));
  const [dob, setDob] = useState(user?.date_of_birth ? user.date_of_birth.slice(0, 10) : '');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removeVisible, setRemoveVisible] = useState(false);

  // Phone re-verification (OTP), triggered after a save that changed the number
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const otpInputs = useRef<(TextInput | null)[]>([]);

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  async function pickAndUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n('editProfile.permissionTitle'), i18n('editProfile.permissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const updated = await uploadAvatar(result.assets[0].uri);
      await setUser(updated);
    } catch (err: any) {
      Alert.alert(i18n('editProfile.uploadFailedTitle'), err.message ?? i18n('editProfile.uploadFailedMessage'));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setRemoveVisible(false);
    setUploading(true);
    try {
      const updated = await updateProfile({ profile_picture_url: null });
      await setUser(updated);
    } catch (err: any) {
      Alert.alert(i18n('editProfile.removeFailedTitle'), err.message ?? i18n('editProfile.removeFailedMessage'));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert(i18n('editProfile.errorMissingFields'), i18n('editProfile.errorMissingFieldsMessage'));
      return;
    }
    if (dob.trim() && !isValidDob(dob.trim())) {
      Alert.alert(i18n('editProfile.invalidDobTitle'), i18n('editProfile.invalidDobMessage'));
      return;
    }

    let normalizedPhone = user?.phone ?? null;
    const phoneChanged = phone.trim() !== toLocalPhone(user?.phone);
    if (phoneChanged) {
      normalizedPhone = normalizeLebanesePhone(phone);
      if (!normalizedPhone) {
        Alert.alert(i18n('common.invalidPhoneTitle'), i18n('common.invalidPhoneMessage'));
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob.trim() || null,
        ...(phoneChanged ? { phone: normalizedPhone } : {}),
      });
      await setUser(updated);

      if (phoneChanged && normalizedPhone) {
        // Backend just reset is_phone_verified to false for the new number —
        // send the OTP immediately so the user isn't left half-verified.
        setOtpPhone(normalizedPhone);
        setOtpCode(['', '', '', '', '', '']);
        try {
          await sendPhoneOtp(normalizedPhone);
          setOtpVisible(true);
        } catch (err: any) {
          Alert.alert(i18n('editProfile.otpSendFailedTitle'), err.message ?? i18n('common.tryAgain'));
        }
      } else {
        Alert.alert(i18n('editProfile.savedTitle'), i18n('editProfile.savedMessage'));
      }
    } catch (err: any) {
      Alert.alert(i18n('editProfile.saveFailedTitle'), err.message ?? i18n('editProfile.saveFailedMessage'));
    } finally {
      setSaving(false);
    }
  }

  function handleOtpDigit(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpCode];
    next[index] = digit;
    setOtpCode(next);
    if (digit && index < 5) otpInputs.current[index + 1]?.focus();
    if (!digit && index > 0) otpInputs.current[index - 1]?.focus();
  }

  async function handleVerifyOtp() {
    const fullCode = otpCode.join('');
    if (fullCode.length < 6) {
      Alert.alert(i18n('editProfile.errorIncompleteCode'), i18n('editProfile.errorIncompleteCodeMessage'));
      return;
    }
    setOtpLoading(true);
    try {
      await verifyPhoneOtp(otpPhone, fullCode);
      if (user) await setUser({ ...user, phone: otpPhone, is_phone_verified: true });
      setOtpVisible(false);
      Alert.alert(i18n('editProfile.savedTitle'), i18n('editProfile.savedMessage'));
    } catch (err: any) {
      Alert.alert(i18n('editProfile.errorVerificationFailed'), err.message ?? i18n('editProfile.errorVerificationFailedMessage'));
      setOtpCode(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    setOtpResending(true);
    try {
      await sendPhoneOtp(otpPhone);
    } catch (err: any) {
      Alert.alert(i18n('editProfile.otpSendFailedTitle'), err.message ?? i18n('common.tryAgain'));
    } finally {
      setOtpResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="title" style={{ flex: 1 }}>{i18n('editProfile.title')}</AppText>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrap} onPress={pickAndUpload} activeOpacity={0.8} disabled={uploading}>
              {user?.profile_picture_url ? (
                <Image source={{ uri: user.profile_picture_url }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback]}>
                  <AppText style={styles.avatarText}>{initials}</AppText>
                </View>
              )}
              <View style={styles.cameraBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.changeBtn} onPress={pickAndUpload} activeOpacity={0.7} disabled={uploading}>
              <AppText variant="body" color={Colors.primary} semiBold>{i18n('editProfile.changePhoto')}</AppText>
            </TouchableOpacity>

            {user?.profile_picture_url ? (
              <TouchableOpacity style={styles.removeBtn} onPress={() => setRemoveVisible(true)} activeOpacity={0.7} disabled={uploading}>
                <AppText variant="body" color="#E53E3E">{i18n('editProfile.removePhoto')}</AppText>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('editProfile.firstNameLabel')}</AppText>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('editProfile.lastNameLabel')}</AppText>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>
            </View>

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>{i18n('editProfile.emailLabel')}</AppText>
              <View style={[styles.input, styles.inputDisabled]}>
                <AppText color={Colors.text.tertiary}>{user?.email}</AppText>
              </View>
            </View>

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>{i18n('editProfile.phoneLabel')}</AppText>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <AppText style={styles.flag}>🇱🇧</AppText>
                  <AppText style={styles.countryCodeText} semiBold>+961</AppText>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={i18n('editProfile.phonePlaceholder')}
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <AppText style={styles.hint} color={Colors.text.tertiary}>{i18n('editProfile.phoneHint')}</AppText>
            </View>

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>{i18n('editProfile.dobLabel')}</AppText>
              <TextInput
                style={styles.input}
                placeholder={i18n('editProfile.dobPlaceholder')}
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="numbers-and-punctuation"
                value={dob}
                onChangeText={setDob}
                maxLength={10}
              />
            </View>

            <Button
              label={i18n('editProfile.saveButton')}
              onPress={handleSave}
              loading={saving}
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={removeVisible}
        title={i18n('editProfile.removeConfirmTitle')}
        message={i18n('editProfile.removeConfirmMessage')}
        onDismiss={() => setRemoveVisible(false)}
        actions={[
          { text: i18n('common.cancel'), style: 'cancel', onPress: () => setRemoveVisible(false) },
          { text: i18n('editProfile.removePhoto'), style: 'destructive', onPress: removePhoto },
        ]}
      />

      {/* Phone re-verification — mirrors (auth)/verify-phone.tsx's flow, but
          completes by updating the already-authenticated user in place
          instead of setAuth (there's no fresh token pair to install here). */}
      <Modal visible={otpVisible} transparent animationType="fade" onRequestClose={() => setOtpVisible(false)}>
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <AppText variant="heading" style={{ textAlign: 'center' }}>{i18n('editProfile.verifyPhoneTitle')}</AppText>
            <AppText variant="body" color={Colors.text.secondary} style={{ textAlign: 'center', marginTop: Spacing.xs }}>
              {i18n('editProfile.verifyPhoneMessage', { phone: otpPhone })}
            </AppText>

            <View style={styles.codeRow}>
              {otpCode.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={el => { otpInputs.current[i] = el; }}
                  style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                  value={digit}
                  onChangeText={text => handleOtpDigit(text, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <Button
              label={i18n('editProfile.verifyButton')}
              onPress={handleVerifyOtp}
              loading={otpLoading}
              size="lg"
              style={{ marginTop: Spacing.lg }}
              disabled={otpCode.join('').length < 6}
            />
            <TouchableOpacity onPress={handleResendOtp} disabled={otpResending} style={styles.resendBtn}>
              <AppText variant="body" color={otpResending ? Colors.text.tertiary : Colors.primary} semiBold>
                {otpResending ? i18n('editProfile.sendingButton') : i18n('editProfile.resendButton')}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOtpVisible(false)} style={styles.resendBtn}>
              <AppText variant="body" color={Colors.text.tertiary}>{i18n('editProfile.verifyLaterButton')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarWrap: { width: 100, height: 100 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  changeBtn: { marginTop: Spacing.md, padding: Spacing.sm },
  removeBtn: { marginTop: Spacing.xs, padding: Spacing.sm },

  form: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  field: { gap: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text.primary,
  },
  inputDisabled: { backgroundColor: Colors.background },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  flag: { fontSize: 18 },
  countryCodeText: { fontSize: 15 },
  hint: { fontSize: FontSize.xs, marginTop: 2 },
  submitBtn: { marginTop: Spacing.sm },

  otpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  otpCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  codeRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.xl },
  codeInput: {
    width: 44,
    height: 52,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF1EC',
  },
  resendBtn: { alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm },
});
