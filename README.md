# LifeHub

LifeHub is a proposed cross-platform personal life-management app for a Project-Based Learning (PBL) course. Its technical design aims to bring personal finance, fitness and nutrition, habits, calendar events, notes, bookmarks, encrypted notes, phone-usage insights, and selected device/email integrations into one mobile app.

**Project status:** Stage 0 Scaffold Initialized and Verified. The mobile foundation is established using React Native with Expo (SDK 57), TypeScript (strict mode enabled), and Expo Router. The next immediate milestone is **Stage 1: MVP Vertical Slice** (local SQLite persistence, Finance CRUD, Calendar events, and resilient habit timer).

## Setup instructions

### Prerequisites
- Node.js (v20+ recommended, tested on v24)
- npm (v10+)
- Expo Go app on an Android device, or an Android emulator / iOS simulator

### Installation
1. Clone the repository and enter the directory:
   ```bash
   git clone https://github.com/AkshatVarma14/LifeHub.git
   cd LifeHub
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Available scripts
- `npm start` — Start the Expo development server (Metro bundler).
- `npm run android` — Open the app on a connected Android device or emulator.
- `npm run ios` — Open the app on an iOS simulator (macOS required).
- `npm run web` — Run the app in a web browser.
- `npx tsc --noEmit` — Run TypeScript type checking.
- `npx expo export` — Verify static bundling and route export across Android, iOS, and Web.

## Repository layout

- `app/` — Application screens and file-based routing via Expo Router (`(tabs)/`, `modal.tsx`, `_layout.tsx`).
- `assets/` — Static assets (fonts, icons, and splash screens).
- `components/` — Reusable UI components and theme hooks.
- `constants/` — Application theme tokens and constants.
- `docs/` — Architecture decisions, requirements, roadmap, and original design documentation.
- `AGENTS.md` — Workspace and AI-agent discipline rules.
- `PROJECT_INSTRUCTIONS.md` — Architectural constraints and delivery guidance.
- `.env.example` — Sanitized environment configuration template.
- `package.json` — Application manifest and locked dependency tree.

## Scope and safety

The technical design is ambitious. Build and demonstrate a small, reliable offline-capable MVP before attempting integrations or advanced automation. Autopay is tracking and reminders only; it never initiates bank transactions. Budget calculation rules prevent double-counting pre-committed payments when determining remaining budget. Email-derived events and camera-recognized meals require user confirmation. Device usage and health features depend on platform permissions and API availability. Encrypted notes require careful security review and must not use custom cryptography.

## Current implementation

- **Stage 0 Scaffold:** Completed and verified.
  - Initialized with official Expo tabs template + TypeScript + Expo Router.
  - TypeScript strict mode verified with zero errors (`npx tsc --noEmit`).
  - Bundling and static route export verified across Android, iOS, and Web (`npx expo export`).
  - Basic LifeHub branding and working tab navigation shell active.
  - All business logic (Finance, Calendar, Habits) remains cleanly scoped for Stage 1.
