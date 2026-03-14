// TODO: Replace with a custom Love layout (floating hearts, romantic typography, etc.)
import React from 'react';
import { BaseCard, type CardContentProps } from './BaseCard';
import { GIFT_THEMES } from '@/src/constants/giftThemes';

const theme = GIFT_THEMES.find(t => t.id === 'love')!;

interface Props extends CardContentProps {
  cardWidth: number;
  cardHeight: number;
}

export function LoveCard(props: Props) {
  return <BaseCard {...props} theme={theme} />;
}
