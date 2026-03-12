import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/layout';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <AppText variant="title" style={styles.logo}>kado</AppText>
        <AppText variant="body" color={Colors.text.secondary} style={styles.tagline}>
          Give gifts they'll actually love
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button label="Create Account" onPress={() => router.push('/(auth)/register')} size="lg" />
        <Button
          label="Sign In"
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    fontSize: 56,
    color: Colors.primary,
    letterSpacing: -2,
  },
  tagline: {
    textAlign: 'center',
  },
  actions: {
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
});
