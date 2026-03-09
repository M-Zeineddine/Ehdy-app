import React from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/layout';
import { AppText } from '../ui/AppText';
import type { Merchant } from '../../types';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 160;

const FALLBACK_IMAGES: Record<string, string> = {
  default: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=400&q=80',
};

interface MerchantCardProps {
  merchant: Merchant;
  onPress?: () => void;
}

export function MerchantCard({ merchant, onPress }: MerchantCardProps) {
  const image = merchant.cover_image_url ?? FALLBACK_IMAGES.default;
  const rating = merchant.rating ?? 4.5;
  const minPrice = merchant.min_price ?? 50000;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <ImageBackground source={{ uri: image }} style={styles.image} imageStyle={styles.imageStyle}>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color={Colors.star} />
          <AppText style={styles.ratingText}>{rating.toFixed(1)}</AppText>
        </View>
        <View style={styles.overlay}>
          <AppText variant="body" color="#fff" bold style={styles.name} numberOfLines={1}>
            {merchant.name}
          </AppText>
        </View>
      </ImageBackground>
      <View style={styles.info}>
        <AppText variant="caption" numberOfLines={1}>{merchant.description}</AppText>
        <View style={styles.meta}>
          {merchant.location && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={11} color={Colors.text.tertiary} />
              <AppText variant="caption" color={Colors.text.tertiary}>{merchant.location}</AppText>
            </View>
          )}
          <AppText variant="caption" color={Colors.text.secondary} style={{ fontWeight: '600' }}>
            {merchant.currency_code} {(minPrice / 1000).toFixed(0)}K+
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: CARD_WIDTH, borderRadius: Radius.lg, backgroundColor: Colors.card, overflow: 'hidden' },
  image: { width: CARD_WIDTH, height: CARD_HEIGHT },
  imageStyle: { borderRadius: Radius.lg },
  ratingBadge: {
    position: 'absolute', top: Spacing.sm, right: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: Colors.text.primary },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  name: { fontSize: 14 },
  info: { padding: Spacing.sm, gap: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
