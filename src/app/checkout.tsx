import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OtpModal } from '../components/OtpModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { formatMoney, TAX_RATE } from '../core/cart';
import type { Customer, Order, PaymentMethod } from '../core/types';
import { InsufficientStockError } from '../db/store';
import { usePos, type PendingCheckout } from '../state/PosProvider';
import { colors, radius, spacing } from '../theme';

const PAYMENTS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'momo', label: 'Mobile money' },
  { key: 'credit', label: 'Credit' },
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
          <Text style={styles.doneTitle}>Order captured</Text>
          <Text style={styles.doneBody}>
            {placed.customerName} · {formatMoney(placed.total)}
          </Text>
          <Text style={styles.doneMeta}>
            Stock is deducted and the order sits in the encrypted outbox until it is pushed.
          </Text>
          <Pressable style={styles.primary} onPress={async () => setReceipt(await printOrder(placed))}>
            <Text style={styles.primaryText}>Print receipt</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)/orders')}>
            <Text style={styles.secondaryText}>View outbox</Text>
          </Pressable>
          <ReceiptModal payload={receipt} printerName={printer.name} onClose={() => setReceipt(null)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Customer</Text>
        <View style={styles.card}>
          {customers.map((entry) => (
            <Pressable
              key={entry.id}
              style={[styles.customer, customer?.id === entry.id && styles.customerActive]}
              onPress={() => setCustomer(entry)}>
              <View style={styles.customerText}>
                <Text style={styles.customerName}>{entry.name}</Text>
                <Text style={styles.customerMeta}>
                  {entry.code} · {entry.route} · {entry.phone}
                </Text>
              </View>
              {entry.balance > 0 ? <Text style={styles.balance}>Owes {formatMoney(entry.balance)}</Text> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Payment</Text>
        <View style={styles.paymentRow}>
          {PAYMENTS.map((entry) => (
            <Pressable
              key={entry.key}
              style={[styles.payment, payment === entry.key && styles.paymentActive]}
              onPress={() => setPayment(entry.key)}>
              <Text style={[styles.paymentText, payment === entry.key && styles.paymentTextActive]}>{entry.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Order</Text>
        <View style={styles.card}>
          {cart.map((item) => (
            <View key={item.product.id} style={styles.line}>
              <Text style={styles.lineName}>
                {item.qty} × {item.product.name}
              </Text>
              <Text style={styles.lineTotal}>{formatMoney(item.product.price * item.qty)}</Text>
            </View>
          ))}
          <View style={styles.line}>
            <Text style={styles.lineMuted}>VAT/Levies ({Math.round(TAX_RATE * 100)}%)</Text>
            <Text style={styles.lineMuted}>{formatMoney(cartTotals.tax)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatMoney(cartTotals.total)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.primary, (!customer || busy || !cart.length) && styles.disabled]} disabled={!customer || busy || !cart.length} onPress={begin}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send OTP & confirm delivery</Text>}
        </Pressable>
        <Text style={styles.footnote}>
          The code is sent over the SIM&apos;s GSM channel, so it reaches basic handsets with no data connection.
        </Text>
      </ScrollView>

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
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, textTransform: 'uppercase' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.xs },
  customer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  customerActive: { backgroundColor: colors.infoSoft },
  customerText: { flexShrink: 1 },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  customerMeta: { fontSize: 12, color: colors.textMuted },
  balance: { fontSize: 12, fontWeight: '700', color: colors.warning },
  paymentRow: { flexDirection: 'row', gap: spacing.sm },
  payment: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  paymentActive: { backgroundColor: colors.primary },
  paymentText: { fontWeight: '700', color: colors.textMuted },
  paymentTextActive: { color: '#fff' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  lineName: { fontSize: 14, color: colors.text, flexShrink: 1 },
  lineTotal: { fontSize: 14, fontWeight: '600', color: colors.text },
  lineMuted: { fontSize: 13, color: colors.textMuted },
  grandLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  primary: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  secondary: { marginTop: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '700' },
  footnote: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md, lineHeight: 18 },
  done: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.sm },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  doneBody: { fontSize: 16, color: colors.text },
  doneMeta: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
});
