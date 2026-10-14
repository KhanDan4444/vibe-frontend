# Project Log — Niku / ንቁ

| | |
|---|---|
| **Standing section last updated** | 2026-10-11 (pass secret + public pass trim) |
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
| Free Trial vs Unpaid / Collect | Trial ≠ unpaid; no Collect — use Change plan to go paid | 2026-10-09 |
| New members metric/filter | **Registered this month** via `created_at` (not renew `start_date`) | 2026-10-09 |
| Admin New gym filter | Gyms registered this month (`Gyms.created_at`); chip after Expired | 2026-10-09 |
| Signup / admin enroll fields | City required; address optional; confirm password | 2026-09-14 |
| Member notices channel | **Telegram only** (linked); no SMS fallback | 2026-09-14 |
| SMS reserved for | **OTP only** (signup + forgot password) | 2026-10-10 |
| Gym license / trial alerts | **Telegram** (owner links gym chat); email backup from cron | 2026-10-10 |
| SMS brand prefix | **ንቁ** | ongoing |
| Mobile FAB phone / tablet | **56** / **68** (radius 17/20, plus 30/36) | 2026-09-15 |
| FAB vs tab bar gap | **Do not change** when resizing FAB | 2026-09-15 |
| Tablet sheets | Wider via `sheetMaxWidth` | 2026-09-14 |
| Auth / logo glow | **No teal glow** on web or mobile auth | 2026-08 |
| Platform Admin on mobile | **Not supported** (reject login) | ongoing |
| Payments | Manual only (no gateway) | v1 |
| Agent memory file | This log + Cursor rule | 2026-10-08 |
| Mobile form drafts | AsyncStorage drafts (no passwords/photos); enroll + register-gym + renew; **TTL 5 min** | 2026-10-08 |
| Mobile list UI persist | Members filter/sort/search; revenue list UI; team tab/search | 2026-10-08 |
| Mobile autofill | `Field` forwards `textContentType` / `autoComplete`; login remembers last identifier | 2026-10-08 |
| Web form drafts / list UI | localStorage drafts (TTL **5 min**); enroll + renew + admin register-gym + public signup; short modals in-memory | 2026-10-08 |
| Error monitoring | **Sentry** on API (`SENTRY_DSN`), web (`VITE_SENTRY_DSN`), mobile (`EXPO_PUBLIC_SENTRY_DSN`); separate projects; uptime = `/api/health` ping | 2026-10-10 |
| Ethiopian phone input (web + mobile) | Split `+251` + national digits; mobile must start with **9** or **7**; no phone placeholders | 2026-10-10 |
| Product brand (user-facing) | **Niku** (SMS Amharic still **ንቁ**); no Vibe / VibeSaaS in UI or email | 2026-10-10 |
| Password reset | **SMS OTP only** (email link reset removed) | 2026-10-10 |
| Owner support contact | Env `SUPPORT_PHONE` (+ optional `SUPPORT_TELEGRAM`); public `/api/public/support` | 2026-10-10 |
| Privacy Policy | Public `/privacy` on `niku-saas.vercel.app`. Web + mobile signup: “By continuing…”. Auth screens: muted footer. Account + mobile Profile | 2026-10-11 |
| OTP in message log | **Not stored**; admin SMS log has no code column | 2026-10-11 |
| Telegram webhook | Production **requires** `TELEGRAM_WEBHOOK_SECRET` or API refuses to start | 2026-10-11 |
| Member / station QR secret | Production **requires** `MEMBER_PASS_SECRET` (not `JWT_SECRET`) | 2026-10-11 |
| Unpaid Change plan | Unpaid **Active** or **Due Soon** can change plan before paying. Expired unpaid pays or renews. | 2026-10-11 |
| Trainer on member enroll | Only trainers registered on the member’s branch can be assigned | 2026-10-12 |
| Trainer roster | Clicking a trainer card lists the live members assigned to that trainer | 2026-10-12 |
| Admin gym list branches | The Gyms table shows each gym’s active branch count beside Members | 2026-10-13 |
| Admin branch members | Opening a gym lists each branch with its own live member count | 2026-10-13 |
| Branch trainer count | The gym Branches table counts live trainers on each location, beside Staff | 2026-10-13 |
| Team staff email | The Team staff list does not show email. Email stays on the staff form | 2026-10-13 |
| Trainer member fee | A trainer’s member list shows the total trainer-fee payments recorded for each member. The list can be searched. When the gym has more than one branch, the branch name appears once at the top left and covers the whole list. On the phone, the member’s phone stays on one line under the name | 2026-10-13 |
| No-visit Telegram | Every 7 days they stay away, with the day count updated. `Hi {name}, we haven't seen you for the past {days} days. We missed you at {gym}. Don't lose the progress you've already made!` Telegram-linked No visit members only | 2026-10-12 |
| Public check-in pass | Name + QR only; no phone, no photo | 2026-10-11 |
| Station check-in ring | After gym QR and OTP, the ring shows the thick check, then the visit count inside, such as 1/6. Same timing as desk check-in | 2026-10-13 |
| Revenue custom range | Custom dates sit on one short row: start, to, end. Web: beside the period control, and Export wraps on its own. Phone: first section in Filters. When on, the row matches the other selected filters | 2026-10-13 |
| Notification inbox | Activity payments do not repeat “Recorded.” The teal unread bar is only on Needs attention. Icon circles are one muted color. Show all names activity. On the phone, the activity chevron opens that member’s profile | 2026-10-14 |

---

## Do not regress

