# LifeHub Requirements

## Purpose and status

This document translates the supplied LifeHub Technical Design Document into traceable product requirements. The design document is authoritative for the intended product; its technology choices are proposals, not proof of implementation or a commitment to deliver every module in the first release. Requirements below are source-derived unless explicitly marked as a planning assumption.

## Problem and intended users

The source identifies fragmented single-purpose tools, context switching, isolated data, and connectivity-dependent logging as the problem. Intended users are people seeking consolidated personal productivity and wellness tracking, including students, working professionals, and quantified-self enthusiasts. The primary product is a native-feeling iOS/Android mobile app using one cross-platform codebase. A web dashboard is future/stretch scope.

## Source-derived functional requirements

| ID | Requirement | MVP Status | Acceptance evidence |
|---|---|---|---|
| FR-01 | Users can create, edit, delete, categorize, and view finance transactions. | **MVP Core** | CRUD flow persists and displays transactions. |
| FR-02 | Users can define month-specific total budgets and optional category limits. | **MVP Core** | Budget is editable for a selected month and category limits are visible. |
| FR-03 | Finance summary distinguishes total budget, fixed/committed payments, actual spent, actual usable budget, and remaining budget. Formulas: Usable = Total Budget minus Fixed Committed; Remaining = Usable minus Eligible Actual Discretionary Spending. Rule: Actual transactions linked to a committed payment or Autopay schedule must NOT be deducted again when calculating remaining budget. | **MVP Core** | Values are separately labeled and computed without double-counting; verified by unit tests with both paid/unpaid committed schedules. |
| FR-04 | Users can maintain recurring fixed-payment definitions, amounts, category, due date/rule, optional payment method, and active state; future schedules can change without rewriting history. | **Deferred** (Post-MVP Stage 3) | Editing future schedule leaves historical payment/transaction records intact. |
| FR-05 | Autopay schedules can be tracked with expected date/amount, recurrence, and optional method/reference. Autopay is strictly planning, tracking, reminders, and manual reconciliation only; it NEVER initiates bank charges or fund transfers. | **Deferred** (Post-MVP Stage 3) | Upcoming schedule appears; no bank transaction is initiated. |
| FR-06 | Finance due dates and Autopay occurrences link to calendar records, reminders, and related finance records; completion/reconciliation updates status. | **Deferred** (Post-MVP Stage 3) | Stable link exists and repeated generation does not duplicate events. |
| FR-07 | Users can create manual trackable events with title, date/time, optional end/duration, category, optional location/notes, recurrence, reminder, and status. Events can be created offline first. | **MVP Core** | Manual event can be created, edited, completed, and displayed offline. |
| FR-08 | Habits support completion tracking, streaks/heatmaps, and optional stopwatch/countdown sessions with start/pause/resume/stop/reset. | **MVP Core** | Timed session is associated with a habit and persisted. |
| FR-09 | Timed sessions retain timestamps and elapsed duration so analytics remain correct after app backgrounding. | **MVP Core** | Reopening a running timer calculates duration from timestamps (`Date.now() - startedAt`). |
| FR-10 | Fitness/nutrition logs support workouts and meals; camera-recognized food, portions, and nutrition values are adjustable and must be confirmed before committing. | **Deferred** (Post-MVP Stage 3/4) | Candidate meal is editable and requires explicit confirmation. |
| FR-11 | Water intake supports quick-add/custom amounts, a daily target/progress, configurable reminders, and offline-first entries. | **Deferred** (Post-MVP Stage 3) | Water entry and daily progress remain available offline. |
| FR-12 | Journal/notes support rich-text entries, tags, chronological and tag-based retrieval. Bookmarks support categories and one-tap links. | **Deferred** (Post-MVP Stage 3) | Entries and links can be organized and retrieved. |
| FR-13 | Encrypted notes encrypt on-device using AES-256-GCM with a passphrase-derived key and device secure storage; server stores ciphertext only. No recovery, sharing, or server full-text search in current design. | **Deferred** (Post-MVP Stage 4) | Security design review verifies keys/plaintext are not sent to or stored by the server. |
| FR-14 | Phone-usage view shows total usage, app breakdowns, categories/trends, and optional goals only where OS permissions/APIs allow. | **Deferred** (Post-MVP Stage 4) | Permission-denied/unavailable states are clear; no unsupported values are fabricated. |
| FR-15 | Wearable/health integration can import steps, heart rate, workouts, active energy, and sleep via supported APIs, with background sync. | **Deferred** (Post-MVP Stage 4) | Supported metric is permissioned, sourced, and sync status is visible. |
| FR-16 | Gmail/Outlook read-only integration identifies candidate event details and proposes calendar entries for user confirmation. Users can revoke access; cached tokens are deleted. | **Deferred** (Post-MVP Stage 4) | No event is added without confirmation; revocation halts access and removes cached credentials. |
| FR-17 | Core logging works offline; local changes synchronize opportunistically when connectivity returns. | **MVP Core (Local Offline)**; Sync Deferred | Create/update while offline works reliably in SQLite; remote sync protocol deferred. |
| FR-18 | Modules communicate through defined interfaces/domain events rather than direct cross-module database access. | **MVP Core** | Cross-module behavior is mediated by explicit contracts. |
| FR-19 | Authentication, account/profile settings, input validation, least privilege, and secure transport are part of the planned system. | **Deferred** (Post-MVP Stage 3/4) | Auth boundaries and validation are demonstrable; transport is TLS when deployed. |

