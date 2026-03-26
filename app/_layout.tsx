import '@/src/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import { useLanguageStore } from '@/src/store/languageStore';
import { LoadingScreen } from '@/src/components/ui/LoadingScreen';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isAuthenticated: merchantAuth, isLoading: merchantLoading } = useMerchantAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || merchantLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inMerchantAuth = segments[0] === '(merchant-auth)';
    const inMerchantTabs = segments[0] === '(merchant-tabs)';

    // Merchant flow: once logged in, stay in merchant tabs
    if (merchantAuth && inMerchantAuth) {
      router.replace('/(merchant-tabs)/scan');
      return;
    }
    if (merchantAuth && !inMerchantTabs && !inAuth) {
      router.replace('/(merchant-tabs)/scan');
      return;
    }

    // Customer flow
    if (!isAuthenticated && !inAuth && !inMerchantAuth && !inMerchantTabs) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, merchantAuth, merchantLoading, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const { isLoading: authLoading, loadFromStorage } = useAuthStore();
  const { isLoading: merchantAuthLoading, loadFromStorage: loadMerchantFromStorage } = useMerchantAuthStore();
  const { appKey, isRTL, loadLanguage } = useLanguageStore();

  useEffect(() => {
    loadFromStorage();
    loadMerchantFromStorage();
    loadLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);


  if (!fontsLoaded || authLoading || merchantAuthLoading) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* direction prop is a Yoga layout property — cascades immediately to all children
            without requiring a native process restart, unlike I18nManager.forceRTL alone. */}
        <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
          <AuthGate />
          <Stack key={appKey} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(merchant-auth)" />
            <Stack.Screen name="(merchant-tabs)" />
            <Stack.Screen name="merchant/[id]" />
            <Stack.Screen name="gift" />
          </Stack>
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
