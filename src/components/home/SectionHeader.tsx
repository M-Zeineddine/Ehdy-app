import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { i18n } from '../../i18n';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="subheading">{title}</AppText>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.55}>
          <AppText bold color={Colors.primary} style={{ fontSize: 14 }}>
            {i18n('common.seeAll')}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
