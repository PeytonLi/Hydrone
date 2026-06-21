import type { WorldNode, NodeSpec } from "../schema/zod";
import { ITEM_CATALOG, NODES } from "../content/seed";
import { templateRegistry } from "./template-registry";

let nodeCounter = NODES.length;

// Module-level set of known node IDs — starts with seed nodes and grows as
// dynamic nodes are created or reloaded from Postgres on cold start.
const knownNodeIds = new Set(NODES.map((n) => n.node_id));

/** Register node IDs from Postgres on cold start so edge validation works. */
export function registerNodeIds(ids: string[]): void {
  for (const id of ids) knownNodeIds.add(id);
}

/** Generate a unique node_id for a dynamically created node. */
function generateNodeId(): string {
  nodeCounter++;
  return `node-dynamic-${nodeCounter}`;
}

/**
 * Validate a NodeSpec against the item catalog and action templates,
 * then construct a WorldNode. Throws if validation fails.
 *
 * This is the authoritative node-creation function — it ensures no
 * dynamically generated node can smuggle in unknown items or actions.
 */
export function createNode(spec: NodeSpec): WorldNode {
  const templateIds = new Set(
    templateRegistry.getAll().map((t) => t.template_id),
  );
  const itemIds = new Set(ITEM_CATALOG.map((i) => i.item_id));

  // Validate every action_template_id references a real template
  for (const tid of spec.action_template_ids) {
    if (!templateIds.has(tid)) {
      throw new Error(
        `createNode: unknown template_id "${tid}" in node "${spec.node_name}"`,
      );
    }
  }

  // Validate every item_id references a real catalog item
  for (const iid of spec.item_ids) {
    if (!itemIds.has(iid)) {
      throw new Error(
        `createNode: unknown item_id "${iid}" in node "${spec.node_name}"`,
      );
    }
  }

  // Validate edges reference known nodes (seed + dynamic from this session or prior)
  for (const edge of spec.edges) {
    if (!knownNodeIds.has(edge)) {
      throw new Error(
        `createNode: unknown edge target "${edge}" in node "${spec.node_name}"`,
      );
    }
  }

  const nodeId = generateNodeId();
  knownNodeIds.add(nodeId);

  return {
    node_id: nodeId,
    zone: spec.zone,
    name: spec.node_name,
    description: spec.node_description || "",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: spec.action_template_ids,
  };
}