## Non-functional requirements and constraints

- **Offline-first:** local logging is a core goal; synchronization must address retries, duplicates, and conflicts. The source suggests timestamp-based last-write-wins plus conflict logging as a mitigation, not a fully specified policy.
- **Security/privacy:** TLS in transit, password hashing (bcrypt/Argon2), encrypted sensitive fields, least privilege, rate limits, and secure device key/token storage are proposed in the source. Do not claim compliance or production readiness without review.
- **Platform limitations:** Health, screen-time, notifications, background execution, and store entitlements vary by OS and may need native code, permissions, approvals, or paid accounts. Graceful degradation is required.
- **Architecture:** source proposes an offline-first client plus a modular monolith service with REST API and relational persistence; microservices, web dashboard, multi-region deployment, Kubernetes, and advanced scaling are future growth paths, not MVP prerequisites.
- **Budget:** project planning assumes no paid AI subscriptions and no project budget. Use free tiers/local tooling where feasible; re-check current service limits before depending on them. Never require a paid service for the core demo without explicit approval.

## Scope and delivery boundaries

**Source full-build scope:** all enumerated modules and both wearable sync and email event extraction are intended for the eventual full build, sequenced independently. Meal recognition, water tracking, and phone usage are also detailed in the source.

**Recommended initial PBL MVP (planning recommendation, not a source requirement):** mobile scaffold, local persistence, a small finance transaction/budget slice, manual calendar events/reminders where supported, and one simple habit/timer flow. Use demo/sample data. Deliver a working vertical slice before auth/backend sync or the remaining modules.

**Explicit exclusions/boundaries from source:** no direct bank payments; no email event auto-creation without confirmation; no meal auto-logging without confirmation; no encrypted-note recovery/sharing/server search; no barcode scanning initially; no fabricated device metrics.

## Assumptions and confirmed decisions

1. Demo platform: Android is approved as the primary demonstration platform (using emulator or physical device via Expo Go), supporting iOS where local tools allow.
2. Architecture baseline: Expo Router, `expo-sqlite`, React Context/hooks, and a currently supported stable Expo SDK baseline are approved.
3. Backend & Cloud: Remote backend, database, cache, and sync protocols are deferred until a later approved milestone.
4. Business rule (ADR-02): When calculating remaining budget, payments linked to pre-committed fixed obligations or Autopay schedules are not deducted twice.
5. External API approvals, entitlements, quotas, and current service pricing will be checked prior to implementing Stages 3 and 4.
6. Security and privacy review depth: Sensitive encrypted notes are deferred to Stage 4 pending threat modeling.

## Traceability

FR identifiers map to source sections: FR-01–06 Finance and payment specs (4.1.1–4.1.5); FR-07 manual calendar events (4.3.1); FR-08–09 habit timer (4.3.2); FR-10–11 meal/water (8); FR-12 utility modules (4.2); FR-13 encrypted notes (6); FR-14 phone usage (4.3.3); FR-15–16 integrations (7); FR-17–19 architecture/security (1–3, 5). Update this table when the source or approved scope changes.
