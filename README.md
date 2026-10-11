# LifeHub

LifeHub is a proposed cross-platform personal life-management app for a Project-Based Learning (PBL) course. Its technical design aims to bring personal finance, fitness and nutrition, habits, calendar events, notes, bookmarks, encrypted notes, phone-usage insights, and selected device/email integrations into one mobile app.

**Project status:** Planning and Architecture Approval Complete (Stage 0). The core client architecture is approved (Expo Router, `expo-sqlite`, React Context/hooks, Android primary demo). The next immediate milestone is **Stage 0 Scaffold Implementation**: initializing the Expo + TypeScript application, generating `package.json`, and verifying the clean build on Android. Backend services and remote cloud sync are explicitly deferred.

## Start here

1. Read `PROJECT_INSTRUCTIONS.md` and `docs/REQUIREMENTS.md`.
2. Review the recommendations and open questions in `docs/DECISIONS.md`.
3. Follow `docs/ROADMAP.md` one milestone at a time.
4. Use `docs/REPOSITORY_GUIDE.md` to initialize Git and maintain the repository.
5. Scaffold the Expo app only after confirming the initial decisions. The scaffold command should generate `package.json`; this starter intentionally does not invent one.

## Repository layout

- `AGENTS.md` — workspace/AI-agent working rules.
- `PROJECT_INSTRUCTIONS.md` — persistent implementation context and constraints.
- `docs/` — requirements, decisions, roadmap, and repository workflow.
- `src/`, `assets/`, `tests/` — reserved for application code and project materials as they are created. `.gitkeep` files preserve these empty directories in Git/ZIP.
- `package.json` — generated during application scaffolding, not included before initialization.

## Scope and safety

The technical design is ambitious. Build and demonstrate a small, reliable offline-capable MVP before attempting integrations or advanced automation. Autopay is tracking and reminders only; it never initiates bank transactions. Budget calculation rules prevent double-counting pre-committed payments when determining remaining budget. Email-derived events and camera-recognized meals require user confirmation. Device usage and health features depend on platform permissions and API availability. Encrypted notes require careful security review and must not use custom cryptography.

## Current implementation

No application functionality is claimed as implemented by this starter bundle. Update this section as verifiable milestones are delivered.
