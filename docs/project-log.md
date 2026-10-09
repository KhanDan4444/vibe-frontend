# Project Log — Vibe / ንቁ / Niku

| | |
|---|---|
| **Standing section last updated** | 2026-10-09 (draft TTL 1 min; new gym/member = created_at) |
| **Canonical requirements** | [`SRS.md`](./SRS.md) (v1.2) |
| **Message copy catalog** | [`MESSAGE_CATALOG.md`](./MESSAGE_CATALOG.md) |
| **Repos** | `vibe` (API) · `vibe-frontend` (web) · `vibe-mobile` (Expo) |

> **Agent memory.** Standing sections = current truth. Session log = append-only history.  
> When a custom changes: update Standing + Decision index + Do-not-regress, and record why in a new session entry.

---

## Decision index (current truth)

| Decision | Value | Since |
|---|---|---|
| Free trial on self-signup | **Off** unless `GYM_SIGNUP_TRIAL_DAYS` > 0 | 2026-10-08 |
| Admin enroll Free Trial | Plan select includes Free Trial; admin enters trial days (no fixed length) | 2026-10-08 |
| Plan badge (owner UI) | Free Trial as-is (amber); paid → Monthly/Quarterly/Yearly Plan (teal); trial shows days left under badge | 2026-10-08 |
| Admin trial visibility | List + detail: day used / total / days left / end date for Free Trial gyms | 2026-10-08 |
| New members metric/filter | **Registered this month** via `created_at` (not renew `start_date`) | 2026-10-09 |
| Admin New gym filter | Gyms registered this month (`Gyms.created_at`); chip after Expired | 2026-10-09 |
| Signup / admin enroll fields | City required; address optional; confirm password | 2026-09-14 |
| Member notices channel | **Telegram only** (linked); no SMS fallback | 2026-09-14 |
| SMS reserved for | OTP + gym SaaS/trial license alerts | 2026-09-15 |
| SMS brand prefix | **ንቁ** | ongoing |
| Mobile FAB phone / tablet | **56** / **68** (radius 17/20, plus 30/36) | 2026-09-15 |
| FAB vs tab bar gap | **Do not change** when resizing FAB | 2026-09-15 |
| Tablet sheets | Wider via `sheetMaxWidth` | 2026-09-14 |
| Auth / logo glow | **No teal glow** on web or mobile auth | 2026-08 |
| Platform Admin on mobile | **Not supported** (reject login) | ongoing |
| Payments | Manual only (no gateway) | v1 |
| Agent memory file | This log + Cursor rule | 2026-10-08 |
| Mobile form drafts | AsyncStorage drafts (no passwords/photos); enroll + register-gym + renew; **TTL 1 min** | 2026-10-08 |
| Mobile list UI persist | Members filter/sort/search; revenue list UI; team tab/search | 2026-10-08 |
| Mobile autofill | `Field` forwards `textContentType` / `autoComplete`; login remembers last identifier | 2026-10-08 |
| Web form drafts / list UI | localStorage drafts (TTL **1 min**); enroll + renew + admin register-gym + public signup; short modals in-memory | 2026-10-08 |
| Error monitoring | **Sentry** on API when `SENTRY_DSN` set; uptime via external ping of `/api/health` | 2026-10-09 |

---

## Do not regress

- Do **not** persist passwords, OTP codes, or photos in form drafts (AsyncStorage / localStorage).
- Do **not** send member lifecycle/pass notices over SMS; Telegram-linked only.
- Do **not** auto-enable public free trial — only via `GYM_SIGNUP_TRIAL_DAYS` > 0; admin trial length is entered per enroll.
- Do **not** change FAB bottom/tab clearance when changing `fabSize`.
- Do **not** invent one-off FAB sizes per screen — use `useResponsiveLayout`.
- Do **not** add teal glow / heavy glow on auth or sidebar logo.
- Do **not** put Platform Admin flows into the mobile app.
- Do **not** collect payment gateway checkout in v1 (manual record only).
- Do **not** hardcode secrets or commit `.env` credentials.
- Do **not** rewrite or delete past **Session log** entries.
- Do **not** fork business rules into clients — API is source of truth.
- Language selected on login (EN / AM / Om) must persist after sign-in (web + mobile).
- Admin enroll must keep city/address parity with public signup.
- Do **not** count renewals as new members — use `created_at` / registration month only.

---

## Before you touch X

