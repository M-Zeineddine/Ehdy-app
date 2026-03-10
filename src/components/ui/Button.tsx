import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/layout';
import { AppText } from './AppText';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  rightIcon?: React.ReactNode;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, rightIcon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} size="small" />
      ) : (
        <>
          <AppText
            style={[
              styles.label,
              styles[`label_${variant}`],
              styles[`labelSize_${size}`],
              textStyle,
            ]}
          >
            {label}
          </AppText>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
  size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, gap: 4 },
  size_md: { paddingVertical: 12, paddingHorizontal: Spacing.lg, gap: 6 },
  size_lg: { paddingVertical: 16, paddingHorizontal: Spacing.xl, gap: 8 },
  variant_primary: { backgroundColor: Colors.primary },
  variant_outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  variant_ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '600' },
  label_primary: { color: '#FFFFFF' },
  label_outline: { color: Colors.primary },
  label_ghost: { color: Colors.primary },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 17 },
});
