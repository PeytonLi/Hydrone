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
  getDb,
} from "@hydrone/core";
import { generateTurn, memory } from "@hydrone/llm-service";
import { historicalLedger, worldNodes, actionTemplates } from "@hydrone/core";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
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
  promptTokens: number;
  completionTokens: number;
  stats?: {
    health: number;
    max_health: number;
    energy: number;
    max_energy: number;
    corruption: number;
  };
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
    if (memoryChunks.length > 0) {
      console.log(
        `[HydraDB] Found ${memoryChunks.length} memory chunks for query`,
      );
    }
  } catch (err) {
    console.warn("[HydraDB] Query failed (non-blocking):", err);
    memoryChunks = [];
  }

  // 4. Generate turn via LLM (AI SDK + DeepSeek/Claude, Zod-validated)
  const turnCtx: TurnContext = {
    session_id: sessionId,
    subgraph,
    allowed_actions: allowedActions,
    memory_chunks: memoryChunks,
    action_id: actionId,
  };
  const llmResponse = await generateTurn(turnCtx);

  // Log whether the LLM proposed a new node
  if (llmResponse.new_node_spec) {
    console.log(
      `[WorldGen] LLM proposed new node: "${llmResponse.new_node_spec.node_name}" in zone ${llmResponse.new_node_spec.zone}`,
    );
  } else {
    console.log(`[WorldGen] LLM did NOT propose a new node this turn`);
  }

  // 5. Validate the action against authored gates (pure)
  const validation = validateAction(
    subgraph,
    actionId,
    llmResponse.new_node_spec,
  );

  if (!validation.ok && llmResponse.new_node_spec) {
    console.log(
      `[WorldGen] Node validation FAILED for "${llmResponse.new_node_spec.node_name}" — rejected`,
    );
  }

  // 6. Resolve effects: either the authored effects, or a tactical setback
  let effects: Mutation[];
  let wasSetback = false;

  if (validation.ok) {
    effects = [...validation.effects];

    // 6b. If LLM proposed a valid new node, create it and wire up edges
    if (llmResponse.new_node_spec) {
      try {
        const spec = llmResponse.new_node_spec;
        const newNode = createNode(spec);
        console.log(
          `[WorldGen] Created node "${newNode.name}" (${newNode.node_id})`,
        );
        const db = getDb();

        // Persist new node
        await db
          .insert(worldNodes)
          .values({
            node_id: newNode.node_id,
            zone: newNode.zone,
            name: newNode.name,
            description: newNode.description,
            is_unlocked: newNode.is_unlocked,
            is_corrupted: newNode.is_corrupted,
            allowed_actions: newNode.allowed_actions,
          })
          .onConflictDoNothing();

        // Wire up edges: create move_to templates and add to edge nodes' allowed_actions
        for (const edgeTargetId of spec.edges) {
          const moveActionId = `action-move-to-${newNode.node_id.replace("node-", "")}`;

          // Create move_to template from edge target → new node
          await db
            .insert(actionTemplates)
            .values({
              template_id: moveActionId,
              label: `Go to ${newNode.name}`,
              narrative_hint: `Travel to the newly discovered ${newNode.name}.`,
              requires: { items: [], flags: {} },
              effects: [{ type: "move_to", node_id: newNode.node_id }],
            })
            .onConflictDoNothing();

          // Read current allowed_actions, append new one, write back as jsonb
          const [edgeNode] = await db
            .select({ allowed_actions: worldNodes.allowed_actions })
            .from(worldNodes)
            .where(eq(worldNodes.node_id, edgeTargetId))
            .limit(1);

          if (edgeNode) {
            const currentActions: string[] = Array.isArray(
              edgeNode.allowed_actions,
            )
              ? edgeNode.allowed_actions
              : [];
            if (!currentActions.includes(moveActionId)) {
              const updatedActions = [...currentActions, moveActionId];
              await db
                .update(worldNodes)
                .set({ allowed_actions: updatedActions })
                .where(eq(worldNodes.node_id, edgeTargetId));
            }
          }

          console.log(
            `[WorldGen] Connected "${edgeTargetId}" ↔ "${newNode.node_id}"`,
          );
        }

        console.log(
          `[WorldGen] Persisted "${newNode.name}" with ${spec.edges.length} edges`,
        );
      } catch (err) {
        console.error(`[WorldGen] Failed to persist node:`, err);
      }
    }
  } else {
    // Tactical setback: zero state changes
    effects = validation.setback;
    wasSetback = true;
  }

  // 7. Commit effects as a single Postgres transaction
  await commitMutationBlock(sessionId, effects);

  // 7b. Write to historical ledger (Postgres)
  try {
    const db = getDb();
    await db.insert(historicalLedger).values({
      id: randomUUID(),
      session_id: sessionId,
      ts: new Date(),
      action: actionId,
      narrative_summary: llmResponse.narrative_text.slice(0, 500),
    });
  } catch {
    // Ledger write is non-blocking
  }

  // 8. Fire-and-forget episodic ingest into HydraDB
  const ledgerEntry: LedgerEntry = {
    session_id: sessionId,
    ts: new Date(),
    action: actionId,
    narrative_summary: llmResponse.narrative_text.slice(0, 200),
  };
  memory.ingestEpisode(sessionId, ledgerEntry);
  console.log(`[HydraDB] Episodic memory ingested for action: ${actionId}`);

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
    boundedCost: llmResponse.promptTokens ?? 1200,
    linearCost: 4500 + turnCount * 800,
    promptTokens: llmResponse.promptTokens ?? 0,
    completionTokens: llmResponse.completionTokens ?? 0,
    stats: updatedSubgraph.stats,
    wasSetback,
  };
}

/** Reset the turn counter (for test / demo purposes). */
export function resetTurnCounter(): void {
  turnCount = 0;
}
