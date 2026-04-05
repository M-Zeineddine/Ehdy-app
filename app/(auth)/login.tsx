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
import { i18n } from '@/src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(i18n('auth.login.errorMissingFields'), i18n('auth.login.errorMissingFieldsMessage'));
      return;
    }
    setLoading(true);
    try {
      const { user, access_token, refresh_token } = await signin(email.trim().toLowerCase(), password);
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

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)} style={styles.forgotBtn}>
              <AppText variant="body" color={Colors.primary}>{i18n('auth.login.forgotPassword')}</AppText>
            </TouchableOpacity>

            <Button label={i18n('auth.login.signInButton')} onPress={handleLogin} loading={loading} size="lg" style={styles.submitBtn} />
          </View>

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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: Spacing.xl,
  },
});
