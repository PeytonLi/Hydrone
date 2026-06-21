# ADR-0001: Split persistence — Postgres for state, HydraDB for memory

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

The PRD specifies a single store, "HydroneDB," and asks it to be three things at once: a
queryable graph, an ACID-transactional state store, and a vector/semantic memory. Those are
different database jobs with conflicting guarantees:

- Graph traversal here is deterministic — you move by explicit edge id, no similarity needed.
- Authoritative game state (inventory, flags, node-unlock status) needs exact, atomic,
  read-after-write consistency, or the "deterministic engine" selling point collapses.
- Long-term narrative context (lore, episodic history) needs semantic recall, which is what
  a vector/memory engine is actually for.

No single product does all three well. The user also requires using **HydraDB**, which (see
ADR-0002) is a memory layer, not a transactional store.

## Decision

We will split persistence by job:

- **Postgres (Neon/Supabase)** is the single source of truth for all authoritative game
  state, accessed transactionally via Drizzle.
- **HydraDB** holds long-term memory only — episodic events and lore — and is queried for
  relevance to enrich narration.

## Consequences

- The determinism and "fast restore" claims become true: state reads and the validation gate
  hit Postgres exactly and synchronously; restore is one query.
- We run two stores instead of one — more infra, but each is used for what it is good at.
- A hard rule is introduced: **never read game state from HydraDB** (enforced in CONTEXT.md
  invariants and tests).

## Alternatives considered

- **HydraDB as the only store.** Rejected: it cannot give exact transactional reads (ADR-0002),
  so the keycard→vault gate could misfire. It would resurrect the exact context-drift the
  project exists to kill.
- **Neo4j for state + Pinecone for memory.** Viable earlier, but HydraDB is mandated and
  already provides the graph+memory story, making Neo4j redundant infra and Pinecone
  unnecessary.
- **A vector DB as the state machine** (the PRD's literal framing). Rejected as a category
  error: deterministic, transactional state does not belong in a relevance-ranked store.
