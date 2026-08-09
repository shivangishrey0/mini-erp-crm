# Mini ERP + CRM Operations Portal

A small internal ERP/CRM case study for a wholesale/distribution company.
Covers customer relationship management, product & inventory tracking, and
sales challan (delivery note) issuance, with role-based access for four
internal staff roles: ADMIN, SALES, WAREHOUSE, ACCOUNTS.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express, Prisma ORM 6
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT (`jsonwebtoken`, `bcryptjs`), role-based access control
- **Validation:** Zod
- **Frontend (planned, Task 7+):** React (plain JS) + Vite, react-router-dom, axios

## Project Structure

```
mini-erp-crm/
├── server/     Express + Prisma API
└── client/     React frontend (not started yet)
```

## Backend Setup

1. `cd server && npm install`
2. Copy `.env.example` to `.env` and fill in the real values (see table below).
3. Run the initial migration: `npx prisma migrate dev`
4. Seed test users: `npx prisma db seed` — creates one user per role (see Test Credentials below)
5. Start the dev server: `npm run dev` — runs on `http://localhost:<PORT>`
6. Check `GET /health` — returns `{ "status": "ok" }` if the app and database are both reachable.

### Environment Variables

| Key            | Description                                                        |
|----------------|---------------------------------------------------------------------|
| `DATABASE_URL` | Supabase pooled connection (port 6543) — used by the app at runtime |
| `DIRECT_URL`   | Supabase direct connection (port 5432) — used by Prisma Migrate     |
| `JWT_SECRET`   | Secret used to sign/verify JWTs                                     |
| `PORT`         | Port the Express server listens on                                  |

Prisma 6 reads these directly from `.env` (no `prisma.config.ts` needed).

## Test Credentials

Created by `npx prisma db seed`. All 4 roles share the same password (dev/test-only, never do
this in production).

| Email                   | Password       | Role       |
|--------------------------|----------------|------------|
| `admin@example.com`      | `Password123!` | ADMIN      |
| `sales@example.com`      | `Password123!` | SALES      |
| `warehouse@example.com`  | `Password123!` | WAREHOUSE  |
| `accounts@example.com`   | `Password123!` | ACCOUNTS   |

## API Endpoints

| Method | Path              | Auth              | Description                          |
|--------|-------------------|-------------------|---------------------------------------|
| GET    | `/health`         | none              | Liveness + DB connectivity check      |
| POST   | `/auth/login`     | none              | Returns `{ token, user }` on success  |
| GET    | `/auth/me`        | Bearer token      | Returns the current user's profile    |
| GET    | `/auth/admin-only`| Bearer token, ADMIN only | Temporary roleGuard smoke test — remove once Task 4+ adds real role-restricted routes |
| GET    | `/customers`      | Bearer token (any role) | List, paginated. Query: `page`, `pageSize`, `search` (name/businessName/mobile/email), `type`, `status` |
| GET    | `/customers/:id`  | Bearer token (any role) | Detail, includes follow-up notes |
| GET    | `/customers/:id/follow-ups` | Bearer token (any role) | Paginated follow-up notes for a customer |
| POST   | `/customers`      | ADMIN, SALES      | Create a customer |
| PATCH  | `/customers/:id`  | ADMIN, SALES      | Partial update (e.g. just `status`) |
| POST   | `/customers/:id/follow-ups` | ADMIN, SALES | Add a follow-up note |

## Database Schema

Defined in `server/prisma/schema.prisma`. Core models:

- **User** — staff accounts, one of 4 roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`)
- **Customer** — CRM record (type, status, follow-up date, notes)
- **FollowUpNote** — many-per-customer follow-up log, linked to the user who wrote it
- **Product** — SKU, category, `Decimal` unit price, current stock, min stock alert, location
- **StockMovement** — audit log of every stock change (IN/OUT, quantity, reason, who, when)
- **Challan** — sales delivery note (DRAFT / CONFIRMED / CANCELLED), linked to a customer
- **ChallanItem** — line items on a challan; stores a snapshot of `productName`/`sku`/`unitPrice`
  at creation time (in addition to the live `productId` reference), so historical challans stay
  accurate even if a product's price or name changes later

## Progress

- [x] **Task 1** — TypeScript config, Prisma schema, initial migration, `.env.example`
- [x] **Task 2** — Express app skeleton, error handling, health check, Prisma client singleton
- [x] **Task 3** — Auth (seed script, login, JWT middleware, role guards)
- [x] **Task 4** — Customer CRM APIs
- [ ] Task 5 — Product & stock movement APIs
- [ ] Task 6 — Challan APIs (draft/confirm/cancel, stock transaction logic)
- [ ] Task 7 — Frontend setup
- [ ] Task 8 — Frontend pages
- [ ] Task 9 — Polish
- [ ] Task 10 — Docs & submission prep

## Assumptions & Decisions

- **Prisma 6, not 7** — deliberately pinned to avoid v7's driver-adapter/`prisma.config.ts`
  requirements; `.env` is read directly by Prisma via the `url`/`directUrl` fields in the
  schema's `datasource` block.
- **CommonJS, not ESM** — `tsconfig.json` targets CommonJS/`node16` module resolution for
  reliable `ts-node-dev` support in local development.
- **Stock-never-negative is an application-layer rule** (enforced inside a Prisma
  `$transaction` in the challan-confirm endpoint, Task 6), not a database `CHECK` constraint.
- **`Customer.mobile` is not unique** — multiple contacts at the same business may share a
  phone number.
- **TypeScript pinned to 5.9.3, not 7.x** — `ts-node-dev`/`ts-node` (the dev-time TS runner)
  don't yet support TypeScript 7's internal compiler API changes and crash on startup with it.
  5.9.3 is the current stable line most tooling targets.
- **Error handling** — a single `AppError` class + centralized Express error-handling
  middleware (`src/middleware/errorHandler.ts`). Route code throws `AppError(status, message)`
  for expected failures (validation, not found, business rules); anything else falls through
  as a generic 500. Keeps error formatting consistent across every endpoint instead of each
  route handling errors ad hoc.
- **Auth vs. role guard are separate middlewares** — `authMiddleware` answers "who is this?"
  (valid token → `req.user`), `roleGuard(allowedRoles)` answers "are they allowed to do this?".
  Routes compose them independently instead of one monolithic check.
- **JWT payload is minimal** — just `{ userId, role }`, not the full user object, so tokens
  stay small and never go stale if a user's name/email changes without re-login. Token expiry
  is 8h (workday-length session for an internal staff tool).
- **Login returns the same error for "no such user" and "wrong password"** (401, generic
  message) so the response can't be used to enumerate registered emails.
- **Customer CRM has no DELETE endpoint** — the brief only calls for add/edit/search/detail/
  follow-ups. Deactivation goes through `PATCH /customers/:id` with `status: "INACTIVE"`
  instead. This also sidesteps `Challan.customerId` being `ON DELETE RESTRICT` — a customer
  with sales history couldn't be hard-deleted anyway without deleting their challans first.
- **Customer read access is open to any authenticated role; writes are ADMIN + SALES only** —
  CRM is a sales function, but ACCOUNTS/WAREHOUSE still need to view customer data (GST info
  for invoicing, customer name on challans).
