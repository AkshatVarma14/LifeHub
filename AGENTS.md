# Workspace Rules for LifeHub

Use `PROJECT_INSTRUCTIONS.md` as the project-wide source of implementation guidance. Read the relevant requirements and decisions in `docs/` before changing behavior.

## Change discipline
- Make one small, scoped change at a time. State the goal and acceptance checks before editing.
- Do not implement unrelated features, broaden scope, or replace architectural choices without updating `docs/DECISIONS.md` and explaining the impact.
- Preserve existing behavior unless a requirement explicitly calls for changing it. Inspect the existing code before editing.
- Prefer straightforward, maintainable code over premature abstractions or infrastructure.
- Do not claim a feature is implemented unless it exists and has been verified.
- Add or update focused tests when behavior changes; report checks run and any not run. (Testing is a project practice, not a claim that tests already exist.)
- Never put credentials, tokens, private user data, or production secrets in source control, prompts, logs, or documentation. Use placeholders in examples.
- Ask before adding paid services, new dependencies with material maintenance/security costs, or handling real sensitive data. Prefer free/local options for the student project.
- Keep module boundaries clear. Cross-module behavior uses explicit interfaces/domain events; modules must not write directly to another module's data.
- Keep offline behavior and permission denial in mind wherever relevant.

## Before each task
1. Read `PROJECT_INSTRUCTIONS.md` and the relevant sections in `docs/REQUIREMENTS.md`, `DECISIONS.md`, and `ROADMAP.md`.
2. Summarize the smallest change, files likely to change, and acceptance criteria.
3. Implement only that change.
4. Review the diff for accidental scope expansion, secrets, and unsupported claims.
