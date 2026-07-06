# Dev Environment — Implementation Checklist

> Concrete, file-by-file tasks from `architecture_review.md` (do-now items).  
> Repos: `/home/daniel/vibe` (backend) · `/home/daniel/vibe-frontend` (frontend)

Track progress with `- [ ]` / `- [x]`.

---

## Overview

| # | ID | Task | Primary files | Est. |
|---|-----|------|---------------|------|
| 1 | MED-10 | GymContext error state + error UI | `GymContext.jsx`, `App.jsx` | 1 hr |
| 2 | CRIT-3 | JWT expired → 401 (not 400) | `middleware/auth.js` | 10 min |
| 3 | HIGH-8 | Remove duplicated member date/status logic | `GymContext.jsx`, `memberService.js`, `routes/members.js` | 1–2 hr |
| 4 | HIGH-10 | Global unhandled rejection handlers | `server.js` | 15 min |
| 5 | MED-7 | Centralized Express error handler | `middleware/errorHandler.js`, `server.js`, route files | 1–2 hr |
| 6 | MED-4 | Parallelize dashboard DB queries | `routes/dashboard.js`, `routes/admin.js` | 1 hr |
| 7 | MED-1 | Document JWT decode is UX-only | `jwt.js`, `AuthContext.jsx` | 5 min |
| 8 | MED-2 | Split dev seeds from schema | `schema.sql`, `seed.dev.sql`, `server.js` | 45 min |
| 9 | LOW-1 | Env-aware API unreachable messages | `AuthContext.jsx` | 15 min |
| 10 | HIGH-3 *(optional)* | JWT_SECRET startup guard | `server.js` | 10 min |

---

## 1. MED-10 — GymContext error state + error UI

**Problem:** `fetchAllData` catches errors but only logs them. Users see an empty dashboard with no explanation.

### `vibe-frontend/src/context/GymContext.jsx`

- [ ] Add state: `const [error, setError] = useState(null);`
- [ ] At the start of `fetchAllData`, call `setError(null)`.
- [ ] In the `catch` block (~L70–72), replace log-only with:
  ```js
  setError(err.message || 'Failed to load gym data.');
  ```
- [ ] Expose `error` and `fetchAllData` (already exposed) from the provider `value`.
- [ ] Change the loading gate (~L200–206): only show the full-screen spinner when `loading && !error`.
- [ ] When `error` is set, render an error panel **instead of** returning early with spinner-only:
  ```jsx
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p className="text-center text-slate-700">{error}</p>
        <button
          type="button"
          onClick={() => fetchAllData()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }
  ```
- [ ] Keep `{children}` rendering when data loaded successfully.

### Verify

- [ ] Stop the backend (`vibe`) and log in as gym owner → see error message + Retry button (not blank page).
- [ ] Start backend, click Retry → data loads normally.

---

## 2. CRIT-3 — JWT expired token returns 401

**Problem:** Expired tokens return `400`, but `AuthContext.apiFetch` only auto-logouts on `401`.

### `vibe/middleware/auth.js`

- [ ] Replace the `catch` block (~L38–40) with:
  ```js
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
  ```

### Verify

- [ ] Use an expired JWT in `Authorization: Bearer …` → response is `401` with `"Token expired…"`.
- [ ] Use a malformed token → `401` with `"Invalid token."`.
- [ ] Frontend redirects to login on expired session during API calls.

---

## 3. HIGH-8 — Remove duplicated member date/status logic

**Problem:** `calculateExpiryAndStatus` in `GymContext.jsx` (~L84–106) duplicates backend logic in `routes/members.js` (`calculateEndDate`, ~L27–49). Frontend can drift from backend rules.

**Rule:** Backend is the source of truth. Frontend sends `name`, `phone`, `plan_id`, `start_date` only.

### `vibe-frontend/src/context/GymContext.jsx`

- [ ] Delete `calculateExpiryAndStatus` entirely (~L84–106).
- [ ] Remove unused import `MEMBER_STATUS` if no longer referenced.
- [ ] Update `addMember` (~L141–154) payload to:
  ```js
  const payload = {
    name: memberData.name,
    phone: memberData.phone,
    plan_id: memberData.planId,
    start_date: memberData.startDate,
  };
  ```
- [ ] Update `updateMember` (~L156–168) the same way (drop `end_date` and `status` from payload).

### `vibe-frontend/src/services/memberService.js`

- [ ] Update JSDoc for `createMember` / `updateMember` payloads — remove `end_date` and `status` from the documented shape.

### `vibe/routes/members.js` *(small backend alignment)*

Backend POST already ignores client `status` and recalculates `end_date`. PUT still accepts client `status` (~L190).

