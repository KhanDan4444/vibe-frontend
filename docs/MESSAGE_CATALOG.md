# Message catalog — outbound copy

> Templates the platform sends. **Channel rules:** see [`project-log.md`](./project-log.md) Decision index.  
> Member lifecycle/pass → **Telegram only**. SMS → OTP + gym license/trial.  
> Source of truth in code if this file lags: `vibe/utils/notificationSms.js`, `phoneOtp.js`, `notificationEmail.js`, `stationSelfCheckIn.js`, `telegramMemberBot.js`.

Placeholders: `{name}` `{gym}` `{plan}` `{date}` `{code}` `{otp}`.

---

## SMS

| Type | Template |
|---|---|
| Gym signup OTP | `ንቁ: Your registration code is {code}` |
| Forgot-password OTP | `ንቁ: Your password reset code is {code}` |
| Default OTP fallback | `ንቁ: Your verification code is {code}` |
| License due in 3 days | `ንቁ: Your platform license for {gym} ({plan}) ends in 3 days ({date}). Contact your administrator to renew.` |
| License expires today | `ንቁ: Your platform license for {gym} expires today. Renew now to avoid interruption.` |
| License expired | `ንቁ: Your platform license for {gym} expired on {date}. Contact your administrator to restore access.` |
| License renewed | `ንቁ: Your platform license for {gym} ({plan}) has been renewed. New term ends on {date}.` |
| Trial due in 3 days | `ንቁ: Your free trial for {gym} ends in 3 days ({date}). Contact your platform admin to subscribe and keep access.` |
| Trial ends today | `ንቁ: Your free trial for {gym} ends today. Contact your platform admin to subscribe before access is paused.` |
| Trial ended | `ንቁ: Your free trial for {gym} ended on {date}. Contact your platform admin to subscribe and restore access.` |

---

## Telegram (members / station / bot)

| Type | Template |
|---|---|
| Due soon | `Hi {name}, your membership at {gym} ends on {date}. Renew at the front desk to stay active.` |
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

## Email

| Type | Subject / gist |
|---|---|
| Password reset (email flow) | **Reset your VibeSaaS password** — link ~1 hour |
| Owner license/trial alerts | `[{gym}] …` matching expiry job body lines |
| Admin trials ending | **`[VibeSaaS] {n} free trial(s) ending this week`** |

---

*When copy changes in code, update this catalog in the same PR/session and note it in `project-log.md`.*
