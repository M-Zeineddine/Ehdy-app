import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

import { Radius } from '@/src/constants/layout';
import { BirthdayCard } from './cards/BirthdayCard';
import { ThankYouCard } from './cards/ThankYouCard';
import { LoveCard } from './cards/LoveCard';
import { ThinkingCard } from './cards/ThinkingCard';
import { CongratsCard } from './cards/CongratsCard';
import { SorryCard } from './cards/SorryCard';
import type { CardContentProps } from './cards/BaseCard';

const CARD_WIDTH = Dimensions.get('window').width - 32;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.58);

// ── Registry: add a new theme by adding one line here ───────────────────────
type CardRenderer = (props: CardContentProps & { cardWidth: number; cardHeight: number }) => React.ReactElement;

const CARD_REGISTRY: Record<string, CardRenderer> = {
  birthday:  (props) => <BirthdayCard {...props} />,
  thankyou:  (props) => <ThankYouCard {...props} />,
  love:      (props) => <LoveCard {...props} />,
  thinking:  (props) => <ThinkingCard {...props} />,
  congrats:  (props) => <CongratsCard {...props} />,
  sorry:     (props) => <SorryCard {...props} />,
};

export interface GiftCardPreviewProps extends CardContentProps {
  themeId: string;
}

export function GiftCardPreview({ themeId, ...contentProps }: GiftCardPreviewProps) {
  const render = CARD_REGISTRY[themeId] ?? CARD_REGISTRY.birthday;

  return (
    <View style={styles.shadowWrap}>
      {render({ ...contentProps, cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT })}
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: Radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
});
