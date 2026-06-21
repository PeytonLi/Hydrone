# Hydrone

**LLM-driven games, deterministic state.** A text-based RPG engine that proves you can have
creative AI narration without sacrificing rule enforcement, consistency, or cost control.

---

## The Problem

Every text-based AI game built on a rolling chat log breaks in the same three ways:

### 1. Hallucinated State
The model lives inside a growing conversation. Fifty turns in, it forgets a door was blown open,
invents items you never picked up, or contradicts a decision made ten messages ago. There is no
source of truth — the LLM *is* the state, which means it drifts.

### 2. Linear Cost Scaling
Each turn replays the entire chat history to the model. Turn 1 costs X tokens. Turn 100 costs
100X. The longer you play, the more expensive each response becomes. A session that's fun at the
start becomes economically unviable at scale.

### 3. No Hard Rule Enforcement
A text agent can't guarantee "no keycard, no vault." It can be told to enforce rules in its
system prompt, but it can be talked out of them, forget them, or just hallucinate past them.
There is no mechanical guarantee — only a strong suggestion.

---

## The Solution

Hydrone decouples what a chat log conflates into three separate, purpose-built layers:

| Responsibility | Where it lives | Guarantee |
|---|---|---|
| Authoritative game state | **Postgres** | Exact, transactional, atomic |
| Long-term episodic memory | **HydraDB** | Queryable, ranked, async |
| Narration and creativity | **LLM (DeepSeek)** | Never touches state directly |

**The key insight:** the LLM selects from a pre-authored set of gated actions and narrates the
result. It cannot invent mechanics, mutate state, or bypass requirements. All state changes are
*authored effects* behind *authored gates*, committed to Postgres in a single transaction.

### How a turn works

```
Player chooses an action
        │
        ▼
  fetchSubGraph()          ← load exact state from Postgres
        │
        ▼
  computeAllowedActions()  ← pure: what gates are currently open?
        │
        ▼
  generateTurn()           ← LLM narrates + picks chosen_action_id + optionally proposes new node
        │
        ▼
  validateAction()         ← engine checks requirements (items, flags) — pure, no I/O
        │
   ┌────┴────┐
valid?       invalid?
   │              │
   ▼              ▼
commitMutation()  tactical setback — 0 writes to Postgres
   │
   ▼
fetchSubGraph()   ← re-fetch authoritative state
   │
   ▼
memory.ingest()   ← fire-and-forget into HydraDB (never authoritative)
```

### The Keycard Gate (determinism showcase)

The vault requires a keycard in inventory. Without it:
- The LLM can narrate an attempt
- `validateAction()` rejects the action
- Zero writes to Postgres
- The door does not open — regardless of what the LLM says

With the keycard: the authored `action-access-vault` gate opens, effects commit, the player moves.
The LLM did not decide. The engine did.

### Live World Generation

On any turn, the LLM can propose a `new_node_spec` — a new room, corridor, or area. If it passes
schema validation (valid edges, catalog items, authored action templates), the engine:

1. Creates a new `world_nodes` row in Postgres
2. Creates a `move_to` action template
3. Wires the edge into neighboring nodes' `allowed_actions`

The new node is permanent, navigable, and part of the world from that point forward. If the
proposed spec references an unknown item or invalid edge target, it is rejected entirely.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               apps/game-client (Next.js 15)          │
│                                                       │
│  Panel A: Cost chart + drift demo                     │
│  Panel B: Location, actions, inventory, narrative     │
│  Panel C: Live Postgres state inspector               │
│                                                       │
│  /api/turn  ←── SAM loop (State→Action→Mutation)     │
│  /api/session ←── session bootstrap + seed           │
└────────────────────────┬────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────┐
│  packages/           │    │  packages/               │
│  hydrone-core        │    │  llm-service             │
│                      │    │                          │
│  Zod schemas         │    │  generateTurn()          │
│  Drizzle ORM         │    │  DeepSeek via AI SDK     │
│  Postgres tables     │    │  (Anthropic fallback)    │
│  Deterministic       │    │                          │
│  engine:             │    │  HydraDB memory client   │
│  ├ computeAllowed    │    │  ├ memory.query()        │
│  ├ validateAction    │    │  └ memory.ingest()       │
│  ├ commitMutation    │    │                          │
│  ├ createNode        │    └─────────────────────────┘
│  └ templateRegistry  │
└──────────┬───────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
  Postgres      HydraDB
  (Neon/        (episodic
  Supabase)     memory)

  SOURCE OF     RECALL ONLY
  TRUTH         never authoritative
