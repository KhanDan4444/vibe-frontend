# Message catalog — outbound copy

> Templates the platform sends. **Channel rules:** see [`project-log.md`](./project-log.md) Decision index.  
> Member lifecycle/pass → **Telegram only**. Gym license/trial → **Telegram** (owner must link). SMS → **OTP only**.  
> Product brand in email subjects: **Niku**. SMS prefix: **ንቁ**.  
> Source of truth in code if this file lags: `vibe/utils/notificationSms.js`, `phoneOtp.js`, `notificationEmail.js`, `stationSelfCheckIn.js`, `telegramMemberBot.js`.

Placeholders: `{name}` `{gym}` `{plan}` `{date}` `{code}` `{otp}`.

---

## SMS (OTP only)

| Type | Template |
|---|---|
| Gym signup OTP | `ንቁ: Your registration code is {code}` |
| Forgot-password OTP | `ንቁ: Your password reset code is {code}` |
| Default OTP fallback | `ንቁ: Your verification code is {code}` |

---

## Telegram (members / station / bot)

| Type | Template |
|---|---|
| Due soon | `Hi {name}, your membership at {gym} ends on {date}.` |
| Expires today | `Hi {name}, your membership at {gym} expires today. Renew at the front desk to stay active.` |
| Expired | `Hi {name}, your membership at {gym} has expired. Contact the gym to renew.` |
| Renewed | `Hi {name}, your membership at {gym} has been renewed. New term ends on {date}. Thank you!` (+ optional pass button) |
| Enrolled | `Hi {name}, welcome to {gym}. Your {plan} membership plan is active until {date}. We are glad to have you!` (+ optional pass) |
| Telegram linked | `Hi {name}, Welcome! You are linked to {gym}. You will get your pass links and renewal reminders here. Your {plan} membership plan is active until {date}. We are glad to have you!` (+ optional pass) |
| Pass link | `Hi {name},\n\nHere is your check-in pass:` (+ Open check-in pass) |
| Station OTP | `Your {gym} check-in code: {otp}\n\nValid for 10 minutes.` |
| Bot `/start` (no token) | Welcome + open personal link / scan QR |
| Bot `/help`, `/status`, errors, `/stop` | Fixed replies in `telegramMemberBot.js` / `routes/telegram.js` |

---

## Telegram (gym owner — license / trial)

| Type | Template |
|---|---|
| Gym Telegram linked | `Linked to {gym}. You will get platform license and trial reminders here.` |
| License due in 3 days | `Your platform license for {gym} ({plan}) ends in 3 days ({date}). Contact your administrator to renew.` |
| License expires today | `Your platform license for {gym} expires today. Renew now to avoid interruption.` |
| License expired | `Your platform license for {gym} expired on {date}. Contact your administrator to restore access.` |
| License renewed | `Your platform license for {gym} ({plan}) has been renewed. New term ends on {date}.` |
| Trial due in 3 days | `Your free trial for {gym} ends in 3 days ({date}). Contact your platform admin to subscribe and keep access.` |
| Trial ends today | `Your free trial for {gym} ends today. Contact your platform admin to subscribe before access is paused.` |
| Trial ended | `Your free trial for {gym} ended on {date}. Contact your platform admin to subscribe and restore access.` |

---

## Email (optional SMTP backup)

| Type | Subject / gist |
|---|---|
| Owner license/trial alerts | `[{gym}] …` matching expiry job body lines |
| Admin trials ending | **`[Niku] {n} free trial(s) ending this week`** |
| Admin license alert | **`[Niku] {subject}`** |

Password reset is **SMS OTP only** (no email reset link).

---

*When copy changes in code, update this catalog in the same PR/session and note it in `project-log.md`.*
