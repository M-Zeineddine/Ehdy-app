import React, { useState } from 'react';
import {
  View, Image, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppText } from '@/src/components/ui/AppText';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';
import { getDrafts, deleteRetryDraft, type GiftDraftSummary } from '@/src/services/giftService';
import { i18n } from '@/src/i18n';

function priceLabel(d: GiftDraftSummary) {
  if (!d.item_price) return '';
  return `${d.item_currency ?? ''} ${parseFloat(d.item_price).toLocaleString()}`.trim();
}

function DraftRow({ draft, onDelete }: { draft: GiftDraftSummary; onDelete: () => void }) {
  const dateLabel = new Date(draft.updated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const imageUri = draft.is_credit ? draft.merchant_logo : draft.item_image;

  function onResume() {
    router.push({
      pathname: '/gift',
      params: {
        itemId: draft.merchant_item_id ?? '',
        itemName: draft.item_name ?? '',
        itemDescription: draft.item_description ?? '',
        itemPrice: draft.item_price != null ? String(draft.item_price) : '',
        itemCurrency: draft.item_currency ?? '',
        itemImage: draft.item_image ?? '',
        merchantId: draft.merchant_id ?? '',
        merchantName: draft.merchant_name ?? '',
        merchantLogo: draft.merchant_logo ?? '',
        isCredit: String(draft.is_credit),
        draft_id: draft.id,
        initial_step: '2',
      },
    });
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onResume} activeOpacity={0.75}>
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="gift-outline" size={22} color={Colors.text.tertiary} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <AppText semiBold numberOfLines={1} style={styles.itemName}>{draft.item_name}</AppText>
        <AppText numberOfLines={1} style={styles.merchantText} color={Colors.text.secondary}>
          {draft.merchant_name ?? ''}
        </AppText>
        <View style={styles.metaRow}>
          {draft.recipient_name ? (
            <AppText numberOfLines={1} style={styles.metaText} color={Colors.text.tertiary}>
              {i18n('gifts.to', { name: draft.recipient_name })}
            </AppText>
          ) : null}
          <AppText style={styles.dateText} color={Colors.text.tertiary}>
            {i18n('drafts.savedOn', { date: dateLabel })}
          </AppText>
        </View>
        <View style={styles.bottomRow}>
          <AppText semiBold style={styles.priceText}>{priceLabel(draft)}</AppText>
          <View style={styles.resumeBtn}>
            <Ionicons name="play" size={12} color={Colors.primary} />
            <AppText semiBold style={styles.resumeText}>{i18n('drafts.resume')}</AppText>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.text.tertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function DraftsScreen() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<GiftDraftSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['gift-drafts'],
    queryFn: getDrafts,
  });

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteRetryDraft(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['gift-drafts'] });
      setDeleteTarget(null);
    } catch (err: any) {
      Alert.alert(i18n('error.genericTitle'), err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="title" style={{ flex: 1 }}>{i18n('drafts.title')}</AppText>
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={d => d.id}
          contentContainerStyle={(data ?? []).length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={30} color={Colors.text.tertiary} />
              </View>
              <AppText semiBold style={styles.emptyTitle}>{i18n('drafts.emptyTitle')}</AppText>
              <AppText variant="caption" style={styles.emptySubtitle}>{i18n('drafts.emptySubtitle')}</AppText>
            </View>
          }
          renderItem={({ item }) => <DraftRow draft={item} onDelete={() => setDeleteTarget(item)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <ConfirmModal
        visible={!!deleteTarget}
        title={i18n('drafts.deleteConfirmTitle')}
        message={i18n('drafts.deleteConfirmMessage')}
        onDismiss={() => setDeleteTarget(null)}
        actions={[
          { text: i18n('common.cancel'), style: 'cancel', onPress: () => setDeleteTarget(null) },
          { text: i18n('drafts.deleteButton'), style: 'destructive', onPress: confirmDelete },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  listEmpty: { flexGrow: 1 },
  separator: { height: Spacing.sm },

  card: {
    flexDirection: 'row', backgroundColor: Colors.card,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.sm, gap: Spacing.md,
  },
  imageWrap: { width: 72, height: 88, borderRadius: Radius.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageFallback: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, justifyContent: 'center', gap: 2, paddingVertical: 2 },
  itemName: { fontSize: FontSize.base },
  merchantText: { fontSize: FontSize.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  metaText: { fontSize: FontSize.xs, maxWidth: '50%' },
  dateText: { fontSize: FontSize.xs },
  bottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4,
  },
  priceText: { fontSize: FontSize.sm, color: Colors.primary },
  resumeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '14', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  resumeText: { fontSize: FontSize.xs, color: Colors.primary },
  deleteBtn: { alignSelf: 'flex-start', padding: 4 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  emptyTitle: { fontSize: FontSize.lg, fontFamily: Fonts.semiBold },
  emptySubtitle: { textAlign: 'center', color: Colors.text.secondary, lineHeight: 20 },
});