- Do **not** persist passwords, OTP codes, or photos in form drafts (AsyncStorage / localStorage).
- Do **not** send member lifecycle/pass notices over SMS; Telegram-linked only.
- Do **not** send gym SaaS/trial license alerts over SMS; Telegram-linked gym only (+ email backup).
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
- Do **not** treat Free Trial gyms as Unpaid or show Collect — trial → paid is Change plan.
- Do **not** accept Ethiopian mobiles that do not start with 9 or 7 (Ethio Telecom / Safaricom).
- Staff and trainer phone inputs use the split `+251` field, same as member phone. Staff phone is required and stored on the user. It is not a sign-in id. On mobile Add Staff and Edit staff, phone sits with name and email, before username.
- Do **not** reintroduce email password-reset links; owner reset is SMS OTP only.
- Do **not** use Vibe / VibeSaaS in user-facing UI or email copy — brand is **Niku** (SMS: ንቁ).
- Do **not** hardcode the platform support phone in clients — use `SUPPORT_PHONE` / `/api/public/support`.
- Do **not** reuse one Sentry DSN across API/web/mobile — separate projects; leave DSNs unset in local/dev.
- Do **not** persist OTP codes in `SmsLog` or show them in the admin message log.
- Do **not** accept Telegram webhooks in production without `TELEGRAM_WEBHOOK_SECRET`.
- Do **not** sign member or station QR tokens with `JWT_SECRET` in production — use `MEMBER_PASS_SECRET`.
- Do **not** return the phone number or member photo on the public check-in pass.
- After gym QR check-in, the success ring shows the thick check first, then the visit count inside, such as 1/6. Same timing as the desk check-in ring.
- Revenue custom range sits on one short row: start date, to, end date. On the web it stays with the period control, and Export wraps on its own. The date row eases open and closed when Custom range is chosen or left. On the phone it is the first section in Filters. When it is on, that row uses the same fill as the other selected filter rows, with no bright outline. Do not stretch those fields across the page, and do not bury the phone control under sort and payment method.
- Do **not** place the Privacy Policy as a peer of Register on login — muted footer only (web and mobile). Signup keeps the “By continuing…” line.
- Do **not** point the mobile privacy link at `vibe-frontend-coral.vercel.app`. Use `niku-saas.vercel.app`.
- Do **not** show the member phone on dashboard Needs attention when a branch exists. Middle line is branch · plan; phone · plan only when there is no branch.
- Do **not** put Telegram, support, or Privacy Policy between Gym profile fields and Save. Mobile email and username sit under **Login**. Web **Sign-in** sits directly under **Gym details**, with username and login email each on their own row, and extra space above the footer.
- Web Telegram link **share** opens the system share sheet and does not copy. Copy stays on the link. Hide share when the browser has no share sheet.
- A successful Telegram link copy shows a thick circle and **Link Copied**. Web: on the row. Mobile: bottom center, circle and text in active green (`statusActive`). Do not use the toast for that.
- Mobile dashboard and Reports revenue lines share one monotone curve through every day, same as the web chart. Do not use a curve that misses the points.
- Offline member enroll must not stop on the phone-availability check. Skip that request on web and mobile when the server cannot be reached; the queue syncs later.
- Revenue payment-method chips use the transaction card fill (`card`) and the card edge for the outline. Do not fill them with `cardEdge` or `inputBg`.
- Unpaid members who are **Active** or **Due Soon** can change plan before paying, from **Manage** only. Collect payment stays the profile button. Expired unpaid does not get a mid-term plan switch.
- Success and delete toasts stay up until their timer bar reaches the end. Do not dismiss them on a separate clock.
- Mobile Revenue hero method totals match the 2026-10-08 card: a hairline above the row, then compact columns (12px icon, 11px amount, 9px name) with a hairline between methods. Four methods stay in that row. Do not wrap each method in its own tile.
- A member can only be assigned a trainer registered on that member’s branch. Do not list trainers from other branches on enroll or edit.
- Clicking a trainer card lists the live members assigned to that trainer. Edit, archive, and restore stay on the card’s actions.
- The admin Gyms table shows the active branch count beside Members. It uses the same count as the gym detail Branches stat.
- Opening an admin gym lists each branch with its own live member count. A new branch starts at 0. The table Members number stays the gym-wide active total.
- The gym Branches table shows a live trainer count beside Staff. Former trainers are left out of that count.
- The Team staff list does not show an email column. Email stays on the staff form.
- The phone trainers list does not show the “No login — assign to members.” line under search.
- A trainer’s member list shows each member’s trainer-fee total. That total is trainer-fee payments only, not the gym membership. The words Trainer fee appear once. Amounts sit in one right-aligned column. 0 ETB stays quiet. The list has a search field. When the gym has more than one branch, the branch name appears once at the top left and is not repeated on each member. On the phone, the member’s phone number stays on one line under the name. Do not let the status or the fee wrap it.
- Notification activity does not show a “Recorded” eyebrow. The teal unread bar stays on Needs attention only. Icon circles stay one muted color. The activity control says it opens activity. On the phone, the activity chevron opens that member’s profile.
- The No visit notice is Telegram only. Send it again every 7 days they stay away, with the day count updated. Do not send it by SMS, and do not repeat it every day.

---

## Before you touch X

| Work | Read / edit these first |
|---|---|
| **Mobile UI / layout / FAB / sheets** | `vibe-mobile/src/hooks/useResponsiveLayout.ts`, `vibe-mobile/src/theme/tokens.ts` → match §Standing mobile |
| **Web UI / theme / chips / surfaces** | `vibe-frontend/src/index.css`, `src/utils/surfaceClasses.js` |
| **Outbound SMS / Telegram / email copy** | [`MESSAGE_CATALOG.md`](./MESSAGE_CATALOG.md), `vibe/utils/notificationSms.js`, `phoneOtp.js`, `notificationEmail.js` |
| **Monitoring / Sentry** | [`vibe/docs/MONITORING.md`](../../vibe/docs/MONITORING.md); API `instrument.js`; web `src/sentry.js`; mobile `src/sentry.ts` |
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
| Product / email / UI | **Niku** |
| SMS / Amharic | **ንቁ** (`vibe/utils/brand.js`) |
| Mobile store | **Niku** (`com.niku.mobile`, scheme `niku`) |
| Repo folders | `vibe` / `vibe-frontend` / `vibe-mobile` (internal paths only) |

**Stack:** API Express 5/`pg`/Zod/JWT · Web React 19/Vite 8/Tailwind 4/RR7/i18next · Mobile Expo 54/RN 0.81/Expo Router/TanStack Query.

### Product

- Tenant = `gym_id`; staff = `branch_id`.
- Team: clicking a trainer card lists that trainer’s live members. Edit, archive, and restore stay on the card’s actions. The phone trainers list does not show the “No login” line under search.
- Admin Gyms table: branch count sits beside Members. Same active-branch count as the gym detail Branches stat. Opening a gym lists each branch with its own live member count.
- Gym Branches table: live trainer count sits beside Staff. Former trainers are not included.
- Team staff list does not show email. Email stays on the add and edit staff form.
- Trainer member list: each row shows the sum of that member’s trainer-fee payments. Membership payments stay out of that figure. Trainer fee is labeled once, in a right-aligned column. 0 ETB stays quiet. A search field filters the list. When the gym has more than one branch, the branch name appears once at the top left and is not repeated on each member. On the phone, the phone number stays on one line under the name, and the plan is the line under that.
- Roles: Platform Admin (web only), Gym Owner, Front Desk (legacy Help Desk / Gym Staff).
- License: `active` → `suspended` (read-only) → `expired` (lockout).
- v1 signup: OTP + city + optional address → **default SaaS plan**, no payment, **no trial**.
- Admin enroll: same identity fields + plan + optional payment.
- ETB; Ethiopian phones; members **do not** log in (pass / Telegram / station only).
- Gym QR check-in success: the ring shows the thick check first, then the visit count inside, such as 1/6. Same timing as desk check-in. The sentence under the name still says how many visits this week.
- Revenue custom range: start date, to, and end date sit on one short row. Web: beside the period control; the date row eases open and closed; Export wraps on its own. Phone: first section in Filters. When on, the row matches the other selected filter rows.
- Notifications: a payment in Activity shows the member and the amount once. Needs attention keeps the teal unread bar. Activity does not. Icon circles are one muted color. The control under Activity says it opens activity. On the phone, the activity chevron opens that member’s profile.

### Messaging

| Audience | Channel |
|---|---|
| Member notices | Telegram if linked — **no SMS fallback** |
| Owner OTP | SMS (`ንቁ: …`) only |
| Gym license / trial | Telegram if gym linked (+ owner email from cron) |
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

### 2026-10-09 — Session wrap (Sentry + uptime live + ops teach)

- **Asked:** Log session; finish Sentry/uptime notifications; explain API↔Railway, replicas, volume for member photos.
- **Decided / why:**
  - Skip Sentry agent/repo/Slack onboarding — DSN on Railway only; Error monitoring enough; free Developer after 14-day trial (no pay unless Upgrade).
  - Uptime = GitHub Actions on `vibe` (`API uptime`); email = GitHub “failed workflows only.” Errors = Sentry Issue Alerts email.
  - Replicas = 1 (volume attached blocks multi-replica); volume keeps `uploads/` member photos across deploys (DB holds path only).
- **Shipped / ops done:** Sentry Express project + `SENTRY_DSN` / `SENTRY_ENVIRONMENT` on Railway; first uptime run green; GH + Sentry email alerts on; MONITORING.md / workflow already in `vibe`.
- **Styles / customs:** none.
- **Do-not-regress:** never commit real `SENTRY_DSN`; keep volume (or equivalent) if photos stay on disk; don’t require multi-replica while volume attached.
- **Follow-ups:** pay Railway past-due if still billed; optional UptimeRobot/SMS; object storage later if scaling past 1 replica; rotate DSN if chat exposure is a concern.

### 2026-10-09 — Draft TTL 5 minutes

