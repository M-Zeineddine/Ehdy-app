import React, { useEffect, useState } from 'react';
import {
  Modal, View, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (phone: string, name: string) => void;
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
}

export function ContactPickerModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filtered, setFiltered] = useState<ContactItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadContacts();
    else setQuery('');
  }, [visible]);

  async function loadContacts() {
    setLoading(true);
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      setLoading(false);
      onClose();
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      sort: Contacts.SortTypes.FirstName,
    });
    const items: ContactItem[] = [];
    for (const c of data) {
      if (!c.phoneNumbers?.length) continue;
      for (const p of c.phoneNumbers) {
        if (p.number) {
          items.push({ id: `${c.id}-${p.id}`, name: c.name ?? '', phone: p.number });
        }
      }
    }
    setContacts(items);
    setFiltered(items);
    setLoading(false);
  }

  function handleSearch(text: string) {
    setQuery(text);
    if (!text) { setFiltered(contacts); return; }
    const lower = text.toLowerCase();
    setFiltered(contacts.filter(c =>
      c.name.toLowerCase().includes(lower) || c.phone.includes(text)
    ));
  }

  function handleSelect(item: ContactItem) {
    // Strip +961 country prefix and formatting characters, keep local digits
    const local = item.phone.replace(/^\+961\s?/, '').replace(/[\s\-().]/g, '');
    onSelect(local, item.name);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AppText style={styles.title}>Select Contact</AppText>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search name or number..."
            placeholderTextColor={Colors.text.tertiary}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.6}>
              <Ionicons name="close-circle" size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={Colors.text.tertiary} />
            <AppText color={Colors.text.tertiary}>No contacts found</AppText>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <View style={styles.avatar}>
                  <AppText style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase() || '#'}
                  </AppText>
                </View>
                <View style={styles.itemInfo}>
                  <AppText semiBold style={styles.itemName}>{item.name}</AppText>
                  <AppText style={styles.itemPhone} color={Colors.text.secondary}>{item.phone}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontFamily: Fonts.semiBold },
  closeBtn: { padding: 4 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 48,
  },
  searchInput: {
    flex: 1, fontSize: FontSize.base, color: Colors.text.primary, fontFamily: Fonts.regular,
  },

  loader: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },

  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 72 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: Spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.base, fontFamily: Fonts.semiBold, color: Colors.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.base },
  itemPhone: { fontSize: FontSize.sm, marginTop: 2 },
});
