import { NextRequest, NextResponse } from "next/server";
import {
  initEngine,
  loadSeed,
  getDb,
  sessions,
  playerStats,
} from "@hydrone/core";
import { initHydraDB, memory } from "@hydrone/llm-service";
import {
  executeSamLoop,
  resetTurnCounter,
  type SamLoopOutput,
} from "@/lib/sam-loop";
import { randomUUID } from "crypto";

let engineInitialized = false;
let hydradbInitialized = false;
let llmAvailable = false;

async function ensureEngine() {
  if (!engineInitialized && process.env.DATABASE_URL) {
    initEngine(process.env.DATABASE_URL);
    await loadSeed();
    engineInitialized = true;
  }
}

async function ensureHydraDB() {
  if (!hydradbInitialized && process.env.HYDRA_DB_API_KEY) {
    initHydraDB(process.env.HYDRA_DB_API_KEY, "hydrone-demo");
    console.log("[HydraDB] Initialized, creating tenant...");
    try {
      await memory.createTenant();
      console.log("[HydraDB] Seeding lore...");
      await memory.seedLore([
        {
          type: "knowledge",
          title: "The Hydrone Incident",
          content:
            "Hydrone Systems was a classified research facility developing advanced AI before a containment breach forced evacuation. The facility spans four sectors: the derelict Sector-7, the Neon Alleyways black market, the Corporate Tower, and the sealed Server Vault. Rumors persist that the Hydrone Core achieved sentience before going dark.",
        },
        {
          type: "knowledge",
          title: "The Data Chip",
          content:
            "The data chip contains critical encrypted research data from the Hydrone project. It is stored in the Vault Chamber of Sector-7, protected by a biometric lock requiring a security keycard. Multiple parties — corporate agents, black market dealers, and rogue AIs — are searching for it.",
        },
        {
          type: "knowledge",
          title: "Sector-7 Layout",
          content:
            "Sector-7 consists of an Entrance Hall with a flickering terminal, Corridor Alpha leading to Security and Storage, a Maintenance Shaft with salvaged equipment, Corridor Beta ending at the sealed Vault Chamber. Emergency power is failing and areas may be corrupted.",
        },
        {
          type: "knowledge",
          title: "The Neon Alleyways",
          content:
            "Beneath the facility lies the Neon Alleyways — a black market hub where information and illegal tech are traded. A hooded vendor sells rare items including virus payloads and decryption tools. An underground server room contains network keys that could unlock the Core Gateway.",
        },
        {
          type: "knowledge",
          title: "The Corporate Tower",
          content:
            "The Corporate Tower houses executive offices and R&D laboratories. Executive badges grant elevator access to restricted floors. The R&D lab contains prototype devices and a sealed containment unit. The CEO's safe may hold secrets about the Core project.",
        },
      ]);
      console.log("[HydraDB] Lore seeded successfully");
    } catch (err) {
      console.error("[HydraDB] Lore seeding failed:", err);
    }
    hydradbInitialized = true;
  }
}

function checkLLM(): boolean {
  if (llmAvailable) return true;
  if (process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY) {
    llmAvailable = true;
    return true;
  }
  console.warn(
    "No LLM API key set (DEEPSEEK_API_KEY or ANTHROPIC_API_KEY) — using fallback narration",
  );
  return false;
}

