import { NextRequest, NextResponse } from "next/server";

// Agent D: Mock SAM API route wired against A-defined interfaces.
// Replace with real engine+llm calls when Agent E integrates.

const MOCK_INIT: any = {
  sessionId: "demo-1",
  currentNode: {
    node_id: "node-entrance",
    zone: "sector-7",
    name: "Entrance Hall",
    description: "A dusty anteroom.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: ["action-examine", "action-move-to-corridor-a"],
  },
  neighbors: [
    {
      node_id: "node-corridor-a",
      zone: "sector-7",
      name: "Corridor Alpha",
      description: "A long hallway.",
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: [
        "action-examine",
        "action-move-to-entrance",
        "action-move-to-security",
        "action-move-to-storage",
      ],
    },
  ],
  inventory: [],
  flags: {},
  allowedActions: [],
  narrativeText: "",
  systemLogMessage: "",
  characterMood: "neutral",
  memoryChunks: [],
  boundedCost: 1200,
  linearCost: 4500,
};

const NODES: Record<string, any> = {
  "node-entrance": {
    node_id: "node-entrance",
    zone: "sector-7",
    name: "Entrance Hall",
    description: "A dusty anteroom.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: ["action-examine", "action-move-to-corridor-a"],
  },
  "node-corridor-a": {
    node_id: "node-corridor-a",
    zone: "sector-7",
    name: "Corridor Alpha",
    description: "Sparking wires.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-move-to-entrance",
      "action-move-to-security",
      "action-move-to-storage",
    ],
  },
  "node-security": {
    node_id: "node-security",
    zone: "sector-7",
    name: "Security Checkpoint",
    description: "Dead monitors. A keycard on the floor.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-pick-up-keycard",
      "action-move-to-corridor-a",
      "action-move-to-corridor-b",
    ],
  },
  "node-storage": {
    node_id: "node-storage",
    zone: "sector-7",
    name: "Storage Room",
    description: "Dusty shelves. A medkit on the floor.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-pick-up-medkit",
      "action-move-to-corridor-a",
    ],
  },
  "node-corridor-b": {
    node_id: "node-corridor-b",
    zone: "sector-7",
    name: "Corridor Beta",
    description: "Narrow corridor. Vault door ahead.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-move-to-security",
      "action-access-vault",
    ],
  },
  "node-vault": {
    node_id: "node-vault",
    zone: "sector-7",
    name: "Vault Chamber",
    description: "Server racks hum. The data chip is here.",
    is_unlocked: false,
    is_corrupted: false,
    allowed_actions: ["action-examine", "action-retrieve-data-chip"],
  },
};

