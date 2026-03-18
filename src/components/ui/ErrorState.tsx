import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/layout';
import { i18n } from '../../i18n';

interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Pass 'network' for a wifi-off icon, defaults to a generic alert icon */
  variant?: 'network' | 'generic';
  onRetry?: () => void;
}

export function ErrorState({
  title,
  message,
  variant = 'generic',
  onRetry,
}: ErrorStateProps) {
  const isNetwork = variant === 'network' ||
    message?.toLowerCase().includes('network') ||
    message?.toLowerCase().includes('internet') ||
    message?.toLowerCase().includes('connect');

  const icon = isNetwork ? 'wifi-outline' : 'alert-circle-outline';
  const defaultTitle = isNetwork ? i18n('error.networkTitle') : i18n('error.genericTitle');
  const defaultMessage = isNetwork ? i18n('error.networkMessage') : i18n('error.genericMessage');

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={Colors.text.tertiary} />
      </View>
      <AppText variant="subheading" style={styles.title}>
        {title ?? defaultTitle}
      </AppText>
      <AppText variant="caption" style={styles.message}>
        {message ?? defaultMessage}
      </AppText>
      {onRetry && (
        <Button
          label={i18n('error.tryAgain')}
          variant="outline"
          size="sm"
          onPress={onRetry}
          style={styles.retryBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
    color: Colors.text.primary,
  },
  message: {
    textAlign: 'center',
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.sm,
    minWidth: 120,
  },
});
