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
  getPortalStaff, createPortalStaff, updatePortalStaff, getMerchantBranches,
  type PortalStaff, type MerchantBranch,
} from '@/src/services/merchantPortalService';

function StaffForm({
  visible, staff, branches, onClose, onSaved,
}: {
  visible: boolean;
  staff: PortalStaff | null; // null = create
  branches: MerchantBranch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null | undefined>(undefined);

  // Hydrate form state when the modal opens for a different target
  const target = staff?.id ?? null;
  if (visible && hydratedFor !== target) {
    setEmail(staff?.email ?? '');
    setPassword('');
    setFirstName(staff?.first_name ?? '');
    setLastName(staff?.last_name ?? '');
    setRole(staff?.role === 'manager' ? 'manager' : 'staff');
    setBranchIds(staff?.branches.map((b) => b.id) ?? []);
    setIsActive(staff?.is_active ?? true);
    setHydratedFor(target);
  }
  if (!visible && hydratedFor !== undefined) setHydratedFor(undefined);

  function toggleBranch(id: string) {
    // Staff are pinned to exactly one branch; managers may cover several
    if (role === 'staff') {
      setBranchIds((prev) => (prev.includes(id) ? [] : [id]));
    } else {
      setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
    }
  }

  async function handleSave() {
    if (!staff) {
      if (!email.trim() || !email.includes('@')) return Alert.alert('Invalid email', 'Enter a valid email address.');
      if (password.length < 8) return Alert.alert('Weak password', 'Password must be at least 8 characters.');
    } else if (password && password.length < 8) {
      return Alert.alert('Weak password', 'New password must be at least 8 characters.');
    }
    if (branches.length > 0 && role === 'staff' && branchIds.length !== 1) {
      return Alert.alert('Branch required', 'Assign this staff member to exactly one branch so their redemptions are attributed correctly.');
    }
    setSaving(true);
    try {
      if (staff) {
        await updatePortalStaff(staff.id, {
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          role,
          is_active: isActive,
          password: password || undefined,
          branch_ids: branchIds,
        });
      } else {
        await createPortalStaff({
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          role,
          branch_ids: branchIds,
        });
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Could not save account.');
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
                {staff ? 'Edit account' : 'New account'}
              </AppText>

              <AppText variant="label" color={Colors.text.secondary}>Email</AppText>
              <TextInput
                style={[form.input, !!staff && form.inputDisabled]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!staff}
                placeholder="cashier@store.com"
                placeholderTextColor={Colors.text.tertiary}
              />

              <AppText variant="label" color={Colors.text.secondary}>
                {staff ? 'New password (leave blank to keep)' : 'Password'}
              </AppText>
              <TextInput style={form.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 8 characters" placeholderTextColor={Colors.text.tertiary} />

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText variant="label" color={Colors.text.secondary}>First name</AppText>
                  <TextInput style={form.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={Colors.text.tertiary} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText variant="label" color={Colors.text.secondary}>Last name</AppText>
                  <TextInput style={form.input} value={lastName} onChangeText={setLastName} placeholderTextColor={Colors.text.tertiary} />
                </View>
              </View>

              <AppText variant="label" color={Colors.text.secondary}>Role</AppText>
              <View style={form.chips}>
                {(['staff', 'manager'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[form.chip, role === r && form.chipActive]}
                    onPress={() => { setRole(r); setBranchIds([]); }}
                  >
                    <AppText variant="caption" semiBold color={role === r ? '#fff' : Colors.text.primary}>
                      {r === 'staff' ? 'Cashier (scan only)' : 'Branch manager (sales access)'}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              {branches.length > 0 && (
                <>
                  <AppText variant="label" color={Colors.text.secondary}>
                    {role === 'staff' ? 'Branch (pick one)' : 'Branches (one or more; none = all)'}
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
                </>
              )}

              {!!staff && (
                <View style={form.switchRow}>
                  <AppText variant="body">Active</AppText>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
                </View>
              )}

              <Button label={staff ? 'Save changes' : 'Create account'} onPress={handleSave} loading={saving} size="lg" />
              <Button label="Cancel" onPress={onClose} variant="outline" size="lg" />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ManageStaffScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PortalStaff | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: staff = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['portal-staff'],
    queryFn: getPortalStaff,
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
    queryClient.invalidateQueries({ queryKey: ['portal-staff'] });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* This is a hidden Tabs.Screen, not a stack push, so router.back()
            falls through to the tab navigator's first tab (Scan) instead of
            wherever this was actually opened from — navigate explicitly. */}
        <TouchableOpacity onPress={() => router.replace('/(merchant-tabs)/manage')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading" style={{ flex: 1 }}>Staff</AppText>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setFormOpen(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const isOwnerRow = item.role === 'owner';
          return (
            <TouchableOpacity
              style={[styles.rowCard, isOwnerRow && { opacity: 0.65 }]}
              disabled={isOwnerRow}
              onPress={() => { setEditing(item); setFormOpen(true); }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="body" semiBold color={item.is_active ? Colors.text.primary : Colors.text.tertiary}>
                  {[item.first_name, item.last_name].filter(Boolean).join(' ') || item.email}
                </AppText>
                <AppText variant="caption" color={Colors.text.secondary}>
                  {item.email}
                  {' · '}
                  {item.branches.length === 0 ? 'All branches' : item.branches.map((b) => b.name).join(', ')}
                </AppText>
              </View>
              <View style={styles.roleBadge}>
                <AppText variant="caption" color={Colors.primary} semiBold>
                  {item.role === 'owner' ? 'Owner' : item.role === 'manager' ? 'Manager' : 'Cashier'}
                </AppText>
              </View>
              {!item.is_active && (
                <View style={styles.inactiveBadge}>
                  <AppText variant="caption" color={Colors.text.secondary}>Inactive</AppText>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={Colors.text.tertiary} />
              <AppText variant="body" color={Colors.text.tertiary} style={{ marginTop: Spacing.sm }}>
                No accounts yet — tap + to add one
              </AppText>
            </View>
          )
        }
      />

      <StaffForm
        visible={formOpen}
        staff={editing}
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
  roleBadge: {
    backgroundColor: '#FFF0EC', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
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
  inputDisabled: { opacity: 0.6 },
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
