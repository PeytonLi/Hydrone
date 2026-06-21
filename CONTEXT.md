# Hydrone — Domain Context

The shared language of this codebase. If you are adding or renaming a concept, update this
file in the same change. The goal is one word per idea, used consistently everywhere
(types, tables, functions, UI, prose).

## The mental model: rulebook vs. memory

Two stores, two jobs. Keep them separate in your head and in the code.

- **The rulebook = Postgres.** Exact, transactional, authoritative. It answers *"what is
  true right now?"* (does the player hold the keycard? is the vault open?). Reads are a
  single SQL query; writes are atomic transactions. The deterministic engine lives here.
- **The memory = HydraDB.** Async-indexed, relevance-ranked. It answers *"what's worth
  remembering about all of this?"* — episodic events and lore that enrich narration. It
  is **never** consulted to decide whether an action is legal.

When in doubt: **state is Postgres, flavor is HydraDB.**

## Glossary

### World & geography
- **World node** — a location. Has a `node_id`, `zone`, boolean state (`is_unlocked`,
  `is_corrupted`), `metadata`, and `edges`. Stored in `world_nodes`.
- **Edge** — a directed connection between nodes (`node_id[]`). Navigation is deterministic:
  you move by edge id, never by similarity.
- **Zone** — a named region (Safehouse, NeonAlleyway, CorporateTower, ServerVault).
- **Sub-graph** — the slice loaded each turn: the current node + its neighbors + the
  player's inventory + flags. Returned by `fetchSubGraph(sessionId)`.

### Items & inventory
- **Item catalog** — the canonical, pre-authored definitions of every item, keyed by
  `item_id`. The single place items are *defined*. Stored in `item_catalog`.
- **Inventory** — what a player holds: rows of `{ session_id, item_id, acquired_timestamp }`
  that *reference* the catalog. Nothing can enter inventory unless its `item_id` exists in
  the catalog.

### The engine vocabulary (the heart of determinism)
- **Action template** — a pre-authored action: `{ template_id, label, narrative_hint,
  requires, effects }`. The atomic unit of "something a player can do." Stored in
  `action_templates`.
- **Gate (`requires`)** — the preconditions on an action template: `{ items: [...],
  flags: {...} }`. The engine checks these against current state before allowing the action.
- **Effect** — an authored state change attached to a template (e.g., set flag
  `vault_open = true`, add item `loot_01`). Effects are *authored*, never invented by the LLM.
- **Mutation** — a single concrete state change applied to Postgres `{ target, key,
  operation }`. Effects are expressed as mutations.
- **Allowed-action set** — the templates whose gates currently pass, computed by
  `computeAllowedActions(state)`. These are the only actions offered to the LLM/player.
- **Tactical setback** — the authored fallback effect applied when an action fails
  validation (instead of silently dropping it). Keeps the narrative moving.

### The LLM contract
- **`chosen_action_id`** — the LLM's output: which gated action it picked. The LLM
  *selects*; it does **not** propose raw mutations.
- **`new_node_spec`** — an optional LLM-proposed new location, built **only** from authored
  bricks: `{ node_name, zone, edges, action_template_ids, item_ids }`. Every referenced
  id must already exist or the spec is rejected.
- **Authored bricks** — the catalog items + action templates. The fixed vocabulary the LLM
  assembles from. "Infinite geography, finite verified mechanics."
- **`LLMGameResponse`** — the full Zod-typed turn output (narrative, mood, log,
  `chosen_action_id`, optional `new_node_spec`, suggested buttons).

### Memory vocabulary (HydraDB)
- **Episodic memory** — time-ordered events from play (`type: "memory"`). Mirrors the
  historical ledger. Ingested fire-and-forget each turn.
- **Knowledge / lore** — authored background facts (`type: "knowledge"`). Ingested once at
  seed time, with a wait for indexing.
- **Recall / chunks** — what `query()` returns: relevance-ranked context slices used to
  enrich narration. Never a source of truth.
- **Indexing lag** — the async delay between ingesting into HydraDB and it being queryable.
  Because of it, **never rely on memory of the move just made.**
- **Tenant / sub-tenant** — HydraDB's isolation unit. Tenant = user; sub-tenant = session
  (playthrough). Keeps one player's memory out of another's.

### Session & history
- **Session** — one playthrough: `{ session_id, user_id, current_location_id,
  last_updated }`. The unit of saved state.
- **Historical ledger** — the exact, ordered log of `{ ts, action, narrative_summary }`
  rows in Postgres. Also mirrored into HydraDB as episodic memory.

### The loop
- **SAM loop** — **S**tate → **A**ction → **M**utation. The per-turn pipeline: load exact
  state, recall memory, generate a turn, validate it, commit the authored effects, return
  new state. Full steps in the plan's "Game Loop" section.

## Invariants (the engine's promises)

These are non-negotiable. Tests exist to enforce them.

1. **No invalid state is reachable.** Every write is an authored effect that passed an
   authored gate, applied in one transaction.
2. **State reads are exact and synchronous** (Postgres). Never gate an action on a HydraDB
   recall.
3. **The LLM cannot invent mechanics.** It selects `chosen_action_id` from the allowed set
   and assembles nodes only from authored bricks. Unknown ids → rejection → setback.
4. **Restore is a single Postgres query.** No embedding round-trip on the restore path.
5. **Memory writes never block a turn.** Episodic ingest is fire-and-forget; indexing lag
   is tolerated by design.

## Related decisions

The *why* behind this vocabulary is recorded in [docs/adr/](docs/adr). Start with
ADR-0001 (split persistence) and ADR-0003 (authored gates).
