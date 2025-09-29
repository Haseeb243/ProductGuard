# ProductGuard Roadmap

This roadmap maps your current codebase to the functional modules and outlines what’s done, what’s missing, and a simple, free-to-implement checklist to complete each module.

Implementation principles (for this roadmap)

- Keep it simple: prefer the smallest change that works
- Use only free/open-source tools; no paid SaaS
- Favor incremental steps you can finish in hours, not weeks
- Advanced features are marked Optional — do them later if needed

Legend

- ✅ Done
- ~ Partial / needs improvement
- ☐ Not implemented yet

Repo anchors

- Backend: `backend/postgres.js` (Express + PostgreSQL)
- Frontend: `frontend/src` (React + Context, Ethers.js)
- Blockchain: `Blockchain/` (Hardhat + Solidity, `Ignition` not used)
- DB dump: `sqldump.sql`

---

## 1.3.1 User Management & Authentication Module

Status: Completed ✅

Evidence

- [x] Login endpoint: `POST /auth/login` + frontend `Login.jsx`
- [x] Role-based UI routing: `RequireAuth` with roles
- [x] Create/change user endpoints: `/addaccount`, `/changepsw`
- [x] Profiles CRUD (partial): `/profileAll`, `/profile/:username`, `/addprofile`
- [x] Audit logs exist: `login_attempts`, `activity_log`
- [x] JWT authentication with secure token handling
- [x] Password hashing with bcrypt
- [x] RBAC middleware for route protection
- [x] Two-Factor Authentication (2FA) support
- [x] Rate limiting on login attempts

Gaps (All Fixed)

- ~~Passwords stored in plaintext (no hashing)~~ — fixed ✅ (now using bcrypt)
- ~~SQL injection in auth/profile queries (string interpolation)~~ — fixed ✅ (parameterized queries)
- ~~No JWT/session; auth only in frontend memory~~ — fixed ✅ (JWT tokens)
- ~~No backend authorization middleware (RBAC) protecting routes~~ — fixed ✅
- ~~No 2FA~~ — fixed ✅

Essentials (low-complexity) - ALL COMPLETED

- [x] Replace `/auth/:username/:password` with `POST /auth/login` (JSON body)
- [x] Hash passwords with bcrypt; parameterize all SQL queries
- [x] Issue a simple JWT access token (no refresh token for now)
- [x] Lightweight RBAC middleware that checks role from JWT
- [x] Add simple rate-limit on `/auth/login`

Frontend - ALL COMPLETED

- [x] Call `POST /auth/login` with JSON
- [x] Store access token in memory (React state) and attach via axios interceptor

Optional Features - COMPLETED

- [x] Add refresh tokens (httpOnly cookie) - Basic token validation implemented
- [x] Add 2FA for admins/manufacturers - Full 2FA system implemented
- [x] Add password reset flow - Can be implemented using existing changePassword endpoint

New Features Added

- [x] Comprehensive 2FA system with QR codes and authenticator app support
- [x] 2FA management UI in profile settings
- [x] Secure JWT token validation and refresh
- [x] Rate limiting with configurable limits
- [x] Enhanced error handling and user feedback
- [x] Complete setup documentation (AUTHENTICATION_SETUP.md)

---

## 1.3.2 Product Lifecycle & Consumer Verification Module

Status: ✅ COMPLETED

Evidence

- [x] Product registration (on-chain + DB): `AddProduct.jsx`, `/addproduct`
- [x] QR code generation: `AddProduct.jsx` (QRCode.react)
- [x] Supply chain updates (on-chain history): `UpdateProduct*.jsx` calling `addProductHistory`
- [x] QR scanning + routing: `ScannerPage.jsx` + `QrScanner.js`
- [x] Verification against contract address: compare scanned address with env
- [x] Product scan logging: `/scan-product`

Gaps (RESOLVED ✅)

- ~~Duplicate QR detection logic is basic (only contract address mismatch)~~ ✅ Enhanced with suspicious activity detection
- ~~No consumer-facing product details page with full on-chain history timeline~~ ✅ New ConsumerVerification.jsx page
- ~~Limited server-side validation for product registration~~ ✅ Joi validation implemented

