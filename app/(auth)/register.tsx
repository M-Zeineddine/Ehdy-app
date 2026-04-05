import { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { signup } from '@/src/services/authService';
import { i18n } from '@/src/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      Alert.alert(i18n('auth.register.errorMissingFields'), i18n('auth.register.errorMissingFieldsMessage'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(i18n('auth.register.errorWeakPassword'), i18n('auth.register.errorWeakPasswordMessage'));
      return;
    }
    setLoading(true);
    try {
      await signup({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: `+961${phone.trim().replace(/\s/g, '')}`,
      });
      router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim().toLowerCase() } });
    } catch (err: any) {
      if (err.message?.includes('pending verification')) {
        router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim().toLowerCase() } });
        return;
      }
      if (err.message?.includes('Phone verification pending')) {
        router.replace('/(auth)/login');
        return;
      }
      Alert.alert(i18n('auth.register.errorRegistrationFailed'), err.message ?? i18n('common.tryAgain'));
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
            <AppText variant="heading">{i18n('auth.register.title')}</AppText>
            <AppText variant="body" color={Colors.text.secondary}>{i18n('auth.register.subtitle')}</AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.register.firstNameLabel')}</AppText>
                <TextInput
                  style={styles.input}
                  placeholder={i18n('auth.register.firstNamePlaceholder')}
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.register.lastNameLabel')}</AppText>
                <TextInput
                  style={styles.input}
                  placeholder={i18n('auth.register.lastNamePlaceholder')}
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="words"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.register.emailLabel')}</AppText>
              <TextInput
                style={styles.input}
                placeholder={i18n('auth.register.emailPlaceholder')}
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.register.passwordLabel')}</AppText>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={i18n('auth.register.passwordPlaceholder')}
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

            <View style={styles.field}>
              <AppText variant="label" color={Colors.text.secondary}>{i18n('auth.register.phoneLabel')}</AppText>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <AppText style={styles.flag}>🇱🇧</AppText>
                  <AppText style={styles.countryCodeText} semiBold>+961</AppText>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={i18n('auth.register.phonePlaceholder')}
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <AppText style={styles.hint} color={Colors.text.tertiary}>{i18n('auth.register.phoneHint')}</AppText>
            </View>

            <Button label={i18n('auth.register.createAccountButton')} onPress={handleRegister} loading={loading} size="lg" style={styles.submitBtn} />
          </View>

          <View style={styles.footer}>
            <AppText variant="body" color={Colors.text.secondary}>{i18n('auth.register.alreadyHaveAccount')} </AppText>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <AppText variant="body" color={Colors.primary} semiBold>{i18n('auth.register.signIn')}</AppText>
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
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  flag: { fontSize: 18 },
  countryCodeText: { fontSize: 15 },
  hint: { fontSize: 12, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: Spacing.xl,
  },
});
