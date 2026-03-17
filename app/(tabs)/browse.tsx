import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { getMerchants, getCategories } from '@/src/services/merchantService';
import { MerchantCard } from '@/src/components/home/MerchantCard';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts, FontSize } from '@/src/constants/layout';
import type { Merchant } from '@/src/types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORY_STYLE_MAP: Record<string, { icon: IconName; color: string; bgColor: string }> = {
  'coffee':               { icon: 'coffee',               color: '#F07856', bgColor: '#FFF0EC' },
  'coffee-cafes':         { icon: 'coffee',               color: '#F07856', bgColor: '#FFF0EC' },
  'dessert':              { icon: 'cake-variant',          color: '#D4709A', bgColor: '#FDF0F6' },
  'desserts':             { icon: 'cake-variant',          color: '#D4709A', bgColor: '#FDF0F6' },
  'sweets':               { icon: 'candy',                 color: '#D4709A', bgColor: '#FDF0F6' },
  'meals':                { icon: 'silverware-fork-knife', color: '#4CAF7D', bgColor: '#EBF7F1' },
  'restaurants':          { icon: 'silverware-fork-knife', color: '#4CAF7D', bgColor: '#EBF7F1' },
  'food-drinks':          { icon: 'food-fork-drink',       color: '#4CAF7D', bgColor: '#EBF7F1' },
  'spa':                  { icon: 'spa',                   color: '#9B7EDE', bgColor: '#F3EEFF' },
  'wellness':             { icon: 'spa',                   color: '#9B7EDE', bgColor: '#F3EEFF' },
  'fashion':              { icon: 'hanger',                color: '#5B9BD5', bgColor: '#EBF3FC' },
  'clothing':             { icon: 'hanger',                color: '#5B9BD5', bgColor: '#EBF3FC' },
  'shopping':             { icon: 'shopping-outline',      color: '#5B9BD5', bgColor: '#EBF3FC' },
  'beauty':               { icon: 'face-woman-shimmer',    color: '#D4709A', bgColor: '#FDF0F6' },
  'entertainment':        { icon: 'music-note',            color: '#E9A84C', bgColor: '#FDF6EC' },
  'experiences':          { icon: 'ticket-outline',        color: '#E9A84C', bgColor: '#FDF6EC' },
};
const FALLBACK_STYLE = { icon: 'tag-outline' as IconName, color: '#F07856', bgColor: '#FFF0EC' };

// ── MerchantGrid ─────────────────────────────────────────────────────────────
// 2-column grid that reuses MerchantCard (designed for horizontal use).
// We render rows of 2 manually so we can use FlatList for virtualization.

const CARD_GAP = Spacing.md;

function MerchantGridItem({ merchant }: { merchant: Merchant }) {
  return (
    <MerchantCard
      merchant={merchant}
      onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: merchant.id } })}
    />
  );
}

// ── Browse Screen ─────────────────────────────────────────────────────────────

export default function BrowseScreen() {
  const { category_id, autofocus } = useLocalSearchParams<{
    category_id?: string;
    autofocus?: string;
  }>();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(category_id ?? null);
  const inputRef = useRef<TextInput>(null);
  const pillScrollRef = useRef<ScrollView>(null);

  // Sync category param when navigating from home while Browse is already mounted.
  // 'all' is used as a sentinel so the param always changes (Expo Router persists
  // tab params, so navigating without a param wouldn't trigger this effect).
  useEffect(() => {
    setActiveCategoryId(!category_id || category_id === 'all' ? null : category_id);
    pillScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [category_id]);

  // Auto-focus search when coming from home search bar tap
  useEffect(() => {
    if (autofocus === '1') {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autofocus]);

  // Debounce search input (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 600);
    return () => clearTimeout(t);
  }, [search]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const {
    data: merchants = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['merchants', 'browse', debouncedSearch, activeCategoryId],
    queryFn: () => getMerchants({
      search: debouncedSearch || undefined,
      category_id: activeCategoryId || undefined,
    }),
  });

  // Float the initially-selected category to the front (from home navigation only).
  // Pills pressed within Browse stay in their original position.
  const sortedCategories = useMemo(() => {
    if (!category_id || category_id === 'all') return categories;
    const active = categories.find(c => c.id === category_id);
    if (!active) return categories;
    return [active, ...categories.filter(c => c.id !== category_id)];
  }, [categories, category_id]);

  // Build 2-column rows for the grid
  const rows = merchants.reduce<Merchant[][]>((acc, m, i) => {
    if (i % 2 === 0) acc.push([m]);
    else acc[acc.length - 1].push(m);
    return acc;
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch('');
    inputRef.current?.focus();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="title">Browse</AppText>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.text.tertiary} />
          <TextInput
            ref={inputRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search merchants..."
            placeholderTextColor={Colors.text.tertiary}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter pills */}
      <ScrollView
        ref={pillScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContent}
        style={styles.pillsScroll}
      >
        {/* All pill */}
        <TouchableOpacity
          onPress={() => setActiveCategoryId(null)}
          activeOpacity={0.6}
          style={[styles.pill, !activeCategoryId && styles.pillActive]}
        >
          <MaterialCommunityIcons
            name="star-four-points"
            size={15}
            color={Colors.primary}
          />
          <AppText numberOfLines={1} style={[styles.pillLabel, !activeCategoryId && styles.pillLabelActive]}>
            All
          </AppText>
        </TouchableOpacity>

        {sortedCategories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          const s = CATEGORY_STYLE_MAP[cat.slug] ?? FALLBACK_STYLE;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setActiveCategoryId(cat.id)}
              activeOpacity={0.6}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <MaterialCommunityIcons name={s.icon} size={15} color={s.color} />
              <AppText numberOfLines={1} style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                {cat.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : isError ? (
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      ) : merchants.length === 0 ? (
        <View style={styles.center}>
          <AppText style={styles.emptyIcon}>🔍</AppText>
          <AppText variant="subheading" style={styles.emptyTitle}>No results</AppText>
          <AppText variant="caption" style={styles.emptySubtitle}>
            {debouncedSearch
              ? `No merchants found for "${debouncedSearch}"`
              : 'No merchants in this category yet.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {row.map(m => <MerchantGridItem key={m.id} merchant={m} />)}
              {row.length === 1 && <View style={styles.rowFiller} />}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },

  searchRow: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.primary,
    padding: 0,
  },

  pillsScroll: { marginBottom: Spacing.md, flexGrow: 0 },
  pillsContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingVertical: 2,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: '#FFF0EC',
    borderColor: Colors.primary,
  },
  pillLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
  },
  pillLabelActive: {
    color: Colors.primary,
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  rowFiller: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: { textAlign: 'center' },
  emptySubtitle: { textAlign: 'center', lineHeight: 20 },
});
