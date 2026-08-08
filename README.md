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
4. (Seed script and `npm run dev` command land in Task 2/3.)

### Environment Variables

| Key            | Description                                                        |
|----------------|---------------------------------------------------------------------|
| `DATABASE_URL` | Supabase pooled connection (port 6543) — used by the app at runtime |
| `DIRECT_URL`   | Supabase direct connection (port 5432) — used by Prisma Migrate     |
| `JWT_SECRET`   | Secret used to sign/verify JWTs                                     |
| `PORT`         | Port the Express server listens on                                  |

Prisma 6 reads these directly from `.env` (no `prisma.config.ts` needed).

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
- [ ] Task 2 — Express app skeleton, error handling, health check, Prisma client singleton
- [ ] Task 3 — Auth (seed script, login, JWT middleware, role guards)
- [ ] Task 4 — Customer CRM APIs
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
