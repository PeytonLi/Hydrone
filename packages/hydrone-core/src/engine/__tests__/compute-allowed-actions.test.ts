import { describe, it, expect } from 'vitest';
import { computeAllowedActions } from '../compute-allowed-actions';
import type { SubGraph, WorldNode } from '../../schema/zod';

function makeNode(overrides: Partial<WorldNode> = {}): WorldNode {
  return {
    node_id: 'node-entrance',
    zone: 'sector-7',
    name: 'Test Node',
    description: 'desc',
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<SubGraph> = {}): SubGraph {
  return {
    session_id: 'test-session',
    current_node: makeNode({
      allowed_actions: ['action-examine', 'action-move-to-corridor-a'],
    }),
    neighbors: [],
    inventory: [],
    flags: {},
    ...overrides,
  };
}

describe('computeAllowedActions', () => {
  it('returns only actions on the current node that have no requirements', () => {
    const state = makeState();
    const allowed = computeAllowedActions(state);
    const ids = allowed.map((a) => a.template_id);
    // Only examine and move-to-corridor-a are on this node
    expect(ids).toHaveLength(2);
    expect(ids).toContain('action-examine');
    expect(ids).toContain('action-move-to-corridor-a');
  });

  it('filters out actions not on the current node', () => {
    // action-pick-up-keycard has no requirements but is NOT on this node
    const state = makeState();
    const allowed = computeAllowedActions(state);
    const ids = allowed.map((a) => a.template_id);
    expect(ids).not.toContain('action-pick-up-keycard');
  });

  describe('gate: item requirements', () => {
    it('excludes action-access-vault when player lacks keycard', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-corridor-b',
          allowed_actions: ['action-access-vault'],
        }),
        inventory: [],
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).not.toContain('action-access-vault');
    });

    it('includes action-access-vault when player has keycard', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-corridor-b',
          allowed_actions: ['action-access-vault'],
        }),
        inventory: ['item-keycard'],
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).toContain('action-access-vault');
    });
  });

  describe('gate: flag requirements', () => {
    it('excludes action-retrieve-data-chip when vault_accessed flag is false', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-vault',
          allowed_actions: ['action-retrieve-data-chip'],
        }),
        flags: { vault_accessed: false },
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).not.toContain('action-retrieve-data-chip');
    });

    it('includes action-retrieve-data-chip when vault_accessed flag is true', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-vault',
          allowed_actions: ['action-retrieve-data-chip'],
        }),
        flags: { vault_accessed: true },
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).toContain('action-retrieve-data-chip');
    });

    it('excludes action-pick-up-keycard when keycard_taken flag is true', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-security',
          allowed_actions: ['action-pick-up-keycard'],
        }),
        flags: { keycard_taken: true },
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).not.toContain('action-pick-up-keycard');
    });

    it('includes action-pick-up-keycard when keycard_taken flag is false', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-security',
          allowed_actions: ['action-pick-up-keycard'],
        }),
        flags: { keycard_taken: false },
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).toContain('action-pick-up-keycard');
    });
  });

  describe('absent flags treated as false', () => {
    it('allows action-pick-up-keycard when keycard_taken is absent', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-security',
          allowed_actions: ['action-pick-up-keycard'],
        }),
        flags: {},
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).toContain('action-pick-up-keycard');
    });

    it('allows action requiring flag:false when flag is absent', () => {
      const state = makeState({
        current_node: makeNode({
          node_id: 'node-security',
          allowed_actions: ['action-pick-up-keycard'],
        }),
        flags: { some_other_flag: true },
      });
      const allowed = computeAllowedActions(state);
      const ids = allowed.map((a) => a.template_id);
      expect(ids).toContain('action-pick-up-keycard');
    });
  });

  it('returns empty array when node has no actions', () => {
    const state = makeState({
      current_node: makeNode({ allowed_actions: [] }),
    });
    const allowed = computeAllowedActions(state);
    expect(allowed).toHaveLength(0);
  });
});
