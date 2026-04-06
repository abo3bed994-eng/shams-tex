# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) — Shams Tex
  - Icons: ALL icons use `lucide-react-native` via `components/Icon.tsx` — NO `@expo/vector-icons`
  - AppSettings includes: stats (clients/products/years), subcategories (Record<string, string[]>), TikTok in social
  - Product: has optional `subcategory?: string` field
  - Weight ordering: per-color kilo weight with individual +/- controls
  - products.tsx: "غير متوفر" special filter + subcategory chips
  - admin/settings.tsx: category reordering (↑/↓), stats editing, subcategory management

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── mockup-sandbox/     # Design mockup preview server
│   └── shamstex/           # Shams Tex Expo mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Shams Tex Mobile App (`artifacts/shamstex`)

Expo React Native app for Shams Tex fabric company.

### Features
- Luxury black + gold design
- OTP phone login with user roles (customer, merchant, employee, admin)
- Product catalog with fabric listings, colors, retail/wholesale pricing
- Cart with weight-based and piece-based ordering
- Order management with status tracking (pending → received → preparing → ready → delivered)
- Return/refund system: customers can request return within 15 days of delivery, staff approve/reject
- Admin panel: products, prices, users, notifications, tabs management
- Push notifications system
- About/contact pages

### User Roles
- **Customer**: sees retail prices, can order
- **Merchant**: sees wholesale prices (approved by admin)
- **Employee**: limited admin access, permissions from admin
- **Supervisor**: broader admin access, can manage staff
- **Admin**: full control

### Permissions System
- Employee/Supervisor permissions stored in Firestore `customers` collection
- Permissions: `view_orders`, `edit_orders`, `view_products`, `edit_products`, `view_users`, `send_notifications`, `manage_staff`, `approve_upgrades`, `delete_orders`
- Admin screens guarded by `useAdminGuard(permission)` hook — unauthorized access redirects back
- Permission changes sync in real-time to logged-in staff sessions

### Session Management
- Single-device enforcement: login from new device invalidates previous session via Firestore `sessions` collection
- Session token checked on app startup — mismatched token triggers auto-logout

### Order Editing by Customer
- Staff can mark an order as "editable" when an item is unavailable (button in order detail)
- Customer sees a yellow banner and "تعديل الطلب" button; opens cart pre-filled with order items
- Cart in edit mode shows "تصفح المنتجات لإضافة بديل" button to browse products
- On submit, `updateOrderItems` updates the order and clears editable flag
- Customer cannot edit orders otherwise
- Merchants see "اتصل بالجملة والتجار" call button in cart for piece orders

### Staff Order Locking
- When a staff member receives an order, `assignedTo` and `assignedToName` are set
- Other staff (except admin) cannot advance the order (buttons hidden, lock message shown)
- "استلمه: [name]" card displayed for all staff in order detail

### Real-time Sync
- Firestore listeners for: orders, customers, notifications, products
- Product order changes by admin reflect instantly for all users
- Permission/role changes sync to active sessions automatically
- `saveOrder` strips `undefined` values before Firestore write to avoid silent failures

### Demo accounts
- `0000000001` → Admin
- `0000000002` → Merchant  
- `0000000003` → Employee (default: view_orders, view_products)
- `0000000004` → Supervisor (default: view_orders, edit_orders, view_products, view_users, send_notifications, approve_upgrades)
- Any other number → Customer

### Key Files
- `app/_layout.tsx` — root layout with providers and splash screen
- `app/(tabs)/` — main tab screens (home, products, orders, contact)
- `app/product/[id].tsx` — product detail with color selection
- `app/cart.tsx` — shopping cart with try-catch checkout
- `app/order/[id].tsx` — order detail with status tracking
- `app/admin/` — admin management screens (all guarded by useAdminGuard)
- `context/AppContext.tsx` — global state with AsyncStorage persistence + Firestore listeners
- `hooks/useAdminGuard.ts` — permission guard hook for admin screens
- `hooks/useColors.ts` — design token hook
- `lib/firebase.ts` — Firestore operations + real-time subscriptions
- `lib/pushService.ts` — Expo push notifications
- `constants/colors.ts` — black/gold luxury design tokens

### Pricing Logic
- Weight orders: price = weight × unit price (shown immediately)
- Piece orders: "Contact sales" message (no price shown)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config.

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.
