'use client';

import { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { forgotPassword } from '@/src/services/authService';
import { i18n } from '@/src/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      router.push({ pathname: '/(auth)/reset-password', params: { email: trimmed } });
    } catch (err: any) {
      Alert.alert(i18n('auth.forgotPassword.errorFailed'), err.message ?? i18n('auth.forgotPassword.errorFailedMessage'));
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
            <AppText variant="heading">{i18n('auth.forgotPassword.title')}</AppText>
            <AppText variant="body" color={Colors.text.secondary}>{i18n('auth.forgotPassword.subtitle')}</AppText>
          </View>

          <View style={styles.field}>
            <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.forgotPassword.emailLabel')}</AppText>
            <TextInput
              style={styles.input}
              placeholder={i18n('auth.forgotPassword.emailPlaceholder')}
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Button
            label={loading ? i18n('auth.forgotPassword.sendingButton') : i18n('auth.forgotPassword.sendButton')}
            onPress={handleSend}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
            disabled={!email.trim()}
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
  header: { marginTop: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.xl * 1.5 },
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
  submitBtn: { marginTop: Spacing.xl },
});
