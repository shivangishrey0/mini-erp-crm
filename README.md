# Mini ERP + CRM Operations Portal

A small internal ERP/CRM case study for a wholesale/distribution company. Covers customer
relationship management, product & inventory tracking, and sales challan (delivery note)
issuance, with role-based access for four internal staff roles: ADMIN, SALES, WAREHOUSE,
ACCOUNTS.

## Live Demo

- **Frontend:** https://mini-erp-4srcm9cn0-shivangi-shreyas-projects.vercel.app
- **Backend API:** https://mini-erp-crm-api-9dba.onrender.com (health check: `/health`)
- **Test credentials:** see [Test Credentials](#test-credentials) below.

The backend is on Render's free tier and spins down after ~15 minutes of inactivity — the first
request after idle time can take 30-50 seconds to wake it back up.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express, Prisma ORM 6
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT (`jsonwebtoken`, `bcryptjs`), role-based access control
- **Validation:** Zod
- **Frontend:** React + Vite, Tailwind CSS, react-router-dom, axios, Framer Motion, lucide-react

## Architecture

```
mini-erp-crm/
├── server/     routes/ -> middleware/ -> controllers/ -> lib/  (Express + Prisma)
└── client/     context/ -> pages/ (one folder per module)      (React + Vite)
```

**Backend:** `routes/` maps URL + method to a controller and declares which guards apply
(`authMiddleware` verifies the JWT, `roleGuard([...])` checks the role) — no business logic
there. `controllers/` validate the request against a Zod schema, then query/mutate via Prisma,
throwing `AppError(status, message)` for expected failures (validation, not found, business
rules) so error formatting stays consistent everywhere.

**Transaction pattern** (the core business logic): every stock-changing operation — manual
adjustment and challan confirm/cancel — validates every line *before* writing anything, then
performs all writes inside one `prisma.$transaction`. Confirming a challan aggregates requested
quantity **per product** (not per line) before checking it against current stock, so two line
items for the same product can't each pass validation individually while their combined
quantity pushes stock negative.

**Frontend:** mirrors the backend's module boundaries (`pages/customers`, `pages/products`,
`pages/challans`, each with List/Form/Detail). Auth state lives in React Context; an axios
interceptor attaches the JWT to every request and clears storage + redirects to `/login` on any
`401`.

## Setup

### Backend
1. `cd server && npm install`
2. Copy `.env.example` to `.env` and fill in real values (see table below)
3. `npx prisma migrate dev`
4. `npx prisma db seed` — creates the 4 test users
5. `npm run dev` — runs on `http://localhost:<PORT>`
6. `GET /health` should return `{ "status": "ok" }`

### Frontend
1. `cd client && npm install`
2. Copy `.env.example` to `.env`, set `VITE_API_URL` to the backend URL
3. `npm run dev` — runs on `http://localhost:5173`

### Environment Variables (server)

| Key | Description |
|---|---|
| `DATABASE_URL` | Supabase Transaction pooler, port 6543, `?pgbouncer=true` — used at runtime |
| `DIRECT_URL` | Supabase Session pooler, port 5432 — used by Prisma Migrate |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `PORT` | Port the Express server listens on |
| `CLIENT_URL` | Deployed frontend origin — CORS only allows requests from this |

## Test Credentials

All 4 roles share one password (dev/test-only, never do this in production).

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Password123!` | ADMIN |
| `sales@example.com` | `Password123!` | SALES |
| `warehouse@example.com` | `Password123!` | WAREHOUSE |
| `accounts@example.com` | `Password123!` | ACCOUNTS |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|--------------|
| GET | `/health` | none | Liveness + DB connectivity check |
| POST | `/auth/login` | none | Returns `{ token, user }` |
| GET | `/auth/me` | Bearer token | Current user's profile |
| GET | `/customers` | any role | Paginated list. Query: `page`, `pageSize`, `search`, `type`, `status` |
| GET | `/customers/:id` | any role | Detail, includes follow-up notes |
| GET | `/customers/:id/follow-ups` | any role | Paginated follow-up notes |
| POST | `/customers` | ADMIN, SALES | Create |
| PATCH | `/customers/:id` | ADMIN, SALES | Partial update |
| POST | `/customers/:id/follow-ups` | ADMIN, SALES | Add a follow-up note |
| GET | `/products` | any role | Paginated list. Query: `page`, `pageSize`, `search`, `category`, `lowStock` |
| GET | `/products/:id` | any role | Detail, includes computed `isLowStock` |
| GET | `/products/:id/movements` | any role | Paginated stock movement history |
| POST | `/products` | ADMIN, WAREHOUSE | Create (starts at `currentStock: 0`) |
| PATCH | `/products/:id` | ADMIN, WAREHOUSE | Edit catalog fields — never `currentStock` |
| POST | `/products/:id/stock-movements` | ADMIN, WAREHOUSE | Manual IN/OUT; `400` if OUT exceeds stock |
| GET | `/challans` | any role | Paginated list. Query: `page`, `pageSize`, `status`, `customerId` |
| GET | `/challans/:id` | any role | Detail (customer + line items) |
| POST | `/challans` | ADMIN, SALES | Create — `{ customerId, items: [{productId, quantity}], status? }` |
| POST | `/challans/:id/confirm` | ADMIN, SALES | DRAFT → CONFIRMED: deducts stock, logs OUT movements |
| POST | `/challans/:id/cancel` | ADMIN, SALES | → CANCELLED; restores stock if it was CONFIRMED |

### Postman Collection

[`Mini-ERP-CRM.postman_collection.json`](./Mini-ERP-CRM.postman_collection.json) at the repo
root. Import it, run **Auth > Login (Admin)** first (auto-captures the token), then run any
request — IDs are captured automatically from `Create` responses. The `baseUrl` variable
defaults to `http://localhost:5000`; change it to the live backend URL above to hit the
deployed API instead.

