import { useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, Switch, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import {
  getMerchantBranches, createPortalBranch, updatePortalBranch,
  type MerchantBranch,
} from '@/src/services/merchantPortalService';

function BranchForm({
  visible, branch, onClose, onSaved,
}: {
  visible: boolean;
  branch: MerchantBranch | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null | undefined>(undefined);

  // Hydrate form state when the modal opens for a different target
  const target = branch?.id ?? null;
  if (visible && hydratedFor !== target) {
    setName(branch?.name ?? '');
    setCity(branch?.city ?? '');
    setAddress(branch?.address ?? '');
    setPhone(branch?.contact_phone ?? '');
    setIsActive(branch?.is_active ?? true);
    setHydratedFor(target);
  }
  if (!visible && hydratedFor !== undefined) setHydratedFor(undefined);

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Missing name', 'Branch name is required.');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        city: city.trim() || null,
        address: address.trim() || null,
        contact_phone: phone.trim() || null,
        is_active: isActive,
      };
      if (branch) await updatePortalBranch(branch.id, payload);
      else await createPortalBranch(payload);
      onSaved();
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Could not save branch.');
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
                {branch ? 'Edit branch' : 'New branch'}
              </AppText>

              <AppText variant="label" color={Colors.text.secondary}>Name</AppText>
              <TextInput style={form.input} value={name} onChangeText={setName} placeholder="e.g. Hamra" placeholderTextColor={Colors.text.tertiary} />

              <AppText variant="label" color={Colors.text.secondary}>City</AppText>
              <TextInput style={form.input} value={city} onChangeText={setCity} placeholder="e.g. Beirut" placeholderTextColor={Colors.text.tertiary} />

              <AppText variant="label" color={Colors.text.secondary}>Address</AppText>
              <TextInput style={form.input} value={address} onChangeText={setAddress} placeholder="Street, building…" placeholderTextColor={Colors.text.tertiary} />

              <AppText variant="label" color={Colors.text.secondary}>Contact phone</AppText>
              <TextInput style={form.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+961 …" placeholderTextColor={Colors.text.tertiary} />

              {!!branch && (
                <View style={form.switchRow}>
                  <AppText variant="body">Active</AppText>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
                </View>
              )}

              <Button label={branch ? 'Save changes' : 'Create branch'} onPress={handleSave} loading={saving} size="lg" />
              <Button label="Cancel" onPress={onClose} variant="outline" size="lg" />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ManageBranchesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MerchantBranch | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: branches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['merchant-branches'],
    queryFn: getMerchantBranches,
  });

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['merchant-branches'] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading" style={{ flex: 1 }}>Branches</AppText>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setFormOpen(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={branches}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.rowCard} onPress={() => { setEditing(item); setFormOpen(true); }}>
            <View style={styles.rowIcon}>
              <Ionicons name="location" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" semiBold color={item.is_active ? Colors.text.primary : Colors.text.tertiary}>
                {item.name}
              </AppText>
              <AppText variant="caption" color={Colors.text.secondary}>
                {[item.city, item.address].filter(Boolean).join(' · ') || 'No location details'}
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
              <Ionicons name="location-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
                No branches yet.{'\n'}Without branches, redemptions are not split by location.
              </AppText>
            </View>
          )
        }
      />

      <BranchForm
        visible={formOpen}
        branch={editing}
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
  rowIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: '#FFF0EC', alignItems: 'center', justifyContent: 'center',
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
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
});
