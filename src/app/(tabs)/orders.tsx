import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReceiptModal } from '../../components/ReceiptModal';
import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import type { Order, OrderStatus } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing, typography } from '../../theme';

const STATUS: Record<OrderStatus, { fg: string; label: string }> = {
  pending: { fg: colors.warning, label: 'Waiting to sync' },
  syncing: { fg: colors.info, label: 'Syncing' },
  synced: { fg: colors.success, label: 'Sent' },
  failed: { fg: colors.danger, label: 'Needs retry' },
};

const PAYMENT: Record<string, string> = { cash: 'Cash', momo: 'Mobile money', credit: 'Credit' };

function formatWhen(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function OrdersScreen() {
  const { orders, syncNow, syncing, printOrder, printer, online, pendingCount } = usePos();
  const [receipt, setReceipt] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const onPrint = useCallback(
    async (order: Order) => {
      setPrintingId(order.id);
      try {
        setReceipt(await printOrder(order));
      } finally {
        setPrintingId(null);
      }
    },
    [printOrder],
  );

  const renderItem = useCallback(
    ({ item }: { item: Order }) => {
      const status = STATUS[item.status];
      return (
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={styles.rowTitle}>
              <Text style={styles.customer} numberOfLines={1}>
                {item.customerName}
              </Text>
              <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
            </View>
            <Text style={styles.total}>{formatMoney(item.total)}</Text>
          </View>

          <View style={styles.lines}>
            {item.lines.map((line) => (
              <Text key={`${item.id}-${line.productId}`} style={styles.line} numberOfLines={1}>
                <Text style={styles.lineQty}>{line.qty}× </Text>
                {line.name}
              </Text>
            ))}
          </View>

          <View style={styles.rowFooter}>
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: status.fg }]} />
              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
              <Text style={styles.footerMeta}>
                · {PAYMENT[item.paymentMethod] ?? item.paymentMethod}
              </Text>
            </View>
            <Pressable
              onPress={() => onPrint(item)}
              disabled={printingId === item.id}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Print receipt"
              style={({ pressed }) => [styles.printBtn, pressed && styles.pressed]}>
              <Ionicons
                name="print-outline"
                size={18}
                color={printingId === item.id ? colors.textMuted : colors.primary}
              />
              <Text style={[styles.printLabel, printingId === item.id && styles.printBusy]}>
                {printingId === item.id ? 'Printing…' : 'Print'}
              </Text>
            </Pressable>
          </View>

          {item.status === 'failed' ? (
            <Text style={styles.error}>Will retry on the next sync.</Text>
          ) : null}
        </View>
      );
    },
    [onPrint, printingId],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen
        title="Orders"
        subtitle={pendingCount ? `${pendingCount} waiting to sync` : 'All orders sent'}
        onIndicatorPress={syncNow}>
        {pendingCount > 0 ? (
          <Pressable
            style={[styles.syncBar, (syncing || !online) && styles.syncBarDisabled]}
            disabled={syncing || !online}
            onPress={syncNow}
            accessibilityRole="button">
            <Ionicons
              name={online ? 'cloud-upload-outline' : 'cloud-offline-outline'}
              size={18}
              color={colors.textMuted}
            />
            <Text style={styles.syncBarText}>
              {syncing
                ? 'Sending…'
                : online
                  ? `Send ${pendingCount} pending order${pendingCount === 1 ? '' : 's'}`
                  : 'Offline — will send when connected'}
            </Text>
            {online && !syncing ? (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            ) : null}
          </Pressable>
        ) : null}

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={22} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.empty}>Finish a sale from Sell → Cart to see it here.</Text>
            </View>
          }
        />
        <ReceiptModal payload={receipt} printerName={printer.name} onClose={() => setReceipt(null)} />
      </Screen>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  syncBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncBarDisabled: { opacity: 0.65 },
  syncBarText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { paddingVertical: spacing.lg, gap: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  rowTitle: { flex: 1, minWidth: 0, gap: 2 },
  customer: { fontSize: 15, fontWeight: '600', color: colors.text },
  when: typography.caption,
  total: { fontSize: 15, fontWeight: '700', color: colors.text },
  lines: { gap: 2 },
  line: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  lineQty: { fontWeight: '600', color: colors.text },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  footerMeta: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  printBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 2 },
  printLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  printBusy: { color: colors.textMuted },
  pressed: { opacity: 0.6 },
  error: { fontSize: 12, color: colors.danger },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.heading, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingHorizontal: spacing.xl, fontSize: 13 },
});