- **Asked:** Change draft hold time to 5 minutes (was 1).
- **Decided / why:** Slightly longer resume window without going to multi-day retention.
- **Shipped:** `DRAFT_TTL_MS = 5 * 60 * 1000` in web `useLocalStorageDraft` + mobile `useAsyncStorageDraft`.

### 2026-10-09 — Mobile boot fail after skeleton

- **Asked:** Mobile stuck on “Could not load gym data” after skeleton (last preview APK).
- **Decided / why:** Last build is `preview` → Railway URL OK. Dashboard uses `Members.created_at` for new-member metrics, but column was only in `schema.sql` (skipped in production bootstrap) — missing column → API 500 → generic boot error.
- **Shipped:** `vibe/migrations/027_member_created_at.sql`; clearer `GymBootError` (license vs network). **Must apply 027 on Neon/production.**
- **Do-not-regress:** schema changes that production needs must ship as `migrations/*.sql`, not only `schema.sql`.
- **Follow-ups:** run migrate against Railway `DATABASE_URL`; then Retry on mobile (no rebuild required for DB fix).

### 2026-10-09 — Collect / Unpaid on Free Trial

- **Asked:** Why does Collect (and Unpaid) show for a Free Trial gym (e.g. Rise up)?
- **Decided / why:** Unpaid meant “no SaaS payment for current term.” Trial gyms correctly have no payment, so they were mis-flagged. Collect is only for paid-plan gyms that never paid; trial → paid uses **Change plan**.
- **Shipped:** Hide Collect + Unpaid badge when `isGymOnTrial`; block collect submit with `admin.useChangePlanForTrial` (API unpaid filter should also exclude trial).
- **Do-not-regress:** Free Trial gyms must not appear in Unpaid / Collect paths.
- **Follow-ups:** deploy API unpaid-SQL exclude + this web UI.

### 2026-10-10 — Split Ethiopian phone field on web register

- **Asked:** On web member enroll + gym register, split phone like contact UI: small `+251` box + empty national box starting with 9 or 7 (`+251 9…` / `+251 7…`).
- **Decided / why:** Match Ethiopian mobile formats (Ethio Telecom 9, Safaricom 7); country code fixed so users only type the 9 national digits.
- **Shipped:** `EthiopianPhoneField`; wired into `MemberModal`, `RegisterGymModal`, public `RegisterGym`; normalize/validate requires national `[79]\d{8}` (web + API `phone.js`).
- **Styles / customs:** Two adjacent inputs; left `+251` read-only chrome; no phone placeholders.
- **Do-not-regress:** Ethiopian mobiles must start with 9 or 7.
- **Follow-ups:** mobile parity.

### 2026-10-10 — Split Ethiopian phone field on mobile

- **Asked:** Same `+251` + national split (no placeholder) on mobile.
- **Decided / why:** Match web enroll / gym register phone UX and 9/7 validation.
- **Shipped:** `vibe-mobile` `EthiopianPhoneField` + phone util `[79]\d{8}`; wired enroll, register-gym, member edit, trainers, profile, station check-in.
- **Do-not-regress:** Ethiopian mobiles must start with 9 or 7 (web + mobile + API).
- **Follow-ups:** optional branch phone field if/when shown as a dedicated input.

### 2026-10-10 — Gym license alerts via Telegram; SMS OTP-only

- **Asked:** Stop relying on SMS gateway for gym license/trial pay alerts; use Telegram; keep SMS for OTP only.
- **Decided / why:** Phone gateway unreliable for ops alerts; owners already use Telegram for members; OTP stays SMS.
- **Shipped:** `vibe` `028_gym_telegram.sql`, gym link tokens, `deliverGymMessage` → Telegram; web Account + mobile Profile link/unlink; `MESSAGE_CATALOG` + Decision index updated.
- **Styles / customs:** none
- **Do-not-regress:** no gym license SMS; SMS = OTP only; suspended owners may still link Telegram (expired still lockout).
- **Follow-ups:** apply migration `028` on Neon/production; ensure `TELEGRAM_BOT_*` env set.

### 2026-10-10 — Brand Niku; drop email password reset

- **Asked:** Don’t use Vibe/VibeSaaS; use Niku; clarify unused email reset.
- **Decided / why:** Product brand is Niku (SMS stays ንቁ); email link reset unused — OTP only.
- **Shipped:** Removed `POST /auth/forgot-password` + `/auth/reset-password` and web `/reset-password`; email subjects/bodies → Niku; UI i18n VibeSaaS → Niku; catalog updated.
- **Styles / customs:** none
- **Do-not-regress:** no email reset links; no Vibe/VibeSaaS in UI/email.
- **Follow-ups:** optional full docs/SRS rename pass (repos stay `vibe*`).

### 2026-10-10 — Platform support phone for gym owners

- **Asked:** Best way for gym owners to reach support.
- **Decided / why:** One env-configured phone (optional Telegram); show where owners get stuck — not a ticket system.
- **Shipped:** `SUPPORT_PHONE` / `SUPPORT_TELEGRAM` → `GET /api/public/support`; web + mobile on forgot-password, lockout, read-only/trial banners, Account/Profile.
- **Styles / customs:** none
- **Do-not-regress:** no hardcoded support number in clients.
- **Follow-ups:** set `SUPPORT_PHONE` on Railway/production.

### 2026-10-10 — Sentry on web + mobile

- **Asked:** Wire crash/error reporting for web and mobile (API already had Sentry).
- **Decided / why:** Same optional-DSN pattern as API; separate Sentry projects per surface; errors only (no replay/PII).
- **Shipped:** web `@sentry/react` + `VITE_SENTRY_DSN`; mobile `@sentry/react-native` + `EXPO_PUBLIC_SENTRY_DSN`; `MONITORING.md` updated.
- **Styles / customs:** none
- **Do-not-regress:** no shared DSN across API/web/mobile; DSN unset = off locally.
- **Follow-ups:** create Web + RN projects in Sentry; set Vercel `VITE_SENTRY_DSN` and EAS `EXPO_PUBLIC_SENTRY_DSN`; optional `SENTRY_AUTH_TOKEN` for mobile source maps.

### 2026-10-10 — Session wrap (messages, chart, support polish, Sentry ops)

- **Asked:** Log the session; finish support/Sentry polish; fix floating admin members chart; clarify env setup.
- **Decided / why:** Skip Sentry wizard (SDK already wired); client DSNs via host env only; preview EAS build OK for APK + Sentry smoke.
- **Shipped:**
  - Member due-soon Telegram copy shortened (no “Renew at the front desk…”).
  - Admin `AdminMembersChart` bars pinned to y=0 baseline.
  - Mobile `GymBootError` shows support when license blocked.
  - EAS env `EXPO_PUBLIC_SENTRY_DSN` set for preview + production (`mobile-react-native` project).
- **Styles / customs:** none
- **Do-not-regress:** none new
- **Follow-ups:**
  - Commit/push mobile (+ any unpushed web/API) before/with EAS preview build.
  - Set Vercel `VITE_SENTRY_DSN` from **web-react** project (not the mobile DSN).
  - Set Railway `SUPPORT_PHONE` (+ optional `SUPPORT_TELEGRAM`).
  - Apply API migration `028_gym_telegram` if not already; keep `TELEGRAM_BOT_*` set.
  - Optional: Sentry auth token for mobile source maps.

### 2026-10-11 — Member pass QR download

- **Asked:** Add a download button with arrow icon on the check-in pass so members can save their QR.
- **Decided / why:** Place under the QR (before the hint) — closest to the asset, doesn’t compete with Telegram CTA.
- **Shipped:** `MemberPassPage` Download control → PNG from `qr_data_url`; i18n en/am/om `publicPass.downloadQr`.
- **Styles / customs:** Compact outline button under QR; lucide `Download`.
- **Do-not-regress:** none
- **Follow-ups:** none

