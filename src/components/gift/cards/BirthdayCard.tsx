// TODO: Replace with a custom Birthday layout (confetti, cake illustration, etc.)
import React from 'react';
import { BaseCard, type CardContentProps } from './BaseCard';
import { GIFT_THEMES } from '@/src/constants/giftThemes';

const theme = GIFT_THEMES.find(t => t.id === 'birthday')!;

interface Props extends CardContentProps {
  cardWidth: number;
  cardHeight: number;
}

export function BirthdayCard(props: Props) {
  return <BaseCard {...props} theme={theme} />;
}
