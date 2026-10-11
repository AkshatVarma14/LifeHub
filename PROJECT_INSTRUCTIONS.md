# LifeHub Project Instructions

## Purpose

Build LifeHub as a student PBL project and a credible portfolio demonstration: a modular, cross-platform mobile application for personal tracking. The supplied technical design document, located at `docs/original/LifeHub_Technical_Documentation.docx`, is the source of product requirements and proposed architecture. These instructions distinguish source-defined goals from recommendations made to keep delivery feasible.

## Product direction

The source design describes an iOS/Android app covering authentication, finance and monthly budgets, fixed payments and Autopay schedules, calendar/reminders, fitness/nutrition, habits and timed sessions, journal/notes, bookmarks, encrypted notes, phone usage insights, wearable sync, email event extraction, meal recognition, and water logging. A companion web dashboard is future/stretch scope. The source expects offline-first logging and eventual synchronization, a modular backend, and privacy/security controls. See `docs/REQUIREMENTS.md` for traceability and boundaries.

## Work method

- Work in small, reviewable increments. One task should have one outcome and explicit acceptance criteria.
- Before coding, inspect the existing project and relevant docs. Propose the smallest implementation and identify changed files.
- Keep setup and the first vertical slice simple; avoid building speculative infrastructure.
- Do not start the next milestone while the current milestone's acceptance criteria remain unmet.
- Update requirements, decisions, roadmap, and README when scope or behavior changes. Record why and when a material decision changed.
- Keep all claims factual: distinguish planned, in progress, and complete.
- Explain tradeoffs in plain language. Do not silently add paid services or external data collection.

## Engineering constraints

- Mobile-first, one cross-platform codebase using a currently supported Expo SDK baseline with TypeScript, targeting Android as primary demo platform (and iOS where supported).
- Navigation uses Expo Router, persistence uses `expo-sqlite`, and client state uses React Context and hooks. Backend and remote synchronization are deferred to later approved milestones.
- Treat local-first data entry and later synchronization as product goals. Introduce sync incrementally and define conflict behavior before syncing multiple writers.
- Keep feature modules responsible for their own logic/data. Use explicit interfaces or domain events for cross-module updates.
- Validate inputs at boundaries; handle loading, empty, error, offline, and permission-denied states.
- Store secrets outside source control. Request the minimum permissions needed and explain their purpose in the app.
- Sensitive notes: use vetted cryptographic libraries, device secure storage, and a reviewed design. Do not invent cryptography. A lost zero-knowledge passphrase means data cannot be recovered under the source design.
- Email extraction and meal recognition propose data for the user to confirm; neither may silently create records.
- No feature may initiate bank transfers or charges. Autopay tracks expected payments and reminders only.
- If an OS/API does not expose a metric, show that it is unavailable; never fabricate data.

## AI-assisted coding prompts

For each coding task, provide the agent only the relevant requirement and files, then ask it to: (1) restate scope, (2) list a small plan and acceptance criteria, (3) implement only the agreed slice, (4) summarize files and decisions changed, and (5) report validation performed and remaining limitations. Review diffs and generated dependencies yourself. Do not paste secrets or private records into AI tools.
