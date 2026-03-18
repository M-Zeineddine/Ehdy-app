import React, { useState } from 'react';
import {
  ScrollView, View, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/layout';
import { getMerchants, getMerchantItems, getRecentlyViewed, getCategories } from '@/src/services/merchantService';
import { useAuthStore } from '@/src/store/authStore';

import { HomeHeader } from '@/src/components/home/HomeHeader';
import { FeaturedBanner } from '@/src/components/home/FeaturedBanner';
import { CategoryRow } from '@/src/components/home/CategoryRow';
import { MerchantCard } from '@/src/components/home/MerchantCard';
import { GiftCardItem } from '@/src/components/home/GiftCardItem';
import { SectionHeader } from '@/src/components/home/SectionHeader';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { i18n } from '@/src/i18n';
import type { Merchant, MerchantItem } from '@/src/types';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: merchants = [], refetch: refetchMerchants } = useQuery({
    queryKey: ['merchants', 'featured'],
    queryFn: () => getMerchants({ featured: true, limit: 10 }),
  });

  const { data: popularItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['merchant-items-popular'],
    queryFn: () => getMerchantItems({ limit: 6 }),
  });

  const { data: recentlyViewed = [], refetch: refetchRecentlyViewed } = useQuery({
    queryKey: ['recently-viewed'],
    queryFn: () => getRecentlyViewed(10),
  });

  const itemRows = popularItems.reduce<MerchantItem[][]>((rows, item, i) => {
    if (i % 2 === 0) rows.push([item]);
    else rows[rows.length - 1].push(item);
    return rows;
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchMerchants(), refetchItems(), refetchRecentlyViewed(), refetchCategories()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.section}>
          <HomeHeader firstName={user?.first_name ?? ''} onNotificationPress={() => { }} unreadCount={0} />
        </View>

        {/* Search — tapping navigates to Browse with keyboard open */}
        <TouchableOpacity
          style={[styles.section, { marginTop: 6 }]}
          onPress={() => router.push('/(tabs)/browse?autofocus=1')}
          activeOpacity={0.85}
        >
          <View pointerEvents="none">
            <SearchBar placeholder={i18n('home.searchPlaceholder')} />
          </View>
        </TouchableOpacity>

        {/* Featured Banner */}
        <View style={styles.section}>
          <FeaturedBanner onPress={() => { }} />
        </View>

        {/* Categories */}
        <View style={[styles.section, styles.sectionHeader, { marginTop: 2 }]}>
          <SectionHeader title={i18n('home.categories')} />
        </View>
        <CategoryRow
          categories={categories}
          onSelect={(id) => {
            router.push(`/(tabs)/browse?category_id=${id}`);
          }}
        />

        {/* Featured Merchants */}
        {merchants.length > 0 && (
          <>
            <View style={[styles.section, styles.sectionHeader, { marginTop: 25 }]}>
              <SectionHeader title={i18n('home.featuredSpots')} onSeeAll={() => router.push('/browse')} />
            </View>
            <FlatList
              data={merchants}
              style={{ marginTop: 10 }}
              keyExtractor={(m: Merchant) => m.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
              renderItem={({ item }: { item: Merchant }) => (
                <MerchantCard merchant={item} onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: item.id } })} />
              )}
            />
          </>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <>
            <View style={[styles.section, styles.sectionHeader, { marginTop: 25 }]}>
              <SectionHeader title={i18n('home.recentlyViewed')} />
            </View>
            <FlatList
              data={recentlyViewed}
              style={{ marginTop: 10 }}
              keyExtractor={(m: Merchant) => m.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
              renderItem={({ item }: { item: Merchant }) => (
                <MerchantCard merchant={item} onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: item.id } })} />
              )}
            />
          </>
        )}

        {/* Popular Gifts */}
        {popularItems.length > 0 && (
          <>
            <View style={[styles.section, styles.sectionHeader, { marginTop: 25 }]}>
              <SectionHeader title={i18n('home.popularGifts')} onSeeAll={() => { }} />
            </View>
            <View style={[styles.section, { marginTop: 10 }]}>
              {itemRows.map((row, i) => (
                <View key={i} style={styles.giftRow}>
                  {row.map(gift => (
                    <GiftCardItem key={gift.id} item={gift} onPress={() => { }} onAdd={() => { }} />
                  ))}
                  {row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionHeader: { marginBottom: Spacing.sm },
  horizontalList: { paddingHorizontal: Spacing.md, paddingBottom: 4 },
  giftRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
});
