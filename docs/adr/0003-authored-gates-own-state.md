# ADR-0003: Authored gates + effects own state; the LLM only selects actions

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

The "deterministic state engine" is the entire thesis, yet the PRD never specifies how
determinism is enforced. Its `LLMGameResponseSchema` has the LLM emit a free-form
`proposed_mutations[]` array, and a vaguely described "validation gate" is supposed to check
them. Two problems:

- The mutation shape `{ target_type, key, operation }` carries no link to any precondition,
  and there is no schema for the gating rules, so the gate has nothing principled to check.
- Letting the LLM author arbitrary state changes means the engine's correctness depends on the
  model behaving — the opposite of determinism.

## Decision

We will make authored content the authority over state:

- Each **action template** carries its own gate (`requires: { items, flags }`) and its own
  authored **effects** (the mutations it applies).
- Each turn the engine computes the **allowed-action set** (templates whose gates pass) and
  offers only those.
- The LLM returns a **`chosen_action_id`** from that set. The engine looks up the authored
  effects and applies them in one Postgres transaction. The LLM never supplies mutations.
- A failed action yields an authored **tactical setback**, not a silent drop.

## Consequences

- The engine cannot reach an invalid state: every write is an authored effect behind an
  authored gate.
- The validation gate becomes trivial and trustworthy — it checks `chosen_action_id ∈ allowed
  set`, not free-form model output.
- The PRD's `mutations[]` array is removed from the LLM response schema; the schema now carries
  `chosen_action_id` (+ optional `new_node_spec`, see ADR-0004).
- Content authoring (templates + their gates/effects) becomes the main design surface — that is
  intentional; it is where the game's rules live.

## Alternatives considered

- **LLM proposes mutations, a rules table validates each.** Closer to the PRD, more LLM freedom,
  but requires building and maintaining a separate rules table and still trusts model-supplied
  keys. More surface area, weaker guarantee.
- **LLM proposes, code trusts it.** Rejected outright — it abandons the thesis.