| Work | Read / edit these first |
|---|---|
| **Mobile UI / layout / FAB / sheets** | `vibe-mobile/src/hooks/useResponsiveLayout.ts`, `vibe-mobile/src/theme/tokens.ts` → match §Standing mobile |
| **Web UI / theme / chips / surfaces** | `vibe-frontend/src/index.css`, `src/utils/surfaceClasses.js` |
| **Outbound SMS / Telegram / email copy** | [`MESSAGE_CATALOG.md`](./MESSAGE_CATALOG.md), `vibe/utils/notificationSms.js`, `phoneOtp.js`, `notificationEmail.js` |
| **Monitoring / Sentry** | [`vibe/docs/MONITORING.md`](../../vibe/docs/MONITORING.md), `vibe/instrument.js`, `SENTRY_DSN` |
| **Signup / enroll / trial** | `vibe/utils/registerGymCore.js`, `GYM_SIGNUP_*` env, SRS §7.5 |
| **Auth / roles / license gate** | API middleware + SRS roles; mobile must reject Platform Admin |
| **Check-in / QR / station / trainers** | `docs/CHECKIN_AND_TRAINERS_PLAN.md` + SRS (prefer SRS if plan stale) |
| **Scope / “is this in v1?”** | [`SRS.md`](./SRS.md) §1.2 + backlog below |

---

## Agent workflow

1. Skim **Decision index** + **Do not regress** (always).
2. Open the relevant **Before you touch X** sources before coding.
3. Prefer existing tokens over new hex/spacing.
4. **End of session:** append a block using the template below (user may say “log this session”).
5. If a standing custom changes: update Decision index + Do not regress + Standing section, then log why in the session entry.

### Append template (copy below the session log)

```markdown
### YYYY-MM-DD — short title

- **Asked:** …
- **Decided / why:** …
- **Shipped:** `repo/path` — …
- **Styles / customs:** … (or “none”)
- **Do-not-regress:** … (new bans only, or “none”)
- **Follow-ups:** …
```

---

## Standing conventions

### Repos & brand

| Repo | Path | Role |
|---|---|---|
| API | `/home/daniel/vibe` | Express + Postgres; cron; SMS/Telegram |
| Web | `/home/daniel/vibe-frontend` | Admin + gym portal + public pass/station |
| Mobile | `/home/daniel/vibe-mobile` | Owner + Front Desk; offline; tablet |

| Surface | Name |
|---|---|
| Docs / email | Vibe / VibeSaaS |
| SMS / Amharic | **ንቁ** (`vibe/utils/brand.js`) |
| Mobile store | **Niku** (`com.niku.mobile`, scheme `niku`) |

**Stack:** API Express 5/`pg`/Zod/JWT · Web React 19/Vite 8/Tailwind 4/RR7/i18next · Mobile Expo 54/RN 0.81/Expo Router/TanStack Query.

### Product

- Tenant = `gym_id`; staff = `branch_id`.
- Roles: Platform Admin (web only), Gym Owner, Front Desk (legacy Help Desk / Gym Staff).
- License: `active` → `suspended` (read-only) → `expired` (lockout).
- v1 signup: OTP + city + optional address → **default SaaS plan**, no payment, **no trial**.
- Admin enroll: same identity fields + plan + optional payment.
- ETB; Ethiopian phones; members **do not** log in (pass / Telegram / station only).

### Messaging

| Audience | Channel |
|---|---|
| Member notices | Telegram if linked — **no SMS fallback** |
| Owner OTP | SMS (`ንቁ: …`) |
| Gym license / trial | SMS (+ owner email from cron) |
| Station check-in OTP | Telegram |
| Admin trial digest | Email |

Code: `notificationSms.js`, `notificationEmail.js`, `phoneOtp.js`, `stationSelfCheckIn.js`, `telegramMemberBot.js`. SmsLog: `channel` `sms`|`telegram`, daily dedupe.

### Design — shared

- CTA / brand teal `#0f766e`; dark accents `#2dd4bf` / brighter CTAs as in tokens.
- Warm accent `#d97706` / `#fbbf24` — identity, not primary buttons.
- Fonts: DM Sans, Space Grotesk, Noto Sans Ethiopic (Amharic: no forced uppercase).
- Status: active `#059669`/`#34d399` · due soon `#0284c7`/`#38bdf8` · expired `#e11d48`/`#f87171` · unpaid `#ea580c`/`#fb923c`.
- Avoid purple-default AI aesthetic; no logo glow gimmicks.

### Design — web

`src/index.css` · `src/utils/surfaceClasses.js`

