import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReceiptModal } from '../../components/ReceiptModal';
import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import { MAX_ATTEMPTS } from '../../core/syncEngine';
import type { Order, OrderStatus } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing } from '../../theme';

const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningSoft, fg: colors.warning, label: 'Queued' },
  syncing: { bg: colors.infoSoft, fg: colors.primaryDark, label: 'Syncing' },
  synced: { bg: colors.successSoft, fg: colors.success, label: 'Posted' },
  failed: { bg: colors.dangerSoft, fg: colors.danger, label: 'Retry' },
};

export default function OrdersScreen() {
  const { orders, syncNow, syncing, printOrder, printer, online } = usePos();
  const [receipt, setReceipt] = useState<string | null>(null);

  const renderItem = ({ item }: { item: Order }) => {
    const status = STATUS_STYLE[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.doc}>{item.serverDocNo ?? `OFFLINE-${item.id.slice(0, 8)}`}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.customer}>{item.customerName}</Text>
        <Text style={styles.meta}>
          {new Date(item.createdAt).toLocaleString()} · {item.lines.length} line
          {item.lines.length === 1 ? '' : 's'} · {item.paymentMethod.toUpperCase()}
        </Text>
        <Text style={styles.meta}>Idempotency key {item.idempotencyKey.slice(0, 18)}…</Text>
        {item.lastError ? (
          <Text style={styles.error}>
            {item.lastError} (attempt {item.attempts}/{MAX_ATTEMPTS})
          </Text>
        ) : null}
        <View style={styles.cardBottom}>
          <Text style={styles.total}>{formatMoney(item.total)}</Text>
          <Pressable style={styles.print} onPress={async () => setReceipt(await printOrder(item))}>
            <Text style={styles.printText}>Print receipt</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Orders" subtitle="Offline outbox" onIndicatorPress={syncNow}>
        <View style={styles.actions}>
          <Pressable style={[styles.sync, (syncing || !online) && styles.syncDisabled]} disabled={syncing || !online} onPress={syncNow}>
            <Text style={styles.syncText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
          </Pressable>
        </View>
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No orders captured yet.</Text>}
        />
        <ReceiptModal payload={receipt} printerName={printer.name} onClose={() => setReceipt(null)} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sync: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  syncDisabled: { opacity: 0.5 },
  syncText: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doc: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: 12, fontWeight: '700' },
  customer: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
  cardBottom: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: 16, fontWeight: '800', color: colors.text },
  print: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  printText: { fontSize: 13, fontWeight: '700', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
