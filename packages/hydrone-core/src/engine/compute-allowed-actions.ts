import type { SubGraph, ActionTemplate } from "../schema/zod";
import { templateRegistry } from "./template-registry";

/**
 * Pure: compute which action templates are unlocked by the current state.
 *
 * Filters to templates that are:
 * 1. Listed in the current node's allowed_actions, AND
 * 2. Have all required items present in the player's inventory, AND
 * 3. Have all required flags matching the expected values.
 *
 * An absent flag is treated as `false` (first-time pickup actions work
 * without pre-seeding flags).
 */
export function computeAllowedActions(state: SubGraph): ActionTemplate[] {
  const inventorySet = new Set(state.inventory);
  const nodeActionSet = new Set(state.current_node.allowed_actions);

  return templateRegistry.getAll().filter((template) => {
    // Must be available on the current node
    if (!nodeActionSet.has(template.template_id)) {
      return false;
    }
    // Check item requirements
    for (const itemId of template.requires.items) {
      if (!inventorySet.has(itemId)) {
        return false;
      }
    }

    // Check flag requirements.
    // An absent flag is treated as `false` so that first-time pickup
    // actions (which require flag: false) work without pre-seeding flags.
    for (const [key, expectedValue] of Object.entries(
      template.requires.flags,
    )) {
      const actualValue = state.flags[key] ?? false;
      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  });
}