- Surfaces light `#f1f5f9`/`#f8fafc`/`#ffffff`; dark `#13161c`/`#1a1e26`/`#22262f`.
- Dark sidebar `#121c1a`/`#171a21`; cards `rounded-xl` + subtle ring.
- Type helpers: `pageTitle`, `sectionTitle`, `panelTitle`, `modalTitle`.
- Filter/toolbar chips; renew CTA stays `#0f766e` where already hardcoded.

### Design — mobile

`src/theme/tokens.ts` · `src/hooks/useResponsiveLayout.ts`

| Token | Phone | Tablet |
|---|---|---|
| `pagePadding` | 16 | 24 |
| `fabSize` / `fabRadius` / `fabFontSize` | 56 / 17 / 30 | 68 / 20 / 36 |
| `fabRight` | 20 | = pagePadding |
| FAB bottom | `24 + tab overlay/insets` — **fixed policy** | same |
| `sheetMaxWidth` | width | land `min(w*0.62,640)`; port `min(w*0.94, contentMax)` |
| `tabIconSize` | 22 | 28 |
| Breakpoints | — | tablet ≥600; large ≥900 |
| radius / space | 8/12/16/22 · 4/8/12/16/24/32 | same |

Filter selected = soft or solid accent (green/teal OK). Sheets radius top 22. Offline cache ~7d + write queue — don’t break sync headers casually.

### Engineering

- Zod on API; thin client API wrappers.
- Soft-archive gyms/members/trainers; keep payment history.
- Smoke: `smoke:test`, `smoke:gym-signup`; mobile `docs/SMOKE_QA.md`.

### Related docs

| Doc | Role |
|---|---|
| [`SRS.md`](./SRS.md) | Scope / FR |
| [`MESSAGE_CATALOG.md`](./MESSAGE_CATALOG.md) | Outbound copy |
| [`CHECKIN_AND_TRAINERS_PLAN.md`](./CHECKIN_AND_TRAINERS_PLAN.md) | Check-in blueprint |
| `vibe/docs/TELEGRAM_INTEGRATION_PLAN.md` | Telegram phases (prefer code if stale) |
| `vibe-mobile/README.md` | Mobile setup |

---

## Backlog / deferred

| Item | Status | Notes |
|---|---|---|
| Free trial signup | Opt-in | Public via env; admin Free Trial + days field; On trial filter + plan badges |
| Payment gateway | Deferred | Manual only |
| Member self-service app | Deferred | — |
| Push notifications | Out v1 | — |
| Absence SMS | Deferred | — |
| Payroll / inventory / turnstiles | Out | — |
| Product copy pass on all templates | Open | See MESSAGE_CATALOG |
| Keep this log current | Ongoing | Append every session |

---

## Open questions (ask; don’t guess)

| Question | Notes |
|---|---|
| Final public web hostname | `niku.vercel.app` may be taken; confirm deploy URL |
| Public trial length when enabled | Ops sets `GYM_SIGNUP_TRIAL_DAYS` |
| Whether to expand member SMS later | Currently Telegram-only by design |
| Message copy ownership | Eng templates vs product-edited catalog |

---

## Session log (append only)

### 2026-09-14 — Signup alignment, trial off, polish, SRS 1.2

- **Asked:** Align admin gym enroll with owner signup (city/address, field order, confirm password); remove 30-day free trial for v1; e2e smoke for signup/enroll; mobile polish (Renew inset, filter chip green highlight, days-left inset, wider tablet sheets); Vercel/`niku.vercel.app` guidance; confirm secrets not in git; update SRS for shipped gaps.
- **Decided / why:**
  - Admin enroll must match public signup identity fields so gyms aren’t missing city/address.
  - Trial deferred to v2 (`GYM_SIGNUP_TRIAL_DAYS=0`) so v1 launches without free-trial ops burden; default SaaS plan on signup instead.
  - Member messaging stays Telegram-first; SMS kept for OTP + gym license.
  - Tablet sheets need more width for usable forms; filter selected state should read clearly (green/teal).
- **Shipped:** API admin enroll + validation; signup trial gating; smoke scripts; mobile FilterChip / BottomSheet / badge insets; `docs/SRS.md` → **v1.2**.
- **Styles / customs:** tablet `sheetMaxWidth` widened; chip selected accent; small badge insets.
- **Do-not-regress:** none new beyond standing (trial off, city/address parity).
- **Follow-ups:** optional Railway CORS / rebuild APK; trial UI gated for v2.

### 2026-09-15 — Mobile FAB sizing

