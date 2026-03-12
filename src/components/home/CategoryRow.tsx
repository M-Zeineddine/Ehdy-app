import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing, Fonts } from '../../constants/layout';
import { AppText } from '../ui/AppText';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryDef {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  bgColor: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'All', icon: 'star-four-points', color: '#F07856', bgColor: '#FFF0EC' },
  { id: 'coffee', label: 'Coffee', icon: 'coffee', color: '#F07856', bgColor: '#FFF0EC' },
  { id: 'dessert', label: 'Dessert', icon: 'cake-variant', color: '#D4709A', bgColor: '#FDF0F6' },
  { id: 'meals', label: 'Meals', icon: 'silverware-fork-knife', color: '#4CAF7D', bgColor: '#EBF7F1' },
  { id: 'spa', label: 'Spa', icon: 'spa', color: '#9B7EDE', bgColor: '#F3EEFF' },
  { id: 'fashion', label: 'Fashion', icon: 'hanger', color: '#5B9BD5', bgColor: '#EBF3FC' },
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll} style={{ marginTop: 3 }}>
      {CATEGORIES.map((cat) => {
        const isActive = cat.id === active;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => handleSelect(cat.id)}
            activeOpacity={0.6}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <View style={[styles.iconWrap, { backgroundColor: isActive ? `${cat.color}25` : cat.bgColor }]}>
              <MaterialCommunityIcons name={cat.icon} size={18} color={cat.color} />
            </View>
            <AppText style={[styles.label, isActive && { color: Colors.text.primary }]}>
              {cat.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: '#FFF0EC',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
  },
});
