import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { ProductImage } from '../../components/ProductImage';
import { QtyStepper } from '../../components/QtyStepper';
import { Screen } from '../../components/Screen';
import { formatMoney, TAX_RATE } from '../../core/cart';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing, typography } from '../../theme';

export default function CartScreen() {
  const router = useRouter();
  const { cart, setCartQty, clearCart, cartTotals, availableStock } = usePos();
  const count = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Cart" subtitle={count ? `${count} item${count === 1 ? '' : 's'}` : 'Empty'}>
        <FlatList
          data={cart}
          keyExtractor={(item) => item.product.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cart-outline" size={22} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.empty}>Tap a product on Sell to add it.</Text>
              <Button label="Back to sell" variant="secondary" onPress={() => router.push('/(tabs)')} style={styles.emptyAction} />
            </View>
          }
          renderItem={({ item }) => {
            const stock = availableStock(item.product.id);
            return (
              <View style={styles.row}>
                <ProductImage product={item.product} size={52} />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.meta}>
                    {formatMoney(item.product.price)} / {item.product.unit}
                  </Text>
                  <Text style={styles.lineTotal}>{formatMoney(item.product.price * item.qty)}</Text>
                </View>
                <QtyStepper
                  value={item.qty}
                  max={stock}
                  unit={item.product.unit}
                  onChange={(qty) => setCartQty(item.product.id, qty)}
                />
              </View>
            );
          }}
        />

        {cart.length ? (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatMoney(cartTotals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT & levies ({Math.round(TAX_RATE * 100)}%)</Text>
              <Text style={styles.summaryValue}>{formatMoney(cartTotals.tax)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(cartTotals.total)}</Text>
            </View>
            <Button label="Checkout" icon="arrow-forward" onPress={() => router.push('/checkout')} style={styles.checkout} />
            <Pressable onPress={clearCart} style={styles.clearButton}>
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
  list: { paddingHorizontal: spacing.lg, gap: 0, paddingBottom: spacing.lg, flexGrow: 1 },
  row: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowText: { flex: 1, gap: 2, paddingTop: 2 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta: typography.caption,
  lineTotal: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xxl },
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
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 13 },
  emptyAction: { marginTop: spacing.md },
  summary: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  totalLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  checkout: { marginTop: spacing.md },
  clearButton: { alignSelf: 'center', paddingVertical: spacing.sm },
  clear: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
});
