import { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import { useQuery } from '@tanstack/react-query';
import {
  validateRedemption,
  sendRedemptionOtp,
  verifyRedemptionOtp,
  confirmRedemption,
  getMerchantBranches,
  type GiftValidation,
  type MerchantBranch,
} from '@/src/services/merchantPortalService';
import { useMerchantAuthStore } from '@/src/store/merchantAuthStore';

// ── Camera overlay modal ───────────────────────────────────────────────────────

function CameraModal({
  visible,
  onScanned,
  onClose,
  scanning,
}: {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
  scanning: boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedRef = useRef('');

  // Fresh session on close so the same code can be legitimately re-scanned
  // later (e.g. a second partial redemption); within one open session the ref
  // still suppresses the scanner's repeated fires for the same code.
  useEffect(() => {
    if (!visible) lastScannedRef.current = '';
  }, [visible]);

  function handleBarcode({ data }: { data: string }) {
    if (scanning || data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    // QR may encode a full URL (e.g. https://ehdy.app/redeem/ABCD-1234) — extract just the code
    const match = data.match(/\/redeem\/([A-Z0-9]{4}-[A-Z0-9]{4})/i);
    onScanned(match ? match[1].toUpperCase() : data);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!permission?.granted ? (
          <SafeAreaView style={cam.permBox}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <AppText variant="heading" color="#fff" style={{ textAlign: 'center', marginTop: Spacing.md }}>
              Camera access needed
            </AppText>
            <AppText variant="body" style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
              Allow camera access to scan gift QR codes.
            </AppText>
            {permission && !permission.canAskAgain ? (
              // OS won't show the prompt again — settings is the only way back
              <Button label="Open Settings" onPress={() => Linking.openSettings()} size="lg" style={{ marginTop: Spacing.lg }} />
            ) : (
              <Button label="Allow camera" onPress={requestPermission} size="lg" style={{ marginTop: Spacing.lg }} />
            )}
          </SafeAreaView>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={!scanning ? handleBarcode : undefined}
            />

            <SafeAreaView style={cam.overlay} pointerEvents="box-none">
              {/* Close button */}
              <TouchableOpacity onPress={onClose} style={cam.closeBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              {/* Viewfinder */}
              <View style={cam.finderArea} pointerEvents="none">
                <View style={cam.finder}>
                  <View style={[cam.corner, cam.TL]} />
                  <View style={[cam.corner, cam.TR]} />
                  <View style={[cam.corner, cam.BL]} />
                  <View style={[cam.corner, cam.BR]} />
                </View>
                <AppText variant="caption" style={cam.hint}>
                  {scanning ? 'Validating...' : 'Point at the QR code on the gift card'}
                </AppText>
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Redemption confirmation modal ─────────────────────────────────────────────

function RedemptionModal({
  visible, code, gift, branchOptions, needsBranch, onConfirm, onCancel, loading,
}: {
  visible: boolean;
  code: string;
  gift: GiftValidation['gift'] | null;
  branchOptions: MerchantBranch[];
  needsBranch: boolean;
  onConfirm: (amount?: number, branchId?: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [partialAmount, setPartialAmount] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const isStoreCredit = gift?.type === 'store_credit';
  // Item restricted to branches this user can't redeem at
  const blockedByAvailability = needsBranch && branchOptions.length === 0;

  // Component stays mounted across redemptions — start each gift with a
  // clean amount instead of the previous gift's; pre-select the branch when
  // there is only one choice
  useEffect(() => {
    if (visible) {
      setPartialAmount('');
      setSelectedBranchId(branchOptions.length === 1 ? branchOptions[0].id : null);
    }
  }, [visible, branchOptions]);

  function handleConfirm() {
    let branchId: string | undefined;
    if (needsBranch) {
      if (!selectedBranchId) {
        Alert.alert('Select a branch', 'Choose the branch where this gift is being redeemed.');
        return;
      }
      branchId = selectedBranchId;
    }
    if (isStoreCredit && partialAmount) {
      const amt = parseFloat(partialAmount);
      if (isNaN(amt) || amt <= 0) {
        Alert.alert('Invalid amount', 'Enter a valid amount to redeem.');
        return;
      }
      if (gift?.current_balance != null && amt > gift.current_balance) {
        Alert.alert('Exceeds balance', `Max: ${gift.current_balance.toLocaleString()} ${gift.currency}`);
        return;
      }
      onConfirm(amt, branchId);
    } else {
      onConfirm(undefined, branchId);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.header}>
              <View style={modal.successIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
              </View>
              <AppText variant="heading" style={{ textAlign: 'center' }}>Valid Gift Code</AppText>
              <AppText variant="body" color={Colors.text.secondary} style={{ textAlign: 'center' }}>{code}</AppText>
            </View>

            {gift && (
              <View style={modal.detailCard}>
                <DetailRow label="Type" value={isStoreCredit ? 'Store Credit' : 'Gift Item'} />
                {gift.recipient_name && <DetailRow label="Recipient" value={gift.recipient_name} />}
                {isStoreCredit && gift.current_balance != null && (
                  <DetailRow label="Balance" value={`${gift.current_balance.toLocaleString()} ${gift.currency}`} highlight />
                )}
                {!isStoreCredit && gift.item_name && (
                  <DetailRow label="Item" value={gift.item_name} />
                )}
                {gift.redeemable_branches && (
                  <DetailRow
                    label="Redeemable at"
                    value={gift.redeemable_branches.map((b) => b.name).join(', ')}
                    highlight
                  />
                )}
              </View>
            )}

            {blockedByAvailability && (
              <View style={modal.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <AppText variant="caption" style={{ flex: 1, color: '#DC2626' }}>
                  This item can only be redeemed at{' '}
                  {gift?.redeemable_branches?.map((b) => b.name).join(', ') ?? 'another branch'} — not at your branch.
                </AppText>
              </View>
            )}

            {needsBranch && branchOptions.length > 1 && (
              <View style={modal.branchSection}>
                <AppText variant="label" color={Colors.text.secondary}>Redeeming at branch</AppText>
                <View style={modal.branchChips}>
                  {branchOptions.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[modal.branchChip, selectedBranchId === b.id && modal.branchChipActive]}
                      onPress={() => setSelectedBranchId(b.id)}
                    >
                      <AppText
                        variant="caption"
                        semiBold
                        color={selectedBranchId === b.id ? '#fff' : Colors.text.primary}
                      >
                        {b.name}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {needsBranch && branchOptions.length === 1 && (
              <AppText variant="caption" color={Colors.text.secondary} style={{ textAlign: 'center' }}>
                Redeeming at: {branchOptions[0].name}
              </AppText>
            )}

            {isStoreCredit && (
              <View style={modal.amountRow}>
                <AppText variant="label" color={Colors.text.secondary}>
                  Amount to redeem (leave blank for full balance)
                </AppText>
                <TextInput
                  style={modal.amountInput}
                  placeholder={`Max: ${gift?.current_balance?.toLocaleString() ?? '—'} ${gift?.currency ?? ''}`}
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="numeric"
                  value={partialAmount}
                  onChangeText={setPartialAmount}
                />
              </View>
            )}

            <View style={modal.actions}>
              <Button
                label="Confirm Redemption"
                onPress={handleConfirm}
                loading={loading}
                size="lg"
                disabled={blockedByAvailability}
              />
              <Button label="Cancel" onPress={onCancel} variant="outline" size="lg" />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={modal.detailRow}>
      <AppText variant="caption" color={Colors.text.secondary}>{label}</AppText>
      <AppText variant="body" semiBold color={highlight ? Colors.primary : Colors.text.primary}>{value}</AppText>
    </View>
  );
}

// ── OTP modal ─────────────────────────────────────────────────────────────────

function OtpModal({
  visible, code, onVerify, onResend, onCancel, loading, resending,
}: {
  visible: boolean;
  code: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onCancel: () => void;
  loading: boolean;
  resending: boolean;
}) {
  const [otp, setOtp] = useState('');

  // Component stays mounted across redemptions — never pre-fill a stale OTP
  useEffect(() => {
    if (visible) setOtp('');
  }, [visible]);

  function handleVerify() {
    if (otp.trim().length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code sent to the recipient.');
      return;
    }
    onVerify(otp.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.header}>
              <View style={[modal.successIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color="#3B82F6" />
              </View>
              <AppText variant="heading" style={{ textAlign: 'center' }}>Recipient Verification</AppText>
              <AppText variant="body" color={Colors.text.secondary} style={{ textAlign: 'center' }}>
                A WhatsApp code was sent to the recipient. Ask them to read it to you.
              </AppText>
              <AppText variant="caption" color={Colors.text.tertiary} style={{ textAlign: 'center' }}>
                Code: {code}
              </AppText>
            </View>

            <TextInput
              style={modal.amountInput}
              placeholder="Enter 6-digit code"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />

            <View style={modal.actions}>
              <Button label="Verify & Redeem" onPress={handleVerify} loading={loading} size="lg" />
              <Button label={resending ? 'Resending...' : 'Resend Code'} onPress={onResend} variant="outline" size="lg" />
              <Button label="Cancel" onPress={onCancel} variant="ghost" size="lg" />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Success overlay ────────────────────────────────────────────────────────────

function SuccessOverlay({ visible, remainingBalance, currency, onDone }: {
  visible: boolean;
  remainingBalance: number | null;
  currency?: string;
  onDone: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={success.overlay}>
        <View style={success.card}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          <AppText variant="heading" style={{ textAlign: 'center', marginTop: Spacing.md }}>Redeemed!</AppText>
          {remainingBalance != null && remainingBalance > 0 && (
            <AppText variant="body" color={Colors.text.secondary} style={{ textAlign: 'center' }}>
              Remaining:{' '}
              <AppText variant="body" semiBold color={Colors.primary}>
                {remainingBalance.toLocaleString()} {currency}
              </AppText>
            </AppText>
          )}
          {remainingBalance === 0 && (
            <AppText variant="body" color={Colors.text.secondary} style={{ textAlign: 'center' }}>Credit fully used.</AppText>
          )}
          <Button label="Scan next" onPress={onDone} size="lg" style={{ marginTop: Spacing.lg, width: '100%' }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

type ScanState = 'idle' | 'validating' | 'confirmed' | 'otp' | 'success';

export default function MerchantScanScreen() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [validatedGift, setValidatedGift] = useState<GiftValidation | null>(null);
  const [activeCode, setActiveCode] = useState('');
  const [pendingAmount, setPendingAmount] = useState<number | undefined>(undefined);
  const [pendingBranchId, setPendingBranchId] = useState<string | undefined>(undefined);
  const [otpSending, setOtpSending] = useState(false);
  const otpSendingRef = useRef(false); // synchronous guard — useState updates are async and miss same-frame double-taps
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [successData, setSuccessData] = useState<{ balance: number | null; currency?: string } | null>(null);

  // Branch context: which branches this user may redeem at, narrowed further
  // by the validated item's own availability
  const merchantUser = useMerchantAuthStore((s) => s.merchantUser);
  const { data: branches = [] } = useQuery({
    queryKey: ['merchant-branches'],
    queryFn: getMerchantBranches,
    staleTime: 5 * 60_000,
  });
  const activeBranches = branches.filter((b) => b.is_active);
  const scopedIds = merchantUser?.branch_ids;
  const myBranches = scopedIds ? activeBranches.filter((b) => scopedIds.includes(b.id)) : activeBranches;
  const redeemable = validatedGift?.gift.redeemable_branches;
  const branchOptions = redeemable
    ? myBranches.filter((b) => redeemable.some((r) => r.id === b.id))
    : myBranches;
  const needsBranch = activeBranches.length > 0;

  async function handleValidate(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCameraOpen(false);
    setScanState('validating');
    try {
      const result = await validateRedemption(trimmed);
      if (!result.is_valid) {
        Alert.alert('Invalid code', 'This gift code is not valid or has already been redeemed.', [
          { text: 'OK', onPress: () => setScanState('idle') },
        ]);
        return;
      }
      setValidatedGift(result);
      setActiveCode(trimmed);
      setScanState('confirmed');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to validate code.', [
        { text: 'OK', onPress: () => setScanState('idle') },
      ]);
    }
  }

  async function handleConfirm(amount?: number, branchId?: string) {
    if (otpSendingRef.current) return;
    otpSendingRef.current = true;
    setOtpSending(true);
    setPendingAmount(amount);
    setPendingBranchId(branchId);
    try {
      await sendRedemptionOtp(activeCode);
      setScanState('otp');
    } catch (err: any) {
      Alert.alert('Failed to send OTP', err.message ?? 'Could not send verification code.');
    } finally {
      otpSendingRef.current = false;
      setOtpSending(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    try {
      await sendRedemptionOtp(activeCode);
    } catch (err: any) {
      Alert.alert('Failed to resend', err.message ?? 'Could not resend verification code.');
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyOtp(otp: string) {
    setOtpLoading(true);
    try {
      await verifyRedemptionOtp(activeCode, otp);
      const result = await confirmRedemption(activeCode, pendingAmount, pendingBranchId);
      setSuccessData({ balance: result.remaining_balance, currency: validatedGift?.gift.currency });
      setScanState('success');
    } catch (err: any) {
      Alert.alert('Verification failed', err.message ?? 'Could not verify code.');
    } finally {
      setOtpLoading(false);
    }
  }

  function handleReset() {
    setManualCode('');
    setScanState('idle');
    setValidatedGift(null);
    setActiveCode('');
    setPendingAmount(undefined);
    setPendingBranchId(undefined);
    setSuccessData(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText variant="heading" style={{ marginBottom: Spacing.xs }}>Scan Gift</AppText>
        <AppText variant="body" color={Colors.text.secondary} style={{ marginBottom: Spacing.xl }}>
          Type the redemption code or tap the camera icon to scan.
        </AppText>

        {/* Code input with camera button inside */}
        <AppText variant="label" color={Colors.text.secondary} style={{ marginBottom: 6 }}>
          Redemption Code
        </AppText>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. LT88-82AB"
            placeholderTextColor={Colors.text.tertiary}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {manualCode.length > 0 && (
            <TouchableOpacity style={styles.inputBtn} onPress={() => setManualCode('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.inputBtn, styles.cameraBtn]}
            onPress={() => setCameraOpen(true)}
          >
            <Ionicons name="qr-code-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Button
          label="Validate Code"
          onPress={() => handleValidate(manualCode)}
          loading={scanState === 'validating'}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>

      {/* Camera overlay */}
      <CameraModal
        visible={cameraOpen}
        scanning={scanState === 'validating'}
        onScanned={handleValidate}
        onClose={() => setCameraOpen(false)}
      />

      {/* Redemption confirmation */}
      <RedemptionModal
        visible={scanState === 'confirmed'}
        code={activeCode}
        gift={validatedGift?.gift ?? null}
        branchOptions={branchOptions}
        needsBranch={needsBranch}
        onConfirm={handleConfirm}
        onCancel={handleReset}
        loading={otpSending}
      />

      {/* OTP verification */}
      <OtpModal
        visible={scanState === 'otp'}
        code={activeCode}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onCancel={handleReset}
        loading={otpLoading}
        resending={resending}
      />

      {/* Success */}
      <SuccessOverlay
        visible={scanState === 'success'}
        remainingBalance={successData?.balance ?? null}
        currency={successData?.currency}
        onDone={handleReset}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 75,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.md,
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  inputBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  cameraBtn: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
});

const cam = StyleSheet.create({
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  overlay: { flex: 1 },
  closeBtn: {
    margin: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  finder: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: '#fff' },
  TL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  TR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  BL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  BR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  hint: { color: 'rgba(255,255,255,0.85)' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    gap: Spacing.md,
  },
  header: { alignItems: 'center', gap: Spacing.xs },
  successIcon: {
    width: 64, height: 64, borderRadius: Radius.full,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
  },
  detailCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  amountRow: { gap: 6 },
  warningCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FEF2F2', borderRadius: Radius.md,
    borderWidth: 1, borderColor: '#FECACA', padding: Spacing.md,
  },
  branchSection: { gap: 8 },
  branchChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  branchChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  branchChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  amountInput: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: Fonts.bold, fontSize: 18, color: Colors.text.primary,
  },
  actions: { gap: Spacing.sm },
});

const success = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: Colors.overlay,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.background, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', width: '100%', gap: Spacing.sm,
  },
});
