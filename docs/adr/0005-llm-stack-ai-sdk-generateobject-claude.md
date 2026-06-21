# ADR-0005: LLM stack — Vercel AI SDK `generateObject` + Claude

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

Each turn the model must return a strictly-typed payload (`LLMGameResponse`: narrative, mood,
`chosen_action_id`, optional `new_node_spec`, suggested buttons). The PRD says "Zod + native
platform structure endpoints (OpenAI / Anthropic SDKs)" but does not pick a provider or a
mechanism for enforcing the schema. The app is Next.js (App Router), so the integration should
be idiomatic there and provider-swappable.

Verified against the AI SDK docs: `generateObject({ model, schema, prompt })` enforces a Zod
schema and is first-class with Anthropic models (`@ai-sdk/anthropic`).

## Decision

We will generate turns with the **Vercel AI SDK `generateObject`**, passing the Zod
`LLMGameResponse` schema, against **Claude `claude-sonnet-4-6`**.

## Consequences

- One dependency handles JSON enforcement, parsing, and retries; output is validated against
  the same Zod schema the rest of the code uses.
- The provider is swappable behind the AI SDK if we later want a different model.
- Sonnet 4.6 is the cost/latency/quality balance for a per-turn loop; swap to Haiku for speed
  or Opus for richer prose without changing the call shape.
- `generateObject` failures (malformed/again-invalid output) must be handled — on failure the
  turn degrades to an authored setback rather than crashing.

## Alternatives considered

- **Raw Anthropic SDK tool-use** (forced tool with a JSON-schema input). More control, more
  boilerplate, no AI-SDK ergonomics.
- **OpenAI structured outputs / `zodResponseFormat`.** Equivalent capability but ties us to
  OpenAI; no reason to prefer it here.
- **Free-text + manual JSON parsing.** Rejected — fragile, and the whole point is a typed
  contract.
