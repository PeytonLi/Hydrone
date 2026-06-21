import type { SubGraph, NodeSpec, Mutation, ActionTemplate } from '../schema/zod';
import { ITEM_CATALOG } from '../content/seed';
import { computeAllowedActions } from './compute-allowed-actions';
import { templateRegistry } from './template-registry';

/**
 * Pure: assert that the chosen action is in the allowed set and validate any
 * new_node_spec against the authored catalog. On failure, returns a tactical
 * setback with zero state written to the database.
 */
export function validateAction(
  state: SubGraph,
  actionId: string,
  newNodeSpec?: NodeSpec
): { ok: true; effects: Mutation[] } | { ok: false; setback: Mutation[] } {
  // Find the action template
  const template = templateRegistry.get(actionId);
  if (!template) {
    return { ok: false, setback: [] };
  }

  // Check if this action is allowed given the current state
  const allowed = computeAllowedActions(state);
  const isAllowed = allowed.some((t) => t.template_id === actionId);
  if (!isAllowed) {
    return { ok: false, setback: [] };
  }

  // If the action includes a new_node_spec, validate it against the catalog
  if (newNodeSpec) {
    const specValidation = validateNodeSpec(newNodeSpec);
    if (!specValidation.ok) {
      return { ok: false, setback: [] };
    }
  }

  return { ok: true, effects: [...template.effects] };
}

/** Validate a new_node_spec against the item catalog and action templates. */
function validateNodeSpec(
  spec: NodeSpec
): { ok: true } | { ok: false; reason: string } {
  const templateIds = new Set(templateRegistry.getAll().map((t) => t.template_id));
  const itemIds = new Set(ITEM_CATALOG.map((i) => i.item_id));

  // Every action_template_id must reference a real template
  for (const tid of spec.action_template_ids) {
    if (!templateIds.has(tid)) {
      return { ok: false, reason: `Unknown template_id: ${tid}` };
    }
  }

  // Every item_id must reference a real catalog item
  for (const iid of spec.item_ids) {
    if (!itemIds.has(iid)) {
      return { ok: false, reason: `Unknown item_id: ${iid}` };
    }
  }

  return { ok: true };
}

/**
 * Given an allowed set of actions, look up the full template for each.
 * Useful when you have a list of template IDs (e.g. from a node's allowed_actions)
 * and you need the full template objects.
 */
export function resolveActionTemplates(actionIds: string[]): ActionTemplate[] {
  return actionIds
    .map((id) => templateRegistry.get(id))
    .filter((t): t is ActionTemplate => t !== undefined);
}