### 2026-10-11 — Public Privacy Policy

- **Asked:** Add a standard privacy policy for Niku.
- **Decided / why:** Needed for store listings and signup transparency; English legal body matched to actual product (SMS OTP-only, Telegram notices, Sentry, manual payments).
- **Shipped:** web `/privacy`; links on login, register-gym, account; mobile Profile opens `PRIVACY_POLICY_URL` (`EXPO_PUBLIC_WEB_URL` or production Vercel default).
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** paste production `/privacy` URL into Play / App Store consents; optional counsel review for Proclamation 1321/2024.

### 2026-10-11 — Dashboard alert expiry on second line

- **Asked:** “Expired on …” truncated on dashboard alert rows; implement option 1 (two lines).
- **Decided / why:** Separate plan + expiry would make 4 text rows with phone/branch; keep 3 — drop branch on alert rows; meta = phone · plan; full `endLabel` alone on the third.
- **Shipped:** `vibe-mobile/app/(tabs)/index.tsx` AlertRow — meta = phone · plan; third line = expiry only (no branch).
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** none

### 2026-10-11 — Drop stored OTP codes; require Telegram webhook secret

- **Asked:** Security fixes 1 and 2 — stop saving verification codes in the SMS log; require the Telegram webhook secret in production.
- **Decided / why:** A code in `SmsLog` is a reusable password for anyone with admin or a DB backup. An unset webhook secret lets anyone post bot updates.
- **Shipped:** `vibe` migration `029_drop_sms_otp_code`; log insert no longer writes codes; admin SMS table drops the Code column. Production exits without `TELEGRAM_WEBHOOK_SECRET`; webhook compares the header with a hash. Local signup smoke reads `devCode` (non-production only).
- **Styles / customs:** none
- **Do-not-regress:** no OTP digits in `SmsLog` or admin UI; production webhook secret required.
- **Follow-ups:** set `TELEGRAM_WEBHOOK_SECRET` on Railway before deploying this API, then restart so `setWebhook` sends `secret_token`. Apply migration `029`.

### 2026-10-11 — Separate pass secret; trim public pass

- **Asked:** Security items 3 and 6 — own secret for check-in QR codes; hide full phone and photo on the public pass.
- **Decided / why:** A leaked login secret must not mint 10-year passes. The pass link only needs name and QR; last four phone digits are enough to recognize the member.
- **Shipped:** `passSigningSecret` — production requires `MEMBER_PASS_SECRET` (member + station QR + device-token HMAC). Public pass payload drops photo and masks phone; pass page no longer renders a photo.
- **Styles / customs:** none
- **Do-not-regress:** production QR signing is `MEMBER_PASS_SECRET` only; public pass has no full phone or photo.
- **Follow-ups:** set a new `MEMBER_PASS_SECRET` on Railway before this API deploy (do not copy `JWT_SECRET`). After deploy, regenerate station posters and member passes — old QR codes will not scan. Trusted check-in phones will need to verify again.

### 2026-10-11 — Public pass drops phone

- **Asked:** Drop the phone from the check-in pass.
- **Decided / why:** Name and QR are enough; even a masked number does not need to be on the link.
- **Shipped:** Public pass API and page no longer include phone.
- **Styles / customs:** none
- **Do-not-regress:** public pass has no phone and no photo.
- **Follow-ups:** none

### 2026-10-11 — Pin admin member bars to the axis

- **Asked:** Top Gyms by Members bars still float in the middle of the chart.
- **Decided / why:** `domain={[0, 'auto']}` lets Recharts nice-ticks extend below 0, so the zero line sits mid-plot. Use a fixed `[0, rounded max]` instead.
- **Shipped:** `AdminMembersChart` Y axis domain is `[0, axisMax(tallest)]`.
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** none

### 2026-10-11 — Member bars fill the dashboard panel

- **Asked:** Top Gyms by Members still looks like the bars are floating.
- **Decided / why:** The zero tick was already at the bar bottoms. The chart box was a fixed height inside a taller card, so the axis sat above an empty band. Let the chart fill the card and draw the baseline.
- **Shipped:** Admin dashboard chart area is `flex-1` (min height kept). Category axis draws a baseline; labels sit closer to it.
- **Styles / customs:** none
- **Do-not-regress:** admin member chart fills the panel; bars sit on the drawn baseline.
- **Follow-ups:** visible on niku-saas after the frontend deploy.

### 2026-10-11 — Thicker admin member bars

- **Asked:** The member bars look right on the baseline, but they are too thin.
- **Decided / why:** Category gap is removed from both sides of each column, so 28% left a narrow bar. 8% with a 56px cap fills the column without the bars touching.
- **Shipped:** `AdminMembersChart` `barCategoryGap` 8%, `maxBarSize` 56, corner radius 6.
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** visible on niku-saas after the frontend deploy.

### 2026-10-11 — Quiet privacy link on login

- **Asked:** Show the privacy policy the standard way.
- **Decided / why:** The policy stays public. Signup keeps the “By continuing…” line. Login should not stack Privacy Policy under Register as another action.
- **Shipped:** Muted footer link on every auth screen (`AuthHeroBackground`). Removed the login line under Register.
- **Styles / customs:** Privacy Policy placement updated in the decision index.
- **Do-not-regress:** login privacy link is a muted footer, not a peer of Register.
- **Follow-ups:** visible on niku-saas after the frontend deploy.

### 2026-10-11 — Mobile privacy matches the web pattern

- **Asked:** Put the privacy policy on mobile the same way as the web login.
- **Decided / why:** Profile already had the signed-in link. Sign-in needed a muted footer, and signup needed the “By continuing…” line.
- **Shipped:** `AuthPrivacyFooter` on mobile auth screens. `AuthPrivacyConsent` under signup actions. Profile link unchanged.
- **Styles / customs:** Privacy Policy decision index covers web and mobile.
- **Do-not-regress:** mobile login privacy link is a muted footer, not a peer of Register.
- **Follow-ups:** needs a new mobile build to show on phones.

### 2026-10-11 — Larger Unpaid label on the member list

- **Asked:** Make the Unpaid text two steps bigger.
- **Decided / why:** The row label was 11. Two steps on this list’s type scale is 13, still under the 16 name.
- **Shipped:** Members list `unpaid` font size 11 → 13.
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** needs a new mobile build to show on phones.

### 2026-10-11 — Nudge Unpaid label left

- **Asked:** Move the Unpaid text 1px from the right toward the left.
- **Decided / why:** The label is right-aligned in the member row. A 1px right margin shifts it inward.
- **Shipped:** Members list `unpaid` `marginRight: 1`.
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** needs a new mobile build to show on phones.

### 2026-10-11 — Privacy link opens the live site

- **Asked:** The mobile Privacy Policy link opened the old Vercel host and landed on sign-in.
- **Decided / why:** `vibe-frontend-coral.vercel.app` has no deployment. `/privacy` is live on `niku-saas.vercel.app`.
- **Shipped:** Mobile `WEB_APP_ORIGIN` and EAS `EXPO_PUBLIC_WEB_URL` point at `https://niku-saas.vercel.app`.
- **Styles / customs:** none
- **Do-not-regress:** mobile privacy link uses the live web host, not the retired coral URL.
- **Follow-ups:** the APK already building will still open the old host. Rebuild after this change.

### 2026-10-11 — Needs attention shows branch, not phone

- **Asked:** Remove the phone from dashboard Needs attention and put the branch back.
- **Decided / why:** The middle line was phone · plan. Plan already includes the gym tag (`Monthly · Gym`). Branch belongs there; the phone does not.
- **Shipped:** Alert row meta is plan · branch. Expiry stays on its own line.
- **Styles / customs:** none
- **Do-not-regress:** Needs attention rows do not show the member phone.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Branch leads Needs attention

