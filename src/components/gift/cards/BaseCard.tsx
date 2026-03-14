/**
 * BaseCard — the default gift card layout.
 * Each theme card currently delegates here, but can replace it entirely
 * with a custom layout without touching any other file.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '@/src/components/ui/AppText';
import { Spacing, Radius, Fonts, FontSize } from '@/src/constants/layout';
import type { GiftTheme } from '@/src/constants/giftThemes';

export interface CardContentProps {
  toName: string;
  fromName: string;
  message: string;
  merchantName: string;
  price: string;
}

interface BaseCardProps extends CardContentProps {
  theme: GiftTheme;
  cardWidth: number;
  cardHeight: number;
}

export function BaseCard({ theme, cardWidth, cardHeight, toName, fromName, message, merchantName, price }: BaseCardProps) {
  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { width: cardWidth, height: cardHeight }]}
    >
      {theme.decorations.map((d, i) => (
        <View key={i} style={[styles.decorCircle, d]} />
      ))}

      <View style={styles.content}>
        <View style={styles.top}>
          <AppText style={[styles.forLabel, { color: theme.subtextColor }]}>
            A gift for
          </AppText>
          <AppText style={[styles.recipient, { color: theme.textColor }]} numberOfLines={1}>
            {toName || 'Your Recipient'}
          </AppText>
          {message ? (
            <AppText style={[styles.message, { color: theme.subtextColor }]} numberOfLines={2}>
              "{message}"
            </AppText>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <View>
            <AppText style={[styles.merchant, { color: theme.textColor }]}>
              {merchantName}
            </AppText>
            <AppText style={[styles.price, { color: theme.subtextColor }]}>
              {price}
            </AppText>
          </View>
          {fromName ? (
            <AppText style={[styles.from, { color: theme.subtextColor }]}>
              From {fromName}
            </AppText>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, overflow: 'hidden' },
  decorCircle: { position: 'absolute' },
  content: { flex: 1, padding: Spacing.md, justifyContent: 'space-between' },
  top: { gap: 3 },
  forLabel: {
    fontSize: FontSize.xs, fontFamily: Fonts.medium,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  recipient: { fontSize: FontSize.xl, fontFamily: Fonts.bold, lineHeight: 30 },
  message: {
    fontSize: FontSize.sm, fontFamily: Fonts.regular,
    lineHeight: 18, fontStyle: 'italic', marginTop: 2,
  },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  merchant: { fontSize: FontSize.sm, fontFamily: Fonts.semiBold },
  price: { fontSize: FontSize.xs, fontFamily: Fonts.medium, marginTop: 1 },
  from: { fontSize: FontSize.sm, fontFamily: Fonts.medium },
});
