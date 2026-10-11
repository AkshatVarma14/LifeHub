# LifeHub Roadmap

The source design contains a large four-phase plan with indicative 11-week sequencing. The milestones below preserve its direction while adding a recommended feasible PBL MVP. Dates/durations are planning estimates only; adjust them to the actual course deadline and rubric. Do not start every module at once.

## Stage 0 — Confirm and initialize

- Read the technical design, rubric, and this starter bundle; confirm the MVP scope and target demo device (approved: Android primary).
- Initialize Git and scaffold the Expo + TypeScript app using a currently supported stable Expo SDK baseline; let the scaffold generate `package.json`.
- Configure Expo Router file-based layout structure (`app/`), TypeScript configuration, and asset paths.
- Run the starter app on Android emulator/device (or Expo Go). Record exact setup steps and constraints.
- Define acceptance criteria before coding.

**Exit:** clean scaffold runs on Android; repository is backed up; scope and demo criteria are agreed.

## Stage 1 — Approved MVP vertical slice

- Build an accessible navigation shell using **Expo Router** (Tabs: Dashboard, Finance, Calendar, Habits).
- Implement local persistence with **`expo-sqlite`** using a clean repository pattern for transactions, budgets, manual events, and habits.
- Implement React Context and custom hooks for client-side state management.
- Implement narrow finance transaction flow (add, list, edit, delete, categorize) and monthly budget summary calculations (FR-01, FR-02, FR-03).
- Enforce and test the ADR-02 double-counting prevention business rule: pre-committed obligations (and future Autopay schedules) are not deducted twice when computing remaining budget.
- Implement manual calendar event creation and status list (offline-first, FR-07); add local notifications where supported.
- Add one habit completion/timer flow using timestamps (`Date.now() - startedAt`) so elapsed duration remains accurate after app backgrounding (FR-08, FR-09).
- Seed clearly labeled sample/demo data; do not collect real personal finance or health data.
- Keep all backend, cloud database, sync, and remote integrations deferred.

**Exit:** demonstrated core flows work reliably on Android after app restart and offline; finance calculations satisfy non-double-counting test fixtures; no backend is required.

## Stage 2 — Stabilize and document

- Add focused tests or repeatable manual checks for calculations, persistence, timer behavior, and event status.
- Handle validation, empty/error states, database migrations, and basic export/reset needs.
- Refine mobile layout/accessibility; update README with setup, screenshots, features, and honest limitations.
- Capture a short demo and explain architecture and decisions for the PBL evaluation.

**Exit:** MVP is reproducible from a fresh checkout and its limitations are clearly documented.

## Stage 3 — Expand core modules (only if time remains)

- Add fixed payment definitions and scheduled occurrences, with idempotent links to calendar events and no bank execution.
- Add fitness/workout logs, nutrition manual entry, water logs, and habit history.
- Add journal/notes and bookmarks.
- Add automated sync/backend only if required by rubric or there is enough time to define and test conflict behavior.

**Exit:** selected additions have complete flows and do not destabilize the MVP.

## Stage 4 — High-risk integrations and advanced security

Treat each as separately scoped, feasibility-tested work: HealthKit/Health Connect/wearables; permitted phone-usage APIs; email OAuth/event extraction with confirmation; camera meal recognition and nutrition lookup; encrypted notes with device key storage. Begin with a feasibility spike and mock interface. Implement only after platform access, permissions, cost, data handling, and acceptance criteria are clear.

**Exit:** each shipped integration handles denial, errors, stale tokens, unavailable metrics, and user confirmation as applicable.

## Source design's full-build sequence

The source proposes Phase 1 foundation (weeks 1–3), Phase 2 behavioral tracking (weeks 4–6), Phase 3 utilities/encrypted notes (weeks 7–8), and Phase 4 integrations/polish (weeks 9–11). Those durations presume a larger team and available external access; a solo student should treat them as directional rather than a guarantee. The source intends wearable and email integration as independent deliverables.

## Risks and responses

| Risk | Response |
|---|---|
| Scope spans many modules and integrations | Freeze a small MVP; add features only after milestones pass. |
| Free tiers, quotas, or API approval change | Check current terms early; keep integrations optional and provide a local demo path. |
| Offline sync conflicts or duplicate events | Start local-only; specify conflict and idempotency rules before sync. |
| iOS/Android API mismatch and permissions | Test on the actual target platform early; provide a clear unavailable state. |
| Cryptography or sensitive data mishandling | Defer encrypted notes; use vetted libraries and obtain design review. Never use real user data in demos. |
| Budget calculations double count obligations | Keep budget, fixed payment, schedule occurrence, and actual transaction concepts distinct; test concrete cases. |
| Project feels unfinished for portfolio | Prioritize a polished, reproducible vertical slice, screenshots/demo, and accurate documentation. |
