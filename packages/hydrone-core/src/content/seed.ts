import type {
  WorldNode,
  ItemCatalogEntry,
  ActionTemplate,
} from "../schema/zod";

export const NODES: WorldNode[] = [
  {
    node_id: "node-entrance",
    zone: "sector-7",
    name: "Entrance Hall",
    description:
      "A dusty anteroom. Emergency lights cast red shadows on peeling walls. The air smells of burnt circuits. A flickering terminal on the wall displays garbled status reports.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-read-terminal",
      "action-rest",
      "action-move-to-corridor-a",
      "action-move-to-maintenance-shaft",
      "action-move-to-alley-entrance",
    ],
  },
  {
    node_id: "node-corridor-a",
    zone: "sector-7",
    name: "Corridor Alpha",
    description:
      "A long hallway receding into darkness. Sparking wires hang from a collapsed ceiling panel. Two doors break the monotony.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-move-to-entrance",
      "action-move-to-security",
      "action-move-to-storage",
    ],
  },
  {
    node_id: "node-security",
    zone: "sector-7",
    name: "Security Checkpoint",
    description:
      "Banks of dead monitors line the walls. A magnetic keycard badge lies on the floor beside an overturned chair. A security log terminal flickers with recent entries.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-pick-up-keycard",
      "action-read-security-log",
      "action-rest",
      "action-move-to-corridor-a",
      "action-move-to-corridor-b",
    ],
  },
  {
    node_id: "node-storage",
    zone: "sector-7",
    name: "Storage Room",
    description:
      "Metal shelves bow under dusty equipment crates. A sealed medkit sits on the floor, somehow untouched. A maintenance panel glows softly on the back wall.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-pick-up-medkit",
      "action-access-maintenance",
      "action-use-medkit",
      "action-use-stim-pack",
      "action-move-to-corridor-a",
    ],
  },
  {
    node_id: "node-maintenance-shaft",
    zone: "sector-7",
    name: "Maintenance Shaft",
    description:
      "A narrow service tunnel bypassing the main corridors. Pipes hiss overhead. A junction box on the wall has been pried open.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-pick-up-emp-device",
      "action-move-to-entrance",
      "action-move-to-corridor-b",
    ],
  },
  {
    node_id: "node-corridor-b",
    zone: "sector-7",
    name: "Corridor Beta",
    description:
      "The corridor narrows, forcing you sideways past collapsed bulkheads. A heavy biometric vault door looms ahead, its red indicator light blinking.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-use-emp-on-vault",
      "action-move-to-security",
      "action-move-to-maintenance-shaft",
      "action-access-vault",
    ],
  },
  {
    node_id: "node-vault",
    zone: "sector-7",
    name: "Vault Chamber",
    description:
      "A climate-controlled cleanroom. Server racks hum with quiet life. The data chip sits in a locked tray at the center pedestal.",
    is_unlocked: false,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-retrieve-data-chip",
      "action-read-vault-records",
      "action-move-to-core-gateway",
    ],
  },
  {
    node_id: "node-alley-entrance",
    zone: "neon-alleyways",
    name: "Neon Alley Entrance",
    description:
      "A rain-slick stairwell descends into the underbelly. Neon signs buzz in unrecognizable languages. The smell of ozone and synthetic noodles fills the air.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-move-to-market-stall",
      "action-move-to-back-alley",
    ],
  },
  {
    node_id: "node-market-stall",
    zone: "neon-alleyways",
    name: "Black Market Stall",
    description:
      "A cramped stall draped in faded tarps. A hooded vendor sits behind a counter of salvaged tech. Holographic price tags flicker.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-trade-with-vendor",
      "action-pick-up-data-decryptor",
      "action-move-to-alley-entrance",
    ],
  },
  {
    node_id: "node-back-alley",
    zone: "neon-alleyways",
    name: "Back Alley",
    description:
      "A dead-end alley reeking of coolant. Graffiti glows on the walls. A discarded datapad lies half-submerged in a dark puddle.",
    is_unlocked: true,
    is_corrupted: true,
    allowed_actions: [
      "action-examine",
      "action-pick-up-datapad",
      "action-move-to-alley-entrance",
      "action-move-to-server-room",
    ],
  },
  {
    node_id: "node-server-room",
    zone: "neon-alleyways",
    name: "Underground Server Room",
    description:
      "Rows of illegal servers hum beneath the city. A terminal displays a login prompt for the Hydrone network.",
    is_unlocked: false,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-hack-server",
      "action-retrieve-network-key",
      "action-move-to-back-alley",
    ],
  },
  {
    node_id: "node-tower-lobby",
    zone: "corporate-tower",
    name: "Tower Lobby",
    description:
      "Polished marble floors reflect cold fluorescent light. An abandoned reception desk holds still-warm coffee. Elevator doors are sealed.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-pick-up-executive-badge",
      "action-move-to-exec-level",
      "action-move-to-r-d-lab",
    ],
  },
  {
    node_id: "node-exec-level",
    zone: "corporate-tower",
    name: "Executive Level",
    description:
      "Floor-to-ceiling windows overlook the neon-drenched city. A mahogany desk holds a terminal with admin privileges. A safe glints in the corner.",
    is_unlocked: false,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-access-admin-terminal",
      "action-crack-safe",
      "action-move-to-tower-lobby",
    ],
  },
  {
    node_id: "node-r-d-lab",
    zone: "corporate-tower",
    name: "R&D Laboratory",
    description:
      "Whiteboards covered in frantic equations. Prototype devices hum on steel tables. A sealed containment unit glows with an eerie blue light.",
    is_unlocked: true,
    is_corrupted: true,
    allowed_actions: [
      "action-examine",
      "action-open-containment",
      "action-pick-up-prototype",
      "action-move-to-tower-lobby",
    ],
  },
  {
    node_id: "node-core-gateway",
    zone: "server-vault",
    name: "Core Gateway",
    description:
      "The air vibrates with subsonic frequencies. A massive circular door dominates the chamber. Glyph-like status indicators pulse in sequence.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-decrypt-gateway",
      "action-use-network-key",
      "action-move-to-vault",
    ],
  },
  {
    node_id: "node-hydrone-core",
    zone: "server-vault",
    name: "Hydrone Core",
    description:
      "The heart of Hydrone Systems. A sphere of liquid light pulses at the center, suspended in a magnetic field. Data streams flow through crystalline conduits.",
    is_unlocked: false,
    is_corrupted: false,
    allowed_actions: [
      "action-examine",
      "action-extract-core-data",
      "action-upload-virus",
      "action-shutdown-core",
    ],
  },
];

