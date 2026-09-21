import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatMoney } from '../core/cart';
import type { PendingCheckout } from '../state/PosProvider';
import { colors, radius, spacing } from '../theme';

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
            A 4-digit code was sent by direct-SIM SMS to {checkout.customer.name} on {checkout.customer.phone}. Ask the
            customer to read it back.
          </Text>
          <View style={styles.channel}>
            <Text style={styles.channelText}>
              {checkout.smsReceipt?.channel === 'direct-sim' ? 'Sent via SIM (no data used)' : 'Sent via simulated GSM channel'}
            </Text>
            {checkout.smsReceipt?.channel === 'simulated' ? (
              <Text style={styles.devCode}>Preview code: {checkout.otpPlain}</Text>
            ) : null}
          </View>

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

          <Pressable
            style={[styles.primary, (busy || code.length < 4) && styles.disabled]}
            disabled={busy || code.length < 4}
            onPress={() => onVerify(code)}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & queue order</Text>}
          </Pressable>
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
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  channel: { backgroundColor: colors.infoSoft, borderRadius: radius.sm, padding: spacing.md, gap: 2 },
  channelText: { fontSize: 12, color: colors.primaryDark, fontWeight: '600' },
  devCode: { fontSize: 12, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: 'center',
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13 },
  total: { fontSize: 14, fontWeight: '600', color: colors.text },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  cancel: { color: colors.textMuted },
});
