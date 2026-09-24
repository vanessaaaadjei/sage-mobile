import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductImage } from '../../components/ProductImage';
import { QtyStepper } from '../../components/QtyStepper';
import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import type { Product, VanStockLine } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing, typography } from '../../theme';

type StockRow = VanStockLine & {
  product?: Product;
  name: string;
  category: string;
  low: boolean;
};

type Category = {
  name: string;
  count: number;
  onHand: number;
  cover?: Product;
};

const ListSeparator = memo(function ListSeparator() {
  return <View style={styles.separator} />;
});

const CategoryCard = memo(function CategoryCard({
  item,
  onPress,
}: {
  item: Category;
  onPress: (name: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.rowPressed]}
      onPress={() => onPress(item.name)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.count} products, ${item.onHand} left`}>
      {item.cover ? (
        <ProductImage product={item.cover} size={64} />
      ) : (
        <View style={styles.cardIcon}>
          <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.cardCount}>
        {item.onHand} left · {item.count} {item.count === 1 ? 'item' : 'items'}
      </Text>
    </Pressable>
  );
});

export default function SellScreen() {
  const router = useRouter();
  const {
    vanStock,
    products,
    cart,
    cartTotals,
    addToCart,
    setCartQty,
    availableStock,
    syncNow,
    signOut,
  } = usePos();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const cartQtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) map.set(line.product.id, line.qty);
    return map;
  }, [cart]);

  const rows = useMemo<StockRow[]>(() => {
    return vanStock.map((line) => {
      const product = byId.get(line.productId);
      const ratio = line.qtyLoaded ? line.qtyOnHand / line.qtyLoaded : 0;
      return {
        ...line,
        product,
        name: product?.name ?? line.productId,
        category: product?.category ?? 'Other',
        low: line.qtyOnHand <= 0 || (line.qtyLoaded > 0 && ratio <= 0.25),
      };
    });
  }, [vanStock, byId]);

  const categories = useMemo<Category[]>(() => {
    const groups = new Map<string, StockRow[]>();
    for (const row of rows) {
      const list = groups.get(row.category) ?? [];
      list.push(row);
      groups.set(row.category, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => ({
        name,
        count: list.length,
        onHand: list.reduce((sum, line) => sum + line.qtyOnHand, 0),
        cover: list.find((line) => line.product?.imageUrl)?.product ?? list[0]?.product,
      }));
  }, [rows]);

  const needle = deferredQuery.trim().toLowerCase();
  const browsing = category !== null || needle.length > 0;

  const items = useMemo(() => {
    if (!browsing) return [];
    return rows
      .filter((row) => {
        if (category !== null && row.category !== category) return false;
        if (!needle) return true;
        return (
          row.name.toLowerCase().includes(needle) ||
          row.product?.sku.toLowerCase().includes(needle) ||
          row.category.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        if (a.qtyOnHand === 0 && b.qtyOnHand !== 0) return 1;
        if (b.qtyOnHand === 0 && a.qtyOnHand !== 0) return -1;
        return a.name.localeCompare(b.name);
      });
  }, [rows, browsing, category, needle]);

  const onHand = useMemo(() => vanStock.reduce((sum, line) => sum + line.qtyOnHand, 0), [vanStock]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const goBack = useCallback(() => {
    setCategory(null);
    setQuery('');
  }, []);

  const openCategory = useCallback((name: string) => setCategory(name), []);

  const renderProduct = useCallback(
    ({ item }: { item: StockRow }) => {
      const stock = availableStock(item.productId);
      const inCart = cartQtyById.get(item.productId) ?? 0;
      const soldOut = stock <= 0;
      const canTap = Boolean(item.product) && !soldOut && inCart === 0;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.row,
            pressed && canTap && styles.rowPressed,
            soldOut && styles.rowSoldOut,
          ]}
          disabled={!canTap}
          onPress={() => item.product && addToCart(item.product)}
          accessibilityRole="button"
          accessibilityLabel={soldOut ? `${item.name}, sold out` : `Add ${item.name} to cart`}>
          {item.product ? (
            <ProductImage product={item.product} size={48} />
          ) : (
            <View style={styles.fallback}>
              <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.meta, item.low && !soldOut && inCart === 0 && styles.metaLow]}>
              {inCart > 0
                ? item.product
                  ? formatMoney(item.product.price)
                  : ''
                : [
                    soldOut ? 'Sold out' : `${stock} left of ${item.qtyLoaded} loaded`,
                    item.product ? formatMoney(item.product.price) : null,
                    category === null && needle ? item.category : null,
                    item.low && !soldOut ? 'running low' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </Text>
          </View>
          {!item.product ? null : inCart > 0 ? (
            <QtyStepper
              value={inCart}
              max={stock}
              unit={item.product.unit}
              onChange={(qty) => setCartQty(item.productId, qty)}
            />
          ) : (
            <View style={[styles.add, soldOut && styles.addDisabled]}>
              <Ionicons name="add" size={20} color={soldOut ? colors.textMuted : colors.textOnPrimary} />
            </View>
          )}
        </Pressable>
      );
    },
    [availableStock, cartQtyById, addToCart, setCartQty, category, needle],
  );

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <View style={styles.gridCell}>
        <CategoryCard item={item} onPress={openCategory} />
      </View>
    ),
    [openCategory],
  );

  const keyProduct = useCallback((item: StockRow) => item.productId, []);
  const keyCategory = useCallback((item: Category) => item.name, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen
        title={category ?? 'Sell'}
        subtitle={
          category
            ? `${items.length} ${items.length === 1 ? 'product' : 'products'}`
            : vanStock.length
              ? `${onHand} left on the van`
              : 'Nothing loaded'
        }
        onBack={category ? goBack : undefined}
        onIndicatorPress={syncNow}
        onSignOut={
          category
            ? undefined
            : () => {
                signOut();
                router.replace('/');
              }
        }>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={category ? `Search in ${category}` : 'Search van stock'}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search van stock"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {browsing ? (
          <FlatList
            key="sell-products"
            data={items}
            keyExtractor={keyProduct}
            renderItem={renderProduct}
            ItemSeparatorComponent={ListSeparator}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>{needle ? 'No matches' : 'No products'}</Text>
                <Text style={styles.empty}>
                  {needle
                    ? `Nothing matches “${query.trim()}”${category ? ` in ${category}` : ''}.`
                    : `No stock in ${category}.`}
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            key="sell-categories"
            data={categories}
            keyExtractor={keyCategory}
            renderItem={renderCategory}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No stock loaded</Text>
                <Text style={styles.empty}>
                  Van stock will appear here once it is synced from the depot.
                </Text>
              </View>
            }
          />
        )}

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
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md - 2, fontSize: 14, color: colors.text },
  grid: {
    paddingHorizontal: spacing.lg - spacing.sm / 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 4,
    flexGrow: 1,
  },
  gridRow: { gap: 0 },
  gridCell: { width: '50%', padding: spacing.sm / 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 148,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardCount: typography.caption,
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 4,
    flexGrow: 1,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: { opacity: 0.7 },
  rowSoldOut: { opacity: 0.45 },
  fallback: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2, paddingTop: 2 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta: typography.caption,
  metaLow: { color: colors.warning, fontWeight: '600' },
  add: {
    width: 36,
    height: 36,
    marginTop: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { backgroundColor: colors.surfaceMuted },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primaryDark,
  },
  barBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textOnPrimary },
  barText: { flex: 1 },
  barLabel: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  barTotal: { fontSize: 16, fontWeight: '700', color: colors.textOnPrimary },
  emptyWrap: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xxl,
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
