// TODO: Replace with a custom Sorry layout (soft rain, gentle illustration, etc.)
import React from 'react';
import { BaseCard, type CardContentProps } from './BaseCard';
import { GIFT_THEMES } from '@/src/constants/giftThemes';

const theme = GIFT_THEMES.find(t => t.id === 'sorry')!;

interface Props extends CardContentProps {
  cardWidth: number;
  cardHeight: number;
}

export function SorryCard(props: Props) {
  return <BaseCard {...props} theme={theme} />;
}
