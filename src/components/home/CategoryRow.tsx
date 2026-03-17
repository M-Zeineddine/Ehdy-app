import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, Fonts } from '../../constants/layout';
import { AppText } from '../ui/AppText';
import type { BackendCategory } from '../../services/merchantService';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryStyle {
  icon: IconName;
  color: string;
  bgColor: string;
}

const CATEGORY_STYLE_MAP: Record<string, CategoryStyle> = {
  'coffee':               { icon: 'coffee',               color: '#F07856', bgColor: '#FFF0EC' },
  'coffee-cafes':         { icon: 'coffee',               color: '#F07856', bgColor: '#FFF0EC' },
  'dessert':              { icon: 'cake-variant',          color: '#D4709A', bgColor: '#FDF0F6' },
  'desserts':             { icon: 'cake-variant',          color: '#D4709A', bgColor: '#FDF0F6' },
  'sweets':               { icon: 'candy',                 color: '#D4709A', bgColor: '#FDF0F6' },
  'meals':                { icon: 'silverware-fork-knife', color: '#4CAF7D', bgColor: '#EBF7F1' },
  'restaurants':          { icon: 'silverware-fork-knife', color: '#4CAF7D', bgColor: '#EBF7F1' },
  'food-drinks':          { icon: 'food-fork-drink',       color: '#4CAF7D', bgColor: '#EBF7F1' },
  'spa':                  { icon: 'spa',                   color: '#9B7EDE', bgColor: '#F3EEFF' },
  'wellness':             { icon: 'spa',                   color: '#9B7EDE', bgColor: '#F3EEFF' },
  'fashion':              { icon: 'hanger',                color: '#5B9BD5', bgColor: '#EBF3FC' },
  'clothing':             { icon: 'hanger',                color: '#5B9BD5', bgColor: '#EBF3FC' },
  'shopping':             { icon: 'shopping-outline',      color: '#5B9BD5', bgColor: '#EBF3FC' },
  'beauty':               { icon: 'face-woman-shimmer',    color: '#D4709A', bgColor: '#FDF0F6' },
  'entertainment':        { icon: 'music-note',            color: '#E9A84C', bgColor: '#FDF6EC' },
  'experiences':          { icon: 'ticket-outline',        color: '#E9A84C', bgColor: '#FDF6EC' },
};
const FALLBACK_STYLE: CategoryStyle = { icon: 'tag-outline', color: '#F07856', bgColor: '#FFF0EC' };
const ALL_STYLE: CategoryStyle = { icon: 'star-four-points', color: '#F07856', bgColor: '#FFF0EC' };

// Static fallback shown before API data loads — slugs match the DB seed
const STATIC_CATEGORIES: BackendCategory[] = [
  { id: 'coffee-cafes',  name: 'Coffee & Cafes',  slug: 'coffee-cafes',  icon_url: null, display_order: 1 },
  { id: 'desserts',      name: 'Desserts',         slug: 'desserts',      icon_url: null, display_order: 2 },
  { id: 'restaurants',   name: 'Restaurants',      slug: 'restaurants',   icon_url: null, display_order: 3 },
  { id: 'wellness',      name: 'Wellness & Spa',   slug: 'wellness',      icon_url: null, display_order: 4 },
  { id: 'fashion',       name: 'Fashion',          slug: 'fashion',       icon_url: null, display_order: 5 },
];

interface CategoryRowProps {
  categories?: BackendCategory[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

export function CategoryRow({ categories, activeId, onSelect }: CategoryRowProps) {
  const items = categories && categories.length > 0 ? categories : STATIC_CATEGORIES;

  function styleFor(slug: string): CategoryStyle {
    return CATEGORY_STYLE_MAP[slug] ?? FALLBACK_STYLE;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={{ marginTop: 3 }}
    >
      {/* "All" pill */}
      <TouchableOpacity
        key="all"
        onPress={() => onSelect?.('all')}
        activeOpacity={0.6}
        style={[styles.pill, (!activeId || activeId === 'all') && styles.pillActive]}
      >
        <View style={[styles.iconWrap, { backgroundColor: (!activeId || activeId === 'all') ? `${ALL_STYLE.color}25` : ALL_STYLE.bgColor }]}>
          <MaterialCommunityIcons name={ALL_STYLE.icon} size={18} color={ALL_STYLE.color} />
        </View>
        <AppText style={[styles.label, (!activeId || activeId === 'all') && { color: Colors.text.primary }]}>
          All
        </AppText>
      </TouchableOpacity>

      {items.map((cat) => {
        const isActive = cat.id === activeId;
        const s = styleFor(cat.slug);
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect?.(cat.id)}
            activeOpacity={0.6}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <View style={[styles.iconWrap, { backgroundColor: isActive ? `${s.color}25` : s.bgColor }]}>
              <MaterialCommunityIcons name={s.icon} size={18} color={s.color} />
            </View>
            <AppText style={[styles.label, isActive && { color: Colors.text.primary }]}>
              {cat.name}
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
