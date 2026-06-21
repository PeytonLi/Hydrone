import type { WorldNode, ItemCatalogEntry, ActionTemplate } from '../schema/zod';

export const NODES: WorldNode[] = [
  {
    node_id: 'node-entrance',
    zone: 'sector-7',
    name: 'Entrance Hall',
    description:
      'A dusty anteroom. Emergency lights cast red shadows on the peeling walls. The air smells of burnt circuits.',
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: ['action-examine', 'action-move-to-corridor-a'],
  },
  {
    node_id: 'node-corridor-a',
    zone: 'sector-7',
    name: 'Corridor Alpha',
    description:
      'A long hallway. Sparking wires hang from a collapsed ceiling panel. Two doors break the monotony.',
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      'action-examine',
      'action-move-to-entrance',
      'action-move-to-security',
      'action-move-to-storage',
    ],
  },
  {
    node_id: 'node-security',
    zone: 'sector-7',
    name: 'Security Checkpoint',
    description:
      'Banks of dead monitors line the walls. A magnetic keycard badge lies on the floor beside an overturned chair.',
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      'action-examine',
      'action-pick-up-keycard',
      'action-move-to-corridor-a',
      'action-move-to-corridor-b',
    ],
  },
  {
    node_id: 'node-storage',
    zone: 'sector-7',
    name: 'Storage Room',
    description:
      'Metal shelves hold dusty equipment. A sealed medkit sits on the floor, somehow untouched.',
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      'action-examine',
      'action-pick-up-medkit',
      'action-move-to-corridor-a',
    ],
  },
  {
    node_id: 'node-corridor-b',
    zone: 'sector-7',
    name: 'Corridor Beta',
    description:
      'The corridor narrows. Ahead, a heavy biometric vault door looms — its red indicator light blinking.',
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [
      'action-examine',
      'action-move-to-security',
      'action-access-vault',
    ],
  },
  {
    node_id: 'node-vault',
    zone: 'sector-7',
    name: 'Vault Chamber',
    description:
      'A climate-controlled chamber. Server racks hum with life. The data chip you came for sits in a locked tray.',
    is_unlocked: false,
    is_corrupted: false,
    allowed_actions: ['action-examine', 'action-retrieve-data-chip'],
  },
];

export const ITEM_CATALOG: ItemCatalogEntry[] = [
  {
    item_id: 'item-keycard',
    name: 'Security Keycard',
    description:
      'A magnetic access badge. The Hydrone Systems logo is barely legible.',
  },
  {
    item_id: 'item-medkit',
    name: 'Medical Kit',
    description:
      'A sealed first-aid kit. Expired by two years, but still better than nothing.',
  },
  {
    item_id: 'item-data-chip',
    name: 'Data Chip',
    description:
      'A chip containing critical encrypted research data. The whole mission hinges on this.',
  },
  {
    item_id: 'item-emp-device',
    name: 'EMP Device',
    description:
      'A small pulse emitter that can disable electronic systems. Single-use.',
  },
];

export const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    template_id: 'action-examine',
    label: 'Examine Surroundings',
    narrative_hint:
      'Carefully survey the area for clues, items, or hazards.',
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: 'action-move-to-entrance',
    label: 'Go to Entrance Hall',
    narrative_hint: 'Head back toward the entrance.',
    requires: { items: [], flags: {} },
    effects: [{ type: 'move_to', node_id: 'node-entrance' }],
  },
  {
    template_id: 'action-move-to-corridor-a',
    label: 'Go to Corridor Alpha',
    narrative_hint: 'Move into the main corridor.',
    requires: { items: [], flags: {} },
    effects: [{ type: 'move_to', node_id: 'node-corridor-a' }],
  },
  {
    template_id: 'action-move-to-security',
    label: 'Go to Security Checkpoint',
    narrative_hint: 'Head toward the security area.',
    requires: { items: [], flags: {} },
    effects: [{ type: 'move_to', node_id: 'node-security' }],
  },
  {
    template_id: 'action-move-to-storage',
    label: 'Go to Storage Room',
    narrative_hint: 'Check the storage room off the main corridor.',
    requires: { items: [], flags: {} },
    effects: [{ type: 'move_to', node_id: 'node-storage' }],
  },
  {
    template_id: 'action-move-to-corridor-b',
    label: 'Go to Corridor Beta',
    narrative_hint: 'Head toward the vault.',
    requires: { items: [], flags: {} },
    effects: [{ type: 'move_to', node_id: 'node-corridor-b' }],
  },
  {
    template_id: 'action-pick-up-keycard',
    label: 'Pick Up Keycard',
    narrative_hint: 'Retrieve the magnetic security badge from the floor.',
    requires: { items: [], flags: { keycard_taken: false } },
    effects: [
      { type: 'add_item', item_id: 'item-keycard' },
      { type: 'set_flag', key: 'keycard_taken', value: true },
    ],
  },
  {
    template_id: 'action-pick-up-medkit',
    label: 'Retrieve Medkit',
    narrative_hint: 'Grab the sealed medical supplies from the shelf.',
    requires: { items: [], flags: { medkit_taken: false } },
    effects: [
      { type: 'add_item', item_id: 'item-medkit' },
      { type: 'set_flag', key: 'medkit_taken', value: true },
    ],
  },
  {
    // THE GATE: the determinism showcase
    template_id: 'action-access-vault',
    label: 'Access Vault',
    narrative_hint:
      'Swipe the security keycard to unlock the biometric vault door.',
    requires: { items: ['item-keycard'], flags: {} },
    effects: [
      { type: 'unlock_node', node_id: 'node-vault' },
      { type: 'set_flag', key: 'vault_accessed', value: true },
      { type: 'move_to', node_id: 'node-vault' },
    ],
  },
  {
    template_id: 'action-retrieve-data-chip',
    label: 'Retrieve Data Chip',
    narrative_hint: 'Extract the critical data chip from the server tray.',
    requires: { items: [], flags: { vault_accessed: true } },
    effects: [
      { type: 'add_item', item_id: 'item-data-chip' },
      { type: 'set_flag', key: 'data_retrieved', value: true },
    ],
  },
];
