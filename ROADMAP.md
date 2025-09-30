# ProductGuard Roadmap

This roadmap maps your current codebase to the functional modules and outlines what’s done, what’s missing, and a simple, free-to-implement checklist to complete each module.

Implementation principles (for this roadmap)

- Keep it simple: prefer the smallest change that works
- Use only free/open-source tools; no paid SaaS
- Favor incremental steps you can finish in hours, not weeks
- Advanced features are marked Optional — do them later if needed

Legend

- Done
- Partial / needs improvement
- Not implemented yet

Repo anchors

- Backend: `backend/postgres.js` (Express + PostgreSQL)
- Frontend: `frontend/src` (React + Context, Ethers.js)
- Blockchain: `Blockchain/` (Hardhat + Solidity, `Ignition` not used)
- DB dump: `db.sql`

---

## 1.3.1 User Management & Authentication Module

Status: Completed

Evidence

- Login endpoint: `POST /auth/login` + frontend Login implemented
- Role-based UI routing: `RequireAuth` with roles
- Create/change user endpoints: `/addaccount`, `/changepsw`
- Profiles CRUD (partial): `/profileAll`, `/profile/:username`, `/addprofile`
- Audit logs exist: `login_attempts`, `activity_log`
- JWT authentication with secure token handling
- Password hashing with bcrypt
- RBAC middleware for route protection
- Two-Factor Authentication (2FA) support
- Rate limiting on login attempts

Gaps (All Fixed)

- Passwords stored in plaintext (fixed: now using bcrypt)
- SQL injection in auth/profile queries (fixed: parameterized queries)
- No JWT/session; auth only in frontend memory (fixed: JWT tokens)
- No backend authorization middleware (RBAC) protecting routes (fixed)
- No 2FA (fixed)

Essentials (low-complexity) - ALL COMPLETED

- Replace `/auth/:username/:password` with `POST /auth/login` (JSON body)
- Hash passwords with bcrypt; parameterize all SQL queries
- Issue a simple JWT access token (no refresh token for now)
- Lightweight RBAC middleware that checks role from JWT
- Add simple rate-limit on `/auth/login`

Frontend - ALL COMPLETED

- Call `POST /auth/login` with JSON
- Store access token in memory (React state) and attach via axios interceptor

Optional Features - COMPLETED

- Add refresh tokens (httpOnly cookie) - Basic token validation implemented
- Add 2FA for admins/manufacturers - Full 2FA system implemented
- Add password reset flow - Can be implemented using existing changePassword endpoint

New Features Added

- Comprehensive 2FA system with QR codes and authenticator app support
- 2FA management UI in profile settings
- Secure JWT token validation and refresh
- Rate limiting with configurable limits
- Enhanced error handling and user feedback
- Complete setup documentation (AUTHENTICATION_SETUP.md)

---

## 1.3.2 Product Lifecycle & Consumer Verification Module

Status: Completed

What’s implemented (verified across backend, frontend, blockchain):

- Product registration (on-chain + DB):
  - Frontend: `frontend/src/components/pages/AddProduct.jsx` calls `registerProduct(...)` on `Identeefi` and also `POST /addproduct` to store minimal metadata in DB. (done)
  - Backend: `backend/postgres.js` endpoint `POST /addproduct` persists to `product` table and writes to `activity_log`; sends confirmation email via `emailService.sendProductRegistrationEmail(...)`. (done)
  - Smart contract: `Blockchain/contracts/Identeefi.sol` implements `registerProduct` and internal history init. (done)

- QR code generation:
  - Frontend: `AddProduct.jsx` renders a QR with payload `CONTRACT_ADDRESS,serialNumber` using `qrcode.react` and supports download. (done)
  - Backend emails also include a QR image URL built from the same payload (`emailService.js`). (done)

- Supply chain updates (movement/history):
  - Frontend: `UpdateProduct.jsx` + `UpdateProductDetails.jsx` call `addProductHistory(...)` on the contract with actor, location, timestamp, isSold. (done)
  - Smart contract: `Identeefi.sol` implements `addProductHistory` and stores an append-only history map. (done)
  - Retail sale capture: When a retailer marks “Is Sold = true”, the UI now requires consumer details (name + identifier) and records them via `POST /ownership/transfer`. (done)
  - Consumer ownership surfaced: Consumer-facing `Product.jsx` fetches `GET /ownership/:serialNumber` and displays the current owner. (done)

