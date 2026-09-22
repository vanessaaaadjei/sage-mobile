import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QtyStepper } from '../../components/QtyStepper';
import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import type { Product } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, shadow, spacing, toneFor, typography } from '../../theme';

type Section = { title: string; data: Product[] };

export default function CatalogScreen() {
  const router = useRouter();
  const { products, addToCart, setCartQty, availableStock, cart, cartTotals, syncNow, rep, signOut } = usePos();

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const list = groups.get(product.category) ?? [];
      list.push(product);
      groups.set(product.category, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data: [...data].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [products]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const renderItem = ({ item, index, section }: { item: Product; index: number; section: Section }) => {
    const stock = availableStock(item.id);
    const inCart = cart.find((line) => line.product.id === item.id)?.qty ?? 0;
    const remaining = stock - inCart;
    const soldOut = remaining <= 0 && inCart === 0;
    const low = !soldOut && remaining <= 5;
    const tone = toneFor(item.category);
    const last = index === section.data.length - 1;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          index === 0 && styles.rowFirst,
          last && styles.rowLast,
          pressed && !soldOut && styles.rowPressed,
          soldOut && styles.rowSoldOut,
        ]}
        disabled={soldOut || inCart > 0}
        onPress={() => addToCart(item)}>
        <View style={[styles.monogram, { backgroundColor: tone.bg }]}>
          <Text style={[styles.monogramText, { color: tone.fg }]}>{item.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {formatMoney(item.price)} / {item.unit}
            {soldOut ? ' · Sold out' : low ? ` · ${remaining} left` : ''}
          </Text>
        </View>
        {inCart > 0 ? (
          <QtyStepper value={inCart} max={stock} onChange={(qty) => setCartQty(item.id, qty)} />
        ) : (
          <View style={[styles.add, soldOut && styles.addDisabled]}>
            <Ionicons name="add" size={20} color={soldOut ? colors.textMuted : colors.textOnPrimary} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen
        title="Catalog"
        subtitle={`Hi ${rep?.name.split(' ')[0] ?? ''} · Van ${rep?.vanCode ?? ''}`}
        onIndicatorPress={syncNow}
        onSignOut={() => {
          signOut();
          router.replace('/');
        }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.header}>
              <Text style={styles.headerText}>{section.title}</Text>
              <Text style={styles.headerCount}>{section.data.length}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.empty}>Your catalog will appear here after the first sync.</Text>
            </View>
          }
        />

        {cartCount > 0 ? (
          <Pressable style={styles.bar} onPress={() => router.push('/(tabs)/cart')}>
            <View style={styles.barBadge}>
              <Text style={styles.barBadgeText}>{cartCount}</Text>
            </View>
            <View style={styles.barText}>
              <Text style={styles.barLabel}>View cart</Text>
              <Text style={styles.barTotal}>{formatMoney(cartTotals.total)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
          </Pressable>
        ) : null}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 4, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerText: typography.heading,
  headerCount: { ...typography.caption, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomWidth: 0, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowSoldOut: { opacity: 0.5 },
  monogram: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontSize: 14, fontWeight: '800' },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: typography.caption,
  add: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addDisabled: { backgroundColor: colors.surfaceMuted },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: typography.heading,
  empty: { textAlign: 'center', color: colors.textMuted },
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.floating,
  },
  barBadge: { minWidth: 30, height: 30, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  barBadgeText: { color: colors.textOnPrimary, fontWeight: '800' },
  barText: { flex: 1 },
  barLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  barTotal: { color: colors.textOnPrimary, fontWeight: '800', fontSize: 17 },
});