- **Asked:** Opinion on FAB size; then set FAB **54** phone / **68** tablet with proportional plus; keep tab-nav gap; later bump phone to **56**.
- **Decided / why:** ~56dp matches common chat/FAB scale; user chose **56**; plus/radius scale with size; tab gap unchanged.
- **Shipped:** `vibe-mobile/src/hooks/useResponsiveLayout.ts` — phone 56/17/30; tablet 68/20/36.
- **Styles / customs:** Decision index FAB row.
- **Do-not-regress:** do not change FAB↔tab gap when resizing.
- **Follow-ups:** rebuild preview APK if needed.

### 2026-09-15 — Outbound message inventory

- **Asked:** List all platform outbound messages.
- **Decided / why:** Clear channel boundaries so future copy work doesn’t reintroduce member SMS.
- **Shipped:** Chat inventory → later [`MESSAGE_CATALOG.md`](./MESSAGE_CATALOG.md).
- **Styles / customs:** Telegram-only members; SMS brand ንቁ.
- **Do-not-regress:** no member SMS fallback.
- **Follow-ups:** none.

### 2026-10-08 — Project log as agent memory

- **Asked:** Create `project-log.md` for whole project; append-only session memory; styles/customs; backlog.
- **Decided / why:** Durable conventions without rediscovering each session.
- **Shipped:** `docs/project-log.md` (initial).
- **Follow-ups:** Cursor rule + stronger structure (done same day below).

### 2026-10-08 — Ultimate usage pass (rule + structure)

- **Asked:** Improve the log for ultimate agent usage; implement the recommendations.
- **Decided / why:** Decision index + do-not-regress + checklists + template + always-on Cursor rule make the file hard to ignore; sibling-repo pointers so API/mobile work still finds it; message catalog split so this file stays short.
- **Shipped:**
  - Rewrote `vibe-frontend/docs/project-log.md` (this structure).
  - Added `vibe-frontend/docs/MESSAGE_CATALOG.md`.
  - Added `.cursor/rules/project-log.mdc` in frontend, `vibe`, and `vibe-mobile`.
  - Pointers: `vibe/docs/PROJECT_LOG.md`, `vibe-mobile/docs/PROJECT_LOG.md`; README note on mobile.
- **Styles / customs:** none changed.
- **Do-not-regress:** none new.
- **Follow-ups:** Say “log this session” at end of work so the habit sticks.

### 2026-10-08 — Mobile autofill + draft / filter persistence

- **Asked:** (1) Native autofill + remember what users entered / prefill reasonably. (2) Save unfinished form state and filters/searches when interrupted or connection fails — what’s reasonable for the app.
- **Decided / why:**
  - Reuse existing enroll-draft + members-filter AsyncStorage patterns; no new storage framework.
  - OS autofill via `textContentType` / `autoComplete` on `Field` + login.
  - App memory: last login identifier; drafts for long flows (register gym, enroll, renew); list UI for members/revenue/team.
  - Never draft passwords, OTP codes, or photos; drafts ≠ offline mutation queue.
- **Shipped (vibe-mobile):**
  - `Form.Field` autofill props; wired auth, enroll, register, profile, team, check-in, etc.
  - `useAsyncStorageDraft`, `usePersistedUiState`, `useRegisterGymDraft`, `useRenewDraft`; enroll draft via shared helper.
  - Register-gym draft (non-secret fields); renew draft per member; login last identifier.
  - Persist members sort/search; revenue list UI; team tab/search/former.
- **Styles / customs:** none visual; persistence keys `vibe.draft.*`, `vibe.*.listUi`, `vibe.login.lastIdentifier`.
- **Do-not-regress:** no passwords/photos in drafts.
- **Follow-ups:** optional drafts for new staff/trainer/plan/branch if users hit interrupt there often.

### 2026-10-08 — Web autofill + draft / filter persistence

- **Asked:** Same autofill + save-state treatment for the web app.
- **Decided / why:** Mirror mobile with browser autofill (`name` + `autoComplete`), localStorage drafts for long flows, list UI persistence; keep existing in-memory `useModalFormDraft` for short modals; no passwords/OTP/photos in drafts.
- **Shipped (vibe-frontend):**
  - `useLocalStorageDraft.js`, `usePersistedUiState.js`
  - Login: `name` attrs + last identifier; Register gym draft + stronger autofill names
  - Enroll (`MemberModal`) + Renew drafts; name/tel autofill on member fields
  - Members / Revenue / Team list UI persisted (members migrates legacy session filter)