- [ ] On PUT, stop trusting client `status` when `plan_id` or `start_date` changes — recalculate status from `end_date` using the same helper as `jobs/expiryCheck.js`, or preserve existing DB status when only name/phone change.
- [ ] Optionally extract shared `calculateEndDate` + status derivation into `vibe/utils/memberDates.js` and use it from both `members.js` and `expiryCheck.js`.

### Verify

- [ ] Add a member with a 1-month plan → `end_date` and `status` match backend response (check Network tab).
- [ ] Change plan on existing member → backend recalculates `end_date`; UI shows updated values after refetch.
- [ ] Owner dashboard notifications (`OwnerLayout.jsx`) still show Due Soon / Expired based on backend `status`.

---

## 4. HIGH-10 — Global unhandled rejection / exception handlers

**Problem:** Unhandled promise rejections (e.g. in the `setInterval` job) can crash Node silently or terminate the process.

### `vibe/server.js`

- [ ] Add **immediately after** `require('dotenv').config();` (~L15):
  ```js
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[uncaughtException]', error);
    process.exit(1);
  });
  ```

### Verify

- [ ] Temporarily throw inside `runDailyExpiryCheck` callback → server logs `[unhandledRejection]` instead of dying silently.
- [ ] Remove test throw after verification.

---

## 5. MED-7 — Centralized Express error handler

**Problem:** ~28 route handlers copy-paste the same `catch → console.error → res.status(500)` pattern.

### `vibe/middleware/errorHandler.js` *(new file)*

- [ ] Create:
  ```js
  module.exports = function errorHandler(err, req, res, next) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Internal server error',
    });
  };
  ```

### `vibe/server.js`

- [ ] Register **after** all routes and **after** the `/api` 404 handler (~L95–97):
  ```js
  const errorHandler = require('./middleware/errorHandler');
  app.use(errorHandler);
  ```

### Route files — migrate incrementally

Replace per-handler 500 blocks with `next(error)`:

| File | Handlers with `res.status(500)` |
|------|----------------------------------|
| `routes/auth.js` | 3 |
| `routes/plans.js` | 4 |
| `routes/members.js` | 4 |
| `routes/payments.js` | 4 |
| `routes/dashboard.js` | 1 |
| `routes/admin.js` | 8 |
| `routes/adminSaasPlans.js` | 4 |

**Pattern per route:**

```js
// Before
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Server error ...' });
}

// After
} catch (error) {
  next(error);
}
```

- [ ] Add `next` to each async handler signature: `async (req, res, next) => {`
- [ ] Start with `routes/dashboard.js` (1 handler) as a pilot.
- [ ] Migrate remaining route files.

### Verify

- [ ] Force a DB error (e.g. bad query in dev) → single formatted log + JSON `{ error: … }`.
- [ ] Normal requests still return 200/201/404 as before.

---

## 6. MED-4 — Parallelize dashboard DB queries

**Problem:** Independent `await db.query()` calls run sequentially, adding unnecessary latency.

### `vibe/routes/dashboard.js` (~L32–46)

- [ ] Replace four sequential queries with:
  ```js
  const [totalMembersRes, activeMembersRes, expiredMembersRes, incomeRes] = await Promise.all([
    db.query('SELECT COUNT(*) FROM Members WHERE gym_id = $1', [gym_id]),
    db.query("SELECT COUNT(*) FROM Members WHERE gym_id = $1 AND LOWER(status) = 'active'", [gym_id]),
    db.query("SELECT COUNT(*) FROM Members WHERE gym_id = $1 AND LOWER(status) = 'expired'", [gym_id]),
    db.query(`
      SELECT COALESCE(SUM(amount), 0) AS monthly_income
      FROM Payments
      WHERE gym_id = $1 AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
    `, [gym_id]),
  ]);
  ```

### `vibe/routes/admin.js` — `GET /dashboard` (~L261–290)

- [ ] Wrap six independent count/MRR queries in one `Promise.all([...])`.
- [ ] Keep `activeGymsCount` derived from `activeGymsRes` after `Promise.all` resolves.

### `vibe/routes/admin.js` — `GET /gyms/:id` (~L65–122)

- [ ] After confirming gym exists (~L79–81), parallelize:
  - `statsResult`
  - `membersResult`
  - `plansResult`
  - `saasSubResult`
  ```js
  const [statsResult, membersResult, plansResult, saasSubResult] = await Promise.all([
    db.query(/* stats */, [id]),
    db.query(/* members */, [id]),
    db.query(/* plans count */, [id]),
    db.query(/* saas sub */, [id]),
  ]);
  ```

### Verify

- [ ] Gym owner dashboard loads with same numbers as before.
- [ ] Admin platform dashboard and gym detail page unchanged.
- [ ] Optional: log query timing in dev — should see lower total wall time.

---

## 7. MED-1 — Document JWT decode is UX-only

