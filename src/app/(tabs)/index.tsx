import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { formatMoney } from '../../core/cart';
import type { Product } from '../../core/types';
import { usePos } from '../../state/PosProvider';
import { colors, radius, shadow, spacing, toneFor, typography } from '../../theme';

export default function CatalogScreen() {
  const router = useRouter();
  const { products, addToCart, availableStock, cart, cartTotals, syncNow, rep, signOut } = usePos();
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
    const remaining = stock - inCart;
    const soldOut = remaining <= 0;
    const low = !soldOut && remaining <= 5;
    const tone = toneFor(item.category);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && !soldOut && styles.cardPressed, soldOut && styles.cardSoldOut]}
        disabled={soldOut}
        onPress={() => addToCart(item)}>
        <View style={styles.cardTop}>
          <View style={[styles.monogram, { backgroundColor: tone.bg }]}>
            <Text style={[styles.monogramText, { color: tone.fg }]}>{item.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={[styles.stockPill, soldOut ? styles.stockOut : low ? styles.stockLow : null]}>
            <Text style={[styles.stockText, soldOut ? styles.stockTextOut : low ? styles.stockTextLow : null]}>
              {soldOut ? 'Sold out' : `${remaining} left`}
            </Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.unit}>per {item.unit}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.price}>{formatMoney(item.price)}</Text>
          <View style={[styles.add, inCart > 0 && styles.addActive, soldOut && styles.addDisabled]}>
            {inCart > 0 ? <Text style={styles.addCount}>{inCart}</Text> : <Ionicons name="add" size={20} color="#fff" />}
          </View>
        </View>
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
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search products or SKU"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search catalog"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          {categories.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setCategory(entry)}
              style={[styles.chip, category === entry && styles.chipActive]}>
              <Text style={[styles.chipText, category === entry && styles.chipTextActive]}>{entry}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="cube-outline" size={36} color={colors.border} />
              <Text style={styles.empty}>{query ? 'No products match your search.' : 'No products loaded yet.'}</Text>
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
            <Ionicons name="arrow-forward" size={20} color="#fff" />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: 15, color: colors.text },
  chipScroll: { flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 34,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 4, gap: spacing.md },
  column: { gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardSoldOut: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  monogram: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  monogramText: { fontSize: 14, fontWeight: '800' },
  stockPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.successSoft },
  stockLow: { backgroundColor: colors.warningSoft },
  stockOut: { backgroundColor: colors.dangerSoft },
  stockText: { fontSize: 11, fontWeight: '700', color: colors.success },
  stockTextLow: { color: colors.warning },
  stockTextOut: { color: colors.danger },
  name: { ...typography.body, fontWeight: '700', minHeight: 40 },
  unit: typography.caption,
  cardBottom: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, fontWeight: '800', color: colors.text },
  add: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addActive: { backgroundColor: colors.ink },
  addDisabled: { backgroundColor: colors.border },
  addCount: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptyWrap: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
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
  barBadgeText: { color: '#fff', fontWeight: '800' },
  barText: { flex: 1 },
  barLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  barTotal: { color: '#fff', fontWeight: '800', fontSize: 17 },
});