export async function GET(req: NextRequest) {
  try {
    await ensureEngine();
    await ensureHydraDB();
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId)
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    if (process.env.DATABASE_URL) {
      const { fetchSubGraph, computeAllowedActions } =
        await import("@hydrone/core");
      const subgraph = await fetchSubGraph(sessionId);
      const allowedActions = computeAllowedActions(subgraph);

      let memoryChunks: any[] = [];
      try {
        memoryChunks = await memory.query(sessionId, "initial exploration");
      } catch {
        /* ok */
      }

      return NextResponse.json({
        sessionId,
        currentNode: subgraph.current_node,
        neighbors: subgraph.neighbors,
        inventory: subgraph.inventory,
        flags: subgraph.flags,
        allowedActions,
        narrativeText: "",
        systemLogMessage: "Session restored from Postgres.",
        characterMood: "neutral" as const,
        memoryChunks,
        boundedCost: 1200,
        linearCost: 4500,
      });
    }

    return NextResponse.json(getDemoInitState(sessionId));
  } catch (err) {
    console.error("GET /api/turn failed:", err);
    return NextResponse.json(
      { error: "Failed to load state" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureEngine();
    await ensureHydraDB();

    const body = await req.json();
    const actionId: string = body.actionId;
    let sessionId: string = body.sessionId;

    if (actionId === "__reset__") {
      resetTurnCounter();
      return NextResponse.json({ reset: true });
    }

    if (actionId === "__create__") {
      sessionId = "demo-" + randomUUID().slice(0, 8);
      if (process.env.DATABASE_URL) {
        const db = getDb();
        await db
          .insert(sessions)
          .values({
            session_id: sessionId,
            user_id: body.userId || "anon",
            current_location_id: "node-entrance",
            last_updated: new Date(),
          })
          .onConflictDoNothing();
        // Initialize player stats
        await db
          .insert(playerStats)
          .values({
            session_id: sessionId,
            health: 100,
            max_health: 100,
            energy: 100,
            max_energy: 100,
            corruption: 0,
          })
          .onConflictDoNothing();
      }
      return NextResponse.json({ sessionId });
    }

    if (!sessionId || !actionId) {
      return NextResponse.json(
        { error: "Missing sessionId or actionId" },
        { status: 400 },
      );
    }

    if (process.env.DATABASE_URL) {
      const liveLLM = checkLLM();
      console.log(
        `Turn: session=${sessionId} action=${actionId} liveLLM=${liveLLM}`,
      );
      const result: SamLoopOutput = await executeSamLoop({
        sessionId,
        actionId,
      });
      return NextResponse.json(result);
    }

    // No DATABASE_URL — pure demo fallback
    console.log(`Turn (demo mock): session=${sessionId} action=${actionId}`);
    return NextResponse.json(runMockTurn(sessionId, actionId));
  } catch (err) {
    console.error("POST /api/turn failed:", err);
    return NextResponse.json(
      {
        error: "Turn execution failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

function getDemoInitState(sessionId: string) {
  return {
    sessionId,
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
    allowedActions: [
      {
        template_id: "action-examine",
        label: "Examine Surroundings",
        narrative_hint: "Survey for clues.",
        requires: { items: [], flags: {} },
        effects: [],
      },
      {
        template_id: "action-move-to-corridor-a",
        label: "Go to Corridor Alpha",
        narrative_hint: "Move forward.",
        requires: { items: [], flags: {} },
        effects: [{ type: "move_to", node_id: "node-corridor-a" }],
      },
    ],
    narrativeText: "",
    systemLogMessage: "Session restored (demo).",
    characterMood: "neutral" as const,
    memoryChunks: [],
    boundedCost: 1200,
    linearCost: 4500,
  };
}

let mockState: Record<string, any> = {};

function runMockTurn(sessionId: string, actionId: string) {
  const RESP: Record<string, any> = {
    "action-examine": {
      nt: "You scan the area carefully.",
      mood: "neutral",
      log: "Turn T - Examine",
    },
    "action-move-to-corridor-a": {
      nt: "Corridor Alpha stretches ahead.",
      mood: "excited",
      log: "Turn T - Corridor Alpha",
    },
    "action-move-to-security": {
      nt: "Security Checkpoint. A keycard lies on the floor.",
      mood: "excited",
      log: "Turn T - Security",
    },
    "action-move-to-storage": {
      nt: "Storage Room. A medkit sits on the floor.",
      mood: "neutral",
      log: "Turn T - Storage",
    },
    "action-move-to-entrance": {
      nt: "You backtrack to the entrance.",
      mood: "neutral",
      log: "Turn T - Entrance",
    },
    "action-move-to-corridor-b": {
      nt: "The corridor narrows. Vault door ahead.",
      mood: "worried",
      log: "Turn T - Corridor Beta",
    },
    "action-pick-up-keycard": {
      nt: "You pick up the security badge.",
      mood: "triumphant",
      log: "Turn T - Keycard acquired",
    },
    "action-pick-up-medkit": {
      nt: "You retrieve the medkit.",
      mood: "neutral",
      log: "Turn T - Medkit acquired",
    },
    "action-access-vault": {
      nt: "GREEN light. The vault door hisses open.",
      mood: "triumphant",
      log: "Turn T - VAULT ACCESSED",
    },
    "action-retrieve-data-chip": {
      nt: "You extract the data chip.",
      mood: "triumphant",
      log: "Turn T - Data Chip acquired",
    },
  };

  const EFF: Record<string, any[]> = {
    "action-move-to-corridor-a": [
      { type: "move_to", node_id: "node-corridor-a" },
    ],
    "action-move-to-security": [{ type: "move_to", node_id: "node-security" }],
    "action-move-to-storage": [{ type: "move_to", node_id: "node-storage" }],
    "action-move-to-entrance": [{ type: "move_to", node_id: "node-entrance" }],
    "action-move-to-corridor-b": [
      { type: "move_to", node_id: "node-corridor-b" },
    ],
    "action-pick-up-keycard": [
      { type: "add_item", item_id: "item-keycard" },
      { type: "set_flag", key: "keycard_taken", value: true },
    ],
    "action-pick-up-medkit": [
      { type: "add_item", item_id: "item-medkit" },
      { type: "set_flag", key: "medkit_taken", value: true },
    ],
    "action-access-vault": [
      { type: "unlock_node", node_id: "node-vault" },
      { type: "set_flag", key: "vault_accessed", value: true },
      { type: "move_to", node_id: "node-vault" },
    ],
    "action-retrieve-data-chip": [
      { type: "add_item", item_id: "item-data-chip" },
      { type: "set_flag", key: "data_retrieved", value: true },
    ],
  };

  const NODES: Record<string, any> = {
    "node-entrance": getDemoInitState("").currentNode,
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
      description: "Dead monitors.",
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
      description: "Dusty shelves.",
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
      description: "Narrow corridor.",
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
      description: "Server racks hum.",
      is_unlocked: false,
      is_corrupted: false,
      allowed_actions: ["action-examine", "action-retrieve-data-chip"],
    },
  };

  if (!mockState[sessionId]) {
    mockState[sessionId] = {
      sessionId,
      currentNode: { ...NODES["node-entrance"] },
      neighbors: [NODES["node-corridor-a"]],
      inventory: [],
      flags: {},
      memoryChunks: [],
      turnCount: 0,
    };
  }

  const s = mockState[sessionId];
  s.turnCount++;
  const resp = RESP[actionId] || {
    nt: "Nothing happens.",
    mood: "neutral",
    log: "Unknown action.",
  };
  const effects = EFF[actionId] || [];

  for (const e of effects) {
    if (e.type === "add_item" && !s.inventory.includes(e.item_id))
      s.inventory = [...s.inventory, e.item_id];
    else if (e.type === "set_flag") s.flags = { ...s.flags, [e.key]: e.value };
    else if (e.type === "unlock_node" && NODES[e.node_id])
      NODES[e.node_id] = { ...NODES[e.node_id], is_unlocked: true };
    else if (e.type === "move_to" && NODES[e.node_id])
      s.currentNode = { ...NODES[e.node_id] };
  }

  s.memoryChunks = [
    ...s.memoryChunks.slice(-9),
    {
      content: "Turn " + s.turnCount + ": " + actionId,
      relevance_score: 0.5,
    },
  ];

  return {
    ...s,
    allowedActions: (s.currentNode?.allowed_actions || []).map(
      (id: string) => ({
        template_id: id,
        label: id,
        narrative_hint: "",
        requires: { items: [], flags: {} },
        effects: EFF[id] || [],
      }),
    ),
    narrativeText: resp.nt,
    systemLogMessage: resp.log.replace("Turn T", "Turn " + s.turnCount),
    characterMood: resp.mood,
    boundedCost: 1200,
    linearCost: 4500 + s.turnCount * 800,
  };
}
