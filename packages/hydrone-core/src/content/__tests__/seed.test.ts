import { describe, it, expect } from 'vitest';
import { NODES, ITEM_CATALOG, ACTION_TEMPLATES } from '../seed';
import { WorldNodeSchema, ItemCatalogEntrySchema, ActionTemplateSchema } from '../../schema/zod';

const templateIds = new Set(ACTION_TEMPLATES.map((t) => t.template_id));
const itemIds = new Set(ITEM_CATALOG.map((i) => i.item_id));
const nodeIds = new Set(NODES.map((n) => n.node_id));

describe('Seed nodes', () => {
  it('all nodes parse as valid WorldNodes', () => {
    for (const node of NODES) {
      expect(() => WorldNodeSchema.parse(node), `node ${node.node_id}`).not.toThrow();
    }
  });

  it('every allowed_action references a real template_id', () => {
    for (const node of NODES) {
      for (const actionId of node.allowed_actions) {
        expect(
          templateIds.has(actionId),
          `node "${node.node_id}" references unknown action "${actionId}"`
        ).toBe(true);
      }
    }
  });

  it('has at least 6 nodes', () => {
    expect(NODES.length).toBeGreaterThanOrEqual(6);
  });
});

describe('Seed item catalog', () => {
  it('all items parse as valid ItemCatalogEntries', () => {
    for (const item of ITEM_CATALOG) {
      expect(() => ItemCatalogEntrySchema.parse(item), `item ${item.item_id}`).not.toThrow();
    }
  });

  it('has at least 4 items', () => {
    expect(ITEM_CATALOG.length).toBeGreaterThanOrEqual(4);
  });

  it('item-keycard is present', () => {
    expect(itemIds.has('item-keycard')).toBe(true);
  });
});

describe('Seed action templates', () => {
  it('all templates parse as valid ActionTemplates', () => {
    for (const template of ACTION_TEMPLATES) {
      expect(() => ActionTemplateSchema.parse(template), `template ${template.template_id}`).not.toThrow();
    }
  });

  it('has at least 6 action templates', () => {
    expect(ACTION_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it('every required item references a real item_id', () => {
    for (const template of ACTION_TEMPLATES) {
      for (const itemId of template.requires.items) {
        expect(
          itemIds.has(itemId),
          `template "${template.template_id}" requires unknown item "${itemId}"`
        ).toBe(true);
      }
    }
  });

  it('every add_item / remove_item effect references a real item_id', () => {
    for (const template of ACTION_TEMPLATES) {
      for (const effect of template.effects) {
        if (effect.type === 'add_item' || effect.type === 'remove_item') {
          expect(
            itemIds.has(effect.item_id),
            `template "${template.template_id}" effect references unknown item "${effect.item_id}"`
          ).toBe(true);
        }
      }
    }
  });

  it('every unlock_node / corrupt_node / move_to effect references a real node_id', () => {
    for (const template of ACTION_TEMPLATES) {
      for (const effect of template.effects) {
        if (
          effect.type === 'unlock_node' ||
          effect.type === 'corrupt_node' ||
          effect.type === 'move_to'
        ) {
          expect(
            nodeIds.has(effect.node_id),
            `template "${template.template_id}" effect references unknown node "${effect.node_id}"`
          ).toBe(true);
        }
      }
    }
  });

  it('keycard gate: action-access-vault requires item-keycard', () => {
    const gate = ACTION_TEMPLATES.find((t) => t.template_id === 'action-access-vault');
    expect(gate).toBeDefined();
    expect(gate!.requires.items).toContain('item-keycard');
  });

  it('keycard gate: action-access-vault unlocks node-vault', () => {
    const gate = ACTION_TEMPLATES.find((t) => t.template_id === 'action-access-vault');
    const unlockEffect = gate!.effects.find((e) => e.type === 'unlock_node');
    expect(unlockEffect).toBeDefined();
    if (unlockEffect?.type === 'unlock_node') {
      expect(unlockEffect.node_id).toBe('node-vault');
    }
  });

  it('node-vault is locked by default in seed', () => {
    const vault = NODES.find((n) => n.node_id === 'node-vault');
    expect(vault).toBeDefined();
    expect(vault!.is_unlocked).toBe(false);
  });

  it('node-corridor-b has action-access-vault in allowed_actions', () => {
    const corridor = NODES.find((n) => n.node_id === 'node-corridor-b');
    expect(corridor).toBeDefined();
    expect(corridor!.allowed_actions).toContain('action-access-vault');
  });
});
