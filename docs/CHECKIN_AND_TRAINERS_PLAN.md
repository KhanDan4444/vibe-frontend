# Check-in, QR Passes & Trainers — Execution Plan

| | |
|---|---|
| **Status** | Phase 2 desk check-in live on web + mobile — QR still later |
| **Date** | 18 August 2026 |
| **Product** | Vibe (API `vibe`, web `vibe-frontend`, mobile `vibe-mobile`) |
| **Depends on** | Live memberships, Former/archive, Front Desk staff, SMS, branch scoping |

This document is the implementation blueprint. Desk check-in (Phase 2) is live on web + mobile. QR remains later. Attendance desk check-in is now in-scope in `docs/SRS.md` (QR / absence SMS still out of scope).

---

## 1. Goals

1. **Attendance** — gyms record when members visit. Each gym chooses its own weekly cap (4 / 5 / 6 days or unlimited).
2. **Trainers** — gyms register trainers as **employees** (no login). Members may be assigned a trainer at enroll (or later) with an **optional extra payment**.
3. **Two check-in paths** (same rules, different entry):
   - **Staff:** search name/phone **or** scan the **member QR**
   - **Self-scan (later):** member scans the **gym/branch station QR**

---

## 2. Product principles

| Principle | Meaning |
|---|---|
| Identity ≠ permission | QR says *who* (or *which station*). Database says *allowed in*. |
| Gym preference | Visit cap and absence reminders are gym (optional plan) settings — not hardcoded. |
| Trainers are not users | No password, no dashboard. Front desk still checks people in. |
| Same engine, many methods | Staff search, staff-scan member QR, and self-scan all write one `CheckIns` row. |
| Stable member pass | Member QR does **not** change on monthly renew. Rotate only if lost, stolen, or regenerated. |
| Staff always available | Self-scan never replaces desk check-in (no phone, failed scan, disputes). |

---

## 3. How QRs work (two different codes)

These are **not** the same QR. Mixing them up will break the product.

```
MEMBER QR                          GYM / STATION QR
─────────                          ────────────────
Lives on the MEMBER                Lives on the WALL / desk poster
Means: “I am this member”          Means: “I am at this gym + branch”
Scanned by STAFF (or kiosk)        Scanned by the MEMBER’s phone
Issued at enroll / regenerate      Issued once per branch (can reprint)
Does NOT rotate on renew           Does NOT rotate on member renew
```

### 3.1 Member QR — identity pass

**What it encodes (signed token, not a raw id):**

- `type`: `member_pass`
- `gym_id`, `member_id`
- `pass_version` (integer, starts at 1)
- HMAC / JWT signature (server secret)

**Who gets it:** the **member** (phone screenshot, print, or later SMS link). Staff can always **Show pass** from the member profile.

**How the member gets it (in order of preference):**

| Step | Channel | When |
|---|---|---|
| 1 | Staff opens member → **Show QR** → member screenshots | Enroll (always) |
| 2 | Staff **Print pass** (name + photo + QR) | Enroll / reprint |
| 3 (optional later) | SMS: link to a **public pass page** (token in URL, not the image) | After enroll, if gym enables it |

Do **not** SMS a QR image every month.

**When it is created:** first time the member exists (enroll). Stored as `pass_version` on `Members` (and optionally a hashed secret). QR is generated **on demand** from current version — not stored as a PNG in the DB.

**When it is NOT renewed:**

- Membership renew
- Plan change
- Payment collected
- Month rollover
- Check-in itself

After renew, **same QR** works because `end_date` / status is live at scan time.

**When it IS rotated (new QR, old one dies):**

| Event | What happens |
|---|---|
| Staff taps **Regenerate pass** | `pass_version` += 1. Old scans fail: “Pass replaced — ask the desk.” |
| Member lost phone / shared screenshot | Same as regenerate |
| Optional: restore from Former | Recommend regenerate so an old screenshot cannot be reused |

Scan flow (staff):

1. Staff opens **Check in → Scan**
2. Camera reads member QR
3. API verifies signature + `pass_version` matches DB
4. Load member → apply attendance rules
5. Write `CheckIns` with `method = 'member_qr'`

Expired / Former / over weekly limit → **reject**. Do not issue a new QR; fix membership or wait for next week.

---

### 3.2 Gym / station QR — location (self-scan)

**What it encodes (signed token):**

- `type`: `checkin_station`
- `gym_id`, `branch_id`
- `station_version` (integer)
- signature

**Who has it:** the **gym** — printed poster at the door/desk, or a tablet showing the same code. One station QR **per branch** (multi-branch gyms: one poster per location).

**How the gym gets it:**

1. Owner opens **Attendance → Station QR** (or Branch settings)
2. App shows the branch’s station QR + **Download / Print**
3. Gym prints and tapes it at the entrance (“Scan to check in”)
4. Reprint anytime — **same code** unless they regenerate the station

**When it is created:** when the feature ships, generate a station token for each existing branch; new branches get one on create.

