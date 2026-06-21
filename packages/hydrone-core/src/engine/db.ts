import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, inArray } from "drizzle-orm";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SubGraph, WorldState, Mutation } from "../schema/zod";
import { NODES, ITEM_CATALOG, ACTION_TEMPLATES } from "../content/seed";
import * as schema from "../schema/postgres";
import { resolveActionTemplates } from "./validate-action";

let db: NodePgDatabase<typeof schema> | null = null;

/** Initialize the engine's database connection. Must be called before any DB operations. */
export function initEngine(databaseUrl: string): void {
  const pool = new Pool({ connectionString: databaseUrl });
  db = drizzle(pool, { schema });
}

/** Get the DB instance, throwing if not initialized. */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) {
    throw new Error(
      "Engine not initialized. Call initEngine(databaseUrl) first.",
    );
  }
  return db;
}

/** Close the database pool. */
export async function closeEngine(): Promise<void> {
  // The drizzle instance wraps a pg Pool; we access it indirectly
  if (db) {
    // drizzle-orm/node-postgres uses a Pool internally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pool = (db as any).$client as Pool | undefined;
    if (pool) await pool.end();
    db = null;
  }
}

/**
 * Load the current node + neighbors + inventory + flags for a session.
 * Fetches all authoritative state from Postgres in a single query sequence.
 */
export async function fetchSubGraph(sessionId: string): Promise<SubGraph> {
  const d = getDb();

  // Load session to find current location
  const [session] = await d
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.session_id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Load current node
  const [currentNode] = await d
    .select()
    .from(schema.worldNodes)
    .where(eq(schema.worldNodes.node_id, session.current_location_id))
    .limit(1);

  if (!currentNode) {
    throw new Error(`Current node not found: ${session.current_location_id}`);
  }

  // Compute neighbors from the current node's allowed actions
  const actionTemplates = resolveActionTemplates(currentNode.allowed_actions);
  const neighborNodeIds = new Set<string>();
  for (const template of actionTemplates) {
    for (const effect of template.effects) {
      if (effect.type === "move_to") {
        neighborNodeIds.add(effect.node_id);
      }
    }
  }

  // Load neighbor nodes
  const neighborNodes =
    neighborNodeIds.size > 0
      ? await d
          .select()
          .from(schema.worldNodes)
          .where(
            inArray(schema.worldNodes.node_id, Array.from(neighborNodeIds)),
          )
      : [];

  // Load inventory
  const inventoryRows = await d
    .select({ item_id: schema.playerInventory.item_id })
    .from(schema.playerInventory)
    .where(eq(schema.playerInventory.session_id, sessionId));

  const inventory = inventoryRows.map((r) => r.item_id);

  // Load flags
  const flagRows = await d
    .select()
    .from(schema.storyFlags)
    .where(eq(schema.storyFlags.session_id, sessionId));

  const flags: Record<string, boolean> = {};
  for (const row of flagRows) {
    flags[row.key] = row.value;
  }

  // Map Drizzle rows to the WorldNode type
  const mapNode = (
    n: typeof currentNode,
  ): import("../schema/zod").WorldNode => ({
    node_id: n.node_id,
    zone: n.zone,
    name: n.name,
    description: n.description,
    is_unlocked: n.is_unlocked,
    is_corrupted: n.is_corrupted,
    allowed_actions: n.allowed_actions,
  });

  return {
    session_id: sessionId,
    current_node: mapNode(currentNode),
    neighbors: neighborNodes.map(mapNode),
    inventory,
    flags,
  };
}

/**
 * Commit a block of authored effects as a single Postgres transaction.
 * If any effect fails validation, the entire block is rolled back with zero writes.
 */
export async function commitMutationBlock(
  sessionId: string,
  effects: Mutation[],
): Promise<WorldState> {
  const d = getDb();

  await d.transaction(async (tx) => {
    for (const effect of effects) {
      switch (effect.type) {
        case "add_item": {
          await tx
            .insert(schema.playerInventory)
            .values({
              session_id: sessionId,
              item_id: effect.item_id,
            })
            .onConflictDoNothing();
          break;
        }

        case "remove_item": {
          await tx
            .delete(schema.playerInventory)
            .where(
              and(
                eq(schema.playerInventory.session_id, sessionId),
                eq(schema.playerInventory.item_id, effect.item_id),
              ),
            );
          break;
        }

        case "set_flag": {
          await tx
            .insert(schema.storyFlags)
            .values({
              session_id: sessionId,
              key: effect.key,
              value: effect.value,
            })
            .onConflictDoUpdate({
              target: [schema.storyFlags.session_id, schema.storyFlags.key],
              set: { value: effect.value },
            });
          break;
        }

        case "unlock_node": {
          await tx
            .update(schema.worldNodes)
            .set({ is_unlocked: true })
            .where(eq(schema.worldNodes.node_id, effect.node_id));
          break;
        }

        case "corrupt_node": {
          await tx
            .update(schema.worldNodes)
            .set({ is_corrupted: true })
            .where(eq(schema.worldNodes.node_id, effect.node_id));
          break;
        }

        case "move_to": {
          await tx
            .update(schema.sessions)
            .set({
              current_location_id: effect.node_id,
              last_updated: new Date(),
            })
            .where(eq(schema.sessions.session_id, sessionId));
          break;
        }
      }
    }
  });

  // Return the new world state after the transaction
  const subgraph = await fetchSubGraph(sessionId);
  return {
    session_id: sessionId,
    current_location_id: subgraph.current_node.node_id,
    inventory: subgraph.inventory,
    flags: subgraph.flags,
  };
}

/**
 * Insert seed data (world_nodes, item_catalog, action_templates) into Postgres.
 * Idempotent — uses ON CONFLICT DO NOTHING so it's safe to call multiple times.
 */
export async function loadSeed(): Promise<void> {
  const d = getDb();

  await d.transaction(async (tx) => {
    // Insert nodes
    for (const node of NODES) {
      await tx
        .insert(schema.worldNodes)
        .values({
          node_id: node.node_id,
          zone: node.zone,
          name: node.name,
          description: node.description,
          is_unlocked: node.is_unlocked,
          is_corrupted: node.is_corrupted,
          allowed_actions: node.allowed_actions,
        })
        .onConflictDoNothing();
    }

    // Insert items
    for (const item of ITEM_CATALOG) {
      await tx
        .insert(schema.itemCatalog)
        .values({
          item_id: item.item_id,
          name: item.name,
          description: item.description,
        })
        .onConflictDoNothing();
    }

    // Insert action templates
    for (const template of ACTION_TEMPLATES) {
      await tx
        .insert(schema.actionTemplates)
        .values({
          template_id: template.template_id,
          label: template.label,
          narrative_hint: template.narrative_hint,
          requires: template.requires,
          effects: template.effects,
        })
        .onConflictDoNothing();
    }
  });
}
