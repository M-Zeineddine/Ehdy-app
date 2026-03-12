import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/layout';
import { AppText } from '../ui/AppText';
import type { GiftCard } from '../../types';

const FALLBACK = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80';

interface GiftCardItemProps {
  item: GiftCard;
  onPress?: () => void;
  onAdd?: () => void;
}

export function GiftCardItem({ item, onPress, onAdd }: GiftCardItemProps) {
  const image = item.image_url ?? FALLBACK;
  const displayPrice = item.credit_amount
    ? `${item.currency_code} ${item.credit_amount.toLocaleString()}`
    : item.currency_code + ' —';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.container}>
      <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      <View style={styles.info}>
        <AppText variant="caption" semiBold numberOfLines={2} style={[styles.name, { marginTop: 12 }]}>{item.name}</AppText>
        <View style={styles.row}>
          <AppText variant="price">{displayPrice}</AppText>
          <TouchableOpacity onPress={onAdd} style={styles.addBtn} activeOpacity={0.55}>
            <AppText semiBold style={{ fontSize: 20, color: Colors.primary, lineHeight: 20, includeFontPadding: false, textAlignVertical: 'center' }}>+</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: Radius.lg, backgroundColor: Colors.card, overflow: 'hidden' },
  image: { width: '100%', height: 108 },
  info: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  name: { color: Colors.text.primary, lineHeight: 20, fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: {
    width: 30, height: 30, borderRadius: Radius.full,
    backgroundColor: '#FFF1EC',
    alignItems: 'center', justifyContent: 'center',
  },
});
