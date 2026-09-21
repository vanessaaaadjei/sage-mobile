import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { usePos } from '../../state/PosProvider';
import { colors, radius, shadow, spacing, toneFor, typography } from '../../theme';

export default function VanStockScreen() {
  const { vanStock, products, syncNow } = usePos();
  const byId = new Map(products.map((product) => [product.id, product]));
  const loaded = vanStock.reduce((sum, line) => sum + line.qtyLoaded, 0);
  const onHand = vanStock.reduce((sum, line) => sum + line.qtyOnHand, 0);
  const sold = loaded - onHand;
  const lowCount = vanStock.filter((line) => line.qtyLoaded && line.qtyOnHand / line.qtyLoaded <= 0.25).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Van stock" subtitle="What's left on the van" onIndicatorPress={syncNow}>
        {vanStock.length ? (
          <View style={styles.stats}>
            <View style={[styles.stat, styles.statPrimary]}>
              <Text style={[styles.statValue, styles.statValuePrimary]}>{onHand}</Text>
              <Text style={[styles.statLabel, styles.statLabelPrimary]}>On hand</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sold}</Text>
              <Text style={styles.statLabel}>Sold today</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, lowCount > 0 && styles.statValueWarn]}>{lowCount}</Text>
              <Text style={styles.statLabel}>Running low</Text>
            </View>
          </View>
        ) : null}
        <FlatList
          data={vanStock}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No stock loaded</Text>
              <Text style={styles.empty}>Your van load will appear here once it&apos;s synced.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const product = byId.get(item.productId);
            const name = product?.name ?? item.productId;
            const ratio = item.qtyLoaded ? item.qtyOnHand / item.qtyLoaded : 0;
            const low = ratio <= 0.25;
            const tone = toneFor(product?.category ?? name);
            return (
              <View style={styles.row}>
                <View style={[styles.monogram, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.monogramText, { color: tone.fg }]}>{name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.rowText}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.qty, low && styles.qtyLow]}>
                      {item.qtyOnHand}
                      <Text style={styles.qtyOf}> / {item.qtyLoaded}</Text>
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%` }, low && styles.fillLow]} />
                  </View>
                  <Text style={styles.meta}>
                    {item.qtyLoaded - item.qtyOnHand} sold{product ? ` · ${product.unit}` : ''}
                    {low ? ' · Running low' : ''}
                  </Text>
                </View>
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
  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2, ...shadow.card },
  statPrimary: { backgroundColor: colors.primary },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statValuePrimary: { color: colors.textOnPrimary },
  statValueWarn: { color: colors.warning },
  statLabel: typography.caption,
  statLabelPrimary: { color: colors.textOnPrimary, opacity: 0.85 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl, flexGrow: 1 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.card,
  },
  monogram: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontSize: 14, fontWeight: '800' },
  rowText: { flex: 1, gap: spacing.xs },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  meta: typography.caption,
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  fillLow: { backgroundColor: colors.warning },
  qty: { fontSize: 17, fontWeight: '800', color: colors.text },
  qtyLow: { color: colors.warning },
  qtyOf: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: typography.heading,
  empty: { textAlign: 'center', color: colors.textMuted },
});
