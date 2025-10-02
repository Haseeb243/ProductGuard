# Copilot Instructions for ProductGuard

## Architecture at a Glance

- Monorepo with three active apps: `backend/` (Express + PostgreSQL), `frontend/` (React CRA), and `Blockchain/` (Hardhat + Solidity). See top-level `package.json` only for workspace metadata; each sub-app has its own scripts.
- The Express server lives entirely in `backend/postgres.js`; it bootstraps the DB client, websocket chat (`chatService.js`), email notifications, and the chain indexer (`services/chainEventsIndexer.js`). New endpoints are usually added directly to that file.
- React admin features share a glassmorphism shell (`frontend/src/components/admin/AdminShell.jsx` and `admin/ui.js`). Pages such as `pages/AuditLogs.jsx`, `pages/AnalyticsDashboard.jsx`, and `pages/ManageAccount.jsx` are the best references for layout/interaction patterns.
- Blockchain events are ingested by the `chainEventsIndexer` service which backfills `chain_events` rows and normalizes timestamps. Frontend blockchain reads are routed through context helpers instead of hitting Hardhat directly in components.

## Backend Practices

- All SQL goes through the shared `pg` client with parameterized placeholders (`$1`, `$2`, …). Follow the existing pattern: build a `params` array, track `paramIndex`, and append `ORDER BY … LIMIT $n` before executing (`/activity-logs`, `/download-logs/:type` show the convention).
- CSV exports rely on `json2csv` (`/download-logs/:type`). When extending exports, keep field order explicit (`fields = [...]`) and reuse the filter helpers so downloads match on-screen filters.
- WebSocket chat features sit in `chatService.js`; they expect conversations to be stored in `support_chats`. Emit events via the same naming (`userOnline`, `newMessage`) when adding functionality.
- Chain indexer env flags: `CHAIN_INDEXER_ENABLED`, `CHAIN_INDEXER_RPC_URL`, and chunk sizes (`CHAIN_INDEXER_BLOCK_CHUNK`). Respect these when touching background jobs.
- File uploads are stored under `backend/public/uploads/{product,profile}` via Multer disk storage. Use those helpers instead of reinventing upload logic.

## Frontend Practices

- Wrap admin routes in `AdminShell`; pass `meta`, `actions`, and optional `toolbar`. `GlassCard`, `glassButtonClass`, and related helpers provide consistent styling—copy their usage from `AuditLogs`.
- Access configuration via `useConfig()` (`apiBaseUrl`, `fileEndpoint`, contract address). Do not hardcode URLs; reuse `ConfigContext` utilities.
- Data fetching patterns: build query strings with `URLSearchParams` (`AuditLogs.buildParams`) and surface errors with `react-toastify` (`toast.error`). Maintain loading state and `lastRefreshed` timestamps for meta pills.
- Role-filtered directory views rely on query params (`useSearchParams`) as seen in `ManageAccount.jsx`. Favor this approach for admin filters so sidebar links like `/manage-account?role=supplier` stay in sync.
- Charts use ApexCharts (`AnalyticsDashboard.jsx`) and custom summary cards. Reuse those utilities instead of importing additional charting libs.

## Blockchain Layer

- Contracts live in `Blockchain/contracts/`. Use Hardhat scripts in `Blockchain/scripts/` (`deploy.js`, `run.js`) and update `REACT_APP_CONTRACT_ADDRESS` after deploys.
- The backend indexer reads the ABI from `backend/abis/Identeefi.json`. If the contract changes, rebuild the ABI and keep this file aligned.

## Developer Workflows

- Backend: `cd backend; npm start` (loads `postgres.js` directly).
- Frontend: `cd frontend; npm start`; production build via `npm run build`. CRA proxy points to `http://localhost:5000`, so use relative URLs (`/activity-logs`).
- Blockchain: `cd Blockchain; npx hardhat node` plus `npx hardhat run scripts/deploy.js --network localhost`.
- Database migrations are plain SQL in `backend/migrations/`. Apply manually with psql or a migration tool; nothing is automated in scripts.

## Conventions & Gotchas

- Many admin pages expect glass-themed metrics; avoid plain Material UI tables unless wrapped in the new shell. Reuse the status badge helpers (`statusBadge` in `AuditLogs.jsx`) for consistent colors.
- Toast notifications come from `react-toastify`; make sure a `<ToastContainer />` is mounted (already in `App.js`). Prefer `toast.error(...)` / `toast.success(...)` instead of `alert`.
- Socket.io client usage depends on shared event names; check `frontend/src/components/CustomerSupport.js` before changing payload shapes.
- Avoid mutating the massive `postgres.js` file without keeping shutdown hooks and `connectionPromise` wiring intact; new services should reuse the existing graceful shutdown pattern.

Let us know if any section is unclear or missing key context for your workflow so we can refine these instructions.
please read all file not just the first 400 line and if it too large send it in partss
