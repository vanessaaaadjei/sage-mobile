import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { memo, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PosProvider } from '../state/PosProvider';
import { colors } from '../theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

const STACK_OPTIONS = { headerShown: false };

const CHECKOUT_OPTIONS = {
  presentation: 'modal' as const,
  headerShown: true,
  title: 'Checkout',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: { fontWeight: '600' as const, color: colors.text },
  headerTintColor: colors.primary,
};

/**
 * Navigators stay outside Pos context subscriptions.
 * Catalogue/cart updates must not recreate Stack/Tabs — that triggers
 * "Maximum update depth exceeded" inside React Navigation.
 */
const AppNavigators = memo(function AppNavigators() {
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkout" options={CHECKOUT_OPTIONS} />
    </Stack>
  );
});

function Providers({ children }: { children: ReactNode }) {
  return <PosProvider>{children}</PosProvider>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="dark" />
        <AppNavigators />
      </Providers>
    </SafeAreaProvider>
  );
}
