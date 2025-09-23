# ProductGuard Roadmap

This roadmap maps your current codebase to the functional modules and outlines what’s done, what’s missing, and a simple, free-to-implement checklist to complete each module.

Implementation principles (for this roadmap)

- Keep it simple: prefer the smallest change that works
- Use only free/open-source tools; no paid SaaS
- Favor incremental steps you can finish in hours, not weeks
- Advanced features are marked Optional — do them later if needed

Legend

- [x] Done
- [~] Partial / needs improvement
- [ ] Not implemented yet

Repo anchors

- Backend: `backend/postgres.js` (Express + PostgreSQL)
- Frontend: `frontend/src` (React + Context, Ethers.js)
- Blockchain: `Blockchain/` (Hardhat + Solidity, `Ignition` not used)
- DB dump: `sqldump.sql`

---

## 1.3.1 User Management & Authentication Module

Status: [~]

Evidence

- Login endpoint: `POST /auth/:username/:password` + frontend `Login.jsx` [~]
- Role-based UI routing: `RequireAuth` with roles [x]
- Create/change user endpoints: `/addaccount`, `/changepsw` [~]
- Profiles CRUD (partial): `/profileAll`, `/profile/:username`, `/addprofile` [~]
- Audit logs exist: `login_attempts`, `activity_log` [~]

Gaps

- Passwords stored in plaintext (no hashing)
- SQL injection in auth/profile queries (string interpolation)
- No JWT/session; auth only in frontend memory
- No backend authorization middleware (RBAC) protecting routes
- No 2FA

Essentials (low-complexity)

- [ ] Replace `/auth/:username/:password` with `POST /auth/login` (JSON body)
- [ ] Hash passwords with bcrypt; parameterize all SQL queries
- [ ] Issue a simple JWT access token (no refresh token for now)
- [ ] Lightweight RBAC middleware that checks role from JWT
- [ ] Add simple rate-limit on `/auth/login`

Frontend

- [ ] Call `POST /auth/login` with JSON
- [ ] Store access token in memory (React state) and attach via axios interceptor

Optional (later)

- [ ] Add refresh tokens (httpOnly cookie)
- [ ] Add 2FA for admins/manufacturers
- [ ] Add password reset flow

---

## 1.3.2 Product Lifecycle & Consumer Verification Module

Status: [~] (largely implemented)

Evidence

- Product registration (on-chain + DB): `AddProduct.jsx`, `/addproduct` [~]
- QR code generation: `AddProduct.jsx` (QRCode.react) [x]
- Supply chain updates (on-chain history): `UpdateProduct*.jsx` calling `addProductHistory` [x]
- QR scanning + routing: `ScannerPage.jsx` + `QrScanner.js` [x]
- Verification against contract address: compare scanned address with env [x]
- Product scan logging: `/scan-product` [x]

Gaps

- Duplicate QR detection logic is basic (only contract address mismatch)
- No consumer-facing product details page with full on-chain history timeline
- Limited server-side validation for product registration

Essentials (low-complexity)

- [ ] Add a backend `/verification/scan` that:
  - [ ] Logs the scan (already done) and returns a simple `isAuthentic` + `isSuspicious`
  - [ ] Suspicious rule v1: “If the same serial is scanned >3 times in 10 minutes from different IPs, mark suspicious”
- [ ] Consumer verification page that shows:
  - [ ] Basic product details and on-chain history (ethers call)
  - [ ] A simple badge for Suspicious if flagged
- [ ] Validate inputs on the server using a small schema (e.g., `joi`)

Optional (later)

- [ ] HMAC/signature inside QR payload
- [ ] More rules (geo anomalies, device fingerprint)

---

## 1.3.3 Communication & Customer Support Module

Status: [ ]

Essentials (low-complexity)

- [ ] Email notifications using free SMTP via `nodemailer`
  - [ ] Trigger on product registration and when a scan is suspicious
  - [ ] Keep templates simple (plain text or minimal HTML)

Optional (later)

- [ ] Live chat using Socket.IO (self-hosted)
- [ ] Support inbox UI and message logs

---

## 1.3.4 User Activity & Audit Logs Module

Status: [~]

Evidence

- Tables: `login_attempts`, `product_scans`, `activity_log` [x]
- Endpoints: list + CSV download [x]

