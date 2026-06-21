# ADR-0002: HydraDB is a memory layer, not the source of truth

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

The project must use HydraDB, and it was initially assumed to be a graph database suitable as
the authoritative store. Investigation of the official docs (docs.hydradb.com) shows
otherwise. HydraDB is an **AI agent memory / context substrate**. Its verified behavior:

- The core loop is `ingest → poll until indexed → query`. **Writes are asynchronous** — the
  quickstart polls `indexing_status == "completed"` before data is queryable.
- **Reads are relevance-ranked "chunks"** via `client.query(...)`, tuned with `alpha` /
  `recency_bias` — a hybrid search, not an exact key lookup.
- Ingestion runs through optional LLM fact-extraction + entity resolution, so stored data is
  transformed, not verbatim.
- It provides a TypeScript SDK, per-tenant isolation, and an MCP / Claude Code plugin.

You therefore cannot write `door_hacked = true` and read it back atomically, and a validation
gate cannot trust a ranked search. The PRD's "atomic mutation block" and "200ms exact restore"
are impossible on an async-indexed retrieval engine.

## Decision

We will use HydraDB strictly as the long-term **memory** layer: ingest episodic events
(`type: "memory"`) and authored lore (`type: "knowledge"`), and `query` it for relevant
context to enrich narration. It is never consulted to decide whether an action is legal, and
state is never restored from it.

## Consequences

- HydraDB becomes the star of the "persistent context, no drift" thesis — exactly the job it
  is built for.
- Two operating rules follow:
  - **Indexing-lag rule:** never rely on "memory of the move just made." Seed lore once at
    startup (wait for indexing); per-turn episodic ingest is fire-and-forget.
  - **Recall-only rule:** memory output enriches narrative text and never gates state.
- If memory recall is flaky, the engine still runs on Postgres alone (graceful degradation;
  narrative loses flavor, state stays intact).

## Alternatives considered

- **Treat HydraDB as the transactional store** (store flags as "memories", read via `query`).
  Rejected: async indexing + ranked recall make exact reads unreliable; the determinism demo
  could fail live on stage.
- **Drop HydraDB.** Not an option — it is a hard requirement, and it is genuinely the best fit
  for the memory role.