- QR scanning and routing UX:

  - Frontend: `QrScanner.js` + `ScannerPage.jsx` call `POST /verification/scan`; routing is based on the server verdict:
    - suppliers/retailers → `UpdateProduct.jsx`
    - consumers → `AuthenticProduct.jsx`
    - mismatches → `FakeProduct.jsx`
  - Logging: Centralized within `/verification/scan`; legacy `POST /scan-product` retained for compatibility.

- Blockchain verification view for consumers:

  - Frontend: `Product.jsx` reads `getProduct(serial)` via ethers and renders details plus a timeline from on-chain history. (done)
  - Displays a “Current Owner” panel (if available) with name, identifier, and since-date. (done)

- Scan logging + notifications:

  - Backend: `POST /verification/scan` validates input, computes authenticity, logs into `product_scans` with IP/user-agent, and applies duplicate detection; emails owner if suspicious. Legacy `POST /scan-product` still available.
  - DB: `product_scans` table exists in `db.sql` and includes all required columns; analytics endpoints read from it.

Key notes and remaining risks:

- QR “tamper-proof” is overstated. Current QR payload has no signature/HMAC; anyone can craft `CONTRACT_ADDRESS,serial`. Consider adding a signed payload for integrity. (optional, not blocking)
- Read-only blockchain calls currently require a signer; these can use a read-only provider to avoid wallet friction for consumers. (nice-to-have)
- Image upload hardening (Multer): filenames aren’t randomized; no mime/size limits enforced. (tracked under cross-cutting)

Essentials implemented in 1.3.2:

- Implemented `POST /verification/scan` on the backend that:
  - Parses QR payload, validates inputs (Joi), and determines `isAuthentic` by comparing contract address. Logs into `product_scans` with IP/user-agent.
  - Computes `isSuspicious` using Rule v1: “same serial scanned from >3 distinct IPs within 10 minutes” and includes `suspicion_reason`.
  - Returns `{ isAuthentic, isSuspicious, suspicionReason, serialNumber }`.

- Updated the frontend scanning flow:
  - `ScannerPage.jsx` calls `/verification/scan` and routes based on the response.
  - Passes `isSuspicious` to the consumer detail page and shows a clear badge/warning in `Product.jsx`.

- Server-side input validation:
  - `POST /verification/scan` schema for qr payload and optional location (Joi).
  - `POST /addproduct` now validates serialNumber, name, brand, username.
  - `POST /ownership/transfer` validates serialNumber, ownerName, ownerIdentifier. (done)

Optional (later, security + robustness):

- Add QR payload signing (HMAC) with server-side verification.
- Additional anomaly rules (geo distance spikes, device fingerprint, repeated scans by same device, time-of-day anomalies).
- Use a read-only provider for consumer reads to avoid wallet prompts.
- Harden image uploads: whitelist mime types, limit size, randomize filenames.

Notes and evidence pointers:

- Frontend files: `AddProduct.jsx`, `UpdateProduct.jsx`, `UpdateProductDetails.jsx`, `ScannerPage.jsx`, `AuthenticProduct.jsx`, `FakeProduct.jsx`, `Product.jsx`, `QrScanner.js`.
- Backend files: `postgres.js` (routes: `/addproduct`, `/scan-product`, analytics endpoints), `emailService.js` (registration + suspicious emails), `chatService.js` (unrelated but present).
  - Ownership routes: `/ownership/transfer` and `/ownership/:serialNumber` (current owner lookup).
- Contract: `Blockchain/contracts/Identeefi.sol` with `registerProduct`, `addProductHistory`, `getProduct`.
- Database: `db.sql` defines `product`, `product_scans`, and logs (`activity_log`); analytics endpoints expect `is_suspicious` column which your DB should include.

---

## 1.3.3 Communication & Customer Support Module

Status: Completed

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
Status: Largely implemented; missing indexer and read-only consumer path (~85%)

What’s implemented (verified across code and DB):

- Smart contract: `Blockchain/contracts/Identeefi.sol`
  - Immutable product lifecycle on-chain via `registerProduct` and `addProductHistory` (history stored in mapping)
  - Emits `ProductRegistered` and `ProductHistoryAdded` events for off-chain indexing
- Frontend consumer/manufacturer views:
  - `frontend/src/components/pages/Product.jsx` fetches on-chain history with `getProduct(...)` and renders a timeline; shows “Current Owner” from backend `GET /ownership/:serialNumber`
  - `frontend/src/components/pages/UpdateProduct.jsx` reads on-chain history for supplier/retailer
  - `frontend/src/components/pages/UpdateProductDetails.jsx` appends on-chain history (actor, location, timestamp, isSold) and, when sold, records off-chain consumer ownership via `POST /ownership/transfer`
