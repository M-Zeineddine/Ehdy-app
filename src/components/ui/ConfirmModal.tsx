import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Colors } from '@/src/constants/colors';
import { Spacing, Radius, FontSize, Fonts } from '@/src/constants/layout';

export interface ConfirmModalAction {
  text: string;
  onPress?: () => void;
  // 'cancel' = outlined/neutral, 'destructive' = filled red, 'default' (or
  // omitted) = filled primary. Always set this explicitly per action — there's
  // no positional fallback, since which action reads as "primary" varies.
  style?: 'default' | 'cancel' | 'destructive';
}

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  // 1-3 buttons. 2 lay out side by side (the classic Cancel/Confirm row);
  // 1 or 3 stack full-width, since a 3-across row gets too cramped to read.
  actions: ConfirmModalAction[];
  // Backdrop tap / Android back button. Omit to make the dialog only
  // dismissible via one of `actions` (use for prompts where an accidental
  // outside-tap shouldn't silently pick a default, e.g. destructive choices).
  onDismiss?: () => void;
  // A single value to call out above the message — large and boxed, so it
  // can't be skimmed past the way plain paragraph text can. Use it for the
  // one detail that's expensive to get wrong (e.g. a phone number that
  // determines who receives a paid gift).
  highlight?: string;
  // A "prefix + emphasized value" line rendered on its own, between the
  // highlight box and the message (e.g. prefix "Sending to " + value the
  // recipient's name, with the value colored to stand out from prose).
  emphasisLine?: { prefix: string; value: string };
}

/**
 * On-brand replacement for Alert.alert — use it for confirm/cancel prompts,
 * simple info dialogs (single action), or up to 3-way choices, wherever the
 * OS alert's plain-text styling undersells what the user is looking at.
 */
export function ConfirmModal({
  visible, title, message, actions, onDismiss, highlight, emphasisLine,
}: ConfirmModalProps) {
  const stacked = actions.length !== 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
        <View style={styles.card}>
          <AppText semiBold style={styles.title}>{title}</AppText>
          {highlight ? (
            <View style={styles.highlightBox}>
              <AppText semiBold style={styles.highlightText}>{highlight}</AppText>
            </View>
          ) : null}
          {emphasisLine ? (
            <AppText style={styles.emphasisLine} color={Colors.text.secondary}>
              {emphasisLine.prefix}
              <AppText semiBold color={Colors.primary}>{emphasisLine.value}</AppText>
            </AppText>
          ) : null}
          {message ? (
            <AppText style={styles.message} color={Colors.text.secondary}>{message}</AppText>
          ) : null}
          <View style={stacked ? styles.btnColumn : styles.btnRow}>
            {actions.map((action, i) => {
              const kind = action.style ?? 'default';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.btnBase,
                    stacked ? styles.btnFull : styles.btnFlex,
                    kind === 'cancel' && styles.cancelBtn,
                    kind === 'default' && styles.confirmBtn,
                    kind === 'destructive' && styles.destructiveBtn,
                  ]}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <AppText
                    semiBold
                    style={[
                      styles.btnText,
                      kind === 'cancel' && styles.cancelText,
                      kind === 'default' && styles.confirmText,
                      kind === 'destructive' && styles.destructiveText,
                    ]}
                  >
                    {action.text}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: { fontSize: FontSize.lg, textAlign: 'center' },
  highlightBox: {
    alignSelf: 'center',
    backgroundColor: Colors.primary + '14',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: 2,
  },
  highlightText: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  emphasisLine: {
    fontSize: FontSize.base,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  btnColumn: { gap: Spacing.sm },
  btnBase: {
    paddingVertical: 13,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  btnFlex: { flex: 1 },
  btnFull: { width: '100%' },
  btnText: { fontSize: FontSize.sm },
  cancelBtn: { borderWidth: 1.5, borderColor: Colors.border },
  cancelText: { color: Colors.text.secondary },
  confirmBtn: { backgroundColor: Colors.primary },
  confirmText: { color: '#fff', fontFamily: Fonts.semiBold },
  destructiveBtn: { backgroundColor: '#E53935' },
  destructiveText: { color: '#fff', fontFamily: Fonts.semiBold },
});
