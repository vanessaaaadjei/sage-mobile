import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing } from '../../theme';

export default function VanStockScreen() {
  const { vanStock, products, syncNow } = usePos();
  const byId = new Map(products.map((product) => [product.id, product]));
  const soldUnits = vanStock.reduce((sum, line) => sum + (line.qtyLoaded - line.qtyOnHand), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Van stock" subtitle={`${soldUnits} units sold from load`} onIndicatorPress={syncNow}>
        <FlatList
          data={vanStock}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No van load pulled yet.</Text>}
          renderItem={({ item }) => {
            const product = byId.get(item.productId);
            const ratio = item.qtyLoaded ? item.qtyOnHand / item.qtyLoaded : 0;
            const low = ratio <= 0.25;
            return (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{product?.name ?? item.productId}</Text>
                  <Text style={styles.meta}>
                    Loaded {item.qtyLoaded} · sold {item.qtyLoaded - item.qtyOnHand}
                  </Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%` }, low && styles.fillLow]} />
                  </View>
                </View>
                <Text style={[styles.qty, low && styles.qtyLow]}>{item.qtyOnHand}</Text>
              </View>
            );
          }}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  rowText: { flex: 1, gap: spacing.xs },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden', marginTop: spacing.xs },
  fill: { height: 6, backgroundColor: colors.success },
  fillLow: { backgroundColor: colors.warning },
  qty: { fontSize: 20, fontWeight: '800', color: colors.success },
  qtyLow: { color: colors.warning },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