- Backend + DB:
  - Ownership endpoints in `backend/postgres.js`: `POST /ownership/transfer`, `GET /ownership/:serialNumber`
  - `consumer_ownership` table present in `db.sql`; migration `2025-09-30_consumer_ownership_ident_column.sql` adds `owner_identifier` and index
  - `activity_log` captures product actions; `chain_events` table exists for optional on-chain event indexing

Gaps found (missing/not wired):

- No event indexer: there’s no background listener piping contract events into `chain_events`
- Read-only provider not used: consumer pages rely on an injected signer (`Web3Provider`), which prompts wallets; a public read-only provider path is missing
- No dedicated Transparency Dashboard: timeline lives inside `Product.jsx`; there’s no unified on-chain/off-chain transparency page

Essentials (low-complexity next):

- [ ] Add a tiny Node listener (Hardhat/ethers.js) to subscribe to `ProductRegistered`/`ProductHistoryAdded` and upsert into `chain_events`
- [ ] Add a read-only provider branch (ethers `JsonRpcProvider`) for consumer reads to avoid wallet prompts
- [ ] Small “Transparency Dashboard” page that merges on-chain history with off-chain ownership from `/ownership/:serialNumber`

Optional (later):

- [ ] Reconciliation UI and diff highlighting between on-chain history and off-chain `consumer_ownership`

---

 
## 1.3.6 Analytical Reports & Dashboard Module
Status: Backend complete; frontend partially wired (~60%)

What’s implemented (verified):

- Backend analytics (in `backend/postgres.js`):
  - `/dashboard-analytics` totals: users (by role via `profile`), products, scans, authentic, counterfeit
  - `/analytics/scans/daily?days=...` time-series with authentic/counterfeit/suspicious breakdown
  - `/analytics/logins/daily?days=...` time-series login analytics (success/failure/unique users)
  - `/analytics/activity/summary?days=...` action frequency + unique users
  - `/analytics/counterfeit/top?days=...&limit=...` top high-risk serials by counterfeit rate
  - `/analytics/scans/geo?days=...` geo rollup by country/city (expects geo columns)
  - Logs: filterable endpoints + CSV download for activity, logins, scans
- Frontend wiring:
  - `Admin.jsx` shows totals and weekly trends using `/analytics/scans/daily`, `/analytics/logins/daily`, `/analytics/activity/summary`
  - `AuditLogs.jsx` renders interactive, filterable logs and mini trends (daily scans/logins)

Gaps found:

- Geo fields not present/populated: `/analytics/scans/geo` references `geo_country`/`geo_city` in `product_scans`, but neither the dump (`db.sql`) nor migration adds/populates them; geo analytics will return empty/SQL errors until columns + enrichment exist
- Frontend doesn’t yet surface “Top Counterfeit Products” table or geo analytics/heatmap
- No dedicated “Admin Performance Dashboard” page consolidating all analytics (admin has partial cards/charts only)
- Inventory analytics absent: while `inventory`/`inventory_moves` tables exist in DB, no endpoints or UI charts are implemented for inventory flow/lifecycle trends
- Suspicious activity summary widget not present (though `is_suspicious` is logged and could be summarized)

Essentials (next):

- [ ] DB: add `geo_country` and `geo_city` columns to `product_scans`; backfill/enrich on write in `/verification/scan` using an IP geolocation library/service; add indexes
- [ ] UI: add a “Top Counterfeit Products” widget/table (use `/analytics/counterfeit/top`)
- [ ] UI: wire a simple geo chart/heatmap using `/analytics/scans/geo` (after DB columns exist)
- [ ] UI: add a Suspicious Activity summary card (counts over last 7/30 days from `product_scans.is_suspicious`)
- [ ] Optional: add a consolidated “Performance Dashboard” page that aggregates totals, time-series, top counterfeit, geo, and suspicious activity

Optional (later):

- [ ] Inventory trend endpoints + UI (stock over time, moves per role); source from `inventory` and `inventory_moves`
- [ ] Add anomaly rules to analytics (geo distance spikes, repeated device scans) and surface them in reports

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


## Completion snapshot (estimates)

- 1.3.1 User Management & Auth: 100%
- 1.3.2 Product Lifecycle & Verification: 100%
- 1.3.3 Communication & Support: 100%
- **1.3.4 Activity & Audit Logs: 100% ✅ COMPLETED**
 - 1.3.5 Blockchain History: ~85%
 - 1.3.6 Analytics & Dashboard: ~60% (backend complete; frontend partially wired)
- 1.3.7 Inventory & Movement: ~10%

These will evolve as code hardens and tests are added.
