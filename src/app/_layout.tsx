import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PosProvider } from '../state/PosProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PosProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="checkout" options={{ presentation: 'modal', headerShown: true, title: 'Checkout' }} />
        </Stack>
      </PosProvider>
    </SafeAreaProvider>
  );
}