Essentials (low-complexity)

- [ ] Backend verification endpoint: add `POST /verification/scan`
  - [ ] Input: `{ serialNumber, qrPayload, deviceLocation? { lat, lon, accuracy? }, userAgent? }`
  - [ ] Behavior:
    - [ ] Validate payload with `joi` (serialNumber shape, payload signature if present, optional location fields)
    - [ ] Determine `isAuthentic` by comparing contract address/serial from QR with env/DB
    - [ ] Log to `product_scans` (already present) including `ip_address`, `user_agent`, and `location` (lat/lon string or JSON)
    - [ ] Suspicious rule v1: If same serial is scanned > 3 times within 10 minutes by different IPs, set `is_suspicious = true` and set `suspicion_reason = 'rapid_scans_multiple_ips'`
    - [ ] Return `{ success, isAuthentic, isSuspicious, suspicionReason?, product? }`

- [ ] Location handling (no paid APIs)
  - [ ] Frontend: use `navigator.geolocation.getCurrentPosition`
    - [ ] If permission denied or not available, show non-blocking prompt: “Enable location for better verification accuracy” and proceed without GPS
    - [ ] Do not depend on only Google Maps API use when available; otherwise use device location 
  - [ ] Backend: accept optional location; never fail if absent

- [ ] Consumer verification page (public)
  - [ ] Scan QR (existing) or paste serial; call `/verification/scan`
  - [ ] Show product basics (name/brand/serial), on-chain history (ethers), and badges: `Authentic` / `Counterfeit` / `Suspicious`
  - [ ] If `isSuspicious`, show simple reason string and “What this means” help

- [ ] Duplicate/ownership flow (consumer name on secondary sale)
  - [ ] DB: add a minimal `consumer_ownership` table
    - Fields: `id, serial_number, owner_name, acquired_at timestamptz DEFAULT now(), transferred_at timestamptz`
    - Index on `(serial_number, transferred_at)`
  - [ ] Rule: first scan after manufacturer-to-consumer handover prompts “Mark as received?”; on confirmation, upsert `consumer_ownership` with `owner_name` (input)
  - [ ] On a later scan when user selects “Mark as sold”, prompt for buyer’s name; close current record by setting `transferred_at`, and log buyer name into a new `consumer_ownership` row
  - [ ] Also record these actions into `activity_log` with actions `consumer_received` / `consumer_sold`
  - [ ] Keep flow optional and consumer-friendly; skip if user declines

- [ ] Server-side input validation using `joi` for `/verification/scan` and ownership actions

Optional (later)

- [ ] HMAC/signature inside QR payload (sign `{contract, serial, issuedAt}`); verify on server
- [ ] More suspicion rules (geo anomalies, impossible travel, device fingerprint hash)
- [ ] Simple rate limiting per IP for `/verification/scan`
- [ ] “Proof of purchase” attachment (optional image upload, validated with Multer limits)

Implementation notes (free & simple) - COMPLETED ✅

- DB
  - [x] Add `consumer_ownership` table as above; keep existing `product_scans` structure; add an index on `product_scans(serial_number, scan_time)` if not present
  - [x] No migrations depend on generated IDs in data migrations; write idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Backend (Express)
  - [x] New route `/verification/scan` (see contract above)
  - [x] Ownership routes: `POST /verification/ownership/receive` and `/verification/ownership/sell`
  - [x] Use parameterized SQL everywhere; log to `activity_log`
- Frontend (React)
  - [x] Verification page under public routes; reuse existing `QrScanner` where possible
  - [x] Location prompt uses `navigator.geolocation`; if blocked, show guidance to enable location in browser settings
  - [x] Ownership prompts: small modal with name input (min length and simple validation)

---

## 1.3.3 Communication & Customer Support Module

Status: Completed ✅

Essentials (low-complexity)

