import React, { useState } from 'react';
import {
  ScrollView, View, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/layout';
import { getMerchants } from '@/src/services/merchantService';

import { HomeHeader } from '@/src/components/home/HomeHeader';
import { FeaturedBanner } from '@/src/components/home/FeaturedBanner';
import { CategoryRow } from '@/src/components/home/CategoryRow';
import { MerchantCard } from '@/src/components/home/MerchantCard';
import { GiftCardItem } from '@/src/components/home/GiftCardItem';
import { SectionHeader } from '@/src/components/home/SectionHeader';
import { SearchBar } from '@/src/components/ui/SearchBar';
import type { GiftCard, Merchant } from '@/src/types';

// Placeholder gift card data until purchases/gift cards endpoint is wired
const MOCK_GIFTS: GiftCard[] = [
  {
    id: '1', merchant_id: '', merchant_name: 'Patchi',
    name: 'Patchi Box', description: '', type: 'gift_item',
    amount: 2500000, currency_code: 'LBP',
    image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80',
  },
  {
    id: '2', merchant_id: '', merchant_name: 'Bliss House',
    name: 'Spa Day', description: '', type: 'gift_item',
    amount: 4500000, currency_code: 'LBP',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80',
  },
  {
    id: '3', merchant_id: '', merchant_name: 'Cafe Younes',
    name: 'Coffee Bundle', description: '', type: 'store_credit',
    amount: 150000, currency_code: 'LBP',
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  },
  {
    id: '4', merchant_id: '', merchant_name: 'Em Sherif',
    name: 'Dinner for Two', description: '', type: 'gift_item',
    amount: 8000000, currency_code: 'LBP',
    image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
  },
];

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: merchants = [], refetch } = useQuery({
    queryKey: ['merchants'],
    queryFn: () => getMerchants({ limit: 10 }),
  });

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Chunk gifts into rows of 2
  const giftRows = MOCK_GIFTS.reduce<GiftCard[][]>((rows, item, i) => {
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
          <HomeHeader firstName="Mohammad" onNotificationPress={() => { }} unreadCount={2} />
        </View>

        {/* Search */}
        <View style={styles.section}>
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
            <View style={[styles.section, styles.sectionHeader]}>
              <SectionHeader title="Featured Merchants" onSeeAll={() => router.push('/browse')} />
            </View>
            <FlatList
              data={merchants}
              keyExtractor={(m: Merchant) => m.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: Spacing.sm }} />}
              renderItem={({ item }: { item: Merchant }) => (
                <MerchantCard merchant={item} onPress={() => { }} />
              )}
            />
          </>
        )}

        {/* Popular Gifts */}
        <View style={[styles.section, styles.sectionHeader, { marginTop: 20 }]}>
          <SectionHeader title="Popular Gifts" onSeeAll={() => { }} />
        </View>
        <View style={styles.section}>
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
