# Van POS — offline-first field sales terminal

React Native (Expo Router + TypeScript) front end for the Android POS / Sage ERP order-sync
architecture. Offline sell/load/checkout runs on device; sync talks to Laravel when configured.

## Architecture mapping

| Diagram block | Implementation |
| --- | --- |
| POS sell (van stock), cart & checkout UI | `src/app/(tabs)/index.tsx`, `cart.tsx`, `src/app/checkout.tsx` |
| Offline/online sync indicator | `src/components/SyncIndicator.tsx` |
| Client OTP verification modal | `src/components/OtpModal.tsx` |
| Outbox & idempotency queue manager | `src/core/syncEngine.ts` |
| Local van stock deduction engine | `PosStore.commitOrder` (atomic deduct + outbox insert) |
| Secure OTP generator & SHA-256 verifier | `src/core/otp.ts` (`expo-crypto`) |
| Encrypted local storage (SQLite) | `src/db/sqliteStore.ts` (SQLCipher key held in `expo-secure-store`) |
| `products_cache` / `customers_cache` / `van_stock_cache` / `offline_orders_outbox` | tables in `src/db/sqliteStore.ts` |
| Android telephony `SmsManager` (direct SIM) | `modules/van-pos-sms` (Android) + `src/services/sms.ts` |
| iOS Messages composer (OTP) | `modules/van-pos-sms` (iOS MessageUI) |
| Bluetooth thermal printer (58/80mm) | `modules/van-pos-printer` (Android SPP + iOS BLE) |
| Sync REST API, bearer token, document numbering | `src/services/syncApi.ts` |

## Order flow

1. Rep signs in on device (calls `/auth/token` when `EXPO_PUBLIC_SYNC_API_URL` is set).
2. Sell and cart draw from local van stock; **Load** adds units onto the van.
3. Checkout generates a 4-digit OTP, stores a SHA-256 digest, and sends the code:
   - **Android:** silent SIM SMS (`SmsManager`)
   - **iOS:** Messages composer (Apple requires the rep to tap Send)
4. Customer reads the code back; verification compares digests.
5. Order is committed: stock deducted + row in `offline_orders_outbox`.
6. Sync pulls catalogue/van stock and pushes queued orders (when the API URL is set).
7. Receipts print over Bluetooth (Android Classic SPP / iOS BLE) on a development build.

## Running

```sh
npm install
npm start                 # Expo Go — SMS/printer simulated
npx expo run:android      # Dev build — SmsManager + Classic BT print
npx expo run:ios          # Dev build — Messages composer + BLE print
npm run web               # Browser preview (MemoryStore)
```

Set the backend base URL (no trailing slash), e.g.:

```sh
EXPO_PUBLIC_SYNC_API_URL=https://api.example.com/api/v1 npx expo start
```

Expected routes: `POST /auth/token`, `GET /sync/delta`, `POST /sync/orders`.

Printer addressing:
- **Android:** set `DEFAULT_PRINTER.address` to the device MAC (`AA:BB:…`) in `src/services/printer.ts`
- **iOS:** use the printer BLE name (or CoreBluetooth UUID). If `address` looks like a MAC, the app scans using `DEFAULT_PRINTER.name` instead

Web preview uses MemoryStore; native SMS/printer need a device build.
