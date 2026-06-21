# ADR-0004: Procedural world generation via authored bricks only

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

We want the "infinite world" feel — the LLM can discover/generate new locations
(`new_nodes_discovered` in the PRD) — but ADR-0003 makes authored content the authority over
state. These collide: the moment the LLM invents a room, that room has no authored actions, no
gates, and any items in it are not in the catalog. The only way to populate a freely-invented
node is to let the LLM invent mechanics too, which is the "code trusts the LLM" option ADR-0003
rejects.

## Decision

The LLM may create new nodes, but only by **assembling authored bricks**:

- A `new_node_spec` may reference only existing `action_template_id`s and `item_id`s, and its
  edges must reference real nodes.
- The engine validates every generated node against the catalog + template library and rejects
  anything referencing an unknown id.

"Infinite geography, finite verified mechanics." New rooms are allowed; new rules are not.

## Consequences

- Procedural sprawl is possible without ever introducing an unverified mechanic — determinism
  (ADR-0003) is preserved across generated content.
- Node creation goes through validation just like actions do; it is not a backdoor.
- The authored brick library must be rich enough that generated rooms feel varied — that is the
  cost of this approach and a content-authoring task.
- If time is short, `new_node_spec` can be disabled to fall back to an authored-only map with
  zero engine changes (the documented cut).

## Alternatives considered

- **Free LLM world generation.** Matches the PRD literally but breaks determinism and risks an
  incoherent map mid-demo.
- **Authored-only map (no generation).** Fully deterministic and simplest, but loses the
  infinite-world wow factor. Kept as the fallback, not the default.
- **Authored anchors + flavor-only generated nodes.** A pragmatic middle ground; rejected as
  the default because it makes generated rooms non-interactive, which undersells the engine.
