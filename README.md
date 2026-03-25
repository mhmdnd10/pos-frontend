# POS Admin SPA (Frontend)

Production-focused POS Admin SPA scaffolded with:
- React + Vite + TypeScript
- React Router
- Tailwind CSS + shadcn-style reusable UI primitives
- TanStack Query
- Axios
- React Hook Form + Zod
- ESLint + Prettier

## 1) Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   copy .env.example .env
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
4. Quality checks:
   ```bash
   npm run lint
   npm run build
   npm run format:check
   ```

## 2) Environment

`.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 3) Architecture (Feature-Based)

- `src/features/auth`
- `src/features/dashboard`
- `src/features/categories`
- `src/features/products`
- `src/features/suppliers`
- `src/features/customers`
- `src/features/purchases`
- `src/features/sales`
- `src/features/customer-payments`
- `src/features/supplier-payments`
- `src/components/shared`
- `src/lib/api`
- `src/lib/types`
- `src/lib/utils`
- `src/lib/constants`

## 4) Implemented in Phase 1

- Project initialization and tooling setup
- API client with:
  - Base URL from `VITE_API_BASE_URL`
  - Bearer token interceptor
  - Global 401 handling (clear session + redirect to `/login`)
- Auth module:
  - Login, Register, Forgot Password, Reset Password, Change Password
  - Route guard for protected pages
  - Auth session persistence in localStorage
  - Zod validation + RHF forms
- Protected layout shell
- Dashboard page wired to backend endpoint
- Shared reusable components:
  - `DataTable`
  - `ConfirmDialog`
  - `FormField`
  - `PageHeader`

## 5) Endpoint Coverage Checklist

| Page/Module | Endpoint(s) | Status |
|---|---|---|
| Login | `POST /api/login` | ✅ wired |
| Register | `POST /api/register` | ✅ wired |
| Forgot Password | `POST /api/forgot-password` | ✅ wired |
| Reset Password | `POST /api/reset-password` | ✅ wired |
| Change Password | `POST /api/change-password` | ✅ wired |
| Logout (Protected Layout) | `POST /api/logout` | ✅ wired |
| Dashboard | `GET /api/dashboard` | ✅ wired |
| Categories | `GET/POST/PUT/DELETE /api/categories` | ⏳ scaffolded (next phase) |
| Products | `GET/POST/GET by id/PUT/DELETE /api/products` | ⏳ scaffolded (next phase) |
| Product Import | `POST /api/products/import` | ⏳ scaffolded (next phase) |
| Products by Category | `GET /api/products/category/{categoryId}` | ⏳ scaffolded (next phase) |
| Suppliers | `GET/POST/GET by id/PUT/DELETE /api/suppliers` | ⏳ scaffolded (next phase) |
| Supplier Ledger | `GET /api/suppliers/{id}/ledger` | ⏳ scaffolded (next phase) |
| Customers | `GET/POST/GET by id/PUT/DELETE /api/customers` | ⏳ scaffolded (next phase) |
| Customer Ledger | `GET /api/customers/{id}/ledger` | ⏳ scaffolded (next phase) |
| Purchases | `GET/POST/GET by id /api/purchases` | ⏳ scaffolded (next phase) |
| Sales | `GET/POST/GET by id /api/sales` | ⏳ scaffolded (next phase) |
| Customer Payments | `GET/POST/GET by id /api/customer-payments` | ⏳ scaffolded (next phase) |
| Supplier Payments | `GET/POST/GET by id /api/supplier-payments` | ⏳ scaffolded (next phase) |
| Email Verify Route | `/email/verify/:token` | ✅ route scaffolded |

## 6) Notes

- No backend code is created; this frontend integrates with the existing Laravel API.
- All API endpoints are centralized in `src/lib/constants/endpoints.ts`.
- All TanStack Query keys are centralized in `src/lib/constants/queryKeys.ts`.
