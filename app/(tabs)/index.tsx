import React, { useState } from 'react';
import {
  ScrollView, View, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/layout';
import { getMerchants, getGiftCards } from '@/src/services/merchantService';
import { useAuthStore } from '@/src/store/authStore';

import { HomeHeader } from '@/src/components/home/HomeHeader';
import { FeaturedBanner } from '@/src/components/home/FeaturedBanner';
import { CategoryRow } from '@/src/components/home/CategoryRow';
import { MerchantCard } from '@/src/components/home/MerchantCard';
import { GiftCardItem } from '@/src/components/home/GiftCardItem';
import { SectionHeader } from '@/src/components/home/SectionHeader';
import { SearchBar } from '@/src/components/ui/SearchBar';
import type { GiftCard, Merchant } from '@/src/types';

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const { data: merchants = [], refetch: refetchMerchants } = useQuery({
    queryKey: ['merchants', 'featured'],
    queryFn: () => getMerchants({ featured: true, limit: 10 }),
  });

  const { data: giftCards = [], refetch: refetchGiftCards } = useQuery({
    queryKey: ['gift-cards-popular'],
    queryFn: () => getGiftCards({ limit: 6 }),
  });

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchMerchants(), refetchGiftCards()]);
    setRefreshing(false);
  }

  // Chunk gift cards into rows of 2
  const giftRows = giftCards.reduce<GiftCard[][]>((rows, item, i) => {
    if (i % 2 === 0) rows.push([item]);
    else rows[rows.length - 1].push(item);
    return rows;
  }, []);

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

        {/* Search */}
        <View style={[styles.section, { marginTop: 6 }]}>
          <SearchBar value={search} onChangeText={setSearch} />
        </View>

        {/* Featured Banner */}
        <View style={styles.section}>
          <FeaturedBanner onPress={() => { }} />
        </View>

        {/* Categories */}
        <View style={[styles.section, styles.sectionHeader, { marginTop: 12 }]}>
          <SectionHeader title="Categories" />
        </View>
        <CategoryRow onSelect={(id) => console.log('category', id)} />

        {/* Featured Merchants */}
        {merchants.length > 0 && (
          <>
            <View style={[styles.section, styles.sectionHeader, { marginTop: 25 }]}>
              <SectionHeader title="Featured Merchants" onSeeAll={() => router.push('/browse')} />
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
                <MerchantCard merchant={item} onPress={() => { }} />
              )}
            />
          </>
        )}

        {/* Popular Gifts */}
        {giftCards.length > 0 && (
          <>
            <View style={[styles.section, styles.sectionHeader, { marginTop: 25 }]}>
              <SectionHeader title="Popular Gifts" onSeeAll={() => { }} />
            </View>
            <View style={[styles.section, { marginTop: 10 }]}>
              {giftRows.map((row, i) => (
                <View key={i} style={styles.giftRow}>
                  {row.map((gift) => (
                    <GiftCardItem
                      key={gift.id}
                      item={gift}
                      onPress={() => { }}
                      onAdd={() => { }}
                    />
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
