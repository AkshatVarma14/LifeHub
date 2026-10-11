# LifeHub Decisions and Recommendations

This log separates the technical design's stated direction from practical recommendations for a zero-budget PBL project. Recommendations are not original product requirements. Record approved changes with date, context, choice, and consequences.

## Source design direction

The supplied design proposes React Native with Expo and TypeScript; React Navigation; SQLite via WatermelonDB or Realm; React Query plus Zustand; a modular monolith backend; REST/OpenAPI; Fastify/Node.js or FastAPI/Python; PostgreSQL; Redis-backed jobs/cache; Prisma or SQLAlchemy; native health and device-usage APIs; and OAuth integrations. It lists multiple alternatives and does not make final backend or database selections.

## Recommended starting decisions (recommendations)

| Area | Recommended starting point | Reason / revisit trigger |
|---|---|---|
| Mobile & Target | Expo + React Native + TypeScript on a currently supported Expo SDK; Android as primary demo platform | One codebase, quick iteration, good fit for a student PBL demo. Avoid pinning obsolete SDK versions. Target Android primarily on supported local environment; support iOS where environment permits. |
| Navigation/UI | Expo Router (file-based navigation) with a minimal accessible component system | Native tabs/stacks, deep linking support, standard for modern Expo projects. Avoid designing a massive design system before the first vertical slice. |
| First persistence | `expo-sqlite` with a repository/data-access boundary | Native support in Expo Go without custom native compilation. WatermelonDB and Realm are deferred due to build overhead and unnecessary complexity for MVP. |
| State/data fetching | React Context and hooks | Simple, zero extra dependencies, sufficient for local MVP state. Zustand is deferred unless complex cross-screen state justifies it; React Query is deferred until a backend API exists. |
| Backend | Defer. If a backend becomes necessary, select one runtime and build a modular monolith REST API; do not begin with microservices. | A local-only MVP reduces setup, hosting, secrets, and cost. Revisit for multi-device sync/auth or rubric requirements. |
| Database/queue/cache | Defer PostgreSQL, Redis, object storage, and job queues until a concrete backend/integration needs them | They add operational work and may incur cost. |
| External APIs | Defer email, wearable, camera ML, and screen-time integrations until the core flows work and feasibility is checked on target devices. Use mock/sample data in the demo. | Permissions, entitlements, review, API quotas, and platform differences may block or delay delivery. |
| Security | Use platform/library primitives; no custom crypto. Keep real personal/financial data out of development. | Encrypted notes are high risk; implement only after an explicit design review. |
| AI workflow | Use Antigravity as the coding workspace if it is available at no cost; treat generated changes as proposals and review diffs. Use small scoped prompts and only relevant docs. | Tool availability/free tiers can change; verify current limits and avoid making the workflow dependent on a paid model. |
| Repository | Git locally plus a private GitHub repository if free access is available; commit small milestones and keep secrets out of Git | Remote hosting is useful backup and portfolio history. Confirm visibility and account settings before publishing. |

## Approved Architecture Decisions

### 2026-10-11 — ADR-01: Initial Client Architecture and Technology Stack
- Status: accepted
- Context: Establishing the foundational client architecture for LifeHub as a zero-budget student PBL demonstration.
- Decisions:
  1. **Navigation:** Adopt **Expo Router** for file-based routing and nested tab/stack navigation.
  2. **Persistence:** Adopt **`expo-sqlite`** with a repository pattern for local offline-first data storage.
  3. **State Management:** Use **React Context and custom hooks** for client state. Defer Zustand until concrete state sharing complexity warrants it.
  4. **Backend & Cloud Infrastructure:** **Defer backend development**, remote PostgreSQL, Redis, and multi-device sync until a later approved milestone. Deliver an offline-first mobile client first.
  5. **Demonstration Platform:** Use **Android** as the primary demonstration platform (via emulator or physical device via Expo Go), supporting iOS where local tools allow.
  6. **Expo SDK Baseline:** Target a **currently supported stable Expo SDK** and compatible dependencies at scaffold time rather than pinning a specific historic SDK version.
- Alternatives considered:
  - *WatermelonDB / Realm:* Deferred due to native build complexity, custom Babel plugins, and heavy configuration overhead.
  - *Standalone React Navigation:* Deferred in favor of Expo Router's integrated file-based routing.
  - *Zustand / Redux Toolkit / React Query:* Deferred to avoid redundant state abstraction layers before a remote REST API exists.
  - *Fastify / FastAPI Backend:* Deferred to keep the initial MVP deliverable 100% reliable, local, and zero-cost.
- Consequences:
  - Fast initial iteration, zero hosting fees, no server runtime dependencies.
  - Initial testing focused on Android; cross-platform validation continues where feasible.

### 2026-10-11 — ADR-02: Budget Summary Calculation and Double-Counting Prevention Rule
- Status: accepted
- Context: FR-03 requires calculating usable budget and remaining budget. In personal finance tracking, fixed committed payments (e.g., rent, subscriptions, insurance) are often logged as actual spending transactions once paid. If an actual transaction is recorded for a committed payment while the committed amount is simultaneously subtracted from usable budget, that amount would be subtracted twice from remaining budget.
- Decisions:
  - Formalize the budget formulas and explicit non-double-counting business rule:
    $$\text{Usable Budget} = \text{Total Budget} - \text{Fixed Committed Obligations for the Month}$$
    $$\text{Remaining Budget} = \text{Usable Budget} - \text{Eligible Actual Discretionary Spending}$$
  - **Double-Counting Prevention Rule:** When calculating Remaining Budget, any actual transaction linked to a pre-committed fixed payment or Autopay schedule must NOT be deducted again from Usable Budget. Only non-committed (discretionary) spending, or discretionary transactions not represented in fixed commitments, reduce Usable Budget.
  - Alternatively, if total remaining budget is computed directly against Total Budget:
    $$\text{Remaining Budget} = \text{Total Budget} - (\text{Fixed Committed Payments} + \text{Eligible Discretionary Actual Spending})$$
    Where linked actual payments fulfill the commitment rather than adding a separate deduction.
- Consequences:
  - Prevents erroneous artificial budget deficits.
  - Test suite must enforce concrete calculation fixtures testing both paid and unpaid committed schedules.

## Deferred decisions

- Backend runtime (Node/Fastify vs Python/FastAPI), remote ORM, hosting, and cloud database provider.
- Multi-device synchronization protocol, conflict resolution policy (LWW vs CRDT), and deletion tombstones.
- External OAuth integrations (Gmail/Outlook read-only calendar sync).
- Native Health integrations (HealthKit / Health Connect) and screen-time APIs.
- Machine learning providers for camera meal recognition and external nutrition database API.
- End-to-end zero-knowledge client encrypted notes implementation and key derivation scheme.
- App store publishing, deployment certificates, and privacy policy legal drafting.

## Decision record template

### YYYY-MM-DD — Short title
- Status: proposed / accepted / superseded
- Context: problem and constraints
- Decision: chosen approach
- Alternatives considered: options and why deferred
- Consequences: benefits, costs, risks, and follow-up
