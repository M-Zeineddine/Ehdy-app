import { Stack } from 'expo-router';

// A real nested Stack (not flat Tabs.Screens with href:null) so drill-down
// screens get genuine push/pop history — swipe-back and a plain router.back()
// both work correctly, instead of needing hardcoded destinations.
export default function ManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="items" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="branches" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
