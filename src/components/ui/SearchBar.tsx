import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/layout';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onFilterPress?: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, onFilterPress, placeholder = 'Find gifts, places, treats...' }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.input}>
        <Ionicons name="search-outline" size={18} color={Colors.text.tertiary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.tertiary}
          style={styles.textInput}
        />
      </View>
      <TouchableOpacity onPress={onFilterPress} style={styles.filterBtn} activeOpacity={0.7}>
        <Ionicons name="options-outline" size={18} color={Colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  textInput: { flex: 1, fontSize: 14, color: Colors.text.primary, padding: 0 },
  filterBtn: {
    width: 40, height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
});
