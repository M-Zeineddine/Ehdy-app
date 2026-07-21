import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Platform } from 'react-native';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconName)}
      size={24}
      color={focused ? Colors.tabBar.active : Colors.tabBar.inactive}
    />
  );
}

export default function MerchantTabLayout() {
  // Per-role visibility (href: null removes a screen from the tab bar):
  //   owner   → Scan, Sales, Manage, Account
  //   manager → Scan, Sales, Account
  //   staff   → Scan, Account (backend 403s sales data for staff)
  const role = useMerchantAuthStore((s) => s.merchantUser?.role);
  const canViewSales = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabBar.active,
        tabBarInactiveTintColor: Colors.tabBar.inactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBar.background,
          borderTopColor: Colors.tabBar.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon name="qr-code" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          href: canViewSales ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          href: isOwner ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
      {/* Owner management sub-screens — reachable by navigation, never tabs */}
      <Tabs.Screen name="manage-items" options={{ href: null }} />
      <Tabs.Screen name="manage-staff" options={{ href: null }} />
      <Tabs.Screen name="manage-branches" options={{ href: null }} />
      <Tabs.Screen name="manage-profile" options={{ href: null }} />
      {/* Sales drill-down sub-screens — reachable by navigation, never tabs */}
      <Tabs.Screen name="redemption-history" options={{ href: null }} />
      <Tabs.Screen name="purchase-history" options={{ href: null }} />
      <Tabs.Screen name="active-codes" options={{ href: null }} />
    </Tabs>
  );
}