- **Asked:** Put the branch before the plan. Gyms with no branch keep the phone.
- **Decided / why:** The middle line was plan · branch. Branch is the locator, so it comes first. No branch name means fall back to the phone.
- **Shipped:** Alert row meta is branch · plan, or phone · plan when `branch_name` is empty.
- **Styles / customs:** Needs attention order updated in Do not regress.
- **Do-not-regress:** branch before plan; phone only when there is no branch.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Lighter revenue payment chips

- **Asked:** Payment method chips on Revenue should match the lighter shade, not the darker inset.
- **Decided / why:** The chip used `inputBg`, which is darker than the card. The earlier screen used a lighter gray.
- **Shipped:** Method chips use `cardEdge` for fill and border.
- **Styles / customs:** none
- **Do-not-regress:** none
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Gym profile form stays together

- **Asked:** Reorder Gym profile so the fields that save are not split by Telegram and support.
- **Decided / why:** Name, phone, email, and username belong next to Save. Telegram, then support and Privacy Policy, come after.
- **Shipped:** Mobile Gym profile order is the form and Save, then license alerts, then support and Privacy Policy.
- **Styles / customs:** none
- **Do-not-regress:** don’t put Telegram or support between the gym fields and Save.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Gym profile Login heading

- **Asked:** Stop the Gym label from covering email and username.
- **Decided / why:** Those two fields are the sign-in account. They stay in the same form, directly above Save, under their own Login heading.
- **Shipped:** `vibe-mobile/app/profile.tsx` — Login section before email and username.
- **Styles / customs:** Gym profile section split updated in Do not regress.
- **Do-not-regress:** email and username stay under Login; Save still follows the form.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Web Gym profile Sign-in under Gym details

- **Asked:** Move web Gym profile Sign-in up so it is not below Telegram, support, and Privacy Policy.
- **Decided / why:** Username and login email save with the gym fields. Alerts and support come after both groups. Discard, Cancel, and Save stay in the footer.
- **Shipped:** `vibe-frontend/src/components/account/AccountPanels.jsx` — Sign-in follows Gym details.
- **Styles / customs:** Web profile order added to Do not regress.
- **Do-not-regress:** Sign-in stays directly under Gym details.
- **Follow-ups:** needs a web deploy.

### 2026-10-11 — Web Gym profile field room

- **Asked:** Give the Gym profile inputs room so they do not sit cramped if a section lands on the footer again.
- **Decided / why:** Username and login email were sharing one row in a narrow dialog, and the last block sat on Discard / Cancel / Save. Each sign-in field gets the full row, and the form keeps extra space above the footer.
- **Shipped:** `vibe-frontend/src/components/account/AccountPanels.jsx` — stacked Sign-in fields and taller bottom padding.
- **Styles / customs:** Web profile field room added to Do not regress.
- **Do-not-regress:** username and login email stay full width; keep the extra space above the footer.
- **Follow-ups:** needs a web deploy.

### 2026-10-11 — Telegram link share does not copy

- **Asked:** The share icon on the Telegram link looks wrong, and clicking it copies the link.
- **Decided / why:** That button was a share control with a copy fallback. Desktop Firefox has no share sheet, so it copied. Copy stays on the link. Share only opens the system share sheet, and the control is hidden when the browser cannot share.
- **Shipped:** `vibe-frontend/src/components/TelegramLinkShareRow.jsx`
- **Styles / customs:** Web share behavior added to Do not regress.
- **Do-not-regress:** share does not copy; hide it when there is no share sheet.
- **Follow-ups:** needs a web deploy.

### 2026-10-11 — Link Copied on the row

- **Asked:** When the Telegram link copies, show a thick circle and “Link Copied” instead of the popup, on phone and web.
- **Decided / why:** The corner toast was the confirmation. The row itself should show it, then return to the link.
- **Shipped:** `TelegramLinkShareRow` on web and mobile. English label is “Link Copied”.
- **Styles / customs:** Copy confirmation added to Do not regress.
- **Do-not-regress:** no success toast for this copy.
- **Follow-ups:** needs a web deploy and a new mobile build.

### 2026-10-11 — Mobile Link Copied at the bottom

- **Asked:** On mobile, show Link Copied at the bottom center, with the text and icon in active green.
- **Decided / why:** The row confirmation sat on the link. On the phone it belongs at the bottom center, in the Active status green.
- **Shipped:** `vibe-mobile/src/components/TelegramLinkShareRow.tsx` — bottom-center circle and label use `statusActive`. The link stays on the row.
- **Styles / customs:** Mobile copy confirmation updated in Do not regress.
- **Do-not-regress:** mobile confirmation stays bottom center in active green; web stays on the row.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Mobile revenue line matches the web

- **Asked:** The phone revenue line breaks at a tapped day. The web line stays smooth.
- **Decided / why:** The phone curve used each day as a bend handle and did not pass through it. The web chart uses a monotone curve through every point. The phone line should do the same, so the marker sits on the stroke.
- **Shipped:** `vibe-mobile/src/components/MiniBarChart.tsx` — monotone cubic through each day.
- **Styles / customs:** Revenue line rule added to Do not regress.
- **Do-not-regress:** the line passes through every day.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Reports uses the same revenue line

- **Asked:** Use the smooth revenue line on mobile Reports too.
- **Decided / why:** Reports already renders `MiniBarChart`, the same component as the dashboard. The monotone curve applies there with no second chart.
- **Shipped:** no separate report chart. Do not regress now names Reports.
- **Styles / customs:** shared revenue line noted in Do not regress.
- **Do-not-regress:** Reports keeps using `MiniBarChart`.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Offline enroll skips phone check

- **Asked:** Offline member registration used to work, and now Continue shows “Could not connect to the server.”
- **Decided / why:** Step 1 always calls the phone-availability API. Offline, that request fails and blocks the wizard before the enroll can be queued.
- **Shipped:** `vibe-mobile/app/enroll.tsx` — skip the phone check when offline or the request cannot reach the server.
- **Styles / customs:** Offline enroll rule added to Do not regress.
- **Do-not-regress:** do not require the phone-availability request to leave the Member step while offline.
- **Follow-ups:** needs a new mobile build.

### 2026-10-11 — Web enroll skips phone check offline

- **Asked:** Skip the phone-uniqueness check on the web too, so offline enroll can continue.
- **Decided / why:** Web Continue always called the phone check. A connection failure stopped the wizard before the enroll could be queued. Online, a real “already used” result still blocks.
- **Shipped:** `vibe-frontend/src/components/MemberModal.jsx` — if the phone check cannot reach the server, Continue proceeds.
- **Styles / customs:** Offline enroll rule now names web and mobile.
- **Do-not-regress:** do not require the phone-availability request to leave the Member step while offline.
- **Follow-ups:** needs a web deploy.

### 2026-10-11 — Revenue method chips use the card fill

- **Asked:** On Revenue, both themes, the payment-method chip should use the card background instead of a white or gray fill.
- **Decided / why:** The chip fill was `cardEdge`, a gray that sits on top of the card. The row is already `card`, so the chip should use that fill and keep `cardEdge` only as the outline.
- **Shipped:** `vibe-mobile/src/constants/payments.ts` — `paymentMethodBadgeStyle` fill is `card`.
- **Styles / customs:** Chip fill rule added to Do not regress.
- **Do-not-regress:** do not fill method chips with `cardEdge` or `inputBg`.
- **Follow-ups:** needs a new mobile build. Member payment history uses the same chip.

### 2026-10-11 — Unpaid Due Soon can change plan

