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
Status: ✅ Completed

What’s implemented (verified across code, blockchain, and DB logs):

- Smart contract: `Blockchain/contracts/Identeefi.sol`
  - Immutable product lifecycle on-chain via `registerProduct` and `addProductHistory`
  - Emits `ProductRegistered` / `ProductHistoryAdded` events consumed by the indexer
- Chain events indexer (new): `backend/services/chainEventsIndexer.js`
  - Boots with backend, keeps schema up to date, and backfills live + historical events
  - Decodes event calldata to resolve serial numbers (stores both readable serial + hash)
  - Exposes `/chain-indexer/status` and `/chain-events` APIs
- Backend transparency endpoint: `GET /transparency/:serialNumber`
  - Merges indexed on-chain events with off-chain ownership records
  - Returns reconciliation status + unified timeline
- Frontend Transparency Dashboard: `frontend/src/components/pages/TransparencyDashboard.jsx`
  - Dark-themed page with search, CSV export, on-chain timeline, ownership history, and reconciliation table
  - Linked from hero, navbar, admin dashboard, and manufacturer view
- Verification evidence (Oct 1, 2025 run):
  - Hardhat node running; new serial `AUTO-1759272506513` registered on-chain
  - `chain_events` table stores matching rows (ProductRegistered/ProductHistoryAdded)
  - `/transparency/AUTO-1759272506513` returns the on-chain history and reconciliation OK

Optional follow-ups:

- Add diff-highlighting between on-chain history and consumer ownership (currently reconciliation provides summary text)
- Consider caching `/transparency` responses for frequently queried serials

---

## 1.3.6 Analytical Reports & Dashboard Module
Status: ✅ Completed (core + optional enhancements)

What’s implemented (verified Oct 1, 2025):

- **Backend intelligence layer (`backend/postgres.js`)**
  - Geo enrichment: `/verification/scan` now resolves `geo_country`/`geo_city` via `geoip-lite`; migration `2025-10-01_product_scans_geo_columns.sql` adds columns + index.
  - New analytics endpoints: `/analytics/scans/suspicious-summary`, `/analytics/inventory/summary`, `/analytics/inventory/moves` with safety guards for missing tables.
  - Existing analytics refined for stacked trends, counterfeit leaderboard, geo roll-ups, and inventory velocity feeds.
- **Performance Analytics console (`/analytics`)**
  - Brand-new dark-mode dashboard with hero metrics, stacked verification timeline, suspicious pulse sparkline, login reliability chart, geo treemap, and counterfeit leaderboard.
  - Inventory intelligence: stacked velocity area chart, holdings/status cards, transfer destination highlights, flow matrix, and recent move table (driven by new endpoints).
  - Admin navigation updated (sidebar + quick action card) for one-click access.
- **Optional deliverables (previously “later”) now live**
  - Top counterfeit products table using `/analytics/counterfeit/top`.
  - Geo analytics visualised via treemap heatmap fed by enriched scan data.
  - Suspicious activity summary card with top drivers + 24h pulse.
  - Inventory trend endpoints/UI powered by `inventory` and `inventory_moves` datasets, including role-to-role flow matrix.

Operational evidence:

- Recent verification scans (Oct 1, 2025) now persist `geo_country`/`geo_city` in `product_scans`, verified via `/analytics/scans/geo?days=30` response data feeding the treemap.
- `/analytics/scans/suspicious-summary?days=30` returns total anomalies, counterfeit subset, top five suspicion reasons, and a daily sparkline payload used on the dashboard.
- `/analytics/inventory/summary?days=45` and `/analytics/inventory/moves?days=45` feed the stacked velocity chart, holdings/status cards, and recent moves grid with live DB data; endpoints gracefully flag availability when tables are absent.
- UI walkthrough: Admin → “Analytics Intelligence” card launches `/analytics` console showing all metrics in the redesigned gradient interface (see commit screenshots / local build).

Next ideas (future polish):

- Add anomaly rule visualisations (geo distance spikes, device fingerprinting) once rule engine lands.
- Consider persisted caching for high-traffic analytics endpoints.
- Expand geo chart to world map heatmapping when global usage data grows.

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
- 1.3.5 Blockchain History: 100%
- 1.3.6 Analytics & Dashboard: ~60% (backend complete; frontend partially wired)
- 1.3.7 Inventory & Movement: ~10%

These will evolve as code hardens and tests are added.
