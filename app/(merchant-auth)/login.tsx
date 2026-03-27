import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import { merchantLogin } from '@/src/services/merchantPortalService';

export default function MerchantLoginScreen() {
  const router = useRouter();
  const { setAuth } = useMerchantAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { token, merchant_user } = await merchantLogin(email.trim().toLowerCase(), password);
      await setAuth(merchant_user, token);
      // AuthGate will redirect to /(merchant-tabs)
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Please check your credentials and try again.');
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
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                <AppText variant="caption" color={Colors.primary} semiBold>Merchant Portal</AppText>
              </View>
            </View>
            <AppText variant="heading">Staff Sign In</AppText>
            <AppText variant="body" color={Colors.text.secondary}>
              Use your store credentials to access the merchant portal.
            </AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>Email</AppText>
              <TextInput
                style={styles.input}
                placeholder="staff@yourstore.com"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>Password</AppText>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
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

            <Button label="Sign In" onPress={handleLogin} loading={loading} size="lg" style={styles.submitBtn} />
          </View>

          <View style={styles.footer}>
            <AppText variant="caption" color={Colors.text.tertiary} style={{ textAlign: 'center' }}>
              This portal is for merchant staff only.{'\n'}
              Looking to shop?{' '}
            </AppText>
            <TouchableOpacity onPress={() => router.replace('/(auth)/welcome' as any)}>
              <AppText variant="caption" color={Colors.primary}>Go to customer app</AppText>
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
  badgeRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0EC',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
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
  submitBtn: { marginTop: Spacing.sm },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: Spacing.xl,
  },
});