Gaps

- Fraud detection for abnormal behavior limited
- Admin audit UI not confirmed

Essentials (low-complexity)

- [ ] Simple aggregation endpoints
  - [ ] `/analytics/scans/daily?days=30` → daily counts
  - [ ] `/analytics/logins/daily?days=30` → daily success/failure counts
- [ ] Admin audit page listing recent logs with filters and CSV download

Optional (later)

- [ ] Suspicion scoring and multiple rule types

---

## 1.3.5 Blockchain Transaction History Module

Status: [~]

Evidence

- Contract `Identeefi` supports product history (`addProductHistory`, `getProduct`) [x]
- Frontend reads/writes via Ethers.js [x]

Gaps

- Comprehensive on-chain/off-chain reconciliation view
- Event indexing (optional) not implemented

Essentials (low-complexity)

- [ ] “Product History” page that:
  - [ ] Reads on-chain history via ethers
  - [ ] Displays a simple timeline (no fancy visuals needed)

Optional (later)

- [ ] Server-side event indexing into `chain_events` table

---

## 1.3.6 Analytical Reports & Dashboard Module

Status: [~]

Evidence

- Endpoint `/dashboard-analytics` with basic counts [~]
- Frontend has chart libs (ApexCharts/Recharts) [x]

Gaps

- Time series scans, counterfeit trends, geo analytics not implemented

Essentials (low-complexity)

- [ ] Minimal endpoints only for daily counts
- [ ] Frontend: one line chart (scans/day) and one bar chart (auth vs counterfeit)

Optional (later)

- [ ] Geo analytics and maps

---

## 1.3.7 Inventory & Product Movement Management Module

Status: [ ]

Gaps

- No stock counts, thresholds, or alerts
- Movement records are on-chain but no off-chain stock model

Essentials (low-complexity)

- [ ] Add a very small `inventory` table
  - [ ] Fields: `serial_number`, `owner_role`, `status`, `qty`, `updated_at`
- [ ] Endpoints
  - [ ] `GET /inventory/:serialNumber`
  - [ ] `POST /inventory/move` with minimal validation and RBAC
- [ ] UI: a simple table per role to view and move stock

Optional (later)

- [ ] Threshold alerts (email) and divergence checks with on-chain events

---

## Cross-cutting Security & Quality

Essentials (low-complexity)

- [ ] Parameterized SQL everywhere (fix `/auth`, `/profile/:username`)
- [ ] Minimal input validation with Joi/Zod
- [ ] Multer: enforce image types and max size; randomize filenames
- [ ] Password hashing with bcrypt
- [ ] Simple JWT access tokens only; restrict CORS to your origin
- [ ] Add ESLint/Prettier (local) and use `npm run lint`

---

## Suggested Milestones

Milestone 1: Secure Auth & RBAC (1.3.1)

- Bcrypt + parameterized SQL + simple JWT + RBAC + rate limit

Milestone 2: Verification & Basic Analytics (1.3.2, 1.3.4, 1.3.6)

- Duplicate-detection rule + consumer verification page + daily scan counts and simple charts

Milestone 3: Inventory Basics + Notifications (1.3.7, 1.3.3)

- Minimal inventory endpoints/UI + Nodemailer email notifications

---

## Quick DDL Sketches (to include in a migration)

Note: Adjust types as needed for your Postgres version.

```sql
-- Support chat messages
CREATE TABLE IF NOT EXISTS support_chats (
  id SERIAL PRIMARY KEY,
  username TEXT,
  role TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  serial_number TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  owner_username TEXT,
  status TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: chain events index
CREATE TABLE IF NOT EXISTS chain_events (
  id SERIAL PRIMARY KEY,
  serial_number TEXT,
  event_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Completion snapshot (estimates)

- 1.3.1 User Management & Auth: ~50%
- 1.3.2 Product Lifecycle & Verification: ~75%
- 1.3.3 Communication & Support: 0%
- 1.3.4 Activity & Audit Logs: ~60%
- 1.3.5 Blockchain History: ~70%
- 1.3.6 Analytics & Dashboard: ~30%
- 1.3.7 Inventory & Movement: ~10%

These will evolve as code hardens and tests are added.