const ACTIONS: Record<string, any> = {
  "action-examine": {
    template_id: "action-examine",
    label: "Examine Surroundings",
    narrative_hint: "Survey for clues.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  "action-move-to-entrance": {
    template_id: "action-move-to-entrance",
    label: "Go to Entrance Hall",
    narrative_hint: "Head back.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-entrance" }],
  },
  "action-move-to-corridor-a": {
    template_id: "action-move-to-corridor-a",
    label: "Go to Corridor Alpha",
    narrative_hint: "Move forward.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-corridor-a" }],
  },
  "action-move-to-security": {
    template_id: "action-move-to-security",
    label: "Go to Security Checkpoint",
    narrative_hint: "Checkpoint ahead.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-security" }],
  },
  "action-move-to-storage": {
    template_id: "action-move-to-storage",
    label: "Go to Storage Room",
    narrative_hint: "Side room.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-storage" }],
  },
  "action-move-to-corridor-b": {
    template_id: "action-move-to-corridor-b",
    label: "Go to Corridor Beta",
    narrative_hint: "Toward vault.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-corridor-b" }],
  },
  "action-pick-up-keycard": {
    template_id: "action-pick-up-keycard",
    label: "Pick Up Keycard",
    narrative_hint: "Grab the badge.",
    requires: { items: [], flags: { keycard_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-keycard" },
      { type: "set_flag", key: "keycard_taken", value: true },
    ],
  },
  "action-pick-up-medkit": {
    template_id: "action-pick-up-medkit",
    label: "Retrieve Medkit",
    narrative_hint: "Grab the kit.",
    requires: { items: [], flags: { medkit_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-medkit" },
      { type: "set_flag", key: "medkit_taken", value: true },
    ],
  },
  "action-access-vault": {
    template_id: "action-access-vault",
    label: "Access Vault",
    narrative_hint: "Swipe keycard.",
    requires: { items: ["item-keycard"], flags: {} },
    effects: [
      { type: "unlock_node", node_id: "node-vault" },
      { type: "set_flag", key: "vault_accessed", value: true },
      { type: "move_to", node_id: "node-vault" },
    ],
  },
  "action-retrieve-data-chip": {
    template_id: "action-retrieve-data-chip",
    label: "Retrieve Data Chip",
    narrative_hint: "Extract the chip.",
    requires: { items: [], flags: { vault_accessed: true } },
    effects: [
      { type: "add_item", item_id: "item-data-chip" },
      { type: "set_flag", key: "data_retrieved", value: true },
    ],
  },
};

const RESPONSES: Record<string, any> = {
  "action-examine": {
    nt: "You scan the area carefully. Faded warning signs line the walls. Nothing immediately useful, but you feel more oriented.",
    mood: "neutral",
    log: "Turn T - Examine: no state changes.",
  },
  "action-move-to-entrance": {
    nt: "You backtrack to the entrance hall. The same dusty anteroom as before.",
    mood: "neutral",
    log: "Turn T - Moved to Entrance Hall.",
  },
  "action-move-to-corridor-a": {
    nt: "Corridor Alpha stretches ahead. Sparking wires hang from the ceiling. Two doors break the monotony: SECURITY on the left, STORAGE on the right.",
    mood: "excited",
    log: "Turn T - Moved to Corridor Alpha.",
  },
  "action-move-to-security": {
    nt: "The Security Checkpoint. Banks of dead monitors line the walls. A magnetic keycard badge lies on the floor beside an overturned chair.",
    mood: "excited",
    log: "Turn T - Entered Security Checkpoint. Keycard detected.",
  },
  "action-move-to-storage": {
    nt: "The Storage Room smells of rust and ozone. Metal shelves hold dusty equipment. A sealed medkit sits on the floor, somehow untouched.",
    mood: "neutral",
    log: "Turn T - Entered Storage Room. Medkit detected.",
  },
  "action-move-to-corridor-b": {
    nt: "The corridor narrows. Ahead, a heavy biometric vault door looms. Its red indicator light blinks steadily.",
    mood: "worried",
    log: "Turn T - Moved to Corridor Beta.",
  },
  "action-pick-up-keycard": {
    nt: "You pick up the magnetic security badge. The Hydrone Systems logo is barely legible, but the strip looks intact. This might grant deeper access.",
    mood: "triumphant",
    log: "Turn T - ITEM: Security Keycard acquired. Flag: keycard_taken=true.",
  },
  "action-pick-up-medkit": {
    nt: "You retrieve the sealed medkit. Expired by two years, but the supplies inside look usable. Better than nothing.",
    mood: "neutral",
    log: "Turn T - ITEM: Medical Kit acquired. Flag: medkit_taken=true.",
  },
  "action-access-vault": {
    nt: "You swipe the keycard. The red light blinks... then turns GREEN with a satisfying CLUNK. The vault door hisses open, revealing a climate-controlled chamber. Server racks hum with life.",
    mood: "triumphant",
    log: "Turn T - VAULT ACCESSED. Node unlocked. Flag: vault_accessed=true.",
  },
  "action-retrieve-data-chip": {
    nt: "You extract the data chip from the server tray. CRITICAL RESEARCH DATA - the entire mission hinges on this.",
    mood: "triumphant",
    log: "Turn T - ITEM: Data Chip acquired. Flag: data_retrieved=true.",
  },
};

let state = JSON.parse(JSON.stringify(MOCK_INIT));
let turns = 0;

function applyEffects(
  effects: any[],
  inv: string[],
  flags: Record<string, boolean>,
  curNode: any,
  nodes: Record<string, any>,
) {
  for (const e of effects) {
    if (e.type === "add_item" && !inv.includes(e.item_id))
      inv = [...inv, e.item_id];
    else if (e.type === "remove_item") inv = inv.filter((i) => i !== e.item_id);
    else if (e.type === "set_flag") flags = { ...flags, [e.key]: e.value };
    else if (e.type === "unlock_node" && nodes[e.node_id])
      nodes[e.node_id] = { ...nodes[e.node_id], is_unlocked: true };
    else if (e.type === "corrupt_node" && nodes[e.node_id])
      nodes[e.node_id] = { ...nodes[e.node_id], is_corrupted: true };
    else if (e.type === "move_to" && nodes[e.node_id])
      curNode = { ...nodes[e.node_id] };
  }
  return { inv, flags, curNode, nodes };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actionId: string = body.actionId;

    if (actionId === "__reset__") {
      state = JSON.parse(JSON.stringify(MOCK_INIT));
      turns = 0;
      return NextResponse.json(MOCK_INIT);
    }

    const resp = RESPONSES[actionId];
    if (!resp)
      return NextResponse.json(
        { error: "Unknown action: " + actionId },
        { status: 400 },
      );

    turns++;
    const tmpl = ACTIONS[actionId];
    let inv = [...state.inventory];
    let flags = { ...state.flags };
    let curNode = state.currentNode;
    let nodes = { ...NODES };

    if (tmpl) {
      const r = applyEffects(tmpl.effects, inv, flags, curNode, nodes);
      inv = r.inv;
      flags = r.flags;
      curNode = r.curNode;
      nodes = r.nodes;
    }

    const nodeActions = (curNode.allowed_actions || [])
      .map((id: string) => ACTIONS[id])
      .filter(Boolean);
    const neighborIds = new Set<string>();
    for (const a of nodeActions)
      for (const e of a.effects)
        if (e.type === "move_to" && e.node_id !== curNode.node_id)
          neighborIds.add(e.node_id);
    const neighbors = Array.from(neighborIds)
      .map((id) => nodes[id])
      .filter(Boolean);

    const logMsg = resp.log.replace("Turn T", "Turn " + turns);
    const newMem = {
      content:
        "Turn " +
        turns +
        ": " +
        (tmpl ? tmpl.label : actionId) +
        " - " +
        resp.nt.slice(0, 70) +
        "...",
      relevance_score: 0.5 + Math.random() * 0.4,
    };

    state = {
      ...state,
      currentNode: curNode,
      neighbors,
      inventory: inv,
      flags,
      allowedActions: nodeActions,
      narrativeText: resp.nt,
      systemLogMessage: logMsg,
      characterMood: resp.mood,
      memoryChunks: [...state.memoryChunks.slice(-9), newMem],
      boundedCost: 1200,
      linearCost: 4500 + turns * 800,
    };

    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
