import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { usePos } from '../../state/PosProvider';
import { colors, radius } from '../../theme';

export default function TabsLayout() {
  const { rep, cart, pendingCount } = usePos();
  if (!rep) return <Redirect href="/" />;

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.ink, fontSize: 10, fontWeight: '700', borderRadius: radius.pill },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartCount || undefined,
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarBadge: pendingCount || undefined,
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Van stock',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
