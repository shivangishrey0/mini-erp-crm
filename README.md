# Mini ERP + CRM Operations Portal

A small internal ERP/CRM case study for a wholesale/distribution company.
Covers customer relationship management, product & inventory tracking, and
sales challan (delivery note) issuance, with role-based access for four
internal staff roles: ADMIN, SALES, WAREHOUSE, ACCOUNTS.

## Live Demo

- **Frontend:** https://mini-erp-4srcm9cn0-shivangi-shreyas-projects.vercel.app
- **Backend API:** https://mini-erp-crm-api-9dba.onrender.com (health check: `/health`)
- **Test credentials:** see [Test Credentials](#test-credentials) below — all 4 roles share one
  password.

The backend is on Render's free tier and spins down after ~15 minutes of inactivity — the first
request after idle time can take 30-50 seconds to wake it back up. This is expected free-tier
behavior, not a bug.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express, Prisma ORM 6
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT (`jsonwebtoken`, `bcryptjs`), role-based access control
- **Validation:** Zod
- **Frontend:** React (plain JS) + Vite, Tailwind CSS v4, react-router-dom, axios, Framer Motion, lucide-react

## Project Structure

```
mini-erp-crm/
├── server/     Express + Prisma API
└── client/     React frontend
```

## Architecture

**Backend — layered, one direction of dependency:**

```
routes/  ->  middleware/  ->  controllers/  ->  lib/
```

- `routes/*.routes.ts` — maps URL + HTTP method to a controller function, and declares which
  middleware guards it (`authMiddleware`, `roleGuard([...])`). No business logic here.
- `middleware/` — cross-cutting request handling: `authMiddleware` verifies the JWT and attaches
  `req.user`; `roleGuard` checks `req.user.role` against an allowed list; `errorHandler`/
  `notFoundHandler` catch whatever nothing else handled.
- `schemas/*.schema.ts` — Zod input validation, one schema per shape (create/update/list-query).
- `controllers/*.controller.ts` — the actual logic: validate -> query/mutate via Prisma ->
  respond. Throws `AppError(status, message)` for expected failures instead of scattering
  `res.status().json()` calls everywhere.
- `lib/` — shared, stateless infrastructure with no business logic: the Prisma client singleton,
  the JWT sign/verify wrapper, the shared Zod-error formatter.

**Request lifecycle example** (`PATCH /products/:id`):
1. `authMiddleware` verifies the Bearer token -> `req.user = { userId, role }`
2. `roleGuard(["ADMIN", "WAREHOUSE"])` checks `req.user.role`, `403`s if not allowed
3. Controller validates the body against `updateProductSchema`, `400`s on failure
4. Controller checks the product exists, `404`s if not
5. Controller updates via Prisma, responds `200`
6. If anything above throws, `errorHandler` (mounted last in `src/index.ts`) catches it and
   formats a consistent JSON error

**Transaction pattern** (the part evaluated hardest): every stock-changing operation — manual
adjustment (`POST /products/:id/stock-movements`) and challan confirm/cancel — follows the same
shape: validate every line *before* touching any data, then perform all writes
(`Product.currentStock` update + `StockMovement` insert) inside a single `prisma.$transaction`.
`confirmChallanTx` takes a `Prisma.TransactionClient` as a parameter rather than importing the
global client, so it can be nested inside a *larger* transaction (the create-and-confirm path)
or run in its own (the dedicated confirm endpoint) — same function, two call sites, one
guarantee: all-or-nothing.

**Frontend — mirrors the backend's module boundaries:**

```
context/    -> global state (who's logged in)
lib/        -> axios instance (auth header, 401 handling)
components/ -> shared, page-agnostic UI (Pagination, Spinner, ErrorState, Layout)
hooks/      -> shared stateful logic (useDebouncedValue)
pages/      -> one folder per module (customers/products/challans), each with List/Form/Detail
```

Every page follows the same shape: `useState` for data/loading/error -> `useEffect` fetches on
mount and when filters change -> a role check from `useAuth()` gates write-action buttons,
mirroring the backend's `roleGuard` allow-lists exactly.

**Auth flow:** login -> backend signs `{ userId, role }` into a JWT -> frontend stores it in
`localStorage` and attaches it via an axios request interceptor on every subsequent call -> a
`401` response anywhere triggers an axios response interceptor that clears storage and redirects
to `/login`.

## Frontend Setup

1. `cd client && npm install`
2. Copy `.env.example` to `.env` — `VITE_API_URL` should point at the running backend
   (default `http://localhost:5000`)
3. Start the dev server: `npm run dev` — runs on `http://localhost:5173`
4. Log in with any seeded test credential (see Test Credentials below)

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
| `CLIENT_URL`   | Deployed frontend origin — CORS only allows requests from this. Defaults to `http://localhost:5173` if unset |

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
| GET    | `/customers`      | Bearer token (any role) | List, paginated. Query: `page`, `pageSize`, `search` (name/businessName/mobile/email), `type`, `status` |
| GET    | `/customers/:id`  | Bearer token (any role) | Detail, includes follow-up notes |
| GET    | `/customers/:id/follow-ups` | Bearer token (any role) | Paginated follow-up notes for a customer |
| POST   | `/customers`      | ADMIN, SALES      | Create a customer |
| PATCH  | `/customers/:id`  | ADMIN, SALES      | Partial update (e.g. just `status`) |
| POST   | `/customers/:id/follow-ups` | ADMIN, SALES | Add a follow-up note |
| GET    | `/products`       | Bearer token (any role) | List, paginated. Query: `page`, `pageSize`, `search` (name/sku/category), `category`, `lowStock` |
| GET    | `/products/:id`   | Bearer token (any role) | Detail, includes computed `isLowStock` flag |
| GET    | `/products/:id/movements` | Bearer token (any role) | Paginated stock movement history |
| POST   | `/products`       | ADMIN, WAREHOUSE  | Create (always starts at `currentStock: 0`) |
| PATCH  | `/products/:id`   | ADMIN, WAREHOUSE  | Edit catalog fields — never `currentStock` |
| POST   | `/products/:id/stock-movements` | ADMIN, WAREHOUSE | Manual IN/OUT adjustment with a reason; 400 if OUT exceeds current stock |
| GET    | `/challans`       | Bearer token (any role) | List, paginated. Query: `page`, `pageSize`, `status`, `customerId` |
| GET    | `/challans/:id`   | Bearer token (any role) | Detail (customer + line items) |
| POST   | `/challans`       | ADMIN, SALES      | Create — `{ customerId, items: [{productId, quantity}], status? }`, defaults to `DRAFT` |
| POST   | `/challans/:id/confirm` | ADMIN, SALES | DRAFT → CONFIRMED: deducts stock, logs OUT movements, all-or-nothing |
| POST   | `/challans/:id/cancel`  | ADMIN, SALES | → CANCELLED; if it was CONFIRMED, restores stock via reversal IN movements |

### Postman Collection

[`Mini-ERP-CRM.postman_collection.json`](./Mini-ERP-CRM.postman_collection.json) at the repo
root — import it into Postman, run **Auth > Login (Admin)** first (auto-captures the token),
then run any request top-to-bottom. `customerId`/`productId`/`challanId` collection variables
are captured automatically from each `Create` response, so requests chain without manual
copy-pasting. Verified end-to-end with `newman` (Postman's CLI runner): all 25 requests pass
with the exact expected status codes on a single linear run. Role-specific logins for testing
`403`s individually live in the trailing **Role Logins** folder.

The `baseUrl` collection variable defaults to `http://localhost:5000` for local testing. To hit
the live deployment instead, edit that variable to `https://mini-erp-crm-api-9dba.onrender.com`
— everything else in the collection works unchanged either way.

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

## Deployment

Live at the URLs in [Live Demo](#live-demo) above (Render + Vercel + Supabase, all free tier).
Steps below document how it was deployed, so it can be reproduced from scratch if needed.

### Backend (Render, Railway, or any Node host)

1. Push this repo to GitHub; point the host at `server/` as the root directory.
2. Build command: `npm install && npm run build`
3. Start command: `npm run start`
4. Environment variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (a freshly generated one,
   never the value from local `.env`), `CLIENT_URL` (leave as the localhost default for now —
   comes back in step 3 below once the frontend has a URL). Most hosts inject `PORT`
   automatically — the app already reads `process.env.PORT`.
5. Add a release/deploy-time command: `npx prisma migrate deploy` — applies committed
   migrations without generating new ones (unlike `migrate dev`, which is dev-only).
6. Run `npx prisma db seed` once manually via the host's shell/console if you want the same 4
   test users available in the deployed environment.

### Frontend (Vercel or Netlify)

1. Root directory: `client/`
2. Build command: `npm run build`; output directory: `dist`
3. Environment variable: `VITE_API_URL` = the deployed backend's URL from above
4. Vite bakes `VITE_API_URL` in at build time — redeploy the frontend if the backend URL changes
5. `client/vercel.json` rewrites all paths to `index.html` so React Router's client-side routes
   (e.g. `/customers/123`) don't 404 on a hard refresh — Vercel picks this up automatically.

### Before actually going live

- **Go back and set `CLIENT_URL`** on the backend host to the frontend's actual deployed URL
  (from the step above), then redeploy/restart the backend — CORS only allows that exact origin
  by default (see `server/src/index.ts`), so this step isn't optional once both sides are live.
- Use a freshly generated `JWT_SECRET` in the hosting platform's secret store, never the one
  from local `.env`.
- `DATABASE_URL`/`DIRECT_URL` already point at Supabase, so no schema changes are needed to go
  from local dev to a hosted backend — same database, different app deployment.

## Known Limitations

- **No automated test suite.** Verification throughout development was manual and live: curl/
  Postman testing after each backend task (see the Postman collection above, verified with
  `newman`), and headless-Chrome Playwright passes after each frontend task. No repeatable
  Jest/Vitest suite is committed to the repo.
- **Challan numbering can theoretically race.** `CH-<year>-<0001>` uses a count-based sequence
  inside the create transaction — correct at this project's scale, but two truly simultaneous
  creates could compute the same count before either commits. A Postgres sequence would close
  that gap at higher scale.
- **Low-stock filtering runs in application code, not the database** — Prisma can't compare two
  columns of the same row (`currentStock < minStockAlert`) in a `where` clause without raw SQL.
- **CORS allows exactly one origin** (`CLIENT_URL`, defaulting to the local Vite dev server) —
  fine for this project's single-frontend setup, but would need a small allow-list instead of a
  single string if multiple frontends ever needed access.
- **No refresh-token flow.** The JWT simply expires after 8h and the user has to log in again;
  there's no silent re-authentication.
- **No password-reset / forgot-password flow.**
- **No rate-limiting or brute-force protection** on `POST /auth/login`.
- **Product movement history on the frontend only shows the first page** (20 most recent) — the
  backend endpoint (`GET /products/:id/movements`) is paginated, but the detail page's UI has no
  "load more" control wired to it yet.
- **No notification system.** Follow-up due dates and low-stock indicators are visible in the UI
  when someone looks, but nothing proactively emails or alerts anyone.
- **No edit history / audit trail for Customer or Product records themselves** — `StockMovement`
  fully audits every stock change, but there's no log of who changed a customer's address or a
  product's price, only the current value.

## Progress

- [x] **Task 1** — TypeScript config, Prisma schema, initial migration, `.env.example`
- [x] **Task 2** — Express app skeleton, error handling, health check, Prisma client singleton
- [x] **Task 3** — Auth (seed script, login, JWT middleware, role guards)
- [x] **Task 4** — Customer CRM APIs
- [x] **Task 5** — Product & stock movement APIs
- [x] **Task 6** — Challan APIs (draft/confirm/cancel, stock transaction logic)
- [x] **Task 7** — Frontend setup (Vite React client, Tailwind, auth context, protected routes, sidebar layout)
- [x] **Task 8** — Frontend pages (customers, products + stock, challan creation flow, role-aware navigation)
- [x] **Task 9** — Polish (debounced search, spinner/retry error states, low-stock highlighting)
- [x] **Task 10** — Docs & submission prep (Postman collection, architecture, limitations, deployment)

## Assumptions & Decisions

- **Prisma 6, not 7** — deliberately pinned to avoid v7's driver-adapter/`prisma.config.ts`
  requirements; `.env` is read directly by Prisma via the `url`/`directUrl` fields in the
  schema's `datasource` block.
- **CommonJS, not ESM** — `tsconfig.json` targets CommonJS/`node16` module resolution for
  reliable `ts-node-dev` support in local development.
- **Stock-never-negative is an application-layer rule**, enforced inside a Prisma
  `$transaction` in `POST /products/:id/stock-movements` (and reused by the Task 6
  challan-confirm endpoint), not a database `CHECK` constraint.
- **`currentStock` is never directly editable** — `PATCH /products/:id` excludes it entirely;
  the only way to change it is the stock-movements endpoint, so the `StockMovement` audit log
  has zero exceptions (even a new product's first stock entry is a logged "Initial stock" IN).
- **Low-stock filtering (`?lowStock=true`) happens in application code**, not the database —
  Prisma can't compare two columns of the same row (`currentStock < minStockAlert`) in a
  `where` clause without raw SQL. Fine at this project's scale; would move to raw SQL if the
  product catalog grew large.
- **Bug found and fixed during Task 5 testing:** `updateProductSchema` was originally
  `createProductSchema.partial()`. Zod's `.default()` survives `.partial()` — a field with
  both silently gets reset to its default on any `PATCH` that omits it, since `.partial()`
  only adds `.optional()`, it doesn't remove the existing default. This meant every partial
  product update was silently zeroing out `minStockAlert` unless the caller explicitly
  resent it. Fixed by splitting field definitions so `.default(0)` is applied only in
  `createProductSchema`, never in the shared fields `updateProductSchema` is built from.
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
- **Product read access is open to any authenticated role; writes are ADMIN + WAREHOUSE only** —
  same pattern as customers: inventory is a warehouse function, but SALES/ACCOUNTS still need
  to see stock levels.
- **Challan stock-deduction logic lives in exactly one function** (`confirmChallanTx`), reused
  by both `POST /challans/:id/confirm` and `POST /challans` when `status: "CONFIRMED"` is
  requested at creation. It takes a `Prisma.TransactionClient` rather than the global client,
  so it always runs inside the caller's transaction — a create-and-confirm that fails on
  insufficient stock rolls back the challan creation too, not just the stock change. That's
  what makes "confirming with insufficient stock changes nothing in the database" literally
  true even for the one-call create-and-confirm path, not just the dedicated confirm endpoint.
- **Cancelling a CONFIRMED challan restores stock** — increments `currentStock` back and logs
  a reversal `IN` `StockMovement` (reason: `"Challan CH-... cancelled"`) per item, inside a
  `$transaction`. Cancelling a DRAFT challan has no stock impact, since nothing was deducted.
  Cancelling an already-cancelled challan is rejected with `400`.
- **Challan numbers (`CH-<year>-<0001>`) use a count-based sequence inside the create
  transaction** — simple and correct at this project's scale, but not immune to a race under
  true simultaneous creates in the same instant (a DB sequence would close that gap at scale).
- **Frontend uses plain CSS-free Tailwind (no component library)** — matches "React with plain
  JavaScript" minimalism from the brief; no MUI/Tailwind-UI/etc. dependency to explain away.
- **Auth state lives in React Context, not Redux/Zustand** — the app only needs "who's logged
  in and what's their role" globally; a full state library would be unjustified weight for that.
- **JWT stored in `localStorage`, not an `httpOnly` cookie** — standard SPA pattern, persists
  across browser restarts (matches the backend's 8h token expiry). Tradeoff: more exposed to
  XSS than a cookie would be; a cookie would need CSRF handling instead. Acceptable for this
  project's scope.
- **`ProtectedRoute` takes an optional `allowedRoles` prop it doesn't use yet** — built now so
  Task 8's role-gated pages don't need new routing infrastructure, just a prop.
- **"Role-aware navigation" means action buttons, not sidebar links** — since the backend
  allows every authenticated role to *read* customers/products/challans, all 3 nav links stay
  visible to everyone. What's role-gated is the Add/Edit/Confirm/Cancel buttons on each page,
  matching the backend's actual write permissions 1:1 — no point showing a button that would
  just 403.
- **Task 8 vs. Task 9 split:** Task 8 pages are fully *functional* — real search input and
  prev/next pagination wired to the live API, basic "Loading…"/"Error: …" text — not stub pages.
  Task 9 is *polish* on top: debounced search, skeleton loaders, retry buttons, richer low-stock
  styling. Building broken pages now just to "wire them up later" wouldn't make sense.
- **Bug found and fixed during Task 8 build:** `ChallanCreatePage` was originally a plain `<div>`
  wrapper instead of a `<form>`, since it has two distinct submit actions (Save as Draft / Save
  & Confirm) rather than one. That's not just a testing inconvenience — without a `<form>`
  element there's no native label association or Enter-key semantics tying the inputs together.
  Fixed by wrapping in `<form onSubmit={(e) => e.preventDefault()}>`: keeps both actions as
  explicit `type="button"` clicks (avoiding "which action does Enter mean" ambiguity) while
  restoring proper form semantics.
- **Verification approach:** built all 3 modules (Customers, Products, Challans) first, then ran
  one comprehensive Playwright pass (headless system Chrome, no browser download needed) across
  live dev servers covering: product creation + stock IN, customer creation + search, the full
  challan create-and-confirm flow with a live stock-count verification (50 → 40), cancel
  restoring stock (40 → 50), the critical insufficient-stock error surfacing the exact backend
  message with no bad navigation, and ACCOUNTS-role read-only enforcement across all 3 modules.
  Screenshots reviewed, not just assertions; zero unexpected console errors.
- **`useDebouncedValue` delays the *search value*, not the input field itself** — the input
  stays controlled and responsive to every keystroke; only the value used in the API-call
  dependency array is debounced (400ms). Verified via Playwright request interception: typing
  6 characters quickly fired 1 network request instead of 6.
- **`ErrorState` always includes a `Retry` button** that just increments a `reloadCounter` state
  included in each list page's `useEffect` dependency array — re-running the exact same fetch
  rather than a special-cased retry code path. Verified by aborting a live network request and
  confirming Retry actually recovers the page, not just re-showing the error.
- **Low-stock highlighting is a row background, not just the existing badge** — a badge next to
  the stock number required reading each row; a `bg-red-50` row background makes low-stock items
  scannable across the whole table at a glance.
- **`GET /auth/admin-only` was removed in Task 10** — it was explicitly a temporary roleGuard
  smoke test from Task 3, meant to be deleted once real role-guarded routes existed (true since
  Task 4's customer endpoints). Removed from both the router and the Postman collection;
  re-verified the full collection still passes with `newman` afterward.
- **Postman collection structure:** a single primary login (Admin, since ADMIN passes every
  `roleGuard`) drives one clean top-to-bottom collection run — `Create` requests were
  deliberately ordered before the `Get`/`Update` requests that depend on their IDs. Role-specific
  logins (Sales/Warehouse/Accounts) live in a separate trailing folder specifically so they don't
  overwrite the active token mid-run if someone runs the whole collection at once; they're meant
  to be triggered individually when manually testing a specific role's `403` behavior.
- **Post-submission design pass** (after all 10 tasks): the original UI was functional but
  visually generic. Rebuilt with: a shared `Badge` component (status/type/category as colored
  pills everywhere, not just challans), a small hand-authored inline SVG icon set (`components/
  icons.jsx` — no icon library dependency), consistent `shadow-sm` depth on cards/tables (was
  flat borders only), uppercase-tracked table headers, zebra striping, tactile
  `active:scale-95` press feedback on buttons, and a real **Dashboard** (stat cards for
  customers/products/low-stock/challans + a recent-challans table) replacing what had been a
  near-blank welcome page.
- **Scoped an external "Apple design" guidance doc to what actually fits this stack** — most of
  it targets gesture-heavy native apps (spring physics, drag momentum projection, haptics) and
  would require an animation library, which conflicts with this project's own "no UI/animation
  library, plain Tailwind" decision (see above). Applied only what transfers cleanly to a
  Tailwind admin CRUD app: typography as a hierarchy (tracking/leading as a set, not just size),
  instant tactile button feedback, depth via shadows on structural chrome, consistent
  iconography, and clear feedback states. Did not add drag-reorder tables, rubber-banding,
  pointer-capture gesture tracking, or haptics/sound — out of scope for this project.
- **Dashboard's low-stock stat card deep-links to a pre-filtered product list**
  (`/products?lowStock=true`) rather than just the plain list — `ProductsListPage` reads
  `useSearchParams()` once on mount to seed its `lowStockOnly` checkbox state, so the shortcut
  is actually functional, not just a link to the right page.
- **Verified the redesign didn't break functionality, not just that it looked right:** ran a
  fresh Playwright pass covering login, customer creation, product creation, stock adjustment,
  and the full create-and-confirm-then-cancel challan flow against the live backend after every
  visual change. Confirmed via the `StockMovement` audit log itself (`OUT ... confirmed` then
  `IN ... cancelled` rows) that the transaction logic was untouched by the styling pass, not
  just by trusting a status badge on screen. All screenshots reviewed directly, zero console
  errors. Test data cleaned up afterward.
- **Second design pass — feedback, safety, and wayfinding**, still without an animation
  library (plain CSS transitions, not JS spring physics):
  - **Toast notifications** (`ToastContext`) confirm save/add-note/stock-adjust/confirm/cancel
    actions instead of silently navigating away. CSS-only enter/exit: each toast mounts
    hidden and flips visible on the next animation frame so the transition actually has
    something to animate (a transition can't animate a value already at its target).
  - **`ConfirmDialog` reserved for genuinely irreversible actions** — specifically, cancelling
    a challan (a terminal state transition with no undo). Confirming a *draft* deliberately
    does **not** get a dialog, since it isn't irreversible — a confirmed challan can still be
    cancelled afterward to undo it. When cancelling a CONFIRMED challan, the dialog states
    exactly how much stock will be restored, not a generic "are you sure?".
  - **Skeleton loaders** (`TableSkeleton`) replace the plain spinner on all 3 list pages and
    the Dashboard, shaped to match the actual table/card layout rather than a generic spinner.
  - **`Breadcrumbs`** (`Dashboard / Customers / {name}`) on every detail/form/create page.
  - **`EmptyState`** (icon + message) replaces plain "No X found" text in every empty table
    and list.
  - **Global `prefers-reduced-motion` handling**: one CSS media-query override in `index.css`
    zeroes all animation/transition durations, rather than requiring a `motion-reduce:`
    Tailwind variant on every individual animated element — catches the toast/dialog
    transitions added here *and* the `active:scale-95` press feedback from the first design
    pass, automatically, including anything animated added later.
  - **Verified with a fresh Playwright pass** covering: toasts firing on every action,
    the confirm dialog rendering with the correct dynamic message and both `Back` (dismisses,
    no state change) and `Cancel Challan` (actually cancels) paths, skeleton loaders appearing
    under an artificially slowed network request, breadcrumb text on every page type, and the
    app functioning correctly under `page.emulateMedia({ reducedMotion: "reduce" })`. Caught
    and worked around two more test-script timing races in the process (a skeleton `<table>`
    matching the same selector as the real one before data loads; a screenshot racing the
    dialog's opacity transition) — both diagnosed via computed-style checks rather than
    guessing, confirmed as test-script issues rather than app bugs, and not "fixed" in the app
    itself since there was nothing wrong there. All screenshots reviewed directly, zero
    console errors, test data cleaned up afterward.
- **Third design pass — Framer Motion + lucide-react added, reversing the earlier
  "no animation library" decision.** Checked the actual case study PDF (not just the
  paraphrased brief given at project start) before deciding: it requires "React, HTML, CSS,
  JavaScript/TypeScript" and "clean admin-style UI," with no dependency-free constraint
  anywhere. The earlier "plain JS, no libraries" framing came from the user's own paraphrase,
  not the source document, so it was safe to add two focused, lightweight dependencies
  (~40kb gzipped combined) rather than hand-rolling worse approximations of what
  Aceternity/Magic UI/shadcn-style components actually use.
  - **`icons.jsx` now re-exports lucide-react icons** under the exact names already used
    everywhere (`CustomersIcon`, `ProductsIcon`, etc.) — swapped the implementation without
    touching any of the ~15 call sites.
  - **`MotionConfig reducedMotion="user"`** wraps the whole app once, so every Framer Motion
    animation added in this pass automatically respects `prefers-reduced-motion`, the same
    way the CSS-level override already covered plain CSS transitions.
  - **Sidebar navigation has a shared-layout "magic move" active pill** (`layoutId`) that
    slides smoothly between nav items on click, instead of the background color just
    swapping. Route changes fade/slide via `AnimatedOutlet` (`useOutlet()` + `AnimatePresence`
    keyed by `location.pathname` — `<Outlet />` alone doesn't reliably trigger exit
    animations on navigation).
  - **Toast and `ConfirmDialog` rebuilt on `AnimatePresence`** with real spring physics,
    replacing the previous pass's manual mount/leaving CSS state machine.
  - **`AnimatedCounter`** count-up on dashboard stat numbers (skips the animation outright
    under reduced motion — no point animating toward a value nobody wants to watch move).
  - **`SpotlightCard`** — cursor-following radial-gradient glow (Aceternity "Card Spotlight"
    style), applied to the dashboard stat cards and all 3 detail-page info cards. Pure
    pointer-position CSS, not gated behind reduced-motion since it tracks real input rather
    than auto-playing.
  - **Gradient CTAs**: all 10 primary action buttons across the app moved from flat
    `bg-indigo-600` to a two-stop gradient, matching the stat-card icon gradients and the
    brand mark on both the sidebar and login page — one consistent visual language instead of
    matching-but-separate flat colors.
  - **Table-row stagger reveals** via a shared `src/lib/motionVariants.js`
    (`staggerContainer`/`staggerItem`) — extracted once it was about to be copy-pasted a
    third time, used by the Dashboard's recent-challans table and all 3 list pages.
  - **Login page** gets two slow-drifting soft gradient blobs behind the card (18s/22s loops,
    respects reduced motion via `MotionConfig`) — the one place in the app that gets a
    decorative "moment," deliberately not repeated elsewhere to avoid the "novelty for its
    own sake" pitfall the Apple design guidance explicitly warns against.
  - **Deliberately did not add**: drag-reorder tables, rubber-band scroll physics,
    pointer-capture gesture tracking, haptics/sound, or a command palette — all real patterns
    from the referenced sites, but out of scope for an admin CRUD app with no drag/gesture
    interactions to begin with. Adding them would be decoration without a task to serve.
  - **Verified with a full Playwright pass**: every list/detail page screenshot reviewed
    directly (not just asserted), plus a complete functional smoke test — create customer,
    create product, adjust stock, create-and-confirm a challan, cancel it through the new
    confirm dialog — confirming the business logic is byte-for-byte unchanged post-redesign.
    Zero console errors. Sample/test data cleaned back to the original seed counts afterward.
