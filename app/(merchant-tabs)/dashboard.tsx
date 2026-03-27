import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius } from '@/src/constants/layout';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';
import { getMerchantDashboard } from '@/src/services/merchantPortalService';

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <AppText variant="caption" color={Colors.text.secondary}>{label}</AppText>
      <AppText variant="heading" style={styles.statValue}>{value}</AppText>
      {sub && <AppText variant="caption" color={Colors.text.tertiary}>{sub}</AppText>}
    </View>
  );
}

export default function MerchantDashboardScreen() {
  const { merchantUser } = useMerchantAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: getMerchantDashboard,
    refetchInterval: 60_000, // auto-refresh every minute
  });

  const formatAmount = (amount: number, currency: string) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ${currency}`;
    return `${amount.toLocaleString()} ${currency}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <AppText variant="heading">Dashboard</AppText>
            <AppText variant="caption" color={Colors.text.secondary}>
              {merchantUser?.merchant_name}
            </AppText>
          </View>
          <View style={styles.roleBadge}>
            <AppText variant="caption" color={Colors.primary} semiBold>
              {merchantUser?.role === 'owner' ? 'Owner' : 'Staff'}
            </AppText>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <AppText variant="body" color={Colors.text.tertiary}>Loading stats...</AppText>
          </View>
        ) : (
          <>
            {/* Today */}
            <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>
              TODAY
            </AppText>
            <View style={styles.statsGrid}>
              <StatCard
                icon="checkmark-circle"
                label="Redemptions"
                value={String(data?.today.redemptions ?? 0)}
              />
              <StatCard
                icon="cash"
                label="Revenue"
                value={formatAmount(data?.today.revenue ?? 0, 'USD')}
              />
            </View>

            {/* This Month */}
            <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>
              THIS MONTH
            </AppText>
            <View style={styles.statsGrid}>
              <StatCard
                icon="checkmark-circle"
                label="Redemptions"
                value={String(data?.month.redemptions ?? 0)}
              />
              <StatCard
                icon="cash"
                label="Revenue"
                value={formatAmount(data?.month.revenue ?? 0, 'USD')}
              />
            </View>

            {/* Active Codes */}
            <View style={styles.activeCodesCard}>
              <Ionicons name="ticket-outline" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" semiBold>{data?.active_codes ?? 0} active gift codes</AppText>
                <AppText variant="caption" color={Colors.text.secondary}>
                  Unredeemed codes valid today
                </AppText>
              </View>
            </View>

            {/* Recent Redemptions */}
            {(data?.recent_redemptions?.length ?? 0) > 0 && (
              <>
                <AppText variant="label" color={Colors.text.secondary} style={styles.sectionLabel}>
                  RECENT REDEMPTIONS
                </AppText>
                <View style={styles.recentList}>
                  {data!.recent_redemptions.map((r, i) => (
                    <View key={i} style={styles.recentItem}>
                      <View style={styles.recentIcon}>
                        <Ionicons name="checkmark" size={14} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body">{r.redemption_code}</AppText>
                        <AppText variant="caption" color={Colors.text.secondary}>
                          {new Date(r.redeemed_at).toLocaleString()}
                        </AppText>
                      </View>
                      {r.redeemed_amount != null && (
                        <AppText variant="body" semiBold color={Colors.primary}>
                          {r.redeemed_amount.toLocaleString()} {r.currency_code}
                        </AppText>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  roleBadge: {
    backgroundColor: '#FFF0EC',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  loadingRow: { paddingVertical: Spacing.xl, alignItems: 'center' },
  sectionLabel: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 22 },
  activeCodesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  recentList: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
