import { describe, it, expect } from 'vitest';
import {
  WorldNodeSchema,
  ItemCatalogEntrySchema,
  ActionTemplateSchema,
  NodeSpecSchema,
  LLMGameResponseSchema,
  MutationSchema,
  SubGraphSchema,
} from '../zod';

describe('MutationSchema', () => {
  it('parses add_item mutation', () => {
    const m = MutationSchema.parse({ type: 'add_item', item_id: 'item-keycard' });
    expect(m.type).toBe('add_item');
  });

  it('parses set_flag mutation', () => {
    const m = MutationSchema.parse({ type: 'set_flag', key: 'vault_accessed', value: true });
    expect(m.type).toBe('set_flag');
  });

  it('parses move_to mutation', () => {
    const m = MutationSchema.parse({ type: 'move_to', node_id: 'node-vault' });
    expect(m.type).toBe('move_to');
  });

  it('rejects unknown mutation type', () => {
    expect(() => MutationSchema.parse({ type: 'hack_mainframe' })).toThrow();
  });
});

describe('WorldNodeSchema', () => {
  it('parses a valid world node', () => {
    const node = {
      node_id: 'node-entrance',
      zone: 'sector-7',
      name: 'Entrance Hall',
      description: 'A dusty anteroom.',
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: ['action-examine', 'action-move-north'],
    };
    const parsed = WorldNodeSchema.parse(node);
    expect(parsed.node_id).toBe('node-entrance');
    expect(parsed.allowed_actions).toHaveLength(2);
  });

  it('rejects node missing required fields', () => {
    expect(() => WorldNodeSchema.parse({ node_id: 'x', zone: 'z' })).toThrow();
  });
});

describe('ItemCatalogEntrySchema', () => {
  it('parses a valid item', () => {
    const item = { item_id: 'item-keycard', name: 'Security Keycard', description: 'Opens the vault.' };
    const parsed = ItemCatalogEntrySchema.parse(item);
    expect(parsed.item_id).toBe('item-keycard');
  });
});

describe('ActionTemplateSchema', () => {
  it('parses the keycard gate template', () => {
    const template = {
      template_id: 'action-access-vault',
      label: 'Access Vault',
      narrative_hint: 'Use the keycard to unlock the vault door.',
      requires: { items: ['item-keycard'], flags: {} },
      effects: [
        { type: 'unlock_node', node_id: 'node-vault' },
        { type: 'set_flag', key: 'vault_accessed', value: true },
        { type: 'move_to', node_id: 'node-vault' },
      ],
    };
    const parsed = ActionTemplateSchema.parse(template);
    expect(parsed.template_id).toBe('action-access-vault');
    expect(parsed.requires.items).toContain('item-keycard');
    expect(parsed.effects).toHaveLength(3);
  });

  it('parses a no-requirement template', () => {
    const template = {
      template_id: 'action-examine',
      label: 'Examine Surroundings',
      narrative_hint: 'Look carefully at the environment.',
      requires: { items: [], flags: {} },
      effects: [],
    };
    expect(() => ActionTemplateSchema.parse(template)).not.toThrow();
  });

  it('rejects template with invalid effect type', () => {
    const template = {
      template_id: 'action-bad',
      label: 'Bad',
      narrative_hint: 'hint',
      requires: { items: [], flags: {} },
      effects: [{ type: 'explode_server' }],
    };
    expect(() => ActionTemplateSchema.parse(template)).toThrow();
  });
});

describe('NodeSpecSchema', () => {
  it('parses a valid node spec', () => {
    const spec = {
      node_name: 'Hidden Lab',
      zone: 'sector-7',
      edges: ['node-vault'],
      action_template_ids: ['action-examine'],
      item_ids: ['item-data-chip'],
    };
    const parsed = NodeSpecSchema.parse(spec);
    expect(parsed.node_name).toBe('Hidden Lab');
  });
});

describe('LLMGameResponseSchema', () => {
  it('parses a valid LLM response without new_node_spec', () => {
    const response = {
      narrative_text: 'You find a keycard on the floor.',
      character_portrait_mood: 'excited',
      system_log_message: '[ITEM ACQUIRED] Security Keycard',
      chosen_action_id: 'action-pick-up-keycard',
      suggested_action_buttons: [
        { button_label: 'Move North', action_id: 'action-move-north' },
      ],
    };
    const parsed = LLMGameResponseSchema.parse(response);
    expect(parsed.chosen_action_id).toBe('action-pick-up-keycard');
    expect(parsed.new_node_spec).toBeUndefined();
  });

  it('parses a valid LLM response with new_node_spec', () => {
    const response = {
      narrative_text: 'A hidden passage reveals itself.',
      character_portrait_mood: 'neutral',
      system_log_message: '[NODE DISCOVERED] Hidden Passage',
      chosen_action_id: 'action-examine',
      new_node_spec: {
        node_name: 'Hidden Passage',
        zone: 'sector-7',
        edges: ['node-entrance'],
        action_template_ids: ['action-examine'],
        item_ids: [],
      },
      suggested_action_buttons: [],
    };
    const parsed = LLMGameResponseSchema.parse(response);
    expect(parsed.new_node_spec?.node_name).toBe('Hidden Passage');
  });

  it('rejects invalid character_portrait_mood', () => {
    const response = {
      narrative_text: 'text',
      character_portrait_mood: 'confused',
      system_log_message: 'log',
      chosen_action_id: 'action-x',
      suggested_action_buttons: [],
    };
    expect(() => LLMGameResponseSchema.parse(response)).toThrow();
  });
});

describe('SubGraphSchema', () => {
  it('parses a valid subgraph', () => {
    const sg = {
      session_id: 'sess-abc',
      current_node: {
        node_id: 'node-entrance',
        zone: 'sector-7',
        name: 'Entrance Hall',
        description: 'desc',
        is_unlocked: true,
        is_corrupted: false,
        allowed_actions: ['action-examine'],
      },
      neighbors: [],
      inventory: [],
      flags: {},
    };
    const parsed = SubGraphSchema.parse(sg);
    expect(parsed.session_id).toBe('sess-abc');
  });
});