- **Asked:** An unpaid Due Soon member’s Manage sheet only had Edit and Remove. They need to change plan before paying.
- **Decided / why:** Due Soon still means the term is open. Unpaid Active and Due Soon can switch plan first. Expired unpaid still pays or renews.
- **Shipped:** `vibe-mobile/src/utils/memberRenew.ts`, `MemberActionsBar.tsx` (Change plan beside Collect and in Manage); `vibe-frontend/src/utils/memberRenew.js`; `vibe/routes/members.js` allows the same unpaid Due Soon switch.
- **Styles / customs:** Unpaid Change plan added to Decision index and Do not regress.
- **Do-not-regress:** do not hide Change plan on unpaid Active or Due Soon; do not offer it for expired unpaid.
- **Follow-ups:** needs a new mobile build and an API deploy. The current app will still hide the action until then.

### 2026-10-12 — Change plan stays in Manage

- **Asked:** Do not put Collect payment and Change plan side by side. Keep Change plan inside Manage, as before.
- **Decided / why:** Unpaid Due Soon still needs the action, but the profile button stays Collect payment only.
- **Shipped:** `vibe-mobile/src/components/MemberActionsBar.tsx` — Change plan is a Manage item when Collect or Renew is already the profile button.
- **Styles / customs:** Do not regress line now says Manage only.
- **Do-not-regress:** do not place Change plan beside Collect payment.
- **Follow-ups:** needs a new mobile build and an API deploy.

### 2026-10-12 — Toast stays until the bar ends

- **Asked:** On register, delete, and renew, the success popup disappears before its timer bar finishes.
- **Decided / why:** The popup and the bar used two timers, so the popup could close while the bar was still moving. The popup should leave when the bar reaches the end.
- **Shipped:** `vibe-mobile/src/components/FlashBanner.tsx` and `vibe-frontend/src/components/FlashBanner.jsx` — dismiss follows the bar animation.
- **Styles / customs:** Do not regress line added.
- **Do-not-regress:** do not close these toasts on a timer that can finish before the bar.
- **Follow-ups:** needs a new mobile build and a web deploy.

### 2026-10-12 — Revenue method tiles

- **Asked:** Make the mobile Revenue card match the screenshot: period, total, payment count, then three method boxes.
- **Decided / why:** Cash, Transfer, and Telebirr were one full-width strip with dividers. Each method should be its own rounded tile inside the card.
- **Shipped:** `vibe-mobile/app/(tabs)/revenue.tsx` — inset tiles with icon, amount, and name.
- **Styles / customs:** Do not regress line added.
- **Do-not-regress:** do not replace the three tiles with an edge-to-edge method strip.
- **Follow-ups:** needs a new mobile build.

### 2026-10-12 — Revenue methods stay one row

- **Asked:** Match the Revenue card screenshot. The boxed method tiles will not fit when a fourth payment method has money.
- **Decided / why:** The screenshot is icon, amount, and name in one row, split by a thin vertical line. Separate tiles waste width, so four methods no longer fit.
- **Shipped:** `vibe-mobile/app/(tabs)/revenue.tsx` — compact columns with a hairline divider. Amounts shrink to one line instead of wrapping.
- **Styles / customs:** Do not regress line updated.
- **Do-not-regress:** do not put each method in its own tile.
- **Follow-ups:** needs a new mobile build. The preview build already running will not include this.

### 2026-10-12 — Revenue card restored to October 8

- **Asked:** Put the Revenue card back to how it was four or five days ago.
- **Decided / why:** That card is the October 8 layout: a line under the payment count, then small method columns with a divider between them. Later tiles and larger type were not that card.
- **Shipped:** `vibe-mobile/app/(tabs)/revenue.tsx` — method row restored to the October 8 sizes and dividers.
- **Styles / customs:** Do not regress line updated to the October 8 card.
- **Do-not-regress:** do not replace that row with method tiles or larger type.
- **Follow-ups:** needs a new mobile build.

### 2026-10-12 — Staff and trainer phone field

- **Asked:** Add a phone field on staff registration, using the member `+251` input. Use that same field for trainers.
- **Decided / why:** Members already use the split Ethiopian phone box. Staff had no phone. The website trainer form was a plain text box. The phone app trainer form already used the split field.
- **Shipped:** `vibe/migrations/030_user_phone.sql`, `vibe/routes/gymTeam.js`, `vibe/validation/schemas.js`; web `StaffModal.jsx` and `TrainerModal.jsx`; mobile staff create and edit.
- **Styles / customs:** Do not regress line added.
- **Do-not-regress:** staff and trainer phones stay on the split `+251` field. Staff phone is not a login.
- **Follow-ups:** run the migration on the API database before saving a staff phone. Needs a web deploy and a new mobile build.

### 2026-10-12 — Mobile staff phone placement

- **Asked:** Put the staff phone field on the phone app, in the right section of registration.
- **Decided / why:** The split `+251` field was already on Add Staff, but it sat before the role and email was down with the login fields. It belongs with name and email, before username, same as the website form.
- **Shipped:** `vibe-mobile/app/team/new.tsx`, `vibe-mobile/app/team/[id]/edit.tsx`.
- **Styles / customs:** Do not regress line updated.
- **Do-not-regress:** mobile staff phone stays with name and email, before the sign-in fields.
- **Follow-ups:** needs a new mobile build. The preview build already running will not include this.

### 2026-10-12 — Trainers listed by member branch

- **Asked:** When a member is registered to a branch, the trainer list should include only trainers registered on that branch.
- **Decided / why:** Trainers belong to one branch. Offering trainers from other branches assigns the member someone who does not work there.
- **Shipped:** `vibe/utils/trainers.js` rejects a cross-branch assignment. Web `MemberModal.jsx` and mobile enroll and member edit filter the picker. Changing branch clears a trainer who is not on the new branch.
- **Styles / customs:** Decision index + Do not regress updated.
- **Do-not-regress:** do not list or save a trainer from a different branch than the member.
- **Follow-ups:** needs an API deploy, a web deploy, and a new mobile build.

### 2026-10-12 — We missed you on Telegram

- **Asked:** Send a Telegram “we have missed you” message to members who did not come in the past 7 days.
- **Decided / why:** No visit already finds those members, but nothing wrote to them. Member notices stay on Telegram. One message per quiet streak, so staying away does not send a new text every morning. A later visit starts a new streak.
- **Shipped:** `vibe/jobs/expiryCheck.js`, `vibe/utils/notificationSms.js`; message log labels on web and mobile; `MESSAGE_CATALOG.md`.
- **Styles / customs:** Decision index + Do not regress updated.
- **Do-not-regress:** Telegram only, once per quiet streak. Copy is `Hi {name}, we have missed you at {gym}.`
- **Follow-ups:** needs an API deploy. The first daily run after deploy messages everyone who already qualifies and has Telegram linked.

### 2026-10-12 — Missed-you message includes the day count

- **Asked:** Put the No visit day count in the Telegram message, and keep the “don’t lose your progress” line.
- **Decided / why:** The list already counts days since the last check-in. The notice should use that same number, with clearer sentences than the first draft.
- **Shipped:** `vibe/utils/notificationSms.js`, `vibe/jobs/expiryCheck.js`.
- **Styles / customs:** Decision index and Do not regress copy updated.
- **Do-not-regress:** the day count in the notice is the No visit count.
- **Follow-ups:** needs an API deploy.

### 2026-10-12 — Missed-you repeats each week away

- **Asked:** On a second week of not coming, the Telegram notice should include the new day count.
- **Decided / why:** One message per quiet stretch left the count stuck at the first week. Each further 7 days away gets the same notice again, with the No visit day count as it is that day.
- **Shipped:** `vibe/jobs/expiryCheck.js`.
- **Styles / customs:** Decision index and Do not regress updated.
- **Do-not-regress:** repeat every 7 days away, not every day, and not only once.
- **Follow-ups:** needs an API deploy.

### 2026-10-12 — Team branch counts follow the selected branch

