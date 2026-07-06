# Vibe Gym SaaS — Architecture & System Design Review

> **Scope**: Full-stack review of `/home/daniel/vibe` (backend) and `/home/daniel/vibe-frontend` (frontend).  
> **Dimensions**: Security · Scalability · Maintainability · Robustness  
> **Severity**: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low / Improvement

---

## Executive Summary

The codebase is a **well-structured multi-tenant SaaS application** with genuinely good fundamentals: parameterized SQL (no injection risk), proper bcrypt hashing, a clean middleware pipeline, role-based access control, and a service-layer pattern on the frontend. The code is readable and well-documented.

That said, several issues — some **critical** from a production standpoint — need addressing before this ships to real customers. Below is a prioritized breakdown.

---

## 1. 🔐 SECURITY

### 🔴 CRIT-1 — CORS is Wide Open (`*`)

**File**: [`server.js:31`](file:///home/daniel/vibe/server.js#L31-L37)

```js
res.header('Access-Control-Allow-Origin', '*');
```

This allows **any website on the internet** to make credentialed requests to your API. An attacker could embed your API calls in a malicious page.

**Fix**: Use the `cors` npm package with an allowlist:
```js
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
```

---

### 🔴 CRIT-2 — `register-admin` Endpoint is Completely Unprotected

**File**: [`routes/auth.js:180-205`](file:///home/daniel/vibe/routes/auth.js#L180-L205)

```js
router.post('/register-admin', async (req, res) => { ... }
```

**Anyone on the internet can call this endpoint and create a Platform Admin account.** There is no auth guard, no secret key check, nothing. This is a catastrophic privilege escalation vector.

**Fix**: Either protect it with `auth + adminCheck` middleware, add a pre-shared admin secret in `.env`, or disable it entirely and seed admins only via schema.

---

### 🔴 CRIT-3 — JWT Expired Token Returns 400 Instead of 401

**File**: [`middleware/auth.js:38-40`](file:///home/daniel/vibe/middleware/auth.js#L38-L40)

```js
} catch (error) {
  res.status(400).json({ error: 'Invalid token.' });
}
```

An expired token is a `401 Unauthorized`, not `400 Bad Request`. More importantly: the error is not differentiated. You should explicitly handle `TokenExpiredError` vs `JsonWebTokenError` so clients can react correctly (e.g., auto-refresh vs. redirect to login).

```js
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired. Please log in again.' });
  }
  return res.status(401).json({ error: 'Invalid token.' });
}
```

---

### 🟠 HIGH-1 — No Rate Limiting on Auth Endpoints

**File**: [`routes/auth.js`](file:///home/daniel/vibe/routes/auth.js) — `/login`, `/register-gym`, `/register-admin`

There is **no brute-force protection**. An attacker can try unlimited passwords against any account.

**Fix**: Add `express-rate-limit` to auth routes:
```js
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
router.post('/login', loginLimiter, async (req, res) => { ... });
```

---

### 🟠 HIGH-2 — No Input Validation / Sanitization Layer

**Files**: All route files

The backend accepts raw user input and trusts it beyond the basic `if (!field)` checks. There is no:
- **Length validation** (a 10MB `name` field will be stored)
- **Type coercion checks** (e.g., `amount` could be a string or negative number)
- **Email format validation**
- **XSS sanitization** on text fields

**Fix**: Use `zod` or `express-validator` to define strict schemas per route:
```js
const { body, validationResult } = require('express-validator');
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }),
], handler);
```

---

### 🟠 HIGH-3 — JWT Secret Has No Fallback Guard

**File**: [`middleware/auth.js:31`](file:///home/daniel/vibe/middleware/auth.js#L31)

```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

If `JWT_SECRET` is `undefined` (missing `.env` in production), `jsonwebtoken` signs with `undefined`, meaning **any token signed with undefined will be accepted**. This is a silent auth bypass.

**Fix**: Add a startup guard in `server.js`:
```js
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
```

---

### 🟡 MED-1 — `decodeToken` in Frontend — No Signature Verification

**File**: [`src/utils/jwt.js`](file:///home/daniel/vibe-frontend/src/utils/jwt.js)

The frontend manually decodes the JWT payload with `atob()`. This is fine for reading display data, but the comment and context suggest it's also used as an **expiry check**:

```js
if (decoded && decoded.exp * 1000 > Date.now()) {
  setUser(decoded);
}
```

Client-side expiry check using client-decoded data is **not a security control** — it's only UX convenience. The real protection is on the backend. The risk is if a developer ever treats the frontend check as authoritative. Add a clear code comment: `// NOTE: This is UX only — the backend re-validates the signature on every request`.

---

### 🟡 MED-2 — Default Seed Credentials are Publicly Documented

**File**: [`schema.sql:89-102`](file:///home/daniel/vibe/schema.sql#L89-L102), [`routes/auth.js:7-11`](file:///home/daniel/vibe/routes/auth.js#L7-L11)

The plaintext password `"password"` and its bcrypt hash are hardcoded in the schema **and** documented in code comments. Any developer who accidentally deploys to production with these seeds creates an exploitable admin account.

**Fix**: Move seed data to a separate `seed.dev.sql` file that is **never** run in production. Load it conditionally via an environment variable: `NODE_ENV !== 'production'`.

---

### 🟡 MED-3 — Helmet / Security Headers Missing

**File**: [`server.js`](file:///home/daniel/vibe/server.js)

The API has no HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`).

**Fix**: Add `helmet`:
```js
const helmet = require('helmet');
app.use(helmet());
```

---

### 🟢 LOW-1 — Hardcoded Backend URL in Error Messages

**File**: [`src/context/AuthContext.jsx:63`](file:///home/daniel/vibe-frontend/src/context/AuthContext.jsx#L63)

```js
throw new Error(`Cannot reach the API at ${API_BASE_URL}. Start the backend: cd vibe && npm start`);
```

Internal infrastructure paths leaked in frontend error messages are bad practice. These should be cleaned up for production builds using `import.meta.env.PROD`.

---

## 2. 📈 SCALABILITY

### 🟠 HIGH-4 — Background Job Uses `setInterval`, Not a Real Scheduler

**File**: [`server.js:116`](file:///home/daniel/vibe/server.js#L116-L122), [`jobs/expiryCheck.js`](file:///home/daniel/vibe/jobs/expiryCheck.js)

```js
setInterval(async () => { await runDailyExpiryCheck(); }, TWENTY_FOUR_HOURS);
```

Problems with this approach:
1. **Drift**: `setInterval` is not clock-aligned. If the server starts at 2 PM, checks run at 2 PM daily, not midnight.
2. **Memory leaks**: No `clearInterval` handle is stored; if `initializeDatabase` runs again or tests re-require the module, you get duplicate timers.
3. **Multi-instance**: If you run 2+ server processes (load balancing, pm2 cluster), the job runs N times per interval.

**Fix**: Use `node-cron` with a fixed expression, and move to a dedicated worker process or database-level job (pg_cron) for multi-instance safety:
```js
const cron = require('node-cron');
cron.schedule('0 0 * * *', runDailyExpiryCheck); // Every day at midnight
```

---

### 🟠 HIGH-5 — No Database Connection Pool Configuration

**File**: [`config/db.js`](file:///home/daniel/vibe/config/db.js)

```js
const pool = new Pool({ user, host, database, password, port });
```

The `pg.Pool` defaults to **10 max connections**. Under load, all connections will be exhausted and requests will queue indefinitely. There is also no:
- `idleTimeoutMillis` — idle connections stay open forever
- `connectionTimeoutMillis` — client waits indefinitely for a connection
- Pool health monitoring

**Fix**:
```js
const pool = new Pool({
  ...dbConfig,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
pool.on('error', (err) => console.error('Unexpected pool error', err));
```

---

### 🟠 HIGH-6 — No Pagination on List Endpoints

**Files**: [`routes/admin.js:33`](file:///home/daniel/vibe/routes/admin.js#L33) (GET /gyms), [`routes/members.js:107`](file:///home/daniel/vibe/routes/members.js#L107) (GET /members), [`routes/payments.js:77`](file:///home/daniel/vibe/routes/payments.js#L77)

All list endpoints return **all rows, no limit**. A gym with 10,000 members will dump 10,000 rows in a single JSON response, causing:
- High memory usage on server and client
- Long response times
- Browser render freezes

**Fix**: Add cursor-based or offset pagination with a default limit:
```js
const limit = Math.min(parseInt(req.query.limit) || 50, 200);
const offset = parseInt(req.query.offset) || 0;
// SELECT * FROM Members WHERE gym_id = $1 LIMIT $2 OFFSET $3
```

---

### 🟡 MED-4 — Dashboard Endpoint Makes 4 Sequential DB Queries

**File**: [`routes/dashboard.js:33-46`](file:///home/daniel/vibe/routes/dashboard.js#L33-L46)

The dashboard fires 4 `await db.query()` calls one after another. These are independent and could all run simultaneously:

```js
const [total, active, expired, income] = await Promise.all([
  db.query('SELECT COUNT(*)...'),
  db.query("SELECT COUNT(*)... WHERE LOWER(status) = 'active'"),
  db.query("SELECT COUNT(*)... WHERE LOWER(status) = 'expired'"),
  db.query("SELECT COALESCE(SUM(amount)..."),
]);
```

Same applies to `routes/admin.js:259` (5 sequential queries) and the `GET /gyms/:id` endpoint (5 sequential queries).

---

### 🟡 MED-5 — No Caching Layer

Every page load and every navigation event triggers fresh DB queries. For a SaaS dashboard with static-ish data (plans, subscription status), even a 30-second in-memory cache (or Redis) would dramatically reduce DB load.

---

### 🟡 MED-6 — `schema.sql` Is Executed Idempotently But Contains Dangerous State Mutations

**File**: [`schema.sql:130-134`](file:///home/daniel/vibe/schema.sql#L130-L134)

```sql
UPDATE Users SET role = 'Platform Admin' WHERE role IN ('Admin', 'admin');
UPDATE Members SET status = LOWER(TRIM(status))...
```

These `UPDATE` statements run on **every server boot**. In production with concurrent starts (rolling deploys), this causes unnecessary write contention on hot tables. Move one-time migrations to a proper migration tool (`db-migrate`, `flyway`, or even numbered `.sql` files).

---

## 3. 🧩 MAINTAINABILITY

### 🟠 HIGH-7 — Role Strings are Magic Values Stored in the DB

**Files**: [`utils/roles.js`](file:///home/daniel/vibe/utils/roles.js), [`schema.sql:25`](file:///home/daniel/vibe/schema.sql#L25)

```js
const ROLES = {
  PLATFORM_ADMIN: 'Platform Admin',
  GYM_OWNER: 'Gym Owner',
};
```

And in `isPlatformAdmin`:
```js
return role === ROLES.PLATFORM_ADMIN || role === 'Admin'; // ← legacy alias!
```

Role values are **plain text strings stored in the DB** with no DB-level constraint (no `ENUM` or `CHECK` constraint on `Users.role`). Changing a role name requires a data migration. The dual-alias in `isPlatformAdmin` is a latent bug.

**Fix**: Use a PostgreSQL `ENUM` or `CHECK` constraint:
```sql
ALTER TABLE Users ADD CONSTRAINT check_user_role 
  CHECK (role IN ('Platform Admin', 'Gym Owner'));
```
Then remove the `'Admin'` alias and fix any legacy rows via a one-time migration.

---

### 🟠 HIGH-8 — Business Logic Scattered Across Routes and Context

**Examples**:
- Date calculation (`calculateEndDate`) lives in [`routes/members.js`](file:///home/daniel/vibe/routes/members.js#L27-L49) AND is duplicated in [`GymContext.jsx`](file:///home/daniel/vibe-frontend/src/context/GymContext.jsx#L85-L106)
- Member status logic is in both frontend (`utils/memberStatus.js`) and backend (`jobs/expiryCheck.js`)

The **source of truth for business rules should be the backend only**. The frontend re-implementing expiry/status calculation creates drift — if the rule changes, you must update it in two places.

**Fix**: Trust the backend status field completely. Remove `calculateExpiryAndStatus` from `GymContext.jsx`. The backend already returns the canonical `status` from the DB.

---

### 🟡 MED-7 — No Error Handling Abstraction

Every route has the same pattern:
```js
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Failed to ...' });
}
```

This is copy-pasted across ~25 handlers. Create a centralized Express error handler:
```js
// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(`[${req.method} ${req.path}]`, err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
};

// server.js — AFTER all routes
app.use(errorHandler);
```

Then routes just do `next(error)` instead of handling the 500 response themselves.

---

### 🟡 MED-8 — `GymContext` Manages Too Much State

**File**: [`src/context/GymContext.jsx`](file:///home/daniel/vibe-frontend/src/context/GymContext.jsx)

`GymContext` holds **all three data domains** (plans, members, payments) and re-fetches **all three** on every mutation (`runMutation → fetchAllData`). This means adding one payment re-fetches all members and all plans unnecessarily.

**Fix**: Split into separate contexts (`PlansContext`, `MembersContext`, `PaymentsContext`) or use a proper server-state library like **TanStack Query (React Query)** which gives you per-resource caching, invalidation, and stale-while-revalidate out of the box.

---

### 🟢 LOW-2 — No Structured Logging

All logging is `console.log` / `console.error`. In production, you want:
- **Log levels** (debug/info/warn/error)
- **Structured JSON** format for log aggregators
- **Request IDs** for tracing

**Fix**: Replace with `pino` or `winston`:
```js
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
```

---

### 🟢 LOW-3 — No API Versioning

All routes are `/api/...` with no version prefix. When you need to make a breaking change in the future, you'll need to version the API (`/api/v1/...`).

---

## 4. 🛡️ ROBUSTNESS

### 🟠 HIGH-9 — `initializeDatabase` Runs Schema SQL on Every Boot

**File**: [`server.js:48-65`](file:///home/daniel/vibe/server.js#L48-L65)

```js
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
await db.query(schemaSql);
```

The `schema.sql` file contains **multiple statements** including `UPDATE` and `ALTER TABLE`. Passing a multi-statement SQL string to `pool.query()` is not guaranteed to be supported by all `pg` versions and can silently fail or only execute the first statement. It also runs `UPDATE` queries with write locks on boot, which can cause issues on busy databases.

**Fix**: Use a migration library (`node-postgres-migrate`, `db-migrate`) or split statements and execute them individually with proper error handling per statement.

---

### 🟠 HIGH-10 — No Global Unhandled Rejection / Exception Handler

**File**: [`server.js`](file:///home/daniel/vibe/server.js)

If any promise rejects without a `.catch()` handler (in middleware, scheduled jobs, etc.), Node.js will print a warning and **may crash** (in Node 15+, unhandled rejections terminate the process by default).

**Fix**: Add global safety nets at the top of `server.js`:
```js
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});
```

---

### 🟡 MED-9 — No Graceful Shutdown

**File**: [`server.js`](file:///home/daniel/vibe/server.js)

When the process receives `SIGTERM` (from pm2, Docker, k8s), there's no graceful shutdown — in-flight requests are dropped and the DB pool isn't drained.

**Fix**:
```js
const server = app.listen(PORT, ...);

process.on('SIGTERM', async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
```

---

### 🟡 MED-10 — Frontend Silently Swallows All Fetch Errors in GymContext

**File**: [`src/context/GymContext.jsx:70-73`](file:///home/daniel/vibe-frontend/src/context/GymContext.jsx#L70-L73)

```js
} catch (err) {
  console.error('Error synchronizing database:', err);
  // ← No state update, no user notification
}
```

If `fetchAllData` fails, the user sees an empty page with no error message. There should be an `error` state that renders a user-friendly error UI.

---

### 🟡 MED-11 — Subscription Check Queries DB on Every Protected Request

**File**: [`middleware/subscriptionCheck.js:32`](file:///home/daniel/vibe/middleware/subscriptionCheck.js#L32)

```js
const result = await db.query('SELECT subscription_status FROM Gyms WHERE id = $1', [gymId]);
```

Every single API call by a gym owner hits the DB just to check if the subscription is active. Under load this adds ~1 DB round-trip per request.

**Fix**: Embed the subscription status in the JWT payload at login, and only re-validate against the DB on write operations or on a TTL basis. Or cache the subscription status in Redis with a 5-minute TTL.

---

### 🟢 LOW-4 — No Health Check for DB Connectivity

**File**: [`server.js:90-92`](file:///home/daniel/vibe/server.js#L90-L92)

```js
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'gym-saas-api' });
});
```

The health check always returns `ok: true` even if the database is down. Load balancers and orchestrators rely on this endpoint to decide if the server is healthy.

**Fix**:
```js
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'disconnected' });
  }
});
```

---

## Priority Action Plan

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 1 | Protect `register-admin` (CRIT-2) | 15 min | Catastrophic |
| 🔴 2 | Restrict CORS to allowlist (CRIT-1) | 30 min | High |
| 🔴 3 | Guard against missing JWT_SECRET (CRIT-3) | 10 min | High |
| 🟠 4 | Add rate limiting on auth (HIGH-1) | 1 hr | High |
| 🟠 5 | Add input validation with zod/express-validator (HIGH-2) | 3-4 hrs | High |
| 🟠 6 | Replace setInterval with node-cron (HIGH-4) | 1 hr | Medium |
| 🟠 7 | Configure DB pool limits (HIGH-5) | 30 min | High |
| 🟠 8 | Add pagination to list endpoints (HIGH-6) | 2 hrs | High |
| 🟠 9 | Centralize error handler (MED-7) | 1 hr | Medium |
| 🟡 10 | Add helmet + security headers (MED-3) | 20 min | Medium |
| 🟡 11 | Fix health check to test DB (LOW-4) | 15 min | Medium |
| 🟡 12 | Parallelize dashboard DB queries (MED-4) | 1 hr | Medium |
| 🟡 13 | Add graceful shutdown (MED-9) | 30 min | Medium |
| 🟡 14 | Fix frontend error state in GymContext (MED-10) | 1 hr | Medium |
| 🟡 15 | Add unhandled rejection handlers (HIGH-10) | 15 min | High |

---

## What's Already Done Well ✅

- ✅ **Parameterized SQL** everywhere — no SQL injection risk
- ✅ **bcrypt** with 10 rounds for password hashing
- ✅ **JWT authentication** with expiry on all protected routes
- ✅ **Multi-tenancy enforcement** — `gym_id` scoping on all queries
- ✅ **Database transactions** for multi-step operations (gym registration, plan assignment)
- ✅ **Service layer** on frontend decoupled from React context
- ✅ **Role-based access control** with dedicated middleware
- ✅ **Subscription gate** middleware protecting gym owner routes
- ✅ **Case-insensitive status checks** and DB-level `CHECK` constraints
- ✅ **Cascade deletes** properly set up in schema
- ✅ **`Promise.all`** partially used (fetchAllData in GymContext)
- ✅ **Sequence resync** on seed to prevent PK conflicts
- ✅ **Good JSDoc** coverage throughout backend
