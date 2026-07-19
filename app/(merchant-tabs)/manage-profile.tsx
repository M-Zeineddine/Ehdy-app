import { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import * as ImagePicker from 'expo-image-picker';
import {
  getMerchantProfile, updateMerchantProfile, uploadPortalImage,
} from '@/src/services/merchantPortalService';

export default function ManageProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: getMerchantProfile,
  });

  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once when the profile arrives
  if (profile && !hydrated) {
    setDescription(profile.description ?? '');
    setWebsite(profile.website_url ?? '');
    setLogoUrl(profile.logo_url ?? '');
    setBannerUrl(profile.banner_image_url ?? '');
    setContactEmail(profile.contact_email ?? '');
    setContactPhone(profile.contact_phone ?? '');
    setHydrated(true);
  }

  async function pickAndUpload(kind: 'logo' | 'banner', setter: (url: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: kind === 'logo',
      aspect: kind === 'logo' ? [1, 1] : undefined,
    });
    if (result.canceled) return;
    setUploading(kind);
    try {
      const url = await uploadPortalImage(result.assets[0].uri);
      setter(url);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Could not upload image.');
    } finally {
      setUploading(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateMerchantProfile({
        description: description.trim() || null,
        website_url: website.trim() || null,
        logo_url: logoUrl.trim() || null,
        banner_image_url: bannerUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ['merchant-profile'] });
      Alert.alert('Saved', 'Store profile updated.');
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="heading" style={{ flex: 1 }}>Store profile</AppText>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <AppText variant="body" color={Colors.text.tertiary} style={{ textAlign: 'center', padding: Spacing.xl }}>
              Loading…
            </AppText>
          ) : (
            <>
              {/* Read-only identity — name/slug/category are managed by Kado */}
              <View style={styles.identityCard}>
                {profile?.logo_url ? (
                  <Image source={{ uri: profile.logo_url }} style={styles.logo} contentFit="cover" />
                ) : (
                  <View style={[styles.logo, styles.logoPlaceholder]}>
                    <Ionicons name="storefront" size={22} color={Colors.text.tertiary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant="body" semiBold>{profile?.name}</AppText>
                  <AppText variant="caption" color={Colors.text.secondary}>
                    Store name is managed by Kado — contact support to change it.
                  </AppText>
                </View>
              </View>

              <AppText variant="label" color={Colors.text.secondary}>Description</AppText>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Tell customers about your store"
                placeholderTextColor={Colors.text.tertiary}
              />

              <AppText variant="label" color={Colors.text.secondary}>Website</AppText>
              <TextInput style={styles.input} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://…" placeholderTextColor={Colors.text.tertiary} />

              <AppText variant="label" color={Colors.text.secondary}>Logo</AppText>
              <View style={styles.uploadRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={logoUrl} onChangeText={setLogoUrl} autoCapitalize="none" keyboardType="url" placeholder="https://…/logo.png" placeholderTextColor={Colors.text.tertiary} />
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickAndUpload('logo', setLogoUrl)} disabled={uploading !== null}>
                  <Ionicons name={uploading === 'logo' ? 'hourglass' : 'image'} size={20} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <AppText variant="label" color={Colors.text.secondary}>Banner image</AppText>
              <View style={styles.uploadRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={bannerUrl} onChangeText={setBannerUrl} autoCapitalize="none" keyboardType="url" placeholder="https://…/banner.jpg" placeholderTextColor={Colors.text.tertiary} />
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickAndUpload('banner', setBannerUrl)} disabled={uploading !== null}>
                  <Ionicons name={uploading === 'banner' ? 'hourglass' : 'image'} size={20} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <AppText variant="label" color={Colors.text.secondary}>Contact email</AppText>
              <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} autoCapitalize="none" keyboardType="email-address" placeholder="hello@store.com" placeholderTextColor={Colors.text.tertiary} />

              <AppText variant="label" color={Colors.text.secondary}>Contact phone</AppText>
              <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="+961 …" placeholderTextColor={Colors.text.tertiary} />

              <Button label="Save changes" onPress={handleSave} loading={saving} size="lg" style={{ marginTop: Spacing.md }} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  logo: { width: 48, height: 48, borderRadius: Radius.md },
  logoPlaceholder: {
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: Fonts.medium, fontSize: 15, color: Colors.text.primary,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  uploadRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  uploadBtn: {
    width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
});
