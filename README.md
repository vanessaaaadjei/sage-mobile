# Van POS — offline-first field sales terminal

React Native (Expo Router + TypeScript) front end for the Android POS / Sage ERP order-sync
architecture. Front end only — there is no backend and no mock server. The sync client in
`src/services/syncApi.ts` is a set of unimplemented hooks; everything else (catalogue, cart, OTP,
van stock, outbox, receipts) runs entirely on the device.

## Architecture mapping

| Diagram block | Implementation |
| --- | --- |
| POS catalog, cart & checkout UI | `src/app/(tabs)/index.tsx`, `cart.tsx`, `src/app/checkout.tsx` |
| Offline/online sync indicator | `src/components/SyncIndicator.tsx` |
| Client OTP verification modal | `src/components/OtpModal.tsx` |
| Outbox & idempotency queue manager | `src/core/syncEngine.ts` |
| Local van stock deduction engine | `PosStore.commitOrder` (atomic deduct + outbox insert) |
| Secure OTP generator & SHA-256 verifier | `src/core/otp.ts` (`expo-crypto`) |
| Encrypted local storage (SQLite) | `src/db/sqliteStore.ts` (SQLCipher key held in `expo-secure-store`) |
| `products_cache` / `customers_cache` / `van_stock_cache` / `offline_orders_outbox` | tables in `src/db/sqliteStore.ts` |
| Android telephony `SmsManager` (direct SIM) | `src/services/sms.ts` |
| Bluetooth thermal printer (58/80mm) | `src/services/printer.ts` |
| Sync REST API, bearer token, document numbering | `src/services/syncApi.ts` (unimplemented hooks) |

## Order flow

1. Rep signs in against the device (no auth service is called).
2. Catalog and cart draw from the local caches; quantities are capped by van stock on hand.
3. Checkout generates a random 4-digit OTP, stores only its SHA-256 digest, and sends the code over
   the SIM's GSM channel so it reaches basic handsets with no data.
4. The customer reads the code back; verification compares digests.
5. On success the order is committed in one transaction: van stock is deducted and the order lands in
   `offline_orders_outbox` with a stable idempotency key.
6. The order stays queued until a sync endpoint exists. `SyncEngine` already pulls the catalogue
   delta and pushes queued orders in batches, deduplicating on the idempotency key; with no backend
   wired up, `Sync now` reports that the endpoint is not configured.
7. Receipts render as ESC/POS text for the 58mm or 80mm Bluetooth printer.

## Running

```sh
npm install
npm run android   # device or emulator
npm run web       # browser preview
```

The van's starting catalogue, customers and stock are seeded into the local caches on first launch
from `src/data/seed.ts`; once the delta endpoint is implemented those rows come from the depot
instead.

Web preview uses a localStorage-backed implementation of the same `PosStore` contract, since
`expo-sqlite` and the native SMS/printer modules are device-only. Everything else — stock deduction,
OTP hashing and receipt rendering — is the shared code path.

## Wiring a backend

Replace the bodies of `SyncApi.login`, `pullDelta` and `pushOrders` in `src/services/syncApi.ts` with
`fetch` calls to your endpoints (bearer token, `since` cursor, `Idempotency-Key` header). No other
module changes. Direct-SIM SMS and Bluetooth printing need a development build with the native
modules wired into `src/services/sms.ts` and `src/services/printer.ts`.
