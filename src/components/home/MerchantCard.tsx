import React from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/layout';
import { AppText } from '../ui/AppText';
import type { Merchant } from '../../types';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 120;

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=400&q=80';

interface MerchantCardProps {
  merchant: Merchant;
  onPress?: () => void;
}

export function MerchantCard({ merchant, onPress }: MerchantCardProps) {
  const image = merchant.banner_image_url ?? FALLBACK_IMAGE;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
      <ImageBackground source={{ uri: image }} style={styles.image} imageStyle={styles.imageStyle}>
        <View style={styles.overlay}>
          <AppText variant="body" color="#fff" bold style={styles.name} numberOfLines={1}>
            {merchant.name}
          </AppText>
        </View>
      </ImageBackground>
      <View style={[styles.info, { marginTop: 0 }]}>
        <AppText variant="caption" numberOfLines={1}>{merchant.description}</AppText>
        <View style={[styles.meta, { marginTop: Spacing.sm }]}>
          {merchant.city && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={11} color={Colors.text.tertiary} />
              <AppText variant="caption" color={Colors.text.tertiary}>{merchant.city}</AppText>
            </View>
          )}
          <AppText variant="caption" color={Colors.text.secondary} style={{ fontWeight: '600' }}>
            {merchant.category_name}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: CARD_WIDTH, borderRadius: Radius.lg, backgroundColor: Colors.card, overflow: 'hidden' },
  image: { width: CARD_WIDTH, height: CARD_HEIGHT },
  imageStyle: {},
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