- **Styles / customs:** none visual; keys align with mobile (`vibe.draft.*`, `vibe.*.listUi`).
- **Do-not-regress:** no secrets/photos in drafts (web + mobile).
- **Follow-ups:** admin gym register draft optional; staff create stays `autoComplete="off"`.

### 2026-10-08 — Free Trial on + plan badges

- **Asked:** Free Trial option while registering gyms; see which gyms are on trial; show plan badge (Free Trial / Monthly / Quarterly…) on web profile menu (right) and mobile Account profile card (right).
- **Decided / why:** Re-enable trial as product path — public signup defaults to 30-day trial; admin can enroll on Free Trial or a paid SaaS plan; surface `licensePlanName` / trial in owner UIs.
- **Shipped:**
  - **API:** `GYM_SIGNUP_TRIAL_DAYS` default 30; admin enroll `trial_days` OR `saas_plan_id`; gym list filter/count `on_trial`.
  - **Web:** Register gym Free Trial option; admin **On trial** filter chip; profile menu plan badge.
  - **Mobile:** Account profile card plan badge (right).
  - `.env.example` + this log updated.
- **Styles / customs:** Small pill badge (trial tint / teal) aligned to the right of name/role block.
- **Do-not-regress:** badges from subscription API (`isTrial` / `licensePlanName`).
- **Follow-ups:** optional trial-ending chip if ops wants narrower view.

### 2026-10-08 — No 30-day trial default

- **Asked:** Don’t set trial to 30 days for now.
- **Decided / why:** Public signup stays off (`GYM_SIGNUP_TRIAL_DAYS=0`); admin Free Trial stays as an option but length is entered per gym (no hardcoded 30).
- **Shipped:** Reverted auth default + `.env.example`; Register gym trial-days field.
- **Do-not-regress:** no automatic 30-day public trial.

### 2026-10-08 — Admin register: no trial

- **Asked:** When admin registers gyms, don’t count/use 30 days for trial.
- **Decided / why:** Admin enroll is SaaS-plan only; no Free Trial option in the register-gym UI.
- **Shipped:** Removed Free Trial from `RegisterGymModal` / admin `RegisterGym` payload.
- **Do-not-regress:** admin register never sends `trial_days`.

### 2026-10-08 — Admin Free Trial restored (custom days)

- **Asked:** There should be Free Trial (clarified after removing it).
- **Decided / why:** Keep Free Trial in admin plan select; admin types the trial length — no hardcoded 30.
- **Shipped:** Restored Free Trial option + trial-days field on admin register.
- **Do-not-regress:** never default admin trial to 30 days.

### 2026-10-08 — Plan badge labels (X Plan)

- **Asked:** Badge should say Quarterly Plan, Yearly Plan, etc.; Free Trial unchanged.
- **Decided / why:** Format from duration/name; Free Trial has no “Plan” suffix.
- **Shipped:** `formatLicensePlanBadge` (web + mobile); API `licensePlanDuration`.
- **Do-not-regress:** Free Trial label never becomes “Free Trial Plan”.

### 2026-10-08 — Trial days used / days left

- **Asked:** Admin should see how long a gym has been on Free Trial; gym should see duration/end; show n days left under plan badge (urgent ~7 days).
- **Decided / why:** Compute from license start/end; badge subtitle always when on trial; emphasize ≤7 days left.
- **Shipped:** API trialDaysUsed/Total/Left + start; admin list/detail progress line; web/mobile badge “n days left”.
- **Do-not-regress:** Free Trial badge still not “Free Trial Plan”.

### 2026-10-09 — New members ≠ renewals

- **Asked:** Renewing membership was counting on the New members chip; should only be newly registered that month; also fix dashboard member cards.
- **Decided / why:** New = registration month (`Members.created_at`), never current-term `start_date` (renew overwrites it).
- **Shipped:** `created_at` + backfill; dashboard/list/branch-compare use `MEMBER_NEW_THIS_MONTH_SQL`; attention cards show phone/branch.
- **Do-not-regress:** renew must not change `created_at` or inflate new-member counts.

### 2026-10-09 — Gym profile top gap

- **Asked:** Large empty gap above the GYM label on mobile Gym profile.
- **Decided / why:** `TabScreenFrame` already pads under the nav; scroll + first section were stacking more top space.
- **Shipped:** `profile.tsx` — zero content/first-section top margin; keep spacing before LOGIN.
- **Do-not-regress:** don’t re-add paddingVertical on profile content above TabScreenFrame inset.

### 2026-10-09 — Admin New gym filter chip