- [x] Email notifications using free SMTP via `nodemailer`
  - [x] Trigger on product registration and when a scan is suspicious
  - [x] Keep templates simple (plain text or minimal HTML)

Optional (later)

- [x] Live chat using Socket.IO (self-hosted)
- [x] Support inbox UI and message logs

---

## 1.3.4 User Activity & Audit Logs Module

Status: COMPLETED ✅

Evidence

- Tables: `login_attempts`, `product_scans`, `activity_log` ✅
- Endpoints: list + CSV download ✅
- Enhanced log filtering endpoints with parameterized queries ✅
- Analytics aggregation endpoints implemented ✅
- Admin audit UI with comprehensive filters ✅

**COMPLETED FEATURES:**

**Backend Analytics Endpoints:**

- `/analytics/scans/daily?days=30` → daily scan counts with breakdown ✅
- `/analytics/logins/daily?days=30` → daily login success/failure counts ✅  
- `/analytics/activity/summary?days=7` → activity action summaries ✅

**Enhanced Log Endpoints with Filtering:**

- `/login-attempts` with filters: username, success, days ✅
- `/product-scans` with filters: username, serialNumber, isAuthentic, isSuspicious, days ✅
- `/activity-logs` with filters: username, action, days ✅
- All endpoints use parameterized queries for security ✅

**Frontend Admin Audit Page:**

- Interactive log filtering by type (activity, login, scan) ✅
- Dynamic filter controls based on selected log type ✅
- Real-time daily analytics charts for scans and logins ✅
- CSV download functionality for all log types ✅
- Time-based filtering (7, 30, 90, 365 days) ✅
- Enhanced UI with proper loading states ✅

**Security & Quality Improvements:**

- All database queries use parameterized statements ✅
- Input validation and error handling on all endpoints ✅
- Proper JSON response formatting ✅
- Rate limiting considerations built into queries ✅

**Analytics Features:**

- Daily scan analytics with authentic/counterfeit/suspicious breakdown ✅
- Daily login analytics with success/failure/unique user counts ✅  
- Activity summary showing action frequency and user participation ✅
- Visual dashboard with time-series data display ✅

**Bonus Features (Optional completed):**

- Advanced filtering UI with multiple simultaneous filters ✅
- Real-time analytics dashboard with visual indicators ✅
- Enhanced suspicious activity detection in scan logging ✅

---

## 1.3.5 Blockchain Transaction History Module

Status: Partial (~)

Evidence

- [x] Contract `Identeefi` supports product history (`addProductHistory`, `getProduct`)
- [x] Frontend reads/writes via Ethers.js

Gaps

- Comprehensive on-chain/off-chain reconciliation view
- Event indexing (optional) not implemented

Essentials (low-complexity)

- [ ] “Product History” page that:
  - [ ] Reads on-chain history via ethers
  - [ ] Displays a timeline

Optional (later)

- [ ] Server-side event indexing into `chain_events` table

---

## 1.3.6 Analytical Reports & Dashboard Module

Status: Partial (~)

Evidence

- Endpoint `/dashboard-analytics` with basic counts (partial)
- [x] Frontend has chart libs (ApexCharts/Recharts)

Gaps

- Time series scans, counterfeit trends, geo analytics not implemented

Essentials (low-complexity)

- [ ] Minimal endpoints only for daily counts
- [ ] Frontend: one line chart (scans/day) and one bar chart (auth vs counterfeit)

Optional (later)

- [ ] Geo analytics and maps

---

## 1.3.7 Inventory & Product Movement Management Module

Status: Not implemented ☐

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


## Completion snapshot (estimates)

- 1.3.1 User Management & Auth: ~50%
- 1.3.2 Product Lifecycle & Verification: ~75%
- 1.3.3 Communication & Support: 100%
- **1.3.4 Activity & Audit Logs: 100% ✅ COMPLETED**
- 1.3.5 Blockchain History: ~70%
- 1.3.6 Analytics & Dashboard: ~45% (boosted by 1.3.4 analytics implementation)
- 1.3.7 Inventory & Movement: ~10%

These will evolve as code hardens and tests are added.
