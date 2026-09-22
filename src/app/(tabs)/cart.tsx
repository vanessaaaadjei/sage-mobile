import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { ProductImage } from '../../components/ProductImage';
import { QtyStepper } from '../../components/QtyStepper';
import { Screen } from '../../components/Screen';
import { formatMoney, TAX_RATE } from '../../core/cart';
import { usePos } from '../../state/PosProvider';
import { colors, radius, shadow, spacing, typography } from '../../theme';

export default function CartScreen() {
  const router = useRouter();
  const { cart, setCartQty, clearCart, cartTotals, availableStock } = usePos();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

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
                <Ionicons name="cart-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.empty}>Tap a product in the catalog to add it.</Text>
              <Button label="Browse catalog" variant="secondary" onPress={() => router.push('/(tabs)')} style={styles.emptyAction} />
            </View>
          }
          renderItem={({ item }) => {
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
                  <View style={styles.rowBottom}>
                    <QtyStepper
                      value={item.qty}
                      max={availableStock(item.product.id)}
                      onChange={(qty) => setCartQty(item.product.id, qty)}
                    />
                    <Text style={styles.lineTotal}>{formatMoney(item.product.price * item.qty)}</Text>
                  </View>
                </View>
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
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadow.card,
  },
  rowText: { flex: 1, gap: 2 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  name: { ...typography.body, fontWeight: '700' },
  meta: typography.caption,
  lineTotal: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: typography.heading,
  empty: { textAlign: 'center', color: colors.textMuted },
  emptyAction: { marginTop: spacing.md },
  summary: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.floating,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: colors.textMuted, fontSize: 14 },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  totalLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  checkout: { marginTop: spacing.md },
  clearButton: { alignSelf: 'center', paddingVertical: spacing.sm },
  clear: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