- **Asked:** Staff and trainer filters should be specific to the selected branch. Every branch still showed the same count of three.
- **Decided / why:** The table already hid other branches. The Staff and Trainers counts stayed on the whole gym, so the filter looked unchanged.
- **Shipped:** `vibe-frontend/src/pages/owner/Team.jsx`.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs a web deploy.

### 2026-10-12 — Mobile team counts follow the branch

- **Asked:** Make the phone app Team branch filter specific to the selected branch, same as the website.
- **Decided / why:** Staff and trainer lists and their counts already used the selected branch. The Former trainer count was still the whole gym.
- **Shipped:** `vibe-mobile/app/team/index.tsx`.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs a new mobile build. The preview build already running will not include this.

### 2026-10-12 — Trainer card lists assigned members

- **Asked:** On the Team page, clicking a trainer card should list the members training under that trainer.
- **Decided / why:** The card already showed a count. Opening it should list those live members (`trainer_id`, not removed). Edit, archive, and restore stay on the actions menu so the card itself can open the list. A former trainer can still have members, so that card opens the same list.
- **Shipped:** `vibe/routes/gymTrainers.js` `GET /api/gym/trainers/:id/members`; web `Team.jsx` and `TrainerMembersModal.jsx`; mobile `app/team/trainers/[id]/members.tsx`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** the trainer card opens the assigned live members. Do not move that list onto the edit or archive action.
- **Follow-ups:** needs an API deploy, a web deploy, and a new mobile build. The preview build already running will not include this.

### 2026-10-13 — Admin gym list shows branch count

- **Asked:** On the admin Gyms table, show how many branches a gym has, the same way Members already shows a number.
- **Decided / why:** Opening a gym already showed Branches. The list did not, so a multi-location gym was invisible until the row was opened. The number is active branches, matching that Branches stat.
- **Shipped:** `vibe/routes/admin.js` gym list; `vibe-frontend` admin Gyms table and the narrow-screen gym card.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** keep the branch count beside Members. Do not use a different count than the gym detail Branches stat.
- **Follow-ups:** needs an API deploy and a web deploy.

### 2026-10-13 — Admin gym details list members per branch

- **Asked:** The admin should see how many members are on each branch, including a branch that was just created.
- **Decided / why:** The Gyms table Members number is the whole gym. A new branch starts empty, and that only shows up once each location has its own count. The gym owner’s Branches page already counts live members per location; the admin detail uses that same count.
- **Shipped:** `vibe/routes/admin.js` gym detail `branches`; `GymDetailsModal.jsx` lists each branch under Overview.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** keep each branch’s live member count on the admin gym detail. Leave the table Members number as the gym-wide active total.
- **Follow-ups:** needs an API deploy and a web deploy.

### 2026-10-13 — Branches table shows trainers

- **Asked:** Add a Trainers column on the gym Branches table, beside Members and Staff.
- **Decided / why:** Each location already shows how many members and staff sit there. Trainers belong to a branch too, so the same row should show how many live trainers are on it. Former trainers stay off the count.
- **Shipped:** `vibe/routes/branches.js`; web `Branches.jsx` (the number opens Team on the Trainers tab for that branch); mobile branch cards.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** keep the live trainer count beside Staff. Do not include former trainers.
- **Follow-ups:** needs an API deploy, a web deploy, and a new mobile build.

### 2026-10-13 — Team staff list hides email

- **Asked:** Remove email from the Team staff table.
- **Decided / why:** Phone and username are what that list needs. Email stays on the add and edit staff form, and search can still match it.
- **Shipped:** `vibe-frontend/src/pages/owner/Team.jsx` staff table and the narrow staff cards.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** do not put email back on the Team staff list.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Branches columns share the row evenly

- **Asked:** The Branches table columns should be spaced fairly and evenly.
- **Decided / why:** The name column was wide and Actions sat on the far right, so Members, Staff, Trainers, and Status looked bunched. Each column now takes an equal share, and Actions lines up with the others.
- **Shipped:** `vibe-frontend/src/index.css`, `src/pages/owner/Branches.jsx`.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Team columns share the row evenly

- **Asked:** Space the Team table columns the same even way as Branches.
- **Decided / why:** Staff and trainer columns used uneven widths, and Actions sat on the far right. Each column now takes an equal share, and Actions lines up with the others.
- **Shipped:** `vibe-frontend/src/index.css`, `src/pages/owner/Team.jsx`.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Trainer member list shows the trainer fee

- **Asked:** On a trainer’s member list, show how much each member paid that personal trainer.
- **Decided / why:** Trainer fees are stored as their own payments, separate from the gym membership. The amount on each row is the total of those trainer-fee payments for that member. If none was entered, the row shows 0 ETB.
- **Shipped:** `vibe/routes/gymTrainers.js` `trainer_paid`; web `TrainerMembersModal.jsx`; mobile trainer members screen.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** show trainer-fee payments only. Do not add the membership payment into that figure.
- **Follow-ups:** needs an API deploy, a web deploy, and a new mobile build.

### 2026-10-13 — Branch and Team loading rows match the tables

- **Asked:** Fix the loading skeleton on the Branches and Team pages.
- **Decided / why:** Those tables now share the row evenly, but the loading bars were fixed widths with the last bar pinned right, so the skeleton did not match the table. The Trainers tab also used the phone list skeleton on a wide screen.
- **Shipped:** `LoadingSkeletons.jsx`, `Branches.jsx`, `Team.jsx`.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Trainer fee column is easier to scan

- **Asked:** Improve the trainer member list so the fees are easier to read.
- **Decided / why:** Repeating “Trainer fee” on every row and letting amounts wrap made the money hard to scan. One header, one right-aligned column. Paid amounts stay bright. 0 ETB stays quiet.
- **Shipped:** web `TrainerMembersModal.jsx`; mobile trainer members screen.
- **Styles / customs:** Do not regress and Standing product updated.
- **Do-not-regress:** one Trainer fee label, right-aligned amounts, quiet zero.
- **Follow-ups:** needs a web deploy and a new mobile build.

### 2026-10-13 — Trainer member modal is wider

- **Asked:** Make the trainer member modal a bit wider.
- **Decided / why:** The narrow dialog cut off phone and plan on each row. One step up to the 2xl dialog gives the name line room without making it a full-page panel.
- **Shipped:** `TrainerMembersModal.jsx` size `lg` → `2xl`.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Trainer member list search and branch column

- **Asked:** Add a search field on the trainer member list, and a column on the right for the branch name.
- **Decided / why:** The branch was buried in the phone line. A Branch column beside Trainer fee makes Main and the other locations scannable. Search filters the list already loaded, by name, phone, plan, or branch.
- **Shipped:** web `TrainerMembersModal.jsx`; mobile trainer members screen.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** search stays on the list. Branch is its own column only when the gym has more than one branch.
- **Follow-ups:** needs a web deploy and a new mobile build.

### 2026-10-13 — Trainer list shows the branch once

- **Asked:** Put the branch on the left top of the trainer member list, not beside Trainer fee, and take it off each member.
- **Decided / why:** Everyone on a trainer’s list shares that trainer’s branch, so one name covers the list. It sits with the member count. Trainer fee stays the only right-hand column.
- **Shipped:** web `TrainerMembersModal.jsx`; mobile trainer members screen; API returns the trainer’s branch name with the member list.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** one branch name at the top left when the gym has more than one branch. Do not repeat it on each member.
- **Follow-ups:** needs an API deploy, a web deploy, and a new mobile build.

### 2026-10-13 — Phone trainer list uses the same branch line

- **Asked:** Do the same branch line on mobile.
- **Decided / why:** The phone list had the branch as its own heading. It now matches the web line: the member count and the branch name together at the top left.
- **Shipped:** mobile trainer members screen.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** needs an API deploy and a new mobile build.

### 2026-10-13 — Gym QR success ring shows the visit count

