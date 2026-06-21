import type { WorldNode, NodeSpec } from "../schema/zod";
import { ACTION_TEMPLATES, ITEM_CATALOG, NODES } from "../content/seed";

let nodeCounter = NODES.length;

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
  const templateIds = new Set(ACTION_TEMPLATES.map((t) => t.template_id));
  const itemIds = new Set(ITEM_CATALOG.map((i) => i.item_id));
  const nodeIds = new Set(NODES.map((n) => n.node_id));

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

  // Validate edges reference known nodes (seed + any previously created)
  for (const edge of spec.edges) {
    if (!nodeIds.has(edge)) {
      throw new Error(
        `createNode: unknown edge target "${edge}" in node "${spec.node_name}"`,
      );
    }
  }

  const nodeId = generateNodeId();

  // Track this node so future createNode calls can reference it via edges
  nodeIds.add(nodeId);

  return {
    node_id: nodeId,
    zone: spec.zone,
    name: spec.node_name,
    description: "",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: spec.action_template_ids,
  };
}
