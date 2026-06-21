# Architecture Decision Records

Each ADR captures one significant decision: its context, the choice, the consequences, and
the alternatives considered. They record *why* the code looks the way it does, so future
contributors (and agents) don't re-litigate settled questions or undo a deliberate choice.

These decisions came out of a structured grilling of the original PRD. The PRD's central
fiction ("HydroneDB") and several of its schemas were corrected as a result.

## Index

| ADR | Decision | Status |
|-----|----------|--------|
| [0001](0001-split-persistence-postgres-and-hydradb.md) | Split persistence: Postgres for state, HydraDB for memory | Accepted |
| [0002](0002-hydradb-is-memory-not-source-of-truth.md) | HydraDB is a memory layer, not the source of truth | Accepted |
| [0003](0003-authored-gates-own-state.md) | Authored gates + effects own state; the LLM only selects actions | Accepted |
| [0004](0004-procedural-world-via-authored-bricks.md) | Procedural world generation via authored bricks only | Accepted |
| [0005](0005-llm-stack-ai-sdk-generateobject-claude.md) | LLM stack: Vercel AI SDK `generateObject` + Claude | Accepted |

## Decisions captured in the plan (candidates to promote to ADRs)

These were also decided during grilling and are recorded in the approved plan; promote them
to full ADRs if they need durable, standalone rationale:

- **3-package pnpm + Turborepo monorepo** (vs. single app / 2-package).
- **Real auth (Auth.js)** for sessions (vs. shared-session URL) — the #1 cut candidate.
- **Scripted "memory drift" demo** (vs. building a real second chatbot).

## Format

New ADRs copy [`0000-template.md`](0000-template.md), take the next number, and get added to
the index above.
