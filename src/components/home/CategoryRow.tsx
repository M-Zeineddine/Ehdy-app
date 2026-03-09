import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/layout';
import { AppText } from '../ui/AppText';
import type { Category } from '../../types';

const CATEGORIES: Category[] = [
  { id: 'all',     label: 'All',     emoji: '✨' },
  { id: 'coffee',  label: 'Coffee',  emoji: '☕' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
  { id: 'meals',   label: 'Meals',   emoji: '🍽️' },
  { id: 'spa',     label: 'Spa',     emoji: '💆' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
];

interface CategoryRowProps {
  onSelect?: (id: string) => void;
}

export function CategoryRow({ onSelect }: CategoryRowProps) {
  const [active, setActive] = useState('all');

  function handleSelect(id: string) {
    setActive(id);
    onSelect?.(id);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {CATEGORIES.map((cat) => {
        const isActive = cat.id === active;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => handleSelect(cat.id)}
            activeOpacity={0.7}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <AppText style={styles.emoji}>{cat.emoji}</AppText>
            <AppText
              variant="caption"
              style={[styles.label, isActive && styles.labelActive]}
            >
              {cat.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: 2 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: '#FFF1EC',
    borderColor: Colors.primary,
  },
  emoji: { fontSize: 14 },
  label: { fontWeight: '500', color: Colors.text.secondary },
  labelActive: { color: Colors.primary, fontWeight: '600' },
});
