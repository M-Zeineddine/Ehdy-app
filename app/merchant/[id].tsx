import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Linking, Share, TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMerchant } from '@/src/services/merchantService';
import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import type { GiftCard } from '@/src/types';

const BANNER_HEIGHT = 210;
const LOGO_SIZE = 80;

type Tab = 'items' | 'credit';

export default function MerchantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('items');
  const [customAmount, setCustomAmount] = useState('');

  const { data: merchant, isLoading } = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => getMerchant(id),
    enabled: !!id,
  });

  const allCards: GiftCard[] = (merchant as any)?.gift_cards ?? [];
  const giftItems = allCards.filter(gc => gc.type === 'gift_item');
  const storeCredits = allCards.filter(gc => gc.type === 'store_credit');

  // Items tab shows gift_item cards; falls back to all cards if none
  const itemsToShow = giftItems.length > 0 ? giftItems : allCards;

  function toRows(cards: GiftCard[]) {
    return cards.reduce<GiftCard[][]>((rows, item, i) => {
      if (i % 2 === 0) rows.push([item]);
      else rows[rows.length - 1].push(item);
      return rows;
    }, []);
  }

  function handleCall() {
    const phone = (merchant as any)?.contact_phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  function handleMap() {
    const q = encodeURIComponent(`${merchant?.name ?? ''} ${merchant?.city ?? 'Beirut'}`);
    Linking.openURL(`https://maps.google.com/?q=${q}`);
  }

  async function handleShare() {
    await Share.share({ message: `Check out ${merchant?.name} on Kado!` });
  }

  return (
    <View style={styles.root}>
      {/* Floating back button */}
      <TouchableOpacity
        style={[styles.floatBtn, { top: insets.top + 8, left: Spacing.md }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
      </TouchableOpacity>

      {/* Floating top-right buttons */}
      <View style={[styles.topRight, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.floatBtn} activeOpacity={0.8}>
          <Ionicons name="search-outline" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatBtn} activeOpacity={0.8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : !merchant ? null : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Banner + overlapping logo */}
          <View style={{ marginBottom: LOGO_SIZE / 2 }}>
            <Image
              source={{ uri: (merchant as any).banner_image_url ?? undefined }}
              style={styles.banner}
              resizeMode="cover"
            />
            <View style={styles.logoWrap}>
              {(merchant as any).logo_url ? (
                <Image
                  source={{ uri: (merchant as any).logo_url }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <AppText variant="heading" color={Colors.primary}>
                    {merchant.name[0]}
                  </AppText>
                </View>
              )}
            </View>
          </View>

          {/* Name + meta */}
          <View style={styles.infoSection}>
            <AppText style={styles.merchantName}>{merchant.name}</AppText>
            <View style={styles.metaRow}>
              <AppText variant="caption">{merchant.category_name}</AppText>
              {merchant.city && (
                <>
                  <AppText variant="caption" color={Colors.text.tertiary}> • </AppText>
                  <Ionicons name="location-outline" size={12} color={Colors.text.tertiary} />
                  <AppText variant="caption" color={Colors.text.tertiary}> {merchant.city}</AppText>
                </>
              )}
            </View>
          </View>

          {/* Call / Map / Share */}
          <View style={styles.actionRow}>
            <ActionBtn icon="call-outline" label="Call" onPress={handleCall} />
            <ActionBtn icon="map-outline" label="Map" onPress={handleMap} />
            <ActionBtn icon="share-social-outline" label="Share" onPress={handleShare} />
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, tab === 'items' && styles.tabActive]}
              onPress={() => setTab('items')}
              activeOpacity={0.8}
            >
              <AppText style={[styles.tabText, tab === 'items' && styles.tabTextActive]}>
                Gift Items
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'credit' && styles.tabActive]}
              onPress={() => setTab('credit')}
              activeOpacity={0.8}
            >
              <AppText style={[styles.tabText, tab === 'credit' && styles.tabTextActive]}>
                Store Credit
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Gift Items tab */}
          {tab === 'items' && (
            <View style={styles.tabContent}>
              {itemsToShow.length === 0 ? (
                <AppText variant="caption" color={Colors.text.tertiary} style={styles.empty}>
                  No gift items available yet.
                </AppText>
              ) : (
                toRows(itemsToShow).map((row, i) => (
                  <View key={i} style={styles.giftRow}>
                    {row.map(gift => <GiftCardTile key={gift.id} item={gift} />)}
                    {row.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Store Credit tab */}
          {tab === 'credit' && (
            <View style={styles.tabContent}>
              <AppText variant="body" color={Colors.text.secondary} style={styles.creditDesc}>
                Gift store credit that can be used for anything at this store
              </AppText>

              {/* Quick-select predefined amounts */}
              {storeCredits.length > 0 && (
                <View style={styles.amountChips}>
                  {storeCredits.map(gc => (
                    <TouchableOpacity
                      key={gc.id}
                      style={styles.amountChip}
                      onPress={() => setCustomAmount(String(gc.credit_amount ?? ''))}
                      activeOpacity={0.8}
                    >
                      <AppText semiBold style={{ color: Colors.primary }}>
                        {gc.currency_code} {gc.credit_amount}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Custom amount box */}
              <View style={styles.customBox}>
                <AppText semiBold style={styles.customLabel}>Enter custom amount</AppText>
                <View style={styles.inputRow}>
                  <AppText semiBold color={Colors.text.secondary} style={styles.currencyLabel}>
                    USD
                  </AppText>
                  <TextInput
                    style={styles.amountInput}
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
                <TouchableOpacity style={styles.giftCreditBtn} activeOpacity={0.85}>
                  <AppText semiBold color="#fff">Gift Custom Amount</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <AppText variant="caption" style={{ marginTop: 4 }}>{label}</AppText>
    </TouchableOpacity>
  );
}

function GiftCardTile({ item }: { item: GiftCard }) {
  const FALLBACK = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80';
  const price = item.credit_amount
    ? `${item.currency_code} ${parseFloat(String(item.credit_amount)).toLocaleString()}`
    : `${item.currency_code} —`;

  return (
    <View style={styles.giftCard}>
      <Image source={{ uri: item.image_url ?? FALLBACK }} style={styles.giftImage} resizeMode="cover" />
      <View style={styles.giftInfo}>
        <AppText semiBold numberOfLines={2} style={styles.giftName}>{item.name}</AppText>
        <AppText style={styles.giftPrice}>{price}</AppText>
        <TouchableOpacity style={styles.giftThisBtn} activeOpacity={0.8}>
          <Ionicons name="gift-outline" size={13} color={Colors.primary} />
          <AppText semiBold style={styles.giftThisText}>Gift This</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },

  floatBtn: {
    position: 'absolute', zIndex: 10,
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  topRight: {
    position: 'absolute', right: Spacing.md, zIndex: 10,
    flexDirection: 'row', gap: Spacing.sm,
  },

  banner: { width: '100%', height: BANNER_HEIGHT, backgroundColor: Colors.border },
  logoWrap: {
    position: 'absolute', bottom: -(LOGO_SIZE / 2), alignSelf: 'center',
    width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
    overflow: 'hidden',
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  logoFallback: { backgroundColor: '#FFF0EC', alignItems: 'center', justifyContent: 'center' },

  infoSection: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: 6 },
  merchantName: { fontSize: 22, fontFamily: Fonts.bold, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },

  actionRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionBtn: { alignItems: 'center' },
  actionIconWrap: {
    width: 52, height: 52, borderRadius: Radius.lg,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingBottom: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 15, fontFamily: Fonts.medium, color: Colors.text.secondary },
  tabTextActive: { color: Colors.primary, fontFamily: Fonts.semiBold },

  tabContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  empty: { textAlign: 'center', marginTop: 32 },

  giftRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  giftCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden' },
  giftImage: { width: '100%', height: 130 },
  giftInfo: { padding: Spacing.sm, gap: 6 },
  giftName: { fontSize: 14, lineHeight: 20 },
  giftPrice: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.primary },
  giftThisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#FFF0EC', borderRadius: Radius.md, paddingVertical: 8,
  },
  giftThisText: { fontSize: 13, color: Colors.primary },

  creditDesc: { marginBottom: Spacing.md, lineHeight: 22 },
  amountChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  amountChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.primary, backgroundColor: '#FFF0EC',
  },
  customBox: {
    backgroundColor: '#FDF5F2', borderRadius: Radius.lg,
    padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: '#F0D8D0',
  },
  customLabel: { fontSize: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  currencyLabel: { fontSize: 15 },
  amountInput: {
    flex: 1, fontSize: 18, fontFamily: Fonts.semiBold,
    color: Colors.text.primary, padding: 0,
  },
  giftCreditBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
});