**When it is NOT renewed:**

- Member renews (irrelevant)
- Daily / monthly
- Each check-in

**When the gym QR IS rotated:**

| Event | What happens |
|---|---|
| Owner taps **Regenerate station QR** | `station_version` += 1. Old posters stop working. Print a new one. |
| Poster stolen / copied to another gym | Same — regenerate so a leaked poster cannot check people in at your branch |

**Self-scan identity problem:** the wall QR only says *where*. The phone must still prove *who*:

**v1 self-scan (no member app):** after scanning the poster, open a **mobile web page**:

1. Member scans gym QR → `vibe.app/check-in?station=…`
2. Enter **phone number**
3. SMS **OTP** (reuse existing OTP infra)
4. If phone matches an **active** member at that gym/branch → apply same rules → check in
5. Show result: “Checked in — 4/5 this week” or why it failed

**v2 (optional):** logged-in member app skips OTP.

Staff are not required for a successful self-scan; they remain the fallback.

---

### 3.3 QR renewal cheat sheet

| QR | On member renew | On lost/stolen | On gym request | Stored as |
|---|---|---|---|---|
| **Member pass** | Keep same | Bump `pass_version` | Staff regenerate | Version on `Members` |
| **Station (gym)** | N/A | Bump `station_version` | Owner regenerate | Version on `Branches` |

**Renew membership ≠ renew QR.** Always.

---

## 4. Attendance rules (gym preference)

### 4.1 Gym settings

On gym (or later per plan):

| Setting | Options | Default |
|---|---|---|
| `visits_per_week` | `null` (unlimited) / `4` / `5` / `6` (optional custom 1–7 later) | `null` |
| `week_starts_on` | `monday` / `sunday` | `monday` |
| `one_checkin_per_day` | true / false | **true** |
| `over_limit_policy` | `block` / `warn_allow` | `block` |
| `absence_reminder_days` | off / 3 / 5 / 7 | off until Phase 3 |
| `station_self_checkin` | on / off | off until Phase 4 |

Optional later: plan-level override (`Plans.visits_per_week`) if Premium = unlimited and Basic = 4.

### 4.2 Check-in validation (all methods)

Reject (or warn) if:

1. Signature invalid or version stale  
2. Member Former (`deleted_at`)  
3. Membership not active (expired / unpaid if you choose to block unpaid)  
4. Wrong branch (if gym locks check-in to member’s branch)  
5. Already checked in today (if enabled)  
6. Weekly visit count ≥ gym/plan cap (if not unlimited)

Success: insert `CheckIns`, return `{ visitsThisWeek, visitsLimit, member }`.

### 4.3 Absence SMS (Phase 3)

Daily job (same pattern as expiry SMS):

- Active members with phone  
- Last check-in older than `absence_reminder_days` (or never since enroll)  
- Dedupe in `SmsLog` (e.g. max once per 7 days)  
- Copy: we haven’t seen you; membership is still active  

---

## 5. Trainers (employees, not logins)

### 5.1 What a trainer is

- Row in **`Trainers`**, not `Users`
- Name, phone, optional photo, branch, specialty, `deleted_at` (Former, like members)
- **No password, no app access**

Staff UI: **Staff** section gets a **Trainers** tab beside Front Desk users.

### 5.2 Assign to a member

At **enroll** (and later on member edit):

1. Optional: **Assign trainer?**
2. Pick active trainer (same gym; typically same branch)
3. Optional **trainer fee** (ETB) — member preference  
4. If fee > 0: create a **Payment** with source `trainer` (or `trainer_assign`) so Revenue/Reports include it  

Member profile shows trainer name. Check-in card can show “Trainer: …” for desk context only.

### 5.3 Trainer fee

- Optional gym default `default_trainer_fee`
- Staff can change amount per member at assign time
- Unassign: keep payment history; clear `trainer_id` on member (or keep assignment history table if you need past trainers)

**v1:** current trainer on `Members.trainer_id` + payment at assign.  
**v2 (if needed):** `TrainerAssignments` history (start/end).

Trainers do **not** check members in.

---

## 6. Data model (migrations)

Suggested files in `vibe/migrations/`:

- `015_trainers.sql`
- `016_check_ins.sql`
- `017_attendance_settings.sql`

### Trainers

```
Trainers (
  id, gym_id, branch_id,
  name, phone, photo_url, specialty,
  deleted_at,
  created_at, updated_at
)
Members.trainer_id  NULL FK → Trainers
```

### Check-ins

```
CheckIns (
  id, gym_id, branch_id, member_id,
  checked_in_at,
  checked_in_by_user_id NULL,  -- staff user; NULL if self-scan
  method  'search' | 'member_qr' | 'station_qr',
  notes
)
Indexes: (gym_id, branch_id, checked_in_at), (member_id, checked_in_at)
```

### Passes & settings

