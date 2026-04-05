import { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { resetPassword } from '@/src/services/authService';
import { i18n } from '@/src/i18n';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleDigit(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
  }

  async function handleReset() {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert(i18n('auth.resetPassword.errorIncompleteCode'), i18n('auth.resetPassword.errorIncompleteCodeMessage'));
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, fullCode, password);
      Alert.alert(i18n('auth.resetPassword.successTitle'), i18n('auth.resetPassword.successMessage'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert(i18n('auth.resetPassword.errorFailed'), err.message ?? i18n('auth.resetPassword.errorFailedMessage'));
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <AppText variant="heading">{i18n('auth.resetPassword.title')}</AppText>
            <AppText variant="body" color={Colors.text.secondary}>
              {i18n('auth.resetPassword.subtitle')}{'\n'}
              <AppText variant="body" semiBold color={Colors.text.primary}>{email}</AppText>
            </AppText>
          </View>

          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={el => { inputs.current[i] = el; }}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                value={digit}
                onChangeText={text => handleDigit(text, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.field}>
            <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.resetPassword.newPasswordLabel')}</AppText>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={i18n('auth.resetPassword.newPasswordPlaceholder')}
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

          <Button
            label={i18n('auth.resetPassword.resetButton')}
            onPress={handleReset}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
            disabled={code.join('').length < 6 || password.length < 8}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  back: { width: 40, height: 40, justifyContent: 'center' },
  header: { marginTop: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.xl },
  codeRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.xl },
  codeInput: {
    width: 48, height: 56,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center', fontSize: 22,
    fontFamily: Fonts.bold, color: Colors.text.primary,
  },
  codeInputFilled: { borderColor: Colors.primary, backgroundColor: '#FFF1EC' },
  field: { gap: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: Fonts.regular, fontSize: 15,
    color: Colors.text.primary,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  submitBtn: { marginTop: Spacing.xl },
});
