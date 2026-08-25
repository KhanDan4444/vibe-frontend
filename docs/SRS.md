# Software Requirements Specification (SRS)

## Vibe — Gym Management SaaS Platform

| | |
|---|---|
| **Document version** | 1.0 |
| **Date** | July 20, 2026 |
| **Status** | Baseline |
| **Product** | Vibe (VibeSaaS) — multi-tenant gym management platform |
| **Components covered** | REST API (`vibe`), Web application (`vibe-frontend`), Mobile application (`vibe-mobile`) |

---

## Table of Contents

1. [Introduction](#1-introduction)
   1.1 Purpose
   1.2 Scope
   1.3 Definitions, Acronyms, and Abbreviations
   1.4 References
   1.5 Document Overview
2. [Overall Description](#2-overall-description)
   2.1 Product Perspective
   2.2 Product Functions
   2.3 User Classes and Characteristics
   2.4 Operating Environment
   2.5 Design and Implementation Constraints
   2.6 Assumptions and Dependencies
3. [Functional Requirements](#3-functional-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [Appendices](#7-appendices)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for **Vibe**, a multi-tenant Software-as-a-Service (SaaS) platform for managing gym businesses. It defines the system's scope, functional requirements, non-functional requirements, external interfaces, and data requirements.

The intended audience includes:

- Developers implementing and maintaining the platform
- Testers deriving test cases from requirements
- Project stakeholders evaluating delivered functionality
- Future maintainers onboarding to the system

### 1.2 Scope

**Vibe** is a platform through which:

1. A **platform operator** sells software licenses to gyms, manages the gym registry, collects license payments, and monitors platform-wide revenue.
2. **Gym owners** manage their day-to-day business: membership plans, member enrollment, renewals, payments, multiple branches, front-desk staff, reports, and automated SMS reminders to members.
3. **Front-desk staff (Help Desk)** perform daily member operations scoped to their assigned branch.

The system consists of three deliverables:

| Component | Description |
|---|---|
| **Backend API** | Node.js/Express REST API with a PostgreSQL database. Single source of truth for all business logic, authentication, authorization, multi-tenancy, and scheduled jobs. |
| **Web application** | React single-page application serving two portals: the Platform Admin console and the Gym Owner/Staff portal. Optimized for desktop use, dense tables, and exports. |
| **Mobile application** | React Native (Expo) app for gym owners and staff. Supports offline operation, English/Amharic localization, dark/light themes, and phone/tablet layouts. Platform Admin is not supported on mobile. |

**In scope:**

- Gym self-registration with phone OTP verification and SaaS plan selection
- Member lifecycle management (enroll, renew, change plan, transfer, edit, delete)
- Manual payment recording (cash, card, bank transfer) — member payments and SaaS license payments
- Multi-branch operation per gym with branch-scoped staff
- Dashboards, revenue analytics, reports with CSV/PDF export
- Automated SMS reminders for expiring memberships and gym licenses
- Subscription enforcement (active / suspended read-only / expired lockout)
- Audit logging of gym operations
- Offline-first mobile operation with a write queue and sync
- Desk check-in: staff search members and record visits (web + mobile), with optional weekly visit caps and dashboards showing who checked in today

**Out of scope (explicitly not provided):**

- Online payment gateway integration (all payments are recorded manually)
- Member-facing self-service portal or member mobile app
- Push notifications (notifications are in-app and SMS only)
- Class/session scheduling or access-control hardware integration
- QR / barcode member passes and staff scan check-in (planned later)
- Automated absence SMS based on missed visits
- Payroll or inventory management

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| **Tenant / Gym** | A customer business of the platform. All business data is partitioned by `gym_id`. |
| **Platform Admin** | The operator of the SaaS platform; manages gyms and licenses. Web only. |
| **Gym Owner** | The owner account of a gym tenant; full control over that gym's data. |
| **Help Desk (Staff)** | A front-desk employee account created by a Gym Owner, scoped to one branch. |
| **SaaS Plan** | A license tier the platform sells to gyms (e.g. Monthly Starter, Yearly Standard). |
| **Membership Plan** | A product a gym sells to its members (name, duration in months, price). |
| **Member** | An end customer of a gym (not a system user; members do not log in). |
| **Term** | A member's current paid/unpaid membership period, from start date to end date. |
| **Due soon** | A membership expiring within 7 days. |
| **Unpaid** | A member (or gym) whose current term has no recorded payment. |
| **Read-only mode** | State in which a gym with a suspended license can view but not modify data. |
| **Lockout** | State in which a gym with an expired license cannot access the portal. |
| **OTP** | One-Time Password delivered by SMS. |
| **JWT** | JSON Web Token, the authentication token format used by the API. |
| **ETB** | Ethiopian Birr, the currency used for member payments. |
| **SRS** | Software Requirements Specification. |
| **API** | Application Programming Interface. |
| **SPA** | Single-Page Application. |

### 1.4 References

- IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications* (structure baseline)
- Afro Message SMS API documentation (SMS provider)
- Repository codebases: `vibe` (API), `vibe-frontend` (web), `vibe-mobile` (mobile)

### 1.5 Document Overview

Section 2 gives a high-level description of the product, its users, and constraints. Section 3 enumerates functional requirements grouped by module, each with a unique identifier. Section 4 specifies external interfaces. Section 5 specifies non-functional requirements. Section 6 describes the data model. Section 7 contains appendices.

Requirement priority is indicated as **M** (Must have), **S** (Should have), or **C** (Could have). Unless otherwise stated, requirements are Must have.

---

## 2. Overall Description

### 2.1 Product Perspective

Vibe is a new, self-contained system. It follows a client–server architecture:

```
┌───────────────────┐      ┌───────────────────┐
│  Web app (React)  │      │ Mobile app (Expo) │
│  Admin + Gym      │      │ Gym Owner + Staff │
└─────────┬─────────┘      └─────────┬─────────┘
          │  HTTPS / JSON (REST, JWT Bearer)
          ▼                          ▼
┌─────────────────────────────────────────────┐
│        Backend API (Node.js / Express)      │
│  Auth · Tenancy · Business rules · Cron     │
└──────────┬──────────────────┬───────────────┘
           │                  │
           ▼                  ▼
   ┌──────────────┐   ┌────────────────────┐
   │  PostgreSQL  │   │ External services   │
   │   database   │   │ · Afro Message SMS  │
   └──────────────┘   │ · SMTP (email)      │
                      └────────────────────┘
```

- All business logic and authorization live in the API; clients are presentation layers.
- The API is stateless: every request is authenticated with a JWT Bearer token.
- A daily in-process scheduled job (node-cron, 00:00 UTC) maintains member/license statuses and sends SMS reminders.

### 2.2 Product Functions (summary)

1. **Platform administration** — gym registry, license enrollment/renewal/plan change, SaaS payment ledger, platform dashboards and reports, SMS audit log, owner password reset.
2. **Gym self-registration** — public signup with phone OTP and SaaS plan selection.
3. **Authentication and account management** — login, password change/reset (email link and SMS OTP flows), role-based access.
4. **Member management** — enroll (with optional photo and payment), search/filter/sort lists, renew, collect payment, change plan mid-term, transfer between branches, edit, delete.
5. **Membership plan management** — CRUD of plans (name, duration, price).
6. **Payment recording** — member payments (enroll/renew/collect/change-plan sources; cash/card/bank transfer methods) with owner-level correction/deletion.
7. **Multi-branch operation** — branch CRUD, default branch, staff and member branch assignment, branch-scoped views, branch comparison dashboard.
8. **Team management** — Help Desk staff account CRUD, enable/disable, branch reassignment, password reset.
9. **Dashboards and analytics** — status counts, monthly income with trend, revenue charts, needs-attention lists, unpaid tracking.
10. **Reports and exports** — member and revenue reports with CSV and PDF export.
11. **Notifications** — in-app notification inbox; automated SMS reminders to members (due soon / expires today / expired) and to gyms (license reminders); SMS logs.
12. **Audit logging** — recorded actions across members, payments, plans, staff, and branches, filterable by actor and branch.
13. **Subscription enforcement** — active / suspended (read-only) / expired (lockout) license states enforced server-side and reflected in both clients.
14. **Offline operation** — cached reads and a queued-write sync mechanism on mobile and in the web gym portal (PWA service worker + IndexedDB).
15. **Personalization** — dark/light theme and English/Amharic language selection.

### 2.3 User Classes and Characteristics

| User class | Description | Technical level | Frequency | Client |
|---|---|---|---|---|
| **Platform Admin** | Operates the SaaS business; onboards gyms, manages licenses and platform revenue. | Comfortable with dense admin tooling | Daily | Web only |
| **Gym Owner** | Runs one gym (possibly multiple branches); needs full visibility and control, reports, and staff management. | Moderate; may prefer mobile | Daily | Web + Mobile |
| **Help Desk (Staff)** | Front-desk employee; enrolls members, collects payments, renews memberships at one branch. | Basic; task-focused UI required | Daily, high volume | Web + Mobile |
| **Gym Member** | The gym's end customer. **Not a system user** — interacts only by receiving SMS reminders. | N/A | N/A | None |

### 2.4 Operating Environment

| Component | Environment |
|---|---|
| Backend API | Node.js (v16+; developed on v22), Express 5, PostgreSQL. Deployable to Railway/Render or any Node + Postgres host. |
| Web app | Modern evergreen browsers (Chrome, Firefox, Safari, Edge). React 19 + Vite SPA; deployable to static hosting (Vercel). |
| Mobile app | Android and iOS via Expo SDK 54 / React Native 0.81. Phones and tablets (portrait-first; tablet ≥600 dp gets adapted layouts). Built with EAS. |
| External services | Afro Message (SMS), SMTP server (password-reset email). Both degrade to console logging in development when unconfigured. |

### 2.5 Design and Implementation Constraints

- **C-1** All persistent data must reside in a single PostgreSQL database; tenancy is enforced by a `gym_id` column on business tables, not by separate schemas/databases.
- **C-2** Authentication must use stateless JWT Bearer tokens; no server-side sessions.
- **C-3** Payments are recorded manually; the system must not depend on any payment gateway.
- **C-4** SMS delivery depends on the Afro Message service; the system must function (minus SMS) when the provider is unconfigured or unavailable.
- **C-5** Scheduled work runs in-process via node-cron; no external queue/worker infrastructure is assumed.
- **C-6** Member payment amounts are denominated in ETB.
- **C-7** The mobile app must not offer Platform Admin functionality.
- **C-8** Photo upload/change requires network connectivity (excluded from the offline write queues on both mobile and web).
- **C-9** Web client is JavaScript (React 19, Vite, Tailwind CSS 4); mobile client is TypeScript (Expo Router); backend is JavaScript (Express 5, Zod validation).

### 2.6 Assumptions and Dependencies

- **A-1** Gyms and members have Ethiopian phone numbers reachable by the SMS provider.
- **A-2** Gym staff devices have intermittent but generally available internet; the offline queues (mobile and web gym portal) cover short outages, not permanently disconnected operation.
- **A-3** The platform operator handles license payment collection out-of-band (cash/bank) and records it in the system.
- **A-4** One owner account exists per gym.
- **A-5** Amharic and English cover the target user base's language needs.

---

## 3. Functional Requirements

Requirements are grouped by module. Identifier format: `FR-<MODULE>-<n>`.

### 3.1 Authentication & Account (FR-AUTH)

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-1 | The system shall authenticate users by email **or** username (case-insensitive) plus password, returning a signed JWT on success. | M |
| FR-AUTH-2 | The system shall support a "remember me" option: token lifetime 30 days when selected, 1 day otherwise. | M |
| FR-AUTH-3 | The system shall store passwords hashed with bcrypt (salt rounds ≥ 10); plaintext passwords shall never be persisted or logged. | M |
| FR-AUTH-4 | The system shall invalidate all previously issued tokens for a user when their password changes (password-change timestamp embedded in and revalidated against the token). | M |
| FR-AUTH-5 | The system shall revalidate the user's existence, active flag, role, and gym on every authenticated request; disabled users shall receive 403. | M |
| FR-AUTH-6 | The system shall provide an authenticated change-password operation requiring the current password. | M |
| FR-AUTH-7 | The system shall provide password reset via emailed token link. | S |
| FR-AUTH-8 | The system shall provide owner password reset via SMS OTP sent to the gym's registered phone (request OTP → verify → set new password). | M |
| FR-AUTH-9 | The Platform Admin shall be able to reset a gym owner's password from the gym detail view. | M |
| FR-AUTH-10 | The mobile app shall reject Platform Admin logins with a message directing them to the web dashboard. | M |
| FR-AUTH-11 | The system shall rate-limit login, OTP, signup, and password-reset endpoints, plus a global API rate limit. | M |
| FR-AUTH-12 | The mobile app shall store the session token in secure device storage (Expo SecureStore); the web app shall store it in localStorage (remember me) or sessionStorage. | M |

### 3.2 Gym Self-Registration (FR-REG)

| ID | Requirement | Priority |
|---|---|---|
| FR-REG-1 | The system shall expose a public catalog of active SaaS plans for signup. | M |
| FR-REG-2 | A prospective owner shall register a gym by: requesting an SMS OTP to their phone, verifying the OTP, then submitting gym name, owner details, username/password, and a selected SaaS plan. | M |
| FR-REG-3 | Successful signup shall create the gym, its owner account, a default "Main" branch, and a license term for the chosen plan; the initial term may be unpaid. | M |
| FR-REG-4 | Signup shall be available from both the web and the mobile app. | M |
| FR-REG-5 | Platform-side gym enrollment (admin creates gym + owner, optionally recording payment) shall also be supported. | M |

### 3.3 Roles & Authorization (FR-ROLE)

| ID | Requirement | Priority |
|---|---|---|
| FR-ROLE-1 | The system shall support exactly three active roles: **Platform Admin**, **Gym Owner**, and **Help Desk** (staff). | M |
| FR-ROLE-2 | Platform Admin shall have no gym affiliation and access only platform-scope endpoints (`/api/admin/*`), with cross-tenant visibility. | M |
| FR-ROLE-3 | Gym Owner shall access all data of exactly one gym, across all branches, including owner-only functions: plan mutations, payment edit/delete, member delete/transfer, gym profile, team, branches, activity log, member SMS log, branch comparison. | M |
| FR-ROLE-4 | Help Desk staff shall be bound to one branch of one gym; all reads and writes shall be scoped to that branch. Staff shall be able to enroll, renew, change plan, collect payments, and update members, and to view plans, dashboard, reports, and payments. | M |
| FR-ROLE-5 | Staff without an assigned branch, or assigned to a deactivated branch, shall be denied login/API access. | M |
| FR-ROLE-6 | Authorization shall be enforced server-side on every endpoint; client-side hiding of functions is a usability aid only. | M |

### 3.4 Membership Plans (FR-PLAN)

| ID | Requirement | Priority |
|---|---|---|
| FR-PLAN-1 | A Gym Owner shall create, update, and delete membership plans with name, duration (months), and price (ETB). | M |
| FR-PLAN-2 | Plan lists shall display the count of active members currently on each plan. | M |
| FR-PLAN-3 | Staff shall have read-only access to plans. | M |
| FR-PLAN-4 | Plan mutations shall require an active gym license. | M |

### 3.5 Member Management (FR-MEM)

| ID | Requirement | Priority |
|---|---|---|
| FR-MEM-1 | Users shall enroll a member with name, phone, plan, start date, branch (owner-selectable when multi-branch; staff fixed to own branch), optional photo, and either an initial payment (amount, date, method) or an explicit "skip payment" leaving the term unpaid. | M |
| FR-MEM-2 | The system shall compute the member's end date automatically from the plan duration and start date. | M |
| FR-MEM-3 | The system shall derive member status: **active**, **due soon** (≤ 7 days to expiry), **expired**; and track **unpaid** (current term has no payment) independently. Dashboard Needs attention shall surface due-soon members with ≤ 3 days remaining. Renew shall be available on the membership end date or after expiry. | M |
| FR-MEM-4 | Member lists shall support text search, status filters (all/active/unpaid/due soon/expired), sorting, and pagination (infinite scroll on mobile). | M |
| FR-MEM-5 | Member detail shall show photo, current status, plan, term dates, branch, and full payment history. | M |
| FR-MEM-6 | Users shall renew a member (new term with plan, start date, payment amount/date/method). | M |
| FR-MEM-7 | Users shall collect a payment against an unpaid current term. | M |
| FR-MEM-8 | Users shall change a member's plan mid-term; the system shall present a payment summary with a suggested amount reflecting credit for the unused portion of the current term, and allow an optional custom term start. | M |
| FR-MEM-9 | A Gym Owner shall transfer a member between branches. | M |
| FR-MEM-10 | Users shall edit member name, phone, and photo; owners may additionally change the member's branch. | M |
| FR-MEM-11 | Only a Gym Owner shall delete a member; deletion shall require confirmation. | M |
| FR-MEM-12 | Member photos shall be compressed client-side before upload and cached on device for display. | S |

### 3.6 Payments — Member Revenue (FR-PAY)

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-1 | Every recorded payment shall capture member, amount, date, method, and source (`enroll`, `collect`, `renew`, `change_plan`). | M |
| FR-PAY-2 | Supported payment methods shall include Cash, Card, and Bank Transfer (Cash default). | M |
| FR-PAY-3 | The revenue view shall list payments with period presets (this month, last month, last 30 days, all time, custom range), method filter, search, sort, and totals per method. | M |
| FR-PAY-4 | The revenue view shall surface unpaid members needing attention with a shortcut to collect payment. | M |
| FR-PAY-5 | The revenue view shall show the month-over-month revenue trend percentage. | M |
| FR-PAY-6 | Only a Gym Owner shall edit (amount/date/method) or delete a payment record. | M |
| FR-PAY-7 | The revenue list shall be exportable to CSV (web download; mobile share sheet). | M |

### 3.7 Branch Management (FR-BR)

| ID | Requirement | Priority |
|---|---|---|
| FR-BR-1 | Each gym shall have at least one branch; a default "Main" branch is created with the gym and cannot be deactivated while default. | M |
| FR-BR-2 | A Gym Owner shall create and edit branches (name, phone, address), set the default branch, and activate/deactivate branches. | M |
| FR-BR-3 | Branch lists shall show per-branch member and staff counts, and default/inactive badges. | M |
| FR-BR-4 | When deactivating a branch, the owner shall be able to reassign that branch's active staff to another branch in one operation. | M |
| FR-BR-5 | Owners shall be able to scope any list/dashboard to one branch or all branches; the selection shall persist per gym. Staff shall always see only their own branch. | M |
| FR-BR-6 | An owner dashboard shall provide a per-branch comparison of key metrics. | S |

### 3.8 Team Management (FR-TEAM)

| ID | Requirement | Priority |
|---|---|---|
| FR-TEAM-1 | A Gym Owner shall create staff accounts with name, username, password, optional email, role (Help Desk), and branch assignment. | M |
| FR-TEAM-2 | A Gym Owner shall edit staff details, reassign branch, reset passwords, and enable/disable accounts. | M |
| FR-TEAM-3 | Disabling a staff account shall immediately block its API access. | M |

### 3.9 Dashboards & Notifications (FR-DASH)

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-1 | The gym dashboard shall show member status counts (active, due soon, expired, unpaid), monthly income with month-over-month trend, total and new-this-month member counts. | M |
| FR-DASH-2 | Status stat cards shall navigate to the member list pre-filtered by that status. | M |
| FR-DASH-3 | Owners shall see a revenue chart of daily collections for the current month (mobile: line chart; web: area chart). | M |
| FR-DASH-4 | The dashboard shall show a "needs attention" list (due soon / expired / unpaid members) with one-tap renew/collect actions; when empty on tablet/desktop it shall be visually de-emphasized or hidden. | M |
| FR-DASH-5 | The system shall provide an in-app notification inbox (bell with unread badge) fed by dashboard alerts (due soon, expired, unpaid), supporting mark-read, mark-all-read, and dismiss, with deep links to renew/collect screens. Read/dismiss state persists per user on device. | M |
| FR-DASH-6 | All primary list/dashboard screens on mobile shall support pull-to-refresh. | M |

### 3.10 Reports & Exports (FR-RPT)

| ID | Requirement | Priority |
|---|---|---|
| FR-RPT-1 | The system shall produce a member report (full member list with status/plan breakdowns and charts) filterable by period and branch. | M |
| FR-RPT-2 | The system shall produce a revenue report (payment lines and summaries by method, member, and date) filterable by period and branch. | M |
| FR-RPT-3 | Reports shall be exportable as CSV and PDF: members-only, revenue-only, or a combined full report. Web downloads files; mobile uses print-to-PDF and the native share sheet. | M |
| FR-RPT-4 | Platform Admin shall have equivalent cross-gym reports (gym registry, platform revenue) with CSV/PDF export. | M |

### 3.11 SMS & Messaging (FR-SMS)

| ID | Requirement | Priority |
|---|---|---|
| FR-SMS-1 | The system shall send automated SMS to members: due-soon reminder, expires-today notice, and expired notice, via the Afro Message provider. | M |
| FR-SMS-2 | The system shall send automated SMS to gym contacts about their license: due in 3 days, expires today, expired. | M |
| FR-SMS-3 | SMS sending shall be deduplicated so a given notice type is sent at most once per day per recipient (unique daily log index). | M |
| FR-SMS-4 | OTP SMS shall support gym signup verification and owner password reset. | M |
| FR-SMS-5 | Gym Owners shall have a read-only log of member SMS sent for their gym, with links to the member. | M |
| FR-SMS-6 | Platform Admin shall have a read-only log of platform SMS (license reminders, OTPs) filterable by type and gym. | M |
| FR-SMS-7 | When the SMS provider is unconfigured, messages shall be logged to console instead of failing operations. | M |

### 3.12 Audit Logging (FR-AUD)

| ID | Requirement | Priority |
|---|---|---|
| FR-AUD-1 | The system shall record an audit entry for significant gym actions (member create/update/delete, payments, renewals, plan changes, staff and branch changes) including actor, action, and branch where applicable. | M |
| FR-AUD-2 | A Gym Owner shall view a paginated activity log filterable by actor type (owner/staff/all) and branch. | M |

### 3.13 Platform Administration (FR-ADM)

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-1 | Platform Admin shall view a platform dashboard: active/suspended/expired gym counts, unpaid gyms, SaaS revenue and estimated MRR, new gyms, due-soon licenses, and top gyms by members. | M |
| FR-ADM-2 | Platform Admin shall manage the gym registry: search, filter by status (all/active/unpaid/due soon/expired), sort, paginate; view gym detail; edit gym profile; delete a gym (cascades all tenant data). | M |
| FR-ADM-3 | Platform Admin shall enroll a gym (create gym + owner, optionally with initial license payment). | M |
| FR-ADM-4 | Platform Admin shall renew a gym's license and change its SaaS plan, with proration credit hints for unused term. | M |
| FR-ADM-5 | Platform Admin shall manage the SaaS plan catalog (create/edit/delete); deleting a plan with subscribed gyms shall be blocked. | M |
| FR-ADM-6 | Platform Admin shall manage the SaaS payment ledger: record, edit, and revoke license payments, filter by period/method/gym, export CSV. | M |
| FR-ADM-7 | Platform Admin shall set a gym's subscription status directly (active/suspended/expired). | M |

### 3.14 Subscription Enforcement (FR-SUB)

| ID | Requirement | Priority |
|---|---|---|
| FR-SUB-1 | Gym license states shall be: **active** (full read/write), **suspended** (read-only: all writes rejected with a distinct error code), **expired** (lockout: portal access denied except the subscription-status endpoint). | M |
| FR-SUB-2 | A daily scheduled job shall automatically expire licenses whose term end date has passed, and synchronize member statuses. The job also runs once at API startup. | M |
| FR-SUB-3 | Clients shall reflect these states: read-only banners with disabled mutations when suspended; a full-screen lockout when expired. | M |
| FR-SUB-4 | Platform Admin operations shall bypass gym subscription guards. | M |

### 3.15 Offline Operation (FR-OFF)

#### Mobile app

| ID | Requirement | Priority |
|---|---|---|
| FR-OFF-1 | The mobile app shall cache primary read data (dashboard, members, payments, plans, branches, team, activity, SMS log, profile) on device for up to 7 days, and serve it while offline. | M |
| FR-OFF-2 | While offline, the app shall queue write operations — enroll, renew, collect payment, change plan, transfer, update member, plan create/update, branch create/update, profile update — and indicate their pending state. | M |
| FR-OFF-3 | Queued writes shall sync automatically on reconnect, with manual "sync now" and "discard failed" controls; failed jobs retry with backoff up to 5 attempts. | M |
| FR-OFF-4 | Operations requiring photo upload shall be blocked while offline with a clear message. | M |
| FR-OFF-5 | The app shall display a persistent offline indicator and a sync-progress UI. | M |

#### Web application (gym portal only)

| ID | Requirement | Priority |
|---|---|---|
| FR-OFF-6 | The web app shall cache the application shell via a service worker so the gym portal loads without network connectivity for an authenticated user. | M |
| FR-OFF-7 | The web app shall cache successful JSON GET responses per user in browser storage (IndexedDB, 7-day validity) and serve them when the network is unavailable, with an offline banner indicating saved data is shown. | M |
| FR-OFF-8 | While offline, the web app shall queue allowlisted gym-portal mutations — enroll, create/update member, renew, change plan, transfer, collect payment, plan create/update, branch create/update — in IndexedDB and acknowledge them as "saved offline". Destructive operations (deletes, payment corrections) and photo uploads shall not be queued. | M |
| FR-OFF-9 | Queued web writes shall replay in order on reconnect using the current session token, with automatic periodic retry, a manual "sync now" control, per-job and bulk discard of failed jobs, and up to 5 attempts for server errors; business rejections (validation, read-only) mark the job failed immediately with the server's reason. | M |
| FR-OFF-10 | The web offline cache shall be scoped per user, cleared on logout, and the write queue shall replay only for the same logged-in user; concurrent replay from multiple browser tabs shall be prevented (web lock). | M |
| FR-OFF-11 | After a successful queue sync, the web app shall automatically refresh dashboard and list data. | M |
| FR-OFF-12 | The platform admin console remains online-only. | M |

### 3.16 Personalization & Localization (FR-PERS)

| ID | Requirement | Priority |
|---|---|---|
| FR-PERS-1 | Users shall toggle between dark and light themes; the choice persists across sessions (mobile defaults to dark; system chrome follows theme). | M |
| FR-PERS-2 | Users shall switch the interface language between English and Amharic; the choice persists. On first launch the mobile app defaults to Amharic when the device locale is Amharic. | M |
| FR-PERS-3 | Amharic text shall render with an appropriate Ethiopic font (Noto Sans Ethiopic). | M |
| FR-PERS-4 | A Gym Owner shall edit the gym profile: gym name, owner name, phone, email, username. | M |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

- **UI-1 Web:** Responsive SPA with two shells — Platform Admin console and Gym portal. Dense data tables with filter chips, sort dropdowns, search, pagination, modal/drawer forms, confirmation dialogs, flash banners, and skeleton loading states.
- **UI-2 Mobile:** Tab-based navigation (Dashboard, Members, Revenue, Plans, More) with stack screens for forms and detail views. Bottom sheets for filters/notifications, floating action buttons for creation, swipe between tabs, pull-to-refresh.
- **UI-3 Tablet:** At widths ≥ 600 dp the mobile app applies tablet layouts: constrained content width, adapted grids/columns, larger charts and touch targets.
- **UI-4** Both clients shall present read-only and lockout subscription states clearly (banners / blocking screens).
- **UI-5** All destructive actions (delete member, delete plan, revoke payment, disable staff, delete gym) require an explicit confirmation dialog.

### 4.2 Software Interfaces

- **SI-1 REST API:** JSON over HTTP(S) under `/api/*`; authentication via `Authorization: Bearer <JWT>`; errors returned as JSON with machine-readable codes (e.g. `SUBSCRIPTION_READ_ONLY`, `SUBSCRIPTION_EXPIRED`). A health endpoint (`/api/health`) reports API + database status.
- **SI-2 PostgreSQL:** Accessed exclusively by the API via the `pg` driver; connection by `DATABASE_URL` or discrete host credentials; TLS optional.
- **SI-3 Afro Message SMS:** Outbound HTTP API for OTP and reminder SMS; failures must not abort the triggering business operation.
- **SI-4 SMTP:** Outbound email for password-reset links via Nodemailer.

### 4.3 Communications Interfaces

- **CI-1** All client–server communication shall use HTTPS in production.
- **CI-2** CORS shall restrict browser origins to an allowlist.
- **CI-3** File-like payloads (member photos) are transmitted as compressed data URLs / multipart form data.

### 4.4 Hardware Interfaces

- **HI-1** Mobile: device camera / photo library (member photos), secure keystore (token storage), network state detection. No dedicated gym hardware (turnstiles, scanners) is interfaced.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **NFR-PERF-1** Typical API list endpoints shall respond within 1 second under normal load; dashboard aggregate endpoints within 2 seconds.
- **NFR-PERF-2** All unbounded lists (members, payments, gyms, audit, SMS logs) shall be paginated server-side.
- **NFR-PERF-3** Member photos shall be client-compressed before upload to limit payload size and stay responsive on mobile networks.
- **NFR-PERF-4** The mobile app shall render cached data immediately on launch (before network revalidation).

### 5.2 Security

- **NFR-SEC-1** Passwords hashed with bcrypt (≥ 10 rounds); no plaintext storage or logging.
- **NFR-SEC-2** JWT tokens signed server-side; role, gym, branch, and password-stamp claims revalidated against the database on every request.
- **NFR-SEC-3** Tenant isolation: every gym-scope query is filtered by the authenticated user's `gym_id`; staff queries additionally by `branch_id`. Cross-tenant access is only possible through Platform Admin endpoints.
- **NFR-SEC-4** Rate limiting on authentication/OTP endpoints and globally (~300 requests / 15 min / client) to resist brute force and abuse.
- **NFR-SEC-5** Security headers via Helmet; CORS origin allowlist; all inputs validated with Zod schemas.
- **NFR-SEC-6** OTP codes are time-limited and single-use; SMS OTP endpoints are rate-limited.
- **NFR-SEC-7** Mobile session tokens stored in platform secure storage (Keychain/Keystore).
- **NFR-SEC-8** Admin bootstrap endpoint is protected by a setup secret and disabled in production.

### 5.3 Reliability & Availability

- **NFR-REL-1** Failure of external services (SMS, SMTP) shall not fail core business transactions; sends degrade to logged no-ops.
- **NFR-REL-2** The daily expiry job shall be idempotent and shall also run at startup, so missed schedules self-heal on restart.
- **NFR-REL-3** SMS dedup constraints shall prevent duplicate daily reminders even across job re-runs.
- **NFR-REL-4** The offline write queue shall persist across app restarts and survive intermittent connectivity, with capped retries and user-visible failure handling.
- **NFR-REL-5** Database schema changes shall be applied through ordered, repeatable migrations.

### 5.4 Usability

- **NFR-USE-1** The UI shall be fully usable in English and Amharic; all user-facing strings are externalized for translation.
- **NFR-USE-2** Status semantics use consistent color coding across clients (active=green, due soon=amber, expired=red, unpaid=orange).
- **NFR-USE-3** Frequent front-desk tasks (enroll, renew, collect payment) shall be reachable within two taps/clicks from the dashboard or member list.
- **NFR-USE-4** Touch targets on mobile shall be at least 44×44 pt; forms shall scroll clear of the on-screen keyboard.
- **NFR-USE-5** Empty, loading, and error states shall be explicit (skeletons, retry buttons, empty-state text) rather than blank screens.

### 5.5 Maintainability

- **NFR-MNT-1** Business rules live only in the API; clients shall not duplicate authorization or pricing logic beyond display hints.
- **NFR-MNT-2** Code organization: API routes per domain module; clients organized by screen/page with shared component and API-client layers.
- **NFR-MNT-3** Configuration via environment variables (`DATABASE_URL`, JWT secret, SMS token, SMTP, CORS origins, `VITE_API_URL` / mobile API URL); no environment-specific values hardcoded.
- **NFR-MNT-4** Web unit tests run under Vitest; API provides a smoke-test script.

### 5.6 Portability

- **NFR-PORT-1** API deployable to any Node.js + PostgreSQL host (configs included for Railway and Render).
- **NFR-PORT-2** Web app deployable as static assets to any SPA host (Vercel config included).
- **NFR-PORT-3** Mobile app builds for Android and iOS from a single codebase via Expo/EAS.

### 5.7 Data Integrity

- **NFR-DATA-1** Deleting a gym shall cascade-delete all tenant data (users, branches, plans, members, payments, logs).
- **NFR-DATA-2** Referential integrity between members↔plans/branches, payments↔members, subscriptions↔SaaS plans is enforced by foreign keys.
- **NFR-DATA-3** Monetary values shall be stored and computed with appropriate numeric precision (no floating-point currency drift in stored data).

---

## 6. Data Requirements

### 6.1 Logical Data Model

```
Gyms 1──* Users            (owner + staff; Platform Admin has gym_id NULL)
Gyms 1──* Branches         (one default "Main" per gym)
Gyms 1──* Plans            (membership products: name, duration months, price)
Gyms 1──* Members          (→ Plans, → Branches; name, phone, photo, term dates)
Gyms 1──* Payments         (→ Members; amount, date, method, source)
Gyms 1──1 GymSubscriptions (→ SaaSPlans; license term start/end)
Gyms 1──* SaaSPayments     (→ SaaSPlans; platform revenue)
Gyms 1──* AuditLogs        (actor, action, optional branch)
Users 1──* PasswordResetTokens
PhoneOtpSessions           (signup / password-reset OTPs)
SmsLog                     (all outbound SMS; unique daily dedup index)
```

### 6.2 Key Entities

| Entity | Purpose | Notable attributes |
|---|---|---|
| **Gyms** | Tenant record | name, phone, `subscription_status` (active/suspended/expired) |
| **Users** | Login accounts | role, gym_id, branch_id (staff), is_active, password hash, password_changed_at |
| **Branches** | Gym locations | name, phone, address, is_default, is_active |
| **Plans** | Membership products | name, duration (months), price (ETB) |
| **Members** | Gym customers | name, phone, plan_id, branch_id, start/end dates, photo |
| **Payments** | Member revenue | member_id, amount, date, method, source |
| **SaaSPlans** | License tiers | name, duration, price |
| **GymSubscriptions** | Current license term | gym_id, saas_plan_id, start/end date |
| **SaaSPayments** | Platform revenue | gym_id, plan, amount, date, method |
| **AuditLogs** | Gym activity trail | actor, action, entity, branch, timestamp |
| **SmsLog** | SMS audit + dedup | recipient, type, gym/member link, sent date |

### 6.3 Data Retention

- Mobile read cache: 7 days.
- Audit and SMS logs: retained indefinitely (no automatic purge specified).
- Password reset tokens and OTP sessions: time-limited validity, single use.

---

## 7. Appendices

### 7.1 Derived Status Rules

| Status | Rule |
|---|---|
| Member **active** | Current date < end date − 7 days |
| Member **due soon** | End date within 7 days |
| Member **expired** | Current date > end date |
| Member **unpaid** | Current term has no payment record |
| Dashboard attention (due soon) | End date within 3 days (subset of due soon) |
| Member renew | Allowed on end date or after expiry |
| Gym **unpaid** | Current license term has no SaaS payment |
| Gym **suspended** | Set by admin or business rule → read-only mode |
| Gym **expired** | License end date passed (auto by daily job) → lockout |

### 7.2 Client Feature Matrix

| Capability | Web (Admin) | Web (Gym) | Mobile (Gym) |
|---|---|---|---|
| Platform gym registry / licenses / SaaS revenue | ✔ | — | — |
| Dashboard, members, payments, plans, reports | — | ✔ | ✔ |
| Team, branches, activity, SMS logs (owner) | — | ✔ | ✔ |
| CSV export | ✔ | ✔ | ✔ (share) |
| PDF export | ✔ | ✔ | ✔ (print/share) |
| Offline operation (cached reads + queued writes) | — | ✔ | ✔ |
| Dark/light theme, EN/AM | ✔ | ✔ | ✔ |
| Gym self-registration | public route | public route | ✔ |

### 7.3 Scheduled Jobs

| Job | Schedule | Actions |
|---|---|---|
| Expiry check | Daily 00:00 UTC + on API startup | Sync member statuses; expire members and gym licenses past end date; send due-soon / expires-today / expired SMS to members and gyms (deduplicated daily) |

### 7.4 Error Codes (representative)

| Code | Meaning |
|---|---|
| `SUBSCRIPTION_READ_ONLY` | Write rejected: gym license suspended |
| `SUBSCRIPTION_EXPIRED` | Access denied: gym license expired |
| 401 | Missing/invalid/expired token (clients force logout) |
| 403 | Role/branch/disabled-account authorization failure |

---

*End of document.*
