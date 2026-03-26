import { Stack } from 'expo-router';

export default function MerchantAuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
