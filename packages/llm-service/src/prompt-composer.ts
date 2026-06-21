import type { TurnContext } from "@hydrone/core";

export interface ComposedPrompt {
  system: string;
  prompt: string;
}

const SYSTEM_PROMPT = "You are the narrator for Hydrone, an immersive sci-fi RPG set aboard a derelict research facility. Your job is to narrate the player's actions and drive the story forward with atmospheric, tense prose.\n\nIMPORTANT CONSTRAINTS:\n- You MUST select a chosen_action_id from the list of allowed actions provided.\n- You may optionally create a new_node_spec to expand the world, but ONLY using authored templates.\n- Your narrative should be atmospheric, concise (2-4 sentences), and reflect the action taken.\n- Provide 3-5 suggested_action_buttons for the next turn that are logically available in the current situation.\n- Include a brief system_log_message for the UI terminal (in-universe computer log style).\n- Character portrait mood must match the narrative tone: neutral, excited, worried, triumphant, or defeated.\n- Never invent new items or mechanics. Reference only items and actions from the provided catalog.";

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

  const neighborBlock =
    subgraph.neighbors.length > 0
      ? "\nNEARBY LOCATIONS:\n" +
        subgraph.neighbors
          .map(
            (n) =>
              "  - " + n.name + (n.is_unlocked ? "" : " [LOCKED]") + (n.is_corrupted ? " [CORRUPTED]" : "")
          )
          .join("\n")
      : "";

  const memoryBlock =
    memory_chunks.length > 0
      ? "\nMEMORY CONTEXT (from HydraDB - use for narrative enrichment):\n" +
        memory_chunks
          .map(
            (chunk, i) =>
              "  [Memory " + (i + 1) + "] (relevance: " + chunk.relevance_score.toFixed(2) + ")\n  " + chunk.content
          )
          .join("\n\n")
      : "\nMEMORY CONTEXT: (no relevant memories)";

  const actionsBlock =
    "\nALLOWED ACTIONS:\n" +
    allowed_actions
      .map(
        (a) =>
          "  - " + a.template_id + ": \"" + a.label + "\" \u2014 " + a.narrative_hint +
          (a.requires.items.length > 0
            ? " [Requires: " + a.requires.items.join(", ") + "]"
            : "")
      )
      .join("\n");

  const actionBlock = "\nPLAYER CHOSE: " + action_id + (chosenAction ? " (\"" + chosenAction.label + "\")" : "");

  const prompt = [
    locationBlock,
    inventoryBlock,
    flagsBlock,
    neighborBlock,
    memoryBlock,
    actionsBlock,
    actionBlock,
    "",
    "Narrate the outcome of this action. Include a brief system_log_message the in-universe computer would show, and suggest 3-5 next possible action buttons.",
  ].join("\n");

  return { system: SYSTEM_PROMPT, prompt };
}
