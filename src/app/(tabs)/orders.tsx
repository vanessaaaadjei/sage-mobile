import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { ReceiptModal } from '../../components/ReceiptModal';
import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import type { Order, OrderStatus } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningSoft, fg: colors.warning, label: 'Waiting to sync' },
  syncing: { bg: colors.infoSoft, fg: colors.info, label: 'Syncing' },
  synced: { bg: colors.successSoft, fg: colors.success, label: 'Sent' },
  failed: { bg: colors.dangerSoft, fg: colors.danger, label: 'Needs retry' },
};

const PAYMENT_LABEL: Record<string, string> = { cash: 'Cash', momo: 'Mobile money', credit: 'Credit' };

function formatWhen(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export default function OrdersScreen() {
  const { orders, syncNow, syncing, printOrder, printer, online, pendingCount } = usePos();
  const [receipt, setReceipt] = useState<string | null>(null);

  const renderItem = ({ item }: { item: Order }) => {
    const status = STATUS_STYLE[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitle}>
            <Text style={styles.customer} numberOfLines={1}>
              {item.customerName}
            </Text>
            <Text style={styles.meta}>
              {formatWhen(item.createdAt)} · {item.lines.length} item{item.lines.length === 1 ? '' : 's'} ·{' '}
              {PAYMENT_LABEL[item.paymentMethod] ?? item.paymentMethod}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>
        {item.status === 'failed' ? (
          <Text style={styles.error}>Could not send this order yet. It will be retried on the next sync.</Text>
        ) : null}
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.docLabel}>{item.serverDocNo ? 'Receipt no.' : 'Local ref.'}</Text>
            <Text style={styles.doc}>{item.serverDocNo ?? item.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <Text style={styles.total}>{formatMoney(item.total)}</Text>
        </View>
        <Button
          label="Print receipt"
          icon="print-outline"
          variant="secondary"
          compact
          onPress={async () => setReceipt(await printOrder(item))}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen
        title="Orders"
        subtitle={pendingCount ? `${pendingCount} waiting to sync` : 'All orders sent'}
        onIndicatorPress={syncNow}>
        {pendingCount > 0 ? (
          <Pressable
            style={[styles.syncCard, (syncing || !online) && styles.syncCardDisabled]}
            disabled={syncing || !online}
            onPress={syncNow}>
            <View style={styles.syncIcon}>
              <Ionicons name={online ? 'cloud-upload-outline' : 'cloud-offline-outline'} size={20} color={colors.primary} />
            </View>
            <View style={styles.syncText}>
              <Text style={styles.syncTitle}>{syncing ? 'Sending orders…' : online ? 'Send pending orders' : 'You are offline'}</Text>
              <Text style={styles.syncSub}>
                {online ? `${pendingCount} order${pendingCount === 1 ? '' : 's'} ready to send` : 'Orders will send when you reconnect'}
              </Text>
            </View>
            {online && !syncing ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
          </Pressable>
        ) : null}
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.empty}>Orders you complete today will show up here.</Text>
            </View>
          }
        />
        <ReceiptModal payload={receipt} printerName={printer.name} onClose={() => setReceipt(null)} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  syncCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  syncCardDisabled: { opacity: 0.7 },
  syncIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  syncText: { flex: 1 },
  syncTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  syncSub: { fontSize: 12, color: colors.primaryDark, opacity: 0.8 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { flex: 1, gap: 2 },
  customer: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: typography.caption,
  badge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  error: { fontSize: 12, color: colors.danger, lineHeight: 17 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  docLabel: typography.overline,
  doc: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  total: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: typography.heading,
  empty: { textAlign: 'center', color: colors.textMuted },
});
