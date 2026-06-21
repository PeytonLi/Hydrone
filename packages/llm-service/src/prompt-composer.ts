import type { TurnContext } from "@hydrone/core";
import { ACTION_TEMPLATES, ITEM_CATALOG } from "@hydrone/core";

export interface ComposedPrompt {
  system: string;
  prompt: string;
}

const SYSTEM_PROMPT =
  "You are the narrator for Hydrone, an immersive sci-fi RPG set aboard a derelict research facility. Your job is to narrate the player's actions and drive the story forward with atmospheric, tense prose.\n\n" +
  "IMPORTANT CONSTRAINTS:\n" +
  "- You MUST select a chosen_action_id from the list of allowed actions provided.\n" +
  "- EVERY TURN you MUST create a new_node_spec to expand the world. This is REQUIRED, not optional. Generate at least one new area, room, corridor, or location the player could discover. Use the MEMORY CONTEXT from HydraDB to tie new areas to the player's history.\n" +
  "- new_node_spec format: { node_name: string, zone: string, node_description: string (1-2 atmospheric sentences), edges: [existing node_ids from CURRENT or NEARBY], action_template_ids: [from ALL Template IDs list], item_ids: [from ALL Item IDs list] }\n" +
  "- Example new_node_spec: { node_name: 'Abandoned Armory', zone: 'sector-7', node_description: 'Weapon racks line the walls, most empty. A single plasma rifle sits locked in a glass case.', edges: ['node-corridor-a'], action_template_ids: ['action-examine', 'action-pick-up-keycard'], item_ids: [] }\n" +
  "- Your narrative should be atmospheric, concise (2-4 sentences), and reflect the action taken.\n" +
  "- Provide 3-5 suggested_action_buttons for the next turn.\n" +
  "- Include a brief system_log_message for the UI terminal (in-universe computer log style).\n" +
  "- Character portrait mood must match the narrative tone: neutral, excited, worried, triumphant, or defeated.\n" +
  "- Never invent new template_ids or item_ids. Only use IDs from the provided lists.";

export function composePrompt(ctx: TurnContext): ComposedPrompt {
  const { subgraph, allowed_actions, memory_chunks, action_id } = ctx;
  const node = subgraph.current_node;
  const chosenAction = allowed_actions.find((a) => a.template_id === action_id);

  const locationBlock = [
    "CURRENT LOCATION:",
    "  Name: " + node.name,
    "  Zone: " + node.zone,
    "  Description: " + node.description,
    node.is_corrupted ? "  WARNING: This area is corrupted!" : "",
    node.is_unlocked ? "" : "  STATUS: Locked",
  ]
    .filter(Boolean)
    .join("\n");

  const inventoryBlock =
    subgraph.inventory.length > 0
      ? "\nPLAYER INVENTORY:\n" +
        subgraph.inventory.map((item) => "  - " + item).join("\n")
      : "\nPLAYER INVENTORY: (empty)";

  const flagsBlock =
    Object.keys(subgraph.flags).length > 0
      ? "\nSTORY FLAGS:\n" +
        Object.entries(subgraph.flags)
          .map(([k, v]) => "  " + k + ": " + v)
          .join("\n")
      : "";

  const stats = (subgraph as any).stats;
  const statsBlock = stats
    ? "\nPLAYER STATS:\n" +
      "  Health: " +
      stats.health +
      "/" +
      stats.max_health +
      "\n" +
      "  Energy: " +
      stats.energy +
      "/" +
      stats.max_energy +
      "\n" +
      "  Corruption: " +
      stats.corruption +
      "%"
    : "";

  const neighborBlock =
    subgraph.neighbors.length > 0
      ? "\nNEARBY LOCATIONS:\n" +
        subgraph.neighbors
          .map(
            (n) =>
              "  - " +
              n.name +
              (n.is_unlocked ? "" : " [LOCKED]") +
              (n.is_corrupted ? " [CORRUPTED]" : ""),
          )
          .join("\n")
      : "";

  const memoryBlock =
    memory_chunks.length > 0
      ? "\nMEMORY CONTEXT (from HydraDB - use for narrative enrichment):\n" +
        memory_chunks
          .map(
            (chunk, i) =>
              "  [Memory " +
              (i + 1) +
              "] (relevance: " +
              chunk.relevance_score.toFixed(2) +
              ")\n  " +
              chunk.content,
          )
          .join("\n\n")
      : "\nMEMORY CONTEXT: (no relevant memories)";

  const actionsBlock =
    "\nALLOWED ACTIONS:\n" +
    allowed_actions
      .map(
        (a) =>
          "  - " +
          a.template_id +
          ': "' +
          a.label +
          '" \u2014 ' +
          a.narrative_hint +
          (a.requires.items.length > 0
            ? " [Requires: " + a.requires.items.join(", ") + "]"
            : ""),
      )
      .join("\n");

  const actionBlock =
    "\nPLAYER CHOSE: " +
    action_id +
    (chosenAction ? ' ("' + chosenAction.label + '")' : "");

  const prompt = [
    locationBlock,
    inventoryBlock,
    flagsBlock,
    statsBlock,
    neighborBlock,
    memoryBlock,
    actionsBlock,
    actionBlock,
    "",
    "AVAILABLE BRICKS FOR NEW NODES (if you create a new_node_spec):",
    "  ALL Template IDs: " +
      ACTION_TEMPLATES.map((a) => a.template_id).join(", "),
    "  ALL Item IDs: " + ITEM_CATALOG.map((i) => i.item_id).join(", "),
    "  Valid edge targets: " +
      [
        subgraph.current_node.node_id,
        ...subgraph.neighbors.map((n) => n.node_id),
      ].join(", "),
    "",
    "If you create a new_node_spec, it should have: node_name, zone (use current zone), node_description (1-2 atmospheric sentences), edges (array of existing node_ids), action_template_ids (from template IDs above), item_ids (from item IDs above).",
    "",
    "Narrate the outcome of this action. Include a brief system_log_message the in-universe computer would show, and suggest 3-5 next possible action buttons.",
  ].join("\n");

  return { system: SYSTEM_PROMPT, prompt };
}
