import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { OtpModal } from '../components/OtpModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { formatMoney, TAX_RATE } from '../core/cart';
import type { Customer, Order, PaymentMethod } from '../core/types';
import { InsufficientStockError } from '../db/store';
import { usePos, type PendingCheckout } from '../state/PosProvider';
import { colors, radius, shadow, spacing, toneFor, typography } from '../theme';

const PAYMENTS: { key: PaymentMethod; label: string; icon: 'cash-outline' | 'phone-portrait-outline' | 'time-outline' }[] = [
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'momo', label: 'Mobile money', icon: 'phone-portrait-outline' },
  { key: 'credit', label: 'Credit', icon: 'time-outline' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { customers, cart, cartTotals, startCheckout, resendOtp, confirmCheckout, printOrder, printer } = usePos();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [checkout, setCheckout] = useState<PendingCheckout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const begin = async () => {
    if (!customer) return;
    setBusy(true);
    setError(null);
    try {
      setCheckout(await startCheckout(customer, payment));
    } catch (caught) {
      setError(
        caught instanceof InsufficientStockError
          ? 'Van stock is short for one of the lines. Adjust quantities.'
          : caught instanceof Error
            ? caught.message
            : 'Could not start checkout',
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    if (!checkout) return;
    setBusy(true);
    setOtpError(null);
    try {
      const order = await confirmCheckout(checkout, code);
      setCheckout(null);
      setPlaced(order);
    } catch (caught) {
      setOtpError(caught instanceof Error ? caught.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (placed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={40} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.doneTitle}>Order complete</Text>
          <Text style={styles.doneBody}>
            {placed.customerName} · {formatMoney(placed.total)}
          </Text>
          <Text style={styles.doneMeta}>Stock has been updated. The order will be sent the next time you sync.</Text>
          <View style={styles.doneActions}>
            <Button label="Print receipt" icon="print-outline" onPress={async () => setReceipt(await printOrder(placed))} />
            <Button label="Back to catalog" variant="secondary" onPress={() => router.replace('/(tabs)')} />
          </View>
          <ReceiptModal payload={receipt} printerName={printer.name} onClose={() => setReceipt(null)} />
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = Boolean(customer) && !busy && cart.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Customer</Text>
        <View style={styles.card}>
          {customers.map((entry, index) => {
            const active = customer?.id === entry.id;
            const tone = toneFor(entry.name);
            return (
              <Pressable
                key={entry.id}
                style={[styles.customer, active && styles.customerActive, index > 0 && styles.customerDivider]}
                onPress={() => setCustomer(entry)}>
                <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.avatarText, { color: tone.fg }]}>{entry.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.customerText}>
                  <Text style={styles.customerName}>{entry.name}</Text>
                  <Text style={styles.customerMeta}>
                    {entry.route} · {entry.phone}
                  </Text>
                  {entry.balance > 0 ? <Text style={styles.balance}>Owes {formatMoney(entry.balance)}</Text> : null}
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? colors.primary : colors.border}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Payment</Text>
        <View style={styles.paymentRow}>
          {PAYMENTS.map((entry) => {
            const active = payment === entry.key;
            return (
              <Pressable
                key={entry.key}
                style={[styles.payment, active && styles.paymentActive]}
                onPress={() => setPayment(entry.key)}>
                <Ionicons name={entry.icon} size={20} color={active ? colors.textOnPrimary : colors.textMuted} />
                <Text style={[styles.paymentText, active && styles.paymentTextActive]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Order summary</Text>
        <View style={[styles.card, styles.summary]}>
          {cart.map((item) => (
            <View key={item.product.id} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                <Text style={styles.lineQty}>{item.qty} × </Text>
                {item.product.name}
              </Text>
              <Text style={styles.lineTotal}>{formatMoney(item.product.price * item.qty)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.line}>
            <Text style={styles.lineMuted}>Subtotal</Text>
            <Text style={styles.lineMuted}>{formatMoney(cartTotals.subtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineMuted}>VAT & levies ({Math.round(TAX_RATE * 100)}%)</Text>
            <Text style={styles.lineMuted}>{formatMoney(cartTotals.tax)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatMoney(cartTotals.total)}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {!customer ? <Text style={styles.footnote}>Select a customer to continue.</Text> : null}
        <Button
          label={customer ? `Confirm with ${customer.name.split(' ')[0]}` : 'Confirm delivery'}
          icon="chatbubble-ellipses-outline"
          onPress={begin}
          loading={busy}
          disabled={!canSubmit}
        />
        <Text style={styles.footnote}>A confirmation code is sent to the customer&apos;s phone by SMS.</Text>
      </View>

      <OtpModal
        checkout={checkout}
        busy={busy}
        error={otpError}
        onVerify={verify}
        onResend={async () => {
          if (!checkout) return;
          setBusy(true);
          setCheckout(await resendOtp(checkout));
          setBusy(false);
        }}
        onCancel={() => {
          setCheckout(null);
          setOtpError(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  section: { ...typography.overline, marginTop: spacing.md, marginBottom: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  customer: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  customerDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  customerActive: { backgroundColor: colors.primarySoft },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  customerText: { flex: 1, gap: 1 },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  customerMeta: typography.caption,
  balance: { fontSize: 12, fontWeight: '700', color: colors.warning, marginTop: 2 },
  paymentRow: { flexDirection: 'row', gap: spacing.sm },
  payment: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentText: { fontWeight: '700', fontSize: 12, color: colors.textMuted },
  paymentTextActive: { color: colors.textOnPrimary },
  summary: { padding: spacing.md, gap: spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  lineName: { fontSize: 14, color: colors.text, flex: 1 },
  lineQty: { fontWeight: '700', color: colors.textMuted },
  lineTotal: { fontSize: 14, fontWeight: '600', color: colors.text },
  lineMuted: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  grandLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  error: { color: colors.danger, fontSize: 13, flex: 1 },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footnote: { ...typography.caption, textAlign: 'center' },
  done: { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.floating,
  },
  doneTitle: typography.title,
  doneBody: { fontSize: 16, color: colors.text, fontWeight: '600' },
  doneMeta: { ...typography.caption, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  doneActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