```

### Postgres schema

| Table | Purpose |
|---|---|
| `world_nodes` | Every location — seed + dynamically generated |
| `action_templates` | Authored gates with `requires` and `effects` |
| `item_catalog` | All items that can exist |
| `sessions` | Active sessions + current location |
| `player_inventory` | Items per session |
| `story_flags` | Boolean flags per session |
| `player_stats` | Health, energy, corruption per session |
| `historical_ledger` | Append-only turn log |

### Cost comparison

| Approach | Turn 1 | Turn 100 |
|---|---|---|
| Linear chat log | ~1,200 tokens | ~120,000 tokens |
| Hydrone (bounded context) | ~1,500 tokens | ~1,500 tokens |

Hydrone sends a bounded context every turn: current node + inventory + nearby actions + memory
snippets. Size is constant regardless of session length.

---

## Monorepo layout

```
apps/
  game-client/        Next.js 15 App Router — three-panel demo UI + SAM API routes
packages/
  hydrone-core/       Zod schemas, Drizzle schema, deterministic engine, seed content
  llm-service/        Vercel AI SDK turn generation + HydraDB memory client
```

Tooling: **pnpm** workspaces + **Turborepo**. Styling: Tailwind + Lucide icons.
Client state: Zustand. Tests: Vitest.

---

## Quickstart

```bash
pnpm install
cp .env.example .env.local      # fill in values (see below)
pnpm db:push                    # apply Drizzle schema to your Postgres instance
pnpm dev                        # starts game-client on http://localhost:3000
```

The seed world (6 nodes, keycard → vault gate) loads automatically on first session creation.

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon or Supabase Postgres connection string |
| `DEEPSEEK_API_KEY` | Yes | Primary LLM — get from platform.deepseek.com |
| `HYDRA_DB_API_KEY` | Yes | Episodic memory layer — get from app.hydradb.com |
| `AUTH_SECRET` | Yes | Any random string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` for local dev |
| `ANTHROPIC_API_KEY` | No | Optional fallback LLM if DeepSeek key is absent |

### Deploy to Vercel

The repo includes a `vercel.json` in `apps/game-client/`. Import the repo on Vercel, set the
root directory to `apps/game-client`, add the environment variables above, and deploy.

---

## The demo UI

**Panel A — The Cause**
The engineering argument: a live bounded-vs-linear token cost chart updated each turn, plus a
"Simulate Memory Drift" toggle that replays a canned broken-chatbot transcript to show what
hallucinated state looks like.

**Panel B — The Action**
The game itself: location name and description, gated action buttons (greyed out when requirements
aren't met), inventory, stats (HP / Energy / Corruption), and a retro typing terminal for
narrative output.

**Panel C — The Proof**
Live Postgres state inspector — rows flash yellow on every write. A HydraDB memory readout shows
what episodic context was recalled this turn. "Simulate Device Destruction" clears the client
entirely and re-hydrates from Postgres, proving state lives in the database, not the browser.

---

## Key invariants

1. **State is Postgres only.** HydraDB is queried for narrative enrichment, never for state reads.
2. **The LLM emits `chosen_action_id`, not free mutations.** The engine owns all effects.
3. **Generated geography uses only authored bricks** — catalog items and existing action templates.
4. **Every write is a transaction.** Validation failure = zero writes, tactical setback narrative.
