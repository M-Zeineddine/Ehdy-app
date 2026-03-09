import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontSize, Fonts } from '../../constants/layout';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'price';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  bold?: boolean;
  semiBold?: boolean;
}

export function AppText({ variant = 'body', color, bold, semiBold, style, ...props }: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        bold && styles.bold,
        semiBold && styles.semiBold,
        color ? { color } : undefined,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base:       { color: Colors.text.primary, fontFamily: Fonts.regular },
  bold:       { fontFamily: Fonts.bold },
  semiBold:   { fontFamily: Fonts.semiBold },
  title:      { fontSize: FontSize.xxl, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  heading:    { fontSize: FontSize.xl,  fontFamily: Fonts.bold },
  subheading: { fontSize: FontSize.lg,  fontFamily: Fonts.semiBold },
  body:       { fontSize: FontSize.base, fontFamily: Fonts.regular },
  caption:    { fontSize: FontSize.sm,  fontFamily: Fonts.regular, color: Colors.text.secondary },
  label:      { fontSize: FontSize.xs,  fontFamily: Fonts.semiBold, letterSpacing: 0.5, textTransform: 'uppercase' },
  price:      { fontSize: FontSize.md,  fontFamily: Fonts.bold, color: Colors.primary },
});
