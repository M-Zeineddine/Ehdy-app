// TODO: Replace with a custom Thank You layout (sparkles, elegant typography, etc.)
import React from 'react';
import { BaseCard, type CardContentProps } from './BaseCard';
import { GIFT_THEMES } from '@/src/constants/giftThemes';

const theme = GIFT_THEMES.find(t => t.id === 'thankyou')!;

interface Props extends CardContentProps {
  cardWidth: number;
  cardHeight: number;
}

export function ThankYouCard(props: Props) {
  return <BaseCard {...props} theme={theme} />;
}
