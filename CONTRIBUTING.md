# Contributing to Hydrone

This repo is built by **parallel TDD agents working in isolated git worktrees**. This doc
is the operating manual. Read [README.md](README.md) and [CONTEXT.md](CONTEXT.md) first.

## The build workflow: A → (B ∥ C ∥ D) → E

The full orchestration, per-agent deliverables, and interface contracts live in the
handoff: `%TEMP%\hydrone-parallel-agents-handoff.md`. Summary:

```
        A (setup + shared contracts)        runs FIRST, alone
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   B (engine)  C (llm+mem)  D (client+UI)    run in PARALLEL after A
        └─────────┼─────────┘
                  ▼
        E (integration + tests + auth)        runs LAST
```

- **A is a hard gate.** It locks the shared `hydrone-core` Zod schemas/types and the public
  function *signatures* (stubbed) that B/C/D compile against. It declares **all**
  dependencies in every `package.json` so the build agents never touch manifests.
- **B/C/D own disjoint directories** (see the ownership table) and never edit each other's.
- **E integrates**: merges B+C+D, replaces stubs with real impls, adds Auth.js, and writes
  the end-to-end tests.

## Package boundaries (ownership)

| Path | Owner | Contents |
|------|-------|----------|
| root configs, `packages/*/package.json`, `hydrone-core/src/schema/**`, `hydrone-core/src/content/**`, the interface stubs | **A** | scaffold + contracts + seed |
| `packages/hydrone-core/src/engine/**` | **B** | the deterministic engine + its tests |
| `packages/llm-service/src/**` | **C** | turn generation + HydraDB memory client + tests |
| `apps/game-client/**` | **D** | three-panel UI, Zustand store, SAM route (against stubs) |
| cross-cutting (SAM wiring, auth, integration tests) | **E** | final integration |

Stay inside your owned dirs. Cross-boundary needs are met through the **interface
contracts** A defines (engine + llm-service public APIs), not by reaching into another
package's internals.

## Git worktrees

Worktrees live in a gitignored `.worktrees/` directory so they sit inside the repo without
self-tracking. They can only be created **after A makes the first commit on `main`**.

```bash
# after A commits the scaffold to main:
git worktree add .worktrees/agent-b -b agent-b-engine main
git worktree add .worktrees/agent-c -b agent-c-llm    main
git worktree add .worktrees/agent-d -b agent-d-client main
# ...later, after B/C/D merge:
git worktree add .worktrees/agent-e -b agent-e-integration main
```

Run `pnpm install` once in each fresh worktree. Use the `superpowers:using-git-worktrees`
skill to manage creation and cleanup.

## Test-Driven Development (required)

Every agent runs `/tdd` and works red → green → refactor.

- **Write the failing test first**, then the minimum code to pass, then refactor.
- **Front-load the infra-free tests.** The engine's `computeAllowedActions` and
  `validateAction` are pure functions — test them with in-memory state, no database.
  These are the highest-value tests in the project.
- **Mock external services** in unit tests: the AI SDK and the HydraDB HTTP client (C),
  Postgres at the boundary (B persistence tests can use a throwaway Neon branch).
- **The "money test"** (owned by E): picking up the keycard unlocks the vault, AND
  attempting the vault *without* the keycard yields a setback with **zero** writes to
  Postgres. If this passes, the thesis holds.

Tests live next to the code they cover (`*.test.ts`) and run under Vitest via `pnpm test`.

## Commits

- Conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`.
- Commit in small, working increments. Each commit should keep the package's tests green.
- Do not commit secrets. `.env.local` is gitignored; only `.env.example` (placeholders)
  is tracked.
- Branch per agent (`agent-b-engine`, etc.). Open a PR or merge to `main` only when your
  package's tests are green.

## Code style

- TypeScript strict mode. Prefer the Zod-inferred types from `hydrone-core` over hand-written
  shapes.
- Match the surrounding code's naming and idiom. Use the vocabulary in
  [CONTEXT.md](CONTEXT.md) exactly — no synonyms.
- Keep functions pure where the design allows (the engine core is pure by design; preserve
  that — it's what makes determinism testable).

## The hard rules (engineering invariants)

Repeated from the README because they are easy to violate and expensive to undo:

1. **Never read game state from HydraDB.** State is Postgres only.
2. **The LLM emits `chosen_action_id`, never raw mutations.** The engine owns effects.
3. **Generated nodes use only authored bricks.** Reject unknown `template_id` / `item_id`.
4. **Restore reads Postgres only** — no embedding call on the restore path.
5. **Memory writes are fire-and-forget** — never block a turn on HydraDB indexing.
