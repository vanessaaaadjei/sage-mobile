import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Van POS',
  slug: 'van-pos',
  scheme: 'vanpos',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vanpos.app',
    infoPlist: {
      NSBluetoothAlwaysUsageDescription:
        'Van POS uses Bluetooth to print receipts on a thermal printer.',
      NSBluetoothPeripheralUsageDescription:
        'Van POS uses Bluetooth to print receipts on a thermal printer.',
    },
  },
  android: {
    package: 'com.vanpos.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.SEND_SMS',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-sqlite',
      {
        useSQLCipher: true,
      },
    ],
    'expo-secure-store',
    'expo-image',
  ],
  extra: {
    syncApiUrl: process.env.EXPO_PUBLIC_SYNC_API_URL ?? null,
    catalogApiUrl:
      process.env.EXPO_PUBLIC_CATALOG_API_URL ??
      'https://eclcommerce.ernestchemists.com.gh/api/get-all-products',
  },
  experiments: {
    typedRoutes: true,
  },
});
