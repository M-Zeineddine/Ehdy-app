import { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, Fonts } from '@/src/constants/layout';
import {
  validateRedemption,
  sendRedemptionOtp,
  verifyRedemptionOtp,
  confirmRedemption,
  type GiftValidation,
} from '@/src/services/merchantPortalService';

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
            <Button label="Allow camera" onPress={requestPermission} size="lg" style={{ marginTop: Spacing.lg }} />
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
  visible, code, gift, onConfirm, onCancel, loading,
}: {
  visible: boolean;
  code: string;
  gift: GiftValidation['gift'] | null;
  onConfirm: (amount?: number) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [partialAmount, setPartialAmount] = useState('');
  const isStoreCredit = gift?.type === 'store_credit';

  function handleConfirm() {
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
      onConfirm(amt);
    } else {
      onConfirm();
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
              </View>
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
              <Button label="Confirm Redemption" onPress={handleConfirm} loading={loading} size="lg" />
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
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [successData, setSuccessData] = useState<{ balance: number | null; currency?: string } | null>(null);

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

  async function handleConfirm(amount?: number) {
    setPendingAmount(amount);
    try {
      await sendRedemptionOtp(activeCode);
      setScanState('otp');
    } catch (err: any) {
      Alert.alert('Failed to send OTP', err.message ?? 'Could not send verification code.');
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
      const result = await confirmRedemption(activeCode, pendingAmount);
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
        onConfirm={handleConfirm}
        onCancel={handleReset}
        loading={false}
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
