import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QtyStepper } from '../../components/QtyStepper';
import { Screen } from '../../components/Screen';
import { formatMoney, TAX_RATE } from '../../core/cart';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing } from '../../theme';

export default function CartScreen() {
  const router = useRouter();
  const { cart, setCartQty, clearCart, cartTotals, availableStock } = usePos();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Cart" subtitle={`${cart.length} line${cart.length === 1 ? '' : 's'}`}>
        <FlatList
          data={cart}
          keyExtractor={(item) => item.product.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Cart is empty. Add items from the catalog.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.product.name}</Text>
                <Text style={styles.meta}>
                  {formatMoney(item.product.price)} · {item.product.unit} · {availableStock(item.product.id)} on van
                </Text>
              </View>
              <View style={styles.rowRight}>
                <QtyStepper
                  value={item.qty}
                  max={availableStock(item.product.id)}
                  onChange={(qty) => setCartQty(item.product.id, qty)}
                />
                <Text style={styles.lineTotal}>{formatMoney(item.product.price * item.qty)}</Text>
              </View>
            </View>
          )}
        />

        {cart.length ? (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatMoney(cartTotals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT/Levies ({Math.round(TAX_RATE * 100)}%)</Text>
              <Text style={styles.summaryValue}>{formatMoney(cartTotals.tax)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(cartTotals.total)}</Text>
            </View>
            <Pressable style={styles.primary} onPress={() => router.push('/checkout')}>
              <Text style={styles.primaryText}>Checkout</Text>
            </Pressable>
            <Pressable onPress={clearCart}>
              <Text style={styles.clear}>Clear cart</Text>
            </Pressable>
          </View>
        ) : null}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: spacing.sm },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  lineTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  summary: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: colors.textMuted, fontSize: 14 },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clear: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
});
