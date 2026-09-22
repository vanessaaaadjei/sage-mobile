import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductImage } from "../../components/ProductImage";
import { QtyStepper } from "../../components/QtyStepper";
import { Screen } from "../../components/Screen";
import { formatMoney } from "../../core/cart";
import type { Product } from "../../core/types";
import { usePos } from "../../state/PosProvider";
import {
  colors,
  radius,
  shadow,
  spacing,
  typography,
} from "../../theme";

type Category = { name: string; count: number; cover?: Product };

export default function CatalogScreen() {
  const router = useRouter();
  const {
    products,
    addToCart,
    setCartQty,
    availableStock,
    cart,
    cartTotals,
    syncNow,
    rep,
    signOut,
  } = usePos();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo<Category[]>(() => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const list = groups.get(product.category) ?? [];
      list.push(product);
      groups.set(product.category, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => ({
        name,
        count: list.length,
        cover: list.find((p) => p.imageUrl) ?? list[0],
      }));
  }, [products]);

  const needle = query.trim().toLowerCase();
  const browsing = category !== null || needle.length > 0;

  const items = useMemo<Product[]>(() => {
    if (!browsing) return [];
    return products
      .filter((product) => {
        if (category !== null && product.category !== category) return false;
        return (
          !needle ||
          product.name.toLowerCase().includes(needle) ||
          product.sku.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, needle, category, browsing]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const goBack = () => {
    setCategory(null);
    setQuery("");
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.rowPressed]}
      onPress={() => setCategory(item.name)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.count} products`}
    >
      {item.cover ? (
        <ProductImage product={item.cover} size={64} />
      ) : (
        <View style={styles.cardIcon}>
          <Ionicons name="cube-outline" size={28} color={colors.primary} />
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.cardCount}>
        {item.count} {item.count === 1 ? "item" : "items"}
      </Text>
    </Pressable>
  );

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    const stock = availableStock(item.id);
    const inCart = cart.find((line) => line.product.id === item.id)?.qty ?? 0;
    const remaining = stock - inCart;
    const soldOut = remaining <= 0 && inCart === 0;
    const low = !soldOut && remaining <= 5;
    const last = index === items.length - 1;
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
        onPress={() => addToCart(item)}
      >
        <ProductImage product={item} size={56} />
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {category === null ? `${item.category} · ` : ""}
            {formatMoney(item.price)} / {item.unit}
            {soldOut ? " · Sold out" : low ? ` · ${remaining} left` : ""}
          </Text>
        </View>
        {inCart > 0 ? (
          <QtyStepper
            value={inCart}
            max={stock}
            onChange={(qty) => setCartQty(item.id, qty)}
          />
        ) : (
          <View style={[styles.add, soldOut && styles.addDisabled]}>
            <Ionicons
              name="add"
              size={20}
              color={soldOut ? colors.textMuted : colors.textOnPrimary}
            />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Screen
        title={category ?? "Catalog"}
        subtitle={
          category
            ? `${items.length} ${items.length === 1 ? "product" : "products"}`
            : `Hi ${rep?.name.split(" ")[0] ?? ""} · Van ${rep?.vanCode ?? ""}`
        }
        onBack={category ? goBack : undefined}
        onIndicatorPress={syncNow}
        onSignOut={
          category
            ? undefined
            : () => {
                signOut();
                router.replace("/");
              }
        }
      >
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={category ? `Search in ${category}` : "Search all products"}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search catalog"
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        {browsing ? (
          <FlatList
            data={items}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="search-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.empty}>
                  {needle
                    ? `Nothing matches “${query.trim()}”${category ? ` in ${category}` : ""}.`
                    : `No products in ${category}.`}
                </Text>
              </View>
            }
          />
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.grid}
          >
            {categories.map((item) => (
              <View key={item.name} style={styles.gridCell}>
                {renderCategory({ item })}
              </View>
            ))}
            {categories.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No products yet</Text>
                <Text style={styles.empty}>
                  Your catalog will appear here after the first sync.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        {cartCount > 0 ? (
          <Pressable
            style={styles.bar}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <View style={styles.barBadge}>
              <Text style={styles.barBadgeText}>{cartCount}</Text>
            </View>
            <View style={styles.barText}>
              <Text style={styles.barLabel}>View cart</Text>
              <Text style={styles.barTotal}>
                {formatMoney(cartTotals.total)}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.textOnPrimary}
            />
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 4,
    flexGrow: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg - spacing.sm / 2,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 4,
    flexGrow: 1,
  },
  gridCell: { width: "50%", padding: spacing.sm / 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardCount: typography.caption,
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowSoldOut: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: typography.caption,
  add: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addDisabled: { backgroundColor: colors.surfaceMuted },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: typography.heading,
  empty: { textAlign: "center", color: colors.textMuted },
  bar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadow.floating,
  },
  barBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  barBadgeText: { color: colors.textOnPrimary, fontWeight: "800" },
  barText: { flex: 1 },
  barLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  barTotal: { color: colors.textOnPrimary, fontWeight: "800", fontSize: 17 },
});
