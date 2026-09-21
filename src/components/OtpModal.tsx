import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatMoney } from '../core/cart';
import type { PendingCheckout } from '../state/PosProvider';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { Button } from './Button';

type Props = {
  checkout: PendingCheckout | null;
  busy: boolean;
  error: string | null;
  onVerify(code: string): void;
  onResend(): void;
  onCancel(): void;
};

export function OtpModal({ checkout, busy, error, onVerify, onResend, onCancel }: Props) {
  const [code, setCode] = useState('');
  if (!checkout) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm delivery</Text>
          <Text style={styles.body}>
            A 4-digit code was texted to {checkout.customer.name} ({checkout.customer.phone}). Ask them to read it back.
          </Text>
          {checkout.smsReceipt?.channel === 'simulated' ? (
            <View style={styles.channel}>
              <Text style={styles.channelText}>Test mode · code is {checkout.otpPlain}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(next) => setCode(next.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="0000"
            placeholderTextColor={colors.textMuted}
            maxLength={4}
            autoFocus
            accessibilityLabel="OTP code"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.total}>Order total {formatMoney(checkout.total)}</Text>

          <Button label="Confirm order" icon="checkmark" loading={busy} disabled={busy || code.length < 4} onPress={() => onVerify(code)} />
          <View style={styles.row}>
            <Pressable onPress={onResend} disabled={busy}>
              <Text style={styles.link}>Resend code</Text>
            </Pressable>
            <Pressable onPress={onCancel} disabled={busy}>
              <Text style={[styles.link, styles.cancel]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.floating,
  },
  title: typography.title,
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  channel: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: spacing.md },
  channelText: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 14,
    textAlign: 'center',
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13 },
  total: { fontSize: 14, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  cancel: { color: colors.textMuted },
});