export const ITEM_CATALOG: ItemCatalogEntry[] = [
  {
    item_id: "item-keycard",
    name: "Security Keycard",
    description:
      "A magnetic access badge. The Hydrone Systems logo is barely legible under scratches.",
  },
  {
    item_id: "item-medkit",
    name: "Medical Kit",
    description:
      "A sealed first-aid kit. Expired by two years, but the stim-packs inside might still work.",
  },
  {
    item_id: "item-data-chip",
    name: "Data Chip",
    description:
      "A chip containing critical encrypted research data. The whole mission hinges on retrieving this.",
  },
  {
    item_id: "item-emp-device",
    name: "EMP Device",
    description:
      "A small pulse emitter salvaged from the maintenance shaft. Single-use. Disables electronic locks.",
  },
  {
    item_id: "item-data-decryptor",
    name: "Data Decryptor",
    description:
      "A black-market decryption tool. Can crack most corporate-grade encryption.",
  },
  {
    item_id: "item-datapad",
    name: "Discarded Datapad",
    description:
      "A cracked datapad from the back alley. Contains fragmented messages about a core breach.",
  },
  {
    item_id: "item-executive-badge",
    name: "Executive Badge",
    description:
      "A platinum-level access badge. Grants elevator access to restricted executive levels.",
  },
  {
    item_id: "item-network-key",
    name: "Network Key",
    description:
      "A cryptographic key from the underground server. Could unlock the Core Gateway.",
  },
  {
    item_id: "item-prototype",
    name: "Prototype Device",
    description:
      "A strange device from the R&D lab. It pulses with the same frequency as the Core.",
  },
  {
    item_id: "item-corrupted-shard",
    name: "Corrupted Data Shard",
    description: "A crystalline fragment humming with corrupted energy.",
  },
  {
    item_id: "item-virus-payload",
    name: "Virus Payload",
    description:
      "A military-grade digital weapon on a portable drive. Designed to corrupt Hydrone systems.",
  },
  {
    item_id: "item-core-extract",
    name: "Core Data Extract",
    description:
      "Raw, unfiltered data siphoned directly from the Hydrone Core. The truth about what happened here.",
  },
];

