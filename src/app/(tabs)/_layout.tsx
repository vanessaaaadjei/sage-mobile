import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors, radius } from '../../theme';

type TabIconProps = { color: ColorValue; size: number; focused: boolean };

function SellIcon({ color, size, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={size} />;
}

function CartIcon({ color, size, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'cart' : 'cart-outline'} color={color} size={size} />;
}

function OrdersIcon({ color, size, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'receipt' : 'receipt-outline'} color={color} size={size} />;
}

const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 64,
    paddingTop: 6,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  tabBarBadgeStyle: {
    backgroundColor: colors.primary,
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '600' as const,
    borderRadius: radius.sm,
  },
};

const sellOptions = { title: 'Sell', tabBarIcon: SellIcon };
const cartOptions = { title: 'Cart', tabBarIcon: CartIcon };
const ordersOptions = { title: 'Orders', tabBarIcon: OrdersIcon };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={sellOptions} />
      <Tabs.Screen name="cart" options={cartOptions} />
      <Tabs.Screen name="orders" options={ordersOptions} />
    </Tabs>
  );
}
