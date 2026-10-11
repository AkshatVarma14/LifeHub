# LifeHub Repository Guide

## Purpose

Use Git to preserve the project history and make changes reversible. A private GitHub repository is a recommended remote backup/portfolio workflow; local Git remains the source of version history. These steps do not assume a paid subscription. Check the current free plan and privacy settings before creating a remote.

## Initial setup

1. Create a folder named `LifeHub` and extract this bundle into it.
2. Open the folder in Antigravity (or another editor). Review `AGENTS.md` and `PROJECT_INSTRUCTIONS.md`.
3. Initialize Git in the project root. Set your Git author name/email if not already configured.
4. Inspect the ignore rules and ensure no `.env`, credentials, private notes, or personal finance/health data are present.
5. Create a private remote repository if desired, add it as `origin`, and push the initial commit. Keep it private while coursework or secrets are in progress; publish only content you intend to share.
6. Scaffold Expo + TypeScript when ready. The scaffold creates `package.json`; commit the generated manifest and lockfile together.

## Daily workflow

1. Start from a clean working tree; sync the current branch if using a remote.
2. Make a focused task with clear acceptance checks. For risky work, use a short-lived branch such as `feature/manual-calendar-events`.
3. Change one coherent slice. Do not combine unrelated refactors and features.
4. Review `git status` and the diff. Search for credentials and accidental personal data before committing.
5. Run relevant checks and record which passed or were unavailable.
6. Commit with a clear message, then push the branch. Merge through a review/merge step after inspecting the diff.
7. Update docs when behavior, scope, setup, or decisions change.

## Branching and commit examples

- `main` should remain in a usable, demonstrable state.
- Use short-lived branches for features/fixes when practical; a solo project may commit directly to `main` for tiny early setup changes, but keep commits small.
- Commit style: `feat: add manual calendar event form`, `fix: prevent budget double counting`, `docs: record local database decision`.
- Avoid huge commits such as `final project` or mixing generated files with unrelated source changes.

## Secret and data hygiene

- Never commit API keys, passwords, OAuth client secrets, signing certificates, tokens, `.env` files, or private user records.
- Put required local variables in ignored `.env` files; commit only a sanitized `.env.example` containing names and placeholder values.
- Revoke and rotate any secret that reaches Git history; deleting the latest file alone does not remove it from history.
- Use synthetic demo data. Do not store real transactions, health metrics, emails, or encrypted notes in test fixtures or screenshots.
- Review generated AI code and dependencies for unexpected telemetry, permissions, and license/security concerns.

## Recovery and release

- Push regularly so a device failure does not destroy the work. Keep an additional backup for important course submissions.
- Tag a stable milestone/demo, for example `v0.1-mvp-demo`.
- Before a submission, verify a fresh clone can be installed and launched using README instructions.
- Preserve source and required notices/license information for dependencies.