- **Asked:** Add New Gym filter chip after Expired on admin Gyms.
- **Decided / why:** Same rule as new members — registered this calendar month via `Gyms.created_at` (not license renewals).
- **Shipped:** API `filter=new` + `counts.new`; chip after Expired; New gyms metric card opens that filter; EN/AM/Om labels.
- **Do-not-regress:** New gym ≠ license renew / plan change.

### 2026-10-09 — Free Trial badge amber

- **Asked:** Free Trial badge only — make it amber (Account screenshot).
- **Decided / why:** Distinguish trial from paid plan badges; paid stays teal.
- **Shipped:** Mobile Account uses `warning` for trial badge; web profile menu Free Trial uses amber classes.
- **Do-not-regress:** paid plan badges remain teal.

### 2026-10-09 — Admin register-gym draft

- **Asked:** Hold admin register-gym stepper inputs like member enroll / mobile.
- **Decided / why:** Same localStorage draft pattern; never store passwords.
- **Shipped:** `RegisterGymModal` → `vibe.draft.admin-register-gym` (fields + step); clear on success; re-enter password if submitting after restore.
- **Do-not-regress:** no passwords in drafts; key distinct from public `vibe.draft.register-gym`.

### 2026-10-09 — Draft TTL 1 minute

- **Asked:** How long to hold drafts; then set to about a minute (not 7 days).
- **Decided / why:** Short resume window only — drop stale drafts after 1 min from last save.
- **Shipped:** `DRAFT_TTL_MS = 60_000` in web `useLocalStorageDraft` + mobile `useAsyncStorageDraft`; `_savedAt` on save; expired/legacy without stamp cleared on load.
- **Do-not-regress:** still no passwords/OTP/photos in drafts.

### 2026-10-09 — Plan badge text +1px

- **Asked:** Free Trial / Yearly Plan badge text one step larger.
- **Shipped:** Mobile Account + web profile menu badge (and days-left) 10 → 11px.

### 2026-10-09 — Session wrap (ops + security Qs)

- **Asked:** Log this session; also Neon backup for later self-hosted Postgres; whether RLS is needed; whether frontend has API keys.
- **Decided / why:**
  - Neon → own server: use `pg_dump -Fc` (direct URL) now; `pg_restore --no-owner --no-acl` later; same-or-newer Postgres major.
  - RLS **not required** for v1 — tenancy is app-layer JWT/`gym_id`; add later only for defense-in-depth.
  - Frontend has **no secret API keys** — only public `VITE_API_URL` + session JWT; secrets stay on API env.
- **Shipped (this day, detail entries above):** new-members ≠ renewals; gym-profile gap; admin New gym chip; Free Trial amber badge; admin register-gym draft; draft TTL 1 min; plan badge +1px.
- **Styles / customs:** Free Trial badge amber; paid plan badges teal; draft TTL 1 minute (web + mobile).
- **Do-not-regress:** renew must not inflate new-member/new-gym counts; no passwords in drafts; paid badges stay teal.
- **Follow-ups:** optional — test `pg_restore` on a spare DB before cutover; restart API so `Members.created_at` / schema changes apply in prod.

### 2026-10-09 — Sentry on API

- **Asked:** How to set up monitoring (Sentry vs Prometheus/Grafana).
- **Decided / why:** Sentry for errors now; Prometheus/Grafana later for infra metrics; uptime = external ping of `/api/health`.
- **Shipped:** `vibe/instrument.js` + `@sentry/node`; wire in `server.js` / `errorHandler`; `SENTRY_*` in `.env.example`; `vibe/docs/MONITORING.md`. Off unless `SENTRY_DSN` set.
- **Do-not-regress:** do not send passwords/OTP/Authorization/Cookie to Sentry; do not require DSN in local/dev.
- **Follow-ups:** create Sentry project → set Railway `SENTRY_DSN`; add UptimeRobot; optional web/mobile Sentry later.

### 2026-10-09 — API uptime check

- **Asked:** Do the uptime check.
- **Decided / why:** Automate probe of production `/api/health` without waiting on UptimeRobot signup; optional UptimeRobot still documented.
- **Shipped:** `vibe/.github/workflows/uptime.yml` (every 5 min); `scripts/uptime-check.sh`; confirmed live health `200 {"ok":true}`; MONITORING.md updated.
- **Follow-ups:** push `vibe` so Actions run; enable GitHub Actions failure emails; optional UptimeRobot for SMS.

---

*Append new sessions below. Do not edit older entries except factual typo fixes.*
