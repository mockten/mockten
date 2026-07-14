# ecfront

Frontend for mockten — a React + Vite + TypeScript single-page app that hosts **three** surfaces: the buyer **storefront**, the **Seller Portal** (`/seller/*`), and the **Admin Portal** (`/admin/*`). It talks to the backend exclusively through the Kong API gateway under `/api/*`.

> The Developer Dashboard is a separate app under [`monitoring/dashboard`](../monitoring), not part of ecfront.

## Layout

```
ecfront/
├── src/
│   ├── App.tsx                 # top-level routes for all three surfaces
│   ├── main.tsx                # app entrypoint
│   ├── pages/                  # storefront pages (Dashboard, ItemDetail, cart, order-history, …)
│   │   ├── admin/              # Admin Portal (login, dashboard, create/edit user, adminApi.ts)
│   │   └── seller/             # Seller Portal (login, sign-up, portal, components)
│   └── ...
├── tests/                      # Playwright end-to-end specs (scenario-*.spec.ts, dashboard.spec.ts)
├── vite.config.ts              # dev server, optimizeDeps pre-bundling, route warmup
├── vitest.config.ts            # unit-test config (scoped to src/**/*.test.ts)
├── .env.development            # dev environment variables (copied to .env by build:dev)
├── .env.production             # prod environment variables (copied to .env by build:prod)
└── Dockerfile
```

### Route map (`src/App.tsx`)

| Surface | Entry route | Notes |
|---------|-------------|-------|
| Storefront | `/` (login `/user/login`) | Buyer shop; most routes are behind `PrivateRoute`. |
| Seller Portal | `/seller/login` → `/seller/portal` | Sign-up at `/seller/signup`. |
| Admin Portal | `/admin` (login) → `/admin/dashboard` | Create user at `/admin/user/create`. |

## Environment variables

Vite reads variables from `.env` at build time. `build:dev` / `build:prod` copy `.env.development` / `.env.production` into `.env` first. Only variables prefixed `VITE_` are exposed to client code (the legacy `REACT_APP_*` values are retained for older service URLs).

| Variable | Example (dev) | Purpose |
|----------|---------------|---------|
| `VITE_STRIPE_PUBLIC_KEY` | `pk_test_…` | Stripe **publishable** test key for the checkout card form (safe to expose; not a secret key). |
| `REACT_APP_SEARCH_API` | `http://dev-searchitem-svc.dev-mockten.svc.cluster.local:50051` | Search service base URL. |
| `REACT_APP_ADDITEM_API` | `http://dev-adder-svc…:50051` | Add-item service base URL. |
| `REACT_APP_ACCOUNT_API` | `http://dev-account-svc…:50051` | Account service base URL. |
| `REACT_APP_ADMIN_API` | `http://dev-admin-svc…:50051` | Admin service base URL. |

`.env.production` mirrors these with `prod-*` hostnames. To point at your own environment, edit the matching `.env.*` file and rebuild.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server (HMR). |
| `npm run build:dev` | Copy `.env.development` → `.env`, typecheck, and build. |
| `npm run build:prod` | Copy `.env.production` → `.env`, typecheck, and build. |
| `npm run test` | Run the Vitest unit tests (`src/**/*.test.ts`). |
| `npm run lint` | ESLint over `ts`/`tsx`. |

## Testing

- **Unit tests** (Vitest): live next to the code they cover, e.g. `src/pages/admin/adminApi.test.ts`. Run with `npm run test`. Wired into CI (`build_ecfront`).
- **End-to-end tests** (Playwright): under `tests/` (`scenario-*.spec.ts`, `scenario-seller.spec.ts`, `dashboard.spec.ts`). Run from the repo root via `task e2e` / `task e2e_sales` / `task ie2e` against the running stack.
