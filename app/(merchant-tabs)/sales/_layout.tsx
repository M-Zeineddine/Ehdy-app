import { Stack } from 'expo-router';

// A real nested Stack (not flat Tabs.Screens with href:null) so drill-down
// screens get genuine push/pop history — swipe-back and a plain router.back()
// both work correctly, instead of needing hardcoded destinations.
export default function SalesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="redemption-history" />
      <Stack.Screen name="purchase-history" />
      <Stack.Screen name="active-codes" />
    </Stack>
  );
}
