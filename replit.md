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
- Order management with status tracking (received → preparing → ready)
- Admin panel: products, prices, users, notifications, tabs management
- Push notifications system
- About/contact pages

### User Roles
- **Customer**: sees retail prices, can order
- **Merchant**: sees wholesale prices (approved by admin)
- **Employee**: limited admin access
- **Admin**: full control

### Demo accounts
- `0000000001` → Admin
- `0000000002` → Merchant  
- `0000000003` → Employee
- Any other number → Customer

### Key Files
- `app/_layout.tsx` — root layout with providers and splash screen
- `app/(tabs)/` — main tab screens (home, products, orders, contact)
- `app/product/[id].tsx` — product detail with color selection
- `app/cart.tsx` — shopping cart
- `app/order/[id].tsx` — order detail with status tracking
- `app/admin/` — admin management screens
- `context/AppContext.tsx` — global state with AsyncStorage persistence
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
