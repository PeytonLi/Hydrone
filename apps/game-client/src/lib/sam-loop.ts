/**
 * SAM Loop — the per-turn pipeline that wires the deterministic engine
 * (hydrone-core) to the LLM + memory service (llm-service).
 *
 *   State → Allowed Actions → Memory Recall → LLM Turn →
 *   Validate → Commit → Ledger → Episodic Ingest → Return
 *
 * This is the single integration point that replaces Agent D's mocks.
 */
import {
  fetchSubGraph,
  computeAllowedActions,
  validateAction,
  commitMutationBlock,
  createNode,
} from "@hydrone/core";
import { generateTurn, memory } from "@hydrone/llm-service";
import type {
  WorldNode,
  ActionTemplate,
  Chunk,
  TurnContext,
  LedgerEntry,
  Mutation,
} from "@hydrone/core";

// ── Public types ──────────────────────────────────────────────────────────

export interface SamLoopInput {
  sessionId: string;
  actionId: string;
}

export interface SamLoopOutput {
  sessionId: string;
  currentNode: WorldNode;
  neighbors: WorldNode[];
  inventory: string[];
  flags: Record<string, boolean>;
  allowedActions: ActionTemplate[];
  narrativeText: string;
  systemLogMessage: string;
  characterMood: "neutral" | "excited" | "worried" | "triumphant" | "defeated";
  memoryChunks: Chunk[];
  boundedCost: number;
  linearCost: number;
  /** Whether the action was rejected (tactical setback applied). */
  wasSetback: boolean;
}

/** In-memory turn counter for cost display (not authoritative). */
let turnCount = 0;

// ── Core loop ─────────────────────────────────────────────────────────────

export async function executeSamLoop(
  input: SamLoopInput,
): Promise<SamLoopOutput> {
  const { sessionId, actionId } = input;
  turnCount++;

  // 1. Load exact state from Postgres
  const subgraph = await fetchSubGraph(sessionId);

  // 2. Compute allowed actions (pure, no I/O)
  const allowedActions = computeAllowedActions(subgraph);

  // 3. Query HydraDB for memory context (narrative enrichment only)
  let memoryChunks: Chunk[] = [];
  try {
    memoryChunks = await memory.query(
      sessionId,
      `${actionId} ${subgraph.current_node.name}`,
    );
  } catch {
    // Memory query failure is non-blocking — continue without context
    memoryChunks = [];
  }

  // 4. Generate turn via LLM (AI SDK + Claude, Zod-validated)
  const turnCtx: TurnContext = {
    session_id: sessionId,
    subgraph,
    allowed_actions: allowedActions,
    memory_chunks: memoryChunks,
    action_id: actionId,
  };
  const llmResponse = await generateTurn(turnCtx);

  // 5. Validate the action against authored gates (pure)
  const validation = validateAction(
    subgraph,
    actionId,
    llmResponse.new_node_spec,
  );

  // 6. Resolve effects: either the authored effects, or a tactical setback
  let effects: Mutation[];
  let wasSetback = false;

  if (validation.ok) {
    effects = [...validation.effects];

    // 6b. If LLM proposed a valid new node, create it and add to effects
    if (llmResponse.new_node_spec) {
      try {
        createNode(llmResponse.new_node_spec);
        // TODO: persist newNode to Postgres in the transaction block
      } catch {
        // Node creation failure is non-blocking
      }
    }
  } else {
    // Tactical setback: zero state changes
    effects = validation.setback;
    wasSetback = true;
  }

  // 7. Commit effects as a single Postgres transaction
  //    (setback effects are empty — zero writes occur)
  await commitMutationBlock(sessionId, effects);

  // 8. Fire-and-forget episodic ingest into HydraDB
  const ledgerEntry: LedgerEntry = {
    session_id: sessionId,
    ts: new Date(),
    action: actionId,
    narrative_summary: llmResponse.narrative_text.slice(0, 200),
  };
  memory.ingestEpisode(sessionId, ledgerEntry);

  // 9. Re-fetch state to get the authoritative post-commit view
  const updatedSubgraph = await fetchSubGraph(sessionId);

  // 10. Recompute allowed actions for the new location
  const updatedAllowedActions = computeAllowedActions(updatedSubgraph);

  return {
    sessionId,
    currentNode: updatedSubgraph.current_node,
    neighbors: updatedSubgraph.neighbors,
    inventory: updatedSubgraph.inventory,
    flags: updatedSubgraph.flags,
    allowedActions: updatedAllowedActions,
    narrativeText: wasSetback
      ? `[SETBACK] ${llmResponse.narrative_text}`
      : llmResponse.narrative_text,
    systemLogMessage: wasSetback
      ? `VALIDATION_FAILED: Action "${actionId}" rejected. 0 writes to Postgres.`
      : llmResponse.system_log_message,
    characterMood: wasSetback ? "worried" : llmResponse.character_portrait_mood,
    memoryChunks,
    boundedCost: 1200,
    linearCost: 4500 + turnCount * 800,
    wasSetback,
  };
}

/** Reset the turn counter (for test / demo purposes). */
export function resetTurnCounter(): void {
  turnCount = 0;
}