**Problem:** Client-side expiry check could be mistaken for a security control.

### `vibe-frontend/src/utils/jwt.js`

- [ ] Update file-level JSDoc (~L2–8):
  ```js
  /**
   * Decodes a JWT payload for display and UX-only expiry checks.
   * Does NOT verify the signature — the backend validates every API request.
   */
  ```

### `vibe-frontend/src/context/AuthContext.jsx`

- [ ] Add comment above the expiry check (~L31–32):
  ```js
  // UX only: skip restoring session if token is past exp. Backend re-validates on every apiFetch.
  ```

### Verify

- [ ] No behavior change — comments only.

---

## 8. MED-2 — Split dev seeds from schema

**Problem:** Default users with password `"password"` live in `schema.sql` and run on every boot, including potential production deploys.

### `vibe/schema.sql`

- [ ] Remove lines ~L86–127 (seed INSERTs and sequence `setval` for seeded IDs).
- [ ] Keep DDL (`CREATE TABLE`, `ALTER TABLE`, constraints) and one-time normalization UPDATEs for now (~L130–134) — full migration split is a production task.

### `vibe/seed.dev.sql` *(new file)*

- [ ] Move seed block from `schema.sql`:
  - Gym, Users, SaaSPlans, GymSubscriptions INSERTs
  - Sequence `setval` calls
  - Comment documenting dev credentials (`admin@saas.com` / `owner@gym.com`, password: `password`)

### `vibe/server.js` — `initializeDatabase()` (~L48–65)

- [ ] After running `schema.sql`, conditionally run seeds:
  ```js
  if (process.env.NODE_ENV !== 'production') {
    const seedPath = path.join(__dirname, 'seed.dev.sql');
    if (fs.existsSync(seedPath)) {
      await db.query(fs.readFileSync(seedPath, 'utf8'));
      console.log('Dev seed data applied.');
    }
  }
  ```

### `vibe/.env` / `.env.example`

- [ ] Document: `NODE_ENV=development` for local work.

### Verify

- [ ] Fresh DB boot → tables created, seed users exist in dev.
- [ ] Set `NODE_ENV=production` → tables created, **no** default admin/owner seeded.

---

## 9. LOW-1 — Env-aware API unreachable messages

**Problem:** Error messages leak internal paths (`cd vibe && npm start`) in all builds.

### `vibe-frontend/src/context/AuthContext.jsx`

- [ ] Extract a small helper at top of file (or `src/utils/api.js`):
  ```js
  function apiUnreachableMessage() {
    if (import.meta.env.DEV) {
      return `Cannot reach the API at ${API_BASE_URL}. Start the backend: cd vibe && npm start`;
    }
    return 'Cannot reach the server. Please try again later.';
  }
  ```
- [ ] Replace both `'Failed to fetch'` branches (~L62–63 and ~L98–99) with `throw new Error(apiUnreachableMessage());`

### Verify

- [ ] Dev: backend stopped → helpful message with URL and start hint.
- [ ] Production build (`npm run build` + preview): generic message only.

---

## 10. HIGH-3 *(optional)* — JWT_SECRET startup guard

**Problem:** Missing `JWT_SECRET` causes silent auth bypass.

### `vibe/server.js`

- [ ] After `require('dotenv').config();`:
  ```js
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
  }
  ```

### Verify

- [ ] Rename/remove `JWT_SECRET` in `.env` → server exits with FATAL message.
- [ ] Restore `.env` → server starts normally.

---

## Suggested implementation order

```
1 → 2 → 4 → 7 → 9     (quick wins, ~45 min)
3 → 6                 (logic + query cleanup, ~2 hr)
5                     (error handler — pilot dashboard.js first)
8                     (seed split — do before sharing DB)
10                    (optional guard)
```

---

## Smoke test after all items

- [ ] Login as `owner@gym.com` / `password`
- [ ] Dashboard metrics load
- [ ] Add / edit / delete a member
- [ ] Add a payment
- [ ] Logout and login as `admin@saas.com`
- [ ] Admin dashboard and gym list load
- [ ] Stop backend mid-session → frontend shows error UI with retry

---

## Out of scope (production later)

Do **not** implement these during the dev sprint — tracked in `architecture_review.md`:

- CRIT-1 CORS allowlist
- CRIT-2 Protect `register-admin`
- HIGH-1 Rate limiting
- HIGH-2 Input validation (zod)
- HIGH-4 node-cron scheduler
- HIGH-5 DB pool tuning
- HIGH-6 Pagination
- HIGH-7 Role ENUM migration
- MED-3 Helmet
- MED-5 Caching
- MED-8 Split GymContext / React Query
- MED-9 Graceful shutdown
- MED-11 Subscription check caching
- LOW-2 Structured logging
- LOW-3 API versioning
- LOW-4 DB health check