```
Members.pass_version  INT NOT NULL DEFAULT 1
Branches.station_version  INT NOT NULL DEFAULT 1

Gyms (or GymSettings):
  visits_per_week, week_starts_on, one_checkin_per_day,
  over_limit_policy, absence_reminder_days, default_trainer_fee
```

Payments: allow `source = 'trainer'` (extend existing payment source constraint).

Audit actions: `trainer.created`, `check_in.recorded`, `member.pass_regenerated`, `branch.station_regenerated`.

---

## 7. API sketch (when executing)

All behind existing `auth` → gym access → subscription.

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET/POST | `/api/gym/trainers` | Owner (staff read optional) | List / create trainers |
| PATCH | `/api/gym/trainers/:id` | Owner | Edit / archive |
| POST | `/api/members` (extend) | Owner / Front Desk | `trainer_id` + optional trainer payment |
| POST | `/api/check-ins` | Owner / Front Desk | Body: `member_id` **or** `member_pass_token` |
| GET | `/api/check-ins` | Owner / Front Desk | Today / date range, branch-scoped |
| GET | `/api/members/:id/pass` | Owner / Front Desk | Render data for QR (token) |
| POST | `/api/members/:id/pass/regenerate` | Owner | Bump `pass_version` |
| GET | `/api/branches/:id/station-pass` | Owner | Token for poster QR |
| POST | `/api/branches/:id/station-pass/regenerate` | Owner | Bump `station_version` |
| POST | `/api/check-ins/station` | Public + OTP | Self-scan after phone verify |

Branch scope: reuse `resolveBranchScope`. Front Desk only their branch.

---

## 8. UI (web + mobile)

### Staff / owner

- **Check in** screen: search, recent today, Scan (member QR), visit count on card  
- **Member profile:** Show QR, Regenerate, trainer, “3/5 this week”, check-in history  
- **Enroll:** optional trainer + fee  
- **Staff → Trainers:** list, add, Former chip + restore (same pattern as members)  
- **Settings:** weekly cap, week start, over-limit, absence SMS  
- **Attendance:** today’s log; later report export  
- **Station QR:** print poster (owner)

### Member (self-scan only)

- Public mobile web page after scanning station QR — not a full member portal  
- OTP + result only  

---

## 9. Execution phases (do in this order)

### Phase 0 — Decide (half day)

- Confirm gym-level cap vs plan-level (recommend gym-level first)  
- Confirm unpaid members: allow check-in or block  
- Confirm week start (Monday vs Sunday)

### Phase 1 — Trainers (smallest valuable slice)

1. Migration `Trainers` + `Members.trainer_id` + payment source  
2. Staff UI: Trainers CRUD + Former  
3. Enroll / edit: assign trainer + extra payment  
4. Show trainer on member row/profile  
5. Reports/revenue already pick up payment if `source` is included  

**Exit:** gym can register trainers and sell PT at enroll without logins.

### Phase 2 — Desk check-in (no QR yet)

1. `CheckIns` + gym attendance settings  
2. `POST /api/check-ins` by `member_id`  
3. Mobile + web Check-in hub (search + tap)  
4. Enforce daily + weekly rules  
5. Dashboard: checked in today  

**Exit:** attendance works for 100% of members (no phone QR needed).

### Phase 3 — Member QR (staff scans)

1. `pass_version` + signed token  
2. Show / print QR on member profile  
3. Check-in camera: scan member QR  
4. Regenerate pass  
5. Optional: SMS link to pass page  

**Exit:** busy desk can scan instead of typing.

### Phase 4 — Gym station QR (self-scan)

1. `station_version` on branch + print poster  
2. Public check-in page + OTP  
3. Gym toggle: enable self-scan  
4. `method = station_qr`, `checked_in_by` null  
5. Same validation as desk  

**Exit:** regulars scan the wall; desk handles the rest.

### Phase 5 — Absence SMS + reports

1. Cron + `SmsLog` type `member_absence_reminder`  
2. Attendance on Reports (counts, no-shows)  
3. i18n en/am/om for all new copy  

---

## 10. Explicitly out of this plan

- Trainer login / trainer app  
- Turnstiles, fingerprint, NFC  
- Full member mobile app (beyond pass page + station check-in)  
- Class scheduling / booking  
- New QR on every membership renew  

---

## 11. Test plan (when building)

- Unlimited gym: 7 check-ins in a week allowed  
- Cap 5: 6th visit blocked or warned per setting  
- Second check-in same day blocked  
- Expired / Former / wrong gym token rejected  
- Renew membership: **old member QR still valid**  
- Regenerate member pass: old QR fails, new works  
- Regenerate station: old poster fails, new print works  
- Self-scan OTP for unknown phone: no check-in  
- Trainer assign with fee: payment on revenue; unassign does not delete payment  
- Front Desk cannot check in other branches  

---

## 12. Suggested first sprint when you execute

**Do Phase 1 + Phase 2 only.**  
Member QR and gym QR wait until desk check-in is trusted. That matches how modern independent gyms start, and it does not block trainers or visit caps.
