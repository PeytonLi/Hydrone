import { describe, it, expect } from 'vitest';
import { createNode } from '../create-node';
import type { NodeSpec } from '../../schema/zod';

describe('createNode', () => {
  it('creates a valid WorldNode from a NodeSpec', () => {
    const spec: NodeSpec = {
      node_name: 'Hidden Lab',
      zone: 'sector-7',
      edges: ['node-vault'],
      action_template_ids: ['action-examine'],
      item_ids: ['item-data-chip'],
    };

    const node = createNode(spec);

    expect(node.node_id).toMatch(/^node-dynamic-/);
    expect(node.zone).toBe('sector-7');
    expect(node.name).toBe('Hidden Lab');
    expect(node.is_unlocked).toBe(true);
    expect(node.is_corrupted).toBe(false);
    expect(node.allowed_actions).toEqual(['action-examine']);
  });

  it('generates unique node_ids for subsequent calls', () => {
    const spec: NodeSpec = {
      node_name: 'A',
      zone: 'sector-7',
      edges: [],
      action_template_ids: ['action-examine'],
      item_ids: [],
    };

    const node1 = createNode(spec);
    const node2 = createNode(spec);

    expect(node1.node_id).not.toBe(node2.node_id);
  });

  it('throws when action_template_ids reference unknown template', () => {
    const spec: NodeSpec = {
      node_name: 'Bad Node',
      zone: 'sector-7',
      edges: [],
      action_template_ids: ['action-fake'],
      item_ids: [],
    };

    expect(() => createNode(spec)).toThrow(/unknown template_id/);
  });

  it('throws when item_ids reference unknown item', () => {
    const spec: NodeSpec = {
      node_name: 'Bad Node',
      zone: 'sector-7',
      edges: [],
      action_template_ids: ['action-examine'],
      item_ids: ['item-fake'],
    };

    expect(() => createNode(spec)).toThrow(/unknown item_id/);
  });

  it('throws when edges reference unknown nodes', () => {
    const spec: NodeSpec = {
      node_name: 'Orphan Node',
      zone: 'sector-7',
      edges: ['node-fake'],
      action_template_ids: ['action-examine'],
      item_ids: [],
    };

    expect(() => createNode(spec)).toThrow(/unknown edge target/);
  });

  it('allows edges referencing seed nodes', () => {
    const spec: NodeSpec = {
      node_name: 'Valid Node',
      zone: 'sector-7',
      edges: ['node-entrance', 'node-vault'],
      action_template_ids: ['action-examine'],
      item_ids: [],
    };

    expect(() => createNode(spec)).not.toThrow();
  });

  it('allows referencing items from the seed catalog', () => {
    const spec: NodeSpec = {
      node_name: 'Item Node',
      zone: 'sector-7',
      edges: [],
      action_template_ids: ['action-examine'],
      item_ids: ['item-keycard', 'item-medkit'],
    };

    expect(() => createNode(spec)).not.toThrow();
  });
});
