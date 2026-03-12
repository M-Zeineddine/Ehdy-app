import { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { useAuthStore } from '@/src/store/authStore';
import { verifyEmail, resendVerification } from '@/src/services/authService';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { setAuth } = useAuthStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleDigit(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
  }

  async function handleVerify() {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert('Incomplete code', 'Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const { user, access_token, refresh_token } = await verifyEmail(email, fullCode);
      await setAuth(user, access_token, refresh_token);
    } catch (err: any) {
      Alert.alert('Verification failed', err.message ?? 'Invalid or expired code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification(email);
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
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
            <AppText variant="heading">Check your email</AppText>
            <AppText variant="body" color={Colors.text.secondary}>
              We sent a 6-digit code to{'\n'}
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

          <Button
            label="Verify Email"
            onPress={handleVerify}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
            disabled={code.join('').length < 6}
          />

          <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
            <AppText variant="body" color={resending ? Colors.text.tertiary : Colors.primary} semiBold>
              {resending ? 'Sending...' : 'Resend code'}
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  back: { width: 40, height: 40, justifyContent: 'center' },
  header: { marginTop: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.xl * 1.5 },
  codeRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF1EC',
  },
  submitBtn: { marginTop: Spacing.xl },
  resendBtn: { alignItems: 'center', marginTop: Spacing.lg, padding: Spacing.sm },
});
