import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import type { Product } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, spacing } from '../../theme';

export default function CatalogScreen() {
  const router = useRouter();
  const { products, addToCart, availableStock, cart, cartTotals, syncNow, rep } = usePos();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesQuery =
        !needle || product.name.toLowerCase().includes(needle) || product.sku.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const renderItem = ({ item }: { item: Product }) => {
    const stock = availableStock(item.id);
    const inCart = cart.find((line) => line.product.id === item.id)?.qty ?? 0;
    const soldOut = stock - inCart <= 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.sku}>{item.sku}</Text>
          <Text style={[styles.stock, soldOut && styles.stockOut]}>{stock - inCart} left</Text>
        </View>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.unit}>
          {item.category} · per {item.unit}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.price}>{formatMoney(item.price)}</Text>
          <Pressable
            style={[styles.add, soldOut && styles.addDisabled]}
            disabled={soldOut}
            onPress={() => addToCart(item)}>
            <Text style={styles.addText}>{inCart ? `Add (${inCart})` : 'Add'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Catalog" subtitle={`Van ${rep?.vanCode ?? ''} · ${products.length} SKUs cached`} onIndicatorPress={syncNow}>
        <View style={styles.controls}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or SKU"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search catalog"
          />
        </View>
        <View style={styles.chips}>
          {categories.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setCategory(entry)}
              style={[styles.chip, category === entry && styles.chipActive]}>
              <Text style={[styles.chipText, category === entry && styles.chipTextActive]}>{entry}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No products cached yet. Pull a delta from Settings.</Text>}
        />

        {cartCount > 0 ? (
          <Pressable style={styles.bar} onPress={() => router.push('/(tabs)/cart')}>
            <Text style={styles.barText}>
              {cartCount} item{cartCount === 1 ? '' : 's'} · {formatMoney(cartTotals.total)}
            </Text>
            <Text style={styles.barAction}>Review cart</Text>
          </Pressable>
        ) : null}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing.lg },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 3, gap: spacing.md },
  column: { gap: spacing.md },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sku: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  stock: { fontSize: 11, color: colors.success, fontWeight: '700' },
  stockOut: { color: colors.danger },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  unit: { fontSize: 12, color: colors.textMuted },
  cardBottom: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 14, fontWeight: '700', color: colors.text },
  add: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addDisabled: { backgroundColor: colors.border },
  addText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barText: { color: '#fff', fontWeight: '700' },
  barAction: { color: '#fff', opacity: 0.8, fontWeight: '600' },
});
