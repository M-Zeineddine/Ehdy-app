import { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { useAuthStore } from '@/src/store/authStore';
import { signin } from '@/src/services/authService';
import { normalizeLebanesePhone } from '@/src/utils/phone';
import { i18n } from '@/src/i18n';

type LoginMode = 'email' | 'phone';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!password.trim()) {
      Alert.alert(i18n('auth.login.errorMissingFields'), i18n('auth.login.errorMissingFieldsMessage'));
      return;
    }

    let credentials: { email?: string; phone?: string; password: string };
    if (mode === 'email') {
      if (!email.trim()) {
        Alert.alert(i18n('auth.login.errorMissingFields'), i18n('auth.login.errorMissingFieldsMessage'));
        return;
      }
      credentials = { email: email.trim().toLowerCase(), password };
    } else {
      const normalizedPhone = normalizeLebanesePhone(phone);
      if (!normalizedPhone) {
        Alert.alert(i18n('common.invalidPhoneTitle'), i18n('common.invalidPhoneMessage'));
        return;
      }
      credentials = { phone: normalizedPhone, password };
    }

    setLoading(true);
    try {
      const { user, access_token, refresh_token } = await signin(credentials);
      if (!user.is_email_verified) {
        router.replace({ pathname: '/(auth)/verify-email', params: { email: user.email } });
      } else if (user.phone && !user.is_phone_verified) {
        router.replace({
          pathname: '/(auth)/verify-phone',
          params: { phone: user.phone, access_token, refresh_token, user: JSON.stringify(user) },
        });
      } else {
        await setAuth(user, access_token, refresh_token);
      }
    } catch (err: any) {
      Alert.alert(i18n('auth.login.errorSignInFailed'), err.message ?? i18n('auth.login.errorSignInFailedMessage'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <AppText variant="heading">{i18n('auth.login.title')}</AppText>
            <AppText variant="body" color={Colors.text.secondary}>{i18n('auth.login.subtitle')}</AppText>
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'email' && styles.modeBtnActive]}
              onPress={() => setMode('email')}
            >
              <AppText variant="body" semiBold color={mode === 'email' ? '#fff' : Colors.text.primary}>
                {i18n('auth.login.emailToggle')}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'phone' && styles.modeBtnActive]}
              onPress={() => setMode('phone')}
            >
              <AppText variant="body" semiBold color={mode === 'phone' ? '#fff' : Colors.text.primary}>
                {i18n('auth.login.phoneToggle')}
              </AppText>
            </TouchableOpacity>
          </View>

          {mode === 'email' ? (
            <View style={styles.form}>
              <View style={styles.field}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.login.emailLabel')}</AppText>
                <TextInput
                  style={styles.input}
                  placeholder={i18n('auth.login.emailPlaceholder')}
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.field}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.login.passwordLabel')}</AppText>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder={i18n('auth.login.passwordPlaceholder')}
                    placeholderTextColor={Colors.text.tertiary}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
                <AppText variant="body" color={Colors.primary}>{i18n('auth.login.forgotPassword')}</AppText>
              </TouchableOpacity>

              <Button label={i18n('auth.login.signInButton')} onPress={handleLogin} loading={loading} size="lg" style={styles.submitBtn} />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.login.phoneLabel')}</AppText>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <AppText style={styles.flag}>🇱🇧</AppText>
                    <AppText style={styles.countryCodeText} semiBold>+961</AppText>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={i18n('auth.login.phonePlaceholder')}
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.login.passwordLabel')}</AppText>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder={i18n('auth.login.passwordPlaceholder')}
                    placeholderTextColor={Colors.text.tertiary}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
                <AppText variant="body" color={Colors.primary}>{i18n('auth.login.forgotPassword')}</AppText>
              </TouchableOpacity>

              <Button label={i18n('auth.login.signInButton')} onPress={handleLogin} loading={loading} size="lg" style={styles.submitBtn} />
            </View>
          )}

          <View style={styles.footer}>
            <AppText variant="body" color={Colors.text.secondary}>{i18n('auth.login.noAccount')} </AppText>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <AppText variant="body" color={Colors.primary} semiBold>{i18n('auth.login.createOne')}</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  back: { width: 40, height: 40, justifyContent: 'center' },
  header: { marginTop: Spacing.xl, gap: Spacing.xs, marginBottom: Spacing.xl },
  form: { gap: Spacing.md },
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
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: Spacing.xs },
  submitBtn: { marginTop: Spacing.sm },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md - 4,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  flag: { fontSize: 18 },
  countryCodeText: { fontSize: 15 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: Spacing.xl,
  },
});