## Database Schema

Defined in `server/prisma/schema.prisma`:

- **User** — staff accounts, one of 4 roles
- **Customer** — CRM record (type, status, follow-up date, notes)
- **FollowUpNote** — many-per-customer follow-up log, linked to the user who wrote it
- **Product** — SKU, category, unit price, current stock, min stock alert, location
- **StockMovement** — audit log of every stock change (IN/OUT, quantity, reason, who, when)
- **Challan** — sales delivery note (DRAFT / CONFIRMED / CANCELLED)
- **ChallanItem** — line items; stores a snapshot of `productName`/`sku`/`unitPrice` at creation
  time (in addition to the live `productId`), so historical challans stay accurate even if a
  product's price or name changes later

## Deployment

Live at the URLs in [Live Demo](#live-demo) (Render + Vercel + Supabase, all free tier).

- **Backend (Render):** root dir `server/`. Build: `npm install && npx prisma migrate deploy &&
  npm run build`. Start: `npm run start`. Env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`,
  `CLIENT_URL` (`PORT` is injected automatically).
- **Frontend (Vercel):** root dir `client/`. Build: `npm run build`, output `dist`. Env var:
  `VITE_API_URL` = the backend URL. `client/vercel.json` rewrites all paths to `index.html` so
  client-side routes don't 404 on a hard refresh.
- **Deploy order:** the backend needs the frontend's URL (`CLIENT_URL`) and the frontend needs
  the backend's URL (`VITE_API_URL`) — deploy the backend first with `CLIENT_URL` left on its
  localhost default, deploy the frontend once the backend URL exists, then go back and update
  `CLIENT_URL` on the backend and redeploy.

## Key Design Decisions

- **Stock never goes negative** — enforced inside a Prisma `$transaction`, validated per
  *product* (quantities aggregated across duplicate line items first) before any write.
- **`currentStock` is never directly editable** — `PATCH /products/:id` excludes it entirely;
  the only way to change it is the stock-movements endpoint, so the audit log has zero
  exceptions.
- **Challan confirm/cancel are all-or-nothing** — `confirmChallanTx` takes a
  `Prisma.TransactionClient`, so it runs inside the caller's transaction whether that's the
  dedicated confirm endpoint or a create-and-confirm-in-one-call. Cancelling a CONFIRMED challan
  restores stock via a reversal `IN` movement; cancelling a DRAFT has no stock impact.
  Cancelling an already-cancelled challan is rejected with `400`.
- **Login returns the same `401` for "no such user" and "wrong password"** — can't be used to
  enumerate registered emails.
- **Customer CRM has no DELETE endpoint** — the brief only asks for add/edit/search/detail/
  follow-ups; deactivation goes through `PATCH` with `status: "INACTIVE"` instead.
- **Read access is open to any authenticated role; writes are scoped to the role that owns that
  function** — SALES for customers/challans, WAREHOUSE for products — matching how the 4 roles
  actually divide responsibility, while everyone can still read across modules (e.g. Warehouse
  needs to see what a challan ordered).
- **Prisma pinned to v6, not v7** — avoids v7's driver-adapter/`prisma.config.ts` requirement;
  `.env` is read directly via the schema's `datasource` block.
- **JWT stored in `localStorage`, not an `httpOnly` cookie** — standard SPA pattern; trades some
  XSS exposure for avoiding CSRF handling, acceptable at this project's scope.

## Known Limitations

- **No automated test suite.** Verification was manual: Postman/`newman` for the backend,
  Playwright passes for the frontend after each feature. No repeatable Jest/Vitest suite is
  committed.
- **Challan numbering can theoretically race.** `CH-<year>-<0001>` uses a count-based sequence
  inside the create transaction — correct at this project's scale, but two truly simultaneous
  creates could compute the same count before either commits.
- **Low-stock filtering runs in application code, not the database** — Prisma can't compare two
  columns of the same row (`currentStock < minStockAlert`) in a `where` clause without raw SQL.
- **CORS allows exactly one origin** (`CLIENT_URL`) — fine for this project's single frontend,
  would need an allow-list if multiple frontends ever needed access.
- **No refresh-token flow.** The JWT expires after 8h and the user has to log in again.
- **No password-reset flow, no rate-limiting on login.**
- **Product movement history on the frontend only shows the first page** — the backend endpoint
  is paginated, but the UI has no "load more" control wired to it yet.
- **No notification system** — follow-up due dates and low-stock indicators are visible in the
  UI, but nothing proactively alerts anyone.
- **No edit history for Customer or Product records themselves** — `StockMovement` fully audits
  stock changes, but there's no log of who changed a customer's address or a product's price.