export const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    template_id: "action-examine",
    label: "Examine Surroundings",
    narrative_hint:
      "Carefully survey the area for clues, items, or hidden details.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: "action-move-to-entrance",
    label: "Go to Entrance Hall",
    narrative_hint: "Head back toward the facility entrance.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-entrance" }],
  },
  {
    template_id: "action-move-to-corridor-a",
    label: "Go to Corridor Alpha",
    narrative_hint: "Move into the main corridor.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-corridor-a" }],
  },
  {
    template_id: "action-move-to-security",
    label: "Go to Security Checkpoint",
    narrative_hint: "Head toward the security area.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-security" }],
  },
  {
    template_id: "action-move-to-storage",
    label: "Go to Storage Room",
    narrative_hint: "Check the storage room off the main corridor.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-storage" }],
  },
  {
    template_id: "action-move-to-corridor-b",
    label: "Go to Corridor Beta",
    narrative_hint: "Head toward the vault corridor.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-corridor-b" }],
  },
  {
    template_id: "action-move-to-maintenance-shaft",
    label: "Enter Maintenance Shaft",
    narrative_hint: "Squeeze into the narrow service tunnel.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-maintenance-shaft" }],
  },
  {
    template_id: "action-pick-up-keycard",
    label: "Pick Up Keycard",
    narrative_hint: "Retrieve the magnetic security badge from the floor.",
    requires: { items: [], flags: { keycard_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-keycard" },
      { type: "set_flag", key: "keycard_taken", value: true },
    ],
  },
  {
    template_id: "action-pick-up-medkit",
    label: "Retrieve Medkit",
    narrative_hint: "Grab the sealed medical supplies from the shelf.",
    requires: { items: [], flags: { medkit_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-medkit" },
      { type: "set_flag", key: "medkit_taken", value: true },
    ],
  },
  {
    template_id: "action-pick-up-emp-device",
    label: "Take EMP Device",
    narrative_hint: "Salvage the pulse emitter from the junction box.",
    requires: { items: [], flags: { emp_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-emp-device" },
      { type: "set_flag", key: "emp_taken", value: true },
    ],
  },
  {
    template_id: "action-read-terminal",
    label: "Read Wall Terminal",
    narrative_hint:
      "Decode the garbled status reports on the entrance terminal.",
    requires: { items: [], flags: {} },
    effects: [{ type: "set_flag", key: "terminal_read", value: true }],
  },
  {
    template_id: "action-read-security-log",
    label: "Read Security Log",
    narrative_hint: "Access the security terminal for recent incident reports.",
    requires: { items: [], flags: {} },
    effects: [{ type: "set_flag", key: "security_log_read", value: true }],
  },
  {
    template_id: "action-access-maintenance",
    label: "Access Maintenance Panel",
    narrative_hint:
      "Interface with the glowing panel to view tunnel schematics.",
    requires: { items: [], flags: {} },
    effects: [{ type: "set_flag", key: "maintenance_accessed", value: true }],
  },
  {
    template_id: "action-access-vault",
    label: "Access Vault (Keycard)",
    narrative_hint:
      "Swipe the security keycard to unlock the biometric vault door.",
    requires: { items: ["item-keycard"], flags: {} },
    effects: [
      { type: "unlock_node", node_id: "node-vault" },
      { type: "set_flag", key: "vault_accessed", value: true },
      { type: "move_to", node_id: "node-vault" },
    ],
  },
  {
    template_id: "action-use-emp-on-vault",
    label: "EMP the Vault Door",
    narrative_hint: "Use the EMP device to short the electronic lock.",
    requires: { items: ["item-emp-device"], flags: {} },
    effects: [
      { type: "remove_item", item_id: "item-emp-device" },
      { type: "unlock_node", node_id: "node-vault" },
      { type: "set_flag", key: "vault_accessed", value: true },
      { type: "set_flag", key: "emp_used", value: true },
      { type: "move_to", node_id: "node-vault" },
    ],
  },
  {
    template_id: "action-retrieve-data-chip",
    label: "Retrieve Data Chip",
    narrative_hint: "Extract the critical data chip from the server tray.",
    requires: { items: [], flags: { vault_accessed: true } },
    effects: [
      { type: "add_item", item_id: "item-data-chip" },
      { type: "set_flag", key: "data_retrieved", value: true },
    ],
  },
  {
    template_id: "action-read-vault-records",
    label: "Read Vault Records",
    narrative_hint: "Access the vault terminal for deeper mission intel.",
    requires: { items: [], flags: { vault_accessed: true } },
    effects: [{ type: "set_flag", key: "core_location_known", value: true }],
  },
  // ── Inter-zone travel ──────────────────────────────────────────────────
  {
    template_id: "action-move-to-core-gateway",
    label: "Go to Core Gateway",
    narrative_hint:
      "Enter the Core Gateway chamber deep in the Server Vault zone.",
    requires: { items: [], flags: { vault_accessed: true } },
    effects: [{ type: "move_to", node_id: "node-core-gateway" }],
  },
  {
    template_id: "action-move-to-alley-entrance",
    label: "Enter Neon Alleyways",
    narrative_hint:
      "Descend into the rain-slick neon underbelly beneath the facility.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-alley-entrance" }],
  },
  {
    template_id: "action-move-to-market-stall",
    label: "Visit Black Market Stall",
    narrative_hint: "Approach the hooded vendor.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-market-stall" }],
  },
  {
    template_id: "action-move-to-back-alley",
    label: "Go to Back Alley",
    narrative_hint: "Head into the dark, graffiti-covered alley.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-back-alley" }],
  },
  {
    template_id: "action-move-to-server-room",
    label: "Enter Underground Server Room",
    narrative_hint: "Access the hidden server room behind the alley.",
    requires: {
      items: ["item-data-decryptor"],
      flags: { alley_explored: true },
    },
    effects: [
      { type: "unlock_node", node_id: "node-server-room" },
      { type: "move_to", node_id: "node-server-room" },
    ],
  },
  {
    template_id: "action-trade-with-vendor",
    label: "Trade with Vendor",
    narrative_hint: "Barter with the hooded merchant for rare items.",
    requires: { items: [], flags: {} },
    effects: [
      { type: "add_item", item_id: "item-virus-payload" },
      { type: "set_flag", key: "vendor_traded", value: true },
    ],
  },
  {
    template_id: "action-pick-up-data-decryptor",
    label: "Acquire Data Decryptor",
    narrative_hint: "Exchange credits for the decryption tool.",
    requires: { items: [], flags: { decryptor_acquired: false } },
    effects: [
      { type: "add_item", item_id: "item-data-decryptor" },
      { type: "set_flag", key: "decryptor_acquired", value: true },
    ],
  },
  {
    template_id: "action-pick-up-datapad",
    label: "Pick Up Datapad",
    narrative_hint: "Retrieve the discarded datapad from the puddle.",
    requires: { items: [], flags: { datapad_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-datapad" },
      { type: "set_flag", key: "datapad_taken", value: true },
      { type: "set_flag", key: "alley_explored", value: true },
    ],
  },
  {
    template_id: "action-hack-server",
    label: "Hack Server Terminal",
    narrative_hint: "Attempt to breach the underground server security.",
    requires: { items: ["item-data-decryptor"], flags: {} },
    effects: [{ type: "set_flag", key: "server_hacked", value: true }],
  },
  {
    template_id: "action-retrieve-network-key",
    label: "Download Network Key",
    narrative_hint:
      "Extract the cryptographic key from the underground server.",
    requires: { items: [], flags: { server_hacked: true } },
    effects: [
      { type: "add_item", item_id: "item-network-key" },
      { type: "set_flag", key: "network_key_obtained", value: true },
    ],
  },
  {
    template_id: "action-pick-up-executive-badge",
    label: "Take Executive Badge",
    narrative_hint:
      "Grab the platinum badge from the abandoned reception desk.",
    requires: { items: [], flags: { badge_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-executive-badge" },
      { type: "set_flag", key: "badge_taken", value: true },
    ],
  },
  {
    template_id: "action-move-to-exec-level",
    label: "Access Executive Level",
    narrative_hint: "Use the executive badge to unlock the elevator.",
    requires: { items: ["item-executive-badge"], flags: {} },
    effects: [
      { type: "unlock_node", node_id: "node-exec-level" },
      { type: "move_to", node_id: "node-exec-level" },
    ],
  },
  {
    template_id: "action-move-to-r-d-lab",
    label: "Enter R&D Lab",
    narrative_hint: "Access the research wing of the corporate tower.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-r-d-lab" }],
  },
  {
    template_id: "action-use-network-key",
    label: "Insert Network Key",
    narrative_hint: "Slot the cryptographic key into the Core Gateway.",
    requires: {
      items: ["item-network-key"],
      flags: { core_location_known: true },
    },
    effects: [
      { type: "unlock_node", node_id: "node-hydrone-core" },
      { type: "set_flag", key: "gateway_unlocked", value: true },
      { type: "move_to", node_id: "node-hydrone-core" },
    ],
  },
  {
    template_id: "action-extract-core-data",
    label: "Extract Core Data",
    narrative_hint: "Siphon the raw truth from the Hydrone Core.",
    requires: { items: [], flags: { gateway_unlocked: true } },
    effects: [
      { type: "add_item", item_id: "item-core-extract" },
      { type: "set_flag", key: "core_extracted", value: true },
    ],
  },
  {
    template_id: "action-upload-virus",
    label: "Upload Virus Payload",
    narrative_hint: "Inject the digital weapon into the Core. No going back.",
    requires: {
      items: ["item-virus-payload"],
      flags: { gateway_unlocked: true },
    },
    effects: [
      { type: "remove_item", item_id: "item-virus-payload" },
      { type: "corrupt_node", node_id: "node-hydrone-core" },
      { type: "set_flag", key: "virus_uploaded", value: true },
    ],
  },
  {
    template_id: "action-shutdown-core",
    label: "Shutdown Core",
    narrative_hint: "Initiate emergency shutdown of the Hydrone Core.",
    requires: {
      items: ["item-prototype"],
      flags: { gateway_unlocked: true, core_shutdown_ready: false },
    },
    effects: [
      { type: "set_flag", key: "core_shutdown_ready", value: true },
      { type: "set_flag", key: "core_shutdown_initiated", value: true },
    ],
  },

  // ── Narrative-only actions (no state change, rich LLM narration) ──────
  {
    template_id: "action-access-admin-terminal",
    label: "Access Admin Terminal",
    narrative_hint: "Log into the executive terminal with admin privileges.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: "action-crack-safe",
    label: "Crack the Safe",
    narrative_hint: "Attempt to bypass the CEO safe locking mechanism.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: "action-open-containment",
    label: "Open Containment Unit",
    narrative_hint: "Release the seal on the glowing containment unit.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: "action-pick-up-prototype",
    label: "Take Prototype Device",
    narrative_hint: "Grab the pulsing prototype from the lab bench.",
    requires: { items: [], flags: { prototype_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-prototype" },
      { type: "set_flag", key: "prototype_taken", value: true },
    ],
  },
  {
    template_id: "action-decrypt-gateway",
    label: "Decrypt Gateway",
    narrative_hint: "Attempt to decode the glyph-like status indicators.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: "action-move-to-vault",
    label: "Return to Vault",
    narrative_hint: "Head back to the Sector-7 vault chamber.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-vault" }],
  },
  {
    template_id: "action-move-to-tower-lobby",
    label: "Go to Tower Lobby",
    narrative_hint: "Return to the corporate tower lobby.",
    requires: { items: [], flags: {} },
    effects: [{ type: "move_to", node_id: "node-tower-lobby" }],
  },

  // ── Stat-affecting actions ─────────────────────────────────────────────
  {
    template_id: "action-use-medkit",
    label: "Use Medkit",
    narrative_hint: "Apply the medical kit to restore health.",
    requires: { items: ["item-medkit"], flags: {} },
    effects: [
      { type: "remove_item", item_id: "item-medkit" },
      { type: "add_health", amount: 30 },
    ],
  },
  {
    template_id: "action-rest",
    label: "Rest and Recover",
    narrative_hint: "Take a moment to catch your breath and recover energy.",
    requires: { items: [], flags: {} },
    effects: [{ type: "add_energy", amount: 20 }],
  },
  {
    template_id: "action-use-stim-pack",
    label: "Use Stim-Pack",
    narrative_hint:
      "Inject a stim-pack for an emergency energy boost. Side effects may include corruption.",
    requires: { items: ["item-medkit"], flags: {} },
    effects: [
      { type: "add_energy", amount: 40 },
      { type: "set_corruption", amount: 15 },
    ],
  },
];
