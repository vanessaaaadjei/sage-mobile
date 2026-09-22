import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  SectionList,
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

type Section = { title: string; data: Product[] };

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
  const [category, setCategory] = useState("All");

  const categories = useMemo(
    () => [
      "All",
      ...[...new Set(products.map((product) => product.category))].sort(
        (a, b) => a.localeCompare(b),
      ),
    ],
    [products],
  );

  const sections = useMemo<Section[]>(() => {
    const needle = query.trim().toLowerCase();
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      if (category !== "All" && product.category !== category) continue;
      if (
        needle &&
        !product.name.toLowerCase().includes(needle) &&
        !product.sku.toLowerCase().includes(needle)
      )
        continue;
      const list = groups.get(product.category) ?? [];
      list.push(product);
      groups.set(product.category, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({
        title,
        data: [...data].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [products, query, category]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: Product;
    index: number;
    section: Section;
  }) => {
    const stock = availableStock(item.id);
    const inCart = cart.find((line) => line.product.id === item.id)?.qty ?? 0;
    const remaining = stock - inCart;
    const soldOut = remaining <= 0 && inCart === 0;
    const low = !soldOut && remaining <= 5;
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
        onPress={() => addToCart(item)}
      >
        <ProductImage product={item} size={56} />
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
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
        title="Catalog"
        subtitle={`Hi ${rep?.name.split(" ")[0] ?? ""} · Van ${rep?.vanCode ?? ""}`}
        onIndicatorPress={syncNow}
        onSignOut={() => {
          signOut();
          router.replace("/");
        }}
      >
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search products"
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

        <View style={styles.tabs}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.tabsContent}
          >
            {categories.map((name) => {
              const active = name === category;
              return (
                <Pressable
                  key={name}
                  onPress={() => setCategory(name)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <SectionList
          sections={sections}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.header}>
              <Text style={styles.headerText}>{section.title}</Text>
              <Text style={styles.headerCount}>{section.data.length}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="cube-outline"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {query || category !== "All" ? "No matches" : "No products yet"}
              </Text>
              <Text style={styles.empty}>
                {query
                  ? `Nothing matches “${query}”${category !== "All" ? ` in ${category}` : ""}.`
                  : category !== "All"
                    ? `No products in ${category}.`
                    : "Your catalog will appear here after the first sync."}
              </Text>
            </View>
          }
        />

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
    paddingBottom: spacing.xl * 4,
    flexGrow: 1,
  },
  tabs: { height: 52, flexShrink: 0, marginTop: spacing.sm },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  tab: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  tabTextActive: { color: colors.textOnPrimary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.background,
  },
  headerText: typography.heading,
  headerCount: { ...typography.caption, fontWeight: "700" },
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
