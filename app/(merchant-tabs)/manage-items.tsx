import { useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, Switch, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import {
  getPortalItems, createPortalItem, updatePortalItem, getMerchantBranches,
  type PortalItem, type MerchantBranch,
} from '@/src/services/merchantPortalService';

function ItemForm({
  visible, item, branches, onClose, onSaved,
}: {
  visible: boolean;
  item: PortalItem | null; // null = create
  branches: MerchantBranch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUrl, setImageUrl] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null | undefined>(undefined);

  // Hydrate form state when the modal opens for a different target
  const target = item?.id ?? null;
  if (visible && hydratedFor !== target) {
    setName(item?.name ?? '');
    setDescription(item?.description ?? '');
    setPrice(item?.price ?? '');
    setCurrency(item?.currency_code ?? 'USD');
    setImageUrl(item?.image_url ?? '');
    setBranchIds(item?.available_branches.map((b) => b.id) ?? []);
    setIsActive(item?.is_active ?? true);
    setHydratedFor(target);
  }
  if (!visible && hydratedFor !== undefined) setHydratedFor(undefined);

  function toggleBranch(id: string) {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  async function handleSave() {
    const parsedPrice = parseFloat(price);
    if (!name.trim()) return Alert.alert('Missing name', 'Item name is required.');
    if (isNaN(parsedPrice) || parsedPrice <= 0) return Alert.alert('Invalid price', 'Enter a valid price.');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        price: parsedPrice,
        currency_code: currency.trim().toUpperCase() || 'USD',
        is_active: isActive,
        branch_ids: branchIds,
      };
      if (item) await updatePortalItem(item.id, payload);
      else await createPortalItem(payload);
      onSaved();
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Could not save item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={form.overlay}>
          <View style={form.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.sm }}>
              <AppText variant="heading" style={{ textAlign: 'center' }}>
                {item ? 'Edit item' : 'New item'}
              </AppText>

              <AppText variant="label" color={Colors.text.secondary}>Name</AppText>
              <TextInput style={form.input} value={name} onChangeText={setName} placeholder="e.g. Signature Box" placeholderTextColor={Colors.text.tertiary} />

              <AppText variant="label" color={Colors.text.secondary}>Description</AppText>
              <TextInput style={[form.input, form.multiline]} value={description} onChangeText={setDescription} multiline placeholder="Optional" placeholderTextColor={Colors.text.tertiary} />

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 2, gap: 6 }}>
                  <AppText variant="label" color={Colors.text.secondary}>Price</AppText>
                  <TextInput style={form.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.text.tertiary} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText variant="label" color={Colors.text.secondary}>Currency</AppText>
                  <TextInput style={form.input} value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} placeholderTextColor={Colors.text.tertiary} />
                </View>
              </View>

              <AppText variant="label" color={Colors.text.secondary}>Image URL</AppText>
              <TextInput style={form.input} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://…" placeholderTextColor={Colors.text.tertiary} />

              {branches.length > 0 && (
                <>
                  <AppText variant="label" color={Colors.text.secondary}>
                    Available at {branchIds.length === 0 ? '(all branches)' : ''}
                  </AppText>
                  <View style={form.chips}>
                    {branches.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[form.chip, branchIds.includes(b.id) && form.chipActive]}
                        onPress={() => toggleBranch(b.id)}
                      >
                        <AppText variant="caption" semiBold color={branchIds.includes(b.id) ? '#fff' : Colors.text.primary}>
                          {b.name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <AppText variant="caption" color={Colors.text.tertiary}>
                    Leave all unselected to make the item redeemable at every branch.
                  </AppText>
                </>
              )}

              <View style={form.switchRow}>
                <AppText variant="body">Active</AppText>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
              </View>

              <Button label={item ? 'Save changes' : 'Create item'} onPress={handleSave} loading={saving} size="lg" />
              <Button label="Cancel" onPress={onClose} variant="outline" size="lg" />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ManageItemsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PortalItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['portal-items'],
    queryFn: getPortalItems,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['merchant-branches'],
    queryFn: getMerchantBranches,
    staleTime: 5 * 60_000,
  });
  const activeBranches = branches.filter((b) => b.is_active);

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['portal-items'] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading" style={{ flex: 1 }}>Items</AppText>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditing(null); setFormOpen(true); }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.rowCard} onPress={() => { setEditing(item); setFormOpen(true); }}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" semiBold color={item.is_active ? Colors.text.primary : Colors.text.tertiary}>
                {item.name}
              </AppText>
              <AppText variant="caption" color={Colors.text.secondary}>
                {parseFloat(item.price).toLocaleString()} {item.currency_code}
                {' · '}
                {item.available_branches.length === 0
                  ? 'All branches'
                  : item.available_branches.map((b) => b.name).join(', ')}
              </AppText>
            </View>
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <AppText variant="caption" color={Colors.text.secondary}>Inactive</AppText>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm }}>
                No items yet — tap + to add one
              </AppText>
            </View>
          )
        }
      />

      <ItemForm
        visible={formOpen}
        item={editing}
        branches={activeBranches}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  backBtn: { padding: 4 },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  inactiveBadge: {
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
});

const form = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    maxHeight: '90%',
  },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: Fonts.medium, fontSize: 15, color: Colors.text.primary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
});