- **Asked:** After the gym QR and OTP, show the visit count inside the ring, like check-in, such as 1/6.
- **Decided / why:** The success screen was swapping the count for a check. The count is what the member needs to see. The sentence under the name stays.
- **Shipped:** `StationCheckInPage.jsx` no longer passes `celebrate` to the ring.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** the public success ring keeps the visit count inside. Do not cover it with a check.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Gym QR ring shows the check, then the count

- **Asked:** Show the thick check inside the ring first, then the number, the way desk check-in does.
- **Decided / why:** The count should stay, but the check comes first so the success moment matches the desk. The check holds for the same short beat, then 1/6 appears.
- **Shipped:** `StationCheckInPage.jsx`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** check first, then the visit count. Same timing as desk check-in.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Revenue custom range is one short row

- **Asked:** Improve the custom range filter on Revenue.
- **Decided / why:** The two dates were full width, so “to” sat on its own line and left a tall empty band under the title. They belong beside Custom range, the same height as the other toolbar controls.
- **Shipped:** `Revenue.jsx`, compact `DateField`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** one short row: start, to, end. Do not stretch the fields across the page.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Phone revenue custom range is one short row

- **Asked:** Do the same custom range row on mobile.
- **Decided / why:** The phone filters already opened two dates, but they stretched across the sheet with nothing between them. They now read start, to, end, in one short row under Custom range on.
- **Shipped:** `RevenueFiltersSheet.tsx`; `common.to` in en, am, and om.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** phone dates stay a short row with “to” between them.
- **Follow-ups:** needs a new mobile build.

### 2026-10-13 — Custom range stays visible

- **Asked:** Improve the remaining custom-range layout on web and mobile.
- **Decided / why:** On the phone the control sat under every payment method and looked like a caption until it was on. It is now the first section in Filters, with a border and a calendar icon. On the web, Export wraps by itself so it does not split the date row.
- **Shipped:** `RevenueFiltersSheet.tsx`, `Revenue.jsx`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** phone custom range stays first in Filters and looks like a control when it is off. Web dates stay with the period control.
- **Follow-ups:** needs a web deploy and a new mobile build.

### 2026-10-13 — Revenue period menu eases the date row

- **Asked:** Smooth the change between a month filter and Custom range.
- **Decided / why:** The dates were appearing and disappearing in one frame, so the toolbar jumped next to the open menu. The period button keeps one width, and the date row eases open and closed.
- **Shipped:** `Revenue.jsx`, `ToolbarPicker.jsx`.
- **Styles / customs:** Do not regress updated.
- **Do-not-regress:** the custom date row eases in and out. Do not pop it on or off.
- **Follow-ups:** needs a web deploy.

### 2026-10-13 — Phone trainers list drops the login line

- **Asked:** Remove the text under trainer search that starts with “No login.”
- **Decided / why:** That line only restated that trainers have no login. The list is clearer without it.
- **Shipped:** mobile `app/team/index.tsx`.
- **Styles / customs:** Do not regress and Standing product updated.
- **Do-not-regress:** do not put the “No login” line back under the phone trainers search.
- **Follow-ups:** needs a new mobile build.

### 2026-10-13 — Custom range row matches the other filters

- **Asked:** Make the phone custom-range row the same color as Newest first and All methods.
- **Decided / why:** The bright outline made that row louder than the other selected filters. It now uses the same soft fill, with no bright edge.
- **Shipped:** `RevenueFiltersSheet.tsx`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** when custom range is on, the row matches the other selected filter rows.
- **Follow-ups:** needs a new mobile build.

### 2026-10-13 — Trainer member phone stays on one line

- **Asked:** Osiyas’s card on the phone trainer list broke the phone number in the middle.
- **Decided / why:** Expired plus a wide fee squeezed the shared phone-and-plan line, so the number wrapped. The phone now sits on its own line under the name, and the plan is the line below it.
- **Shipped:** mobile `app/team/trainers/[id]/members.tsx`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** on the phone trainer member list, do not let the status or the fee wrap the phone number.
- **Follow-ups:** needs a new mobile build.

### 2026-10-13 — Trials, one API, ZAP, station link

- **Asked:** How to give free trials while contacting gym owners. Whether extra Railway copies prevent a crash. What to do for about 20 desks at once, then about 50. Where `DB_POOL_MAX` is set, and whether setting it to 40 now costs anything. What the OWASP ZAP alerts on `niku-saas.vercel.app` mean. Why station self check-in said Telegram was not linked after a desk QR check-in.
- **Decided / why:** Enroll each trial from admin: Free Trial, and type the days for that gym. Leave public signup as it is. A trial gym is not unpaid; when they pay, use Change plan, and link the gym Telegram so the ending notice arrives. Stay on one small API on the $5 plan. Register as many gyms as you want. The API gets busy when about 20 desks are using it at the same moment. Morning and evening rushes line up, but a check-in only borrows a database connection for a moment, so the first gyms stay on this size. Railway already restarts that one copy on a crash (`ON_FAILURE`, up to 10). The health check only gates a new deploy. A short database blip does not restart the process. `DB_POOL_MAX` is unset, so the pool ceiling stays 20 (`vibe/config/db.js`). Setting 40 on Railway only raises that ceiling and restarts the API once. Leave it unset until a real rush feels slow. For about 50 desks at once, give the same service more memory, then set `DB_POOL_MAX` to 40 after checking Neon’s connection limit. Still one copy. A second copy waits until photos leave the attached disk and Neon’s connection pooler is in front. The $20 plan is not a step. The ZAP list is a loose Content Security Policy, not a break-in. Leave it for the trials. The only later cleanup is dropping `localhost` from the live policy. The station message means that member’s Telegram chat is not saved. Scanning his pass and copying the link do not link him. He has to open the link in Telegram and tap Start.
- **Shipped:** none. The phone-number line on the trainer member list was already logged above.
- **Styles / customs:** none.
- **Do-not-regress:** none.
- **Follow-ups:** the trainer-list phone fix needs a new mobile build. The build that was running does not include it.

### 2026-10-14 — Notification activity is quieter

- **Asked:** Fix the notification panel so activity does not look like something that still needs a person.
- **Decided / why:** “Recorded” was repeated above “4,000 ETB recorded.” The teal unread bar was on every row, including old payments. “Show all” did not say it only opens activity.
- **Shipped:** web `NotificationInbox.jsx`, `notificationText.js`; mobile `NotificationsSheet.tsx`, `notificationText.ts`; en/am/om copy on web and mobile.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** activity payments do not show a Recorded eyebrow. The teal unread bar stays on Needs attention only. The activity control names activity.
- **Follow-ups:** needs a web deploy and a new mobile build.

### 2026-10-14 — Activity chevron opens the profile

- **Asked:** On the phone, tapping the arrow on an activity row should open the member. Only the name did.
- **Decided / why:** The arrow sat outside the name’s tap target. The date and arrow now open the same profile.
- **Shipped:** mobile `NotificationsSheet.tsx`.
- **Styles / customs:** Do not regress and Standing product updated.
- **Do-not-regress:** the phone activity chevron opens that member’s profile.
- **Follow-ups:** needs a new mobile build.

### 2026-10-14 — Notification icons share one color

- **Asked:** Quiet the amber, blue, rose, and teal circles on notification rows.
- **Decided / why:** Those circles were the loud part. The green unread line stays. Every icon circle now uses the same muted color, on web and phone.
- **Shipped:** web `NotificationInbox.jsx`; mobile `NotificationsSheet.tsx`.
- **Styles / customs:** Decision index, Do not regress, and Standing product updated.
- **Do-not-regress:** notification icon circles stay one muted color. Do not put the status colors back on them.
- **Follow-ups:** needs a web deploy and a new mobile build.

---

*Append new sessions below. Do not edit older entries except factual typo fixes.*
