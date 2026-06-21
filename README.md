# Hydrone

A persistent-state graph RPG engine that **decouples the LLM from state enforcement**.
The model narrates and proposes; a deterministic engine owns every state change; a
long-term memory layer keeps the story from ever drifting.

> **Status: greenfield.** The architecture is locked and the implementation plan is
> approved. Nothing is built yet — code lands via parallel TDD agents (see
> [CONTRIBUTING.md](CONTRIBUTING.md)). Read the plan and the ADRs before writing code.

## Why this exists

LLM-driven games built on a rolling chat log break in three ways:

1. **Context drift / hallucinated state** — the model forgets a door was blown open 50 turns ago.
2. **Token-bloat cost scaling** — replaying the whole history every turn makes cost grow linearly.
3. **No hard rule enforcement** — a text agent can't guarantee "no keycard, no vault."

Hydrone fixes all three by splitting the jobs a chat log conflates:

- **Authoritative state** lives in a transactional store (exact, atomic, instant reads).
- **Long-term context** lives in a purpose-built memory layer (queried for relevance).
- **The LLM only renders** — it selects from gated actions and narrates; it never writes state.

## Architecture at a glance

```
Next.js App Router (game-client)  +  Auth.js (identity)
  │  server route: the SAM loop (State -> Action -> Mutation)
  ▼
hydrone-core ──► Postgres   SOURCE OF TRUTH: nodes, edges, inventory, flags, ledger,
  │                         item catalog, action templates. Exact + transactional.
  ▼
llm-service  ──► AI SDK generateObject (Claude)   narration + action selection
             ──► HydraDB   MEMORY ONLY: ingest episodic events + lore; query for recall
```

**The determinism guarantee:** every state change is an *authored effect* behind an
*authored gate*, committed to Postgres in a single transaction. The LLM selects a gated
action by id and may assemble new geography only from authored bricks; it cannot invent
mechanics, so the engine can never reach an invalid state.

**The two superpowers:** Postgres guarantees the *rules* can't be violated; HydraDB gives
the narrator a queryable long-term *memory* so the story never forgets. See
[docs/adr/](docs/adr) for why, and [CONTEXT.md](CONTEXT.md) for the vocabulary.

## Monorepo layout

```
apps/
  game-client/        Next.js App Router app — the three-panel demo UI + the SAM API route
packages/
  hydrone-core/       Zod schemas, Drizzle/Postgres tables, the deterministic engine, seed content
  llm-service/        Vercel AI SDK turn generation + the HydraDB memory client
```

Tooling: **pnpm** workspaces + **Turborepo**. Styling: Tailwind + shadcn/ui + Lucide.
Client state: Zustand. Tests: Vitest.

## Quickstart

> The scaffold (workspace, packages, scripts, `.env.example`) is produced by the setup
> agent. Once it exists, the workflow is:

```bash
pnpm install
cp .env.example .env.local      # then fill in the values below
pnpm db:push                    # apply Drizzle schema to Postgres
pnpm db:seed                    # load the authored world (1 zone, ~6 nodes, keycard->vault)
pnpm dev                        # run the app
pnpm test                       # run all package tests
```

## Environment

Real values go in `.env.local` (gitignored — never commit secrets). `.env.example` ships
placeholders only.

| Variable | Used by | Notes |
|----------|---------|-------|
| `DATABASE_URL` | hydrone-core, game-client | Neon/Supabase Postgres connection string |
| `HYDRA_DB_API_KEY` | llm-service | From app.hydradb.com — memory layer |
| `ANTHROPIC_API_KEY` | llm-service | Claude (`claude-sonnet-4-6`) |
| `AUTH_SECRET` (+ provider creds) | game-client | Auth.js; only needed once auth lands |

## The demo (three panels)

- **Panel A — The Cause:** the engineering story, a bounded-vs-linear cost chart, and a
  `Simulate Memory Drift` toggle (a canned broken-chatbot transcript).
- **Panel B — The Action:** location card, gated action buttons, inventory slots, a retro
  typing terminal.
- **Panel C — The Proof:** a live Postgres-state inspector (mutated row flashes yellow), a
  HydraDB memory readout, and `Simulate Device Destruction` (clears the client, reloads,
  re-hydrates state from Postgres).

## Documentation map

| Doc | What it's for |
|-----|----------------|
| `C:\Users\lipey\.claude\plans\parsed-dancing-kazoo.md` | **Approved plan** — architecture, schema, game loop, build sequence, verification (source of truth) |
| `%TEMP%\hydrone-parallel-agents-handoff.md` | **Handoff** — the parallel A→BCD→E agent orchestration + worktrees |
| [CONTEXT.md](CONTEXT.md) | Domain glossary, the mental model, and the invariants you must not break |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow: parallel agents, worktrees, TDD, package boundaries |
| [docs/adr/](docs/adr) | Architecture Decision Records — the *why* behind each big choice |

## Hard rules (do not break these)

1. **Never read game state from HydraDB.** It is async-indexed and ranked — state is
   Postgres only. HydraDB is for narrative recall.
2. **The LLM emits `chosen_action_id`, never free-form mutations.** The engine owns effects.
3. **Generated geography uses only authored bricks** (catalog items + action templates).
4. **Honest demo copy:** bounded-vs-linear cost (not "$0.00"); a scripted drift transcript
   (not a real second chatbot).
