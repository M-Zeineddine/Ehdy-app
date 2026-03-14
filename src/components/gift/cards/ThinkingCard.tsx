// TODO: Replace with a custom Thinking of You layout (clouds, soft illustration, etc.)
import React from 'react';
import { BaseCard, type CardContentProps } from './BaseCard';
import { GIFT_THEMES } from '@/src/constants/giftThemes';

const theme = GIFT_THEMES.find(t => t.id === 'thinking')!;

interface Props extends CardContentProps {
  cardWidth: number;
  cardHeight: number;
}

export function ThinkingCard(props: Props) {
  return <BaseCard {...props} theme={theme} />;
}
