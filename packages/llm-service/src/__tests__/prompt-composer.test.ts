import { describe, it, expect } from 'vitest';
import type { TurnContext, SubGraph, ActionTemplate, Chunk } from '@hydrone/core';
import { composePrompt } from '../prompt-composer';

function makeSubGraph(overrides: Partial<SubGraph> = {}): SubGraph {
  return {
    session_id: 'sess-1',
    current_node: {
      node_id: 'node-entrance',
      zone: 'sector-7',
      name: 'Entrance Hall',
      description: 'A dusty anteroom with emergency lights.',
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: ['action-examine', 'action-move-to-corridor-a'],
    },
    neighbors: [
      {
        node_id: 'node-corridor-a',
        zone: 'sector-7',
        name: 'Corridor Alpha',
        description: 'A long hallway.',
        is_unlocked: true,
        is_corrupted: false,
        allowed_actions: ['action-examine'],
      },
    ],
    inventory: [],
    flags: {},
    ...overrides,
  };
}

function makeActions(): ActionTemplate[] {
  return [
    {
      template_id: 'action-examine',
      label: 'Examine Surroundings',
      narrative_hint: 'Carefully survey the area.',
      requires: { items: [], flags: {} },
      effects: [],
    },
    {
      template_id: 'action-move-to-corridor-a',
      label: 'Go to Corridor Alpha',
      narrative_hint: 'Move into the main corridor.',
      requires: { items: [], flags: {} },
      effects: [{ type: 'move_to', node_id: 'node-corridor-a' }],
    },
  ];
}

function makeChunks(): Chunk[] {
  return [
    { content: 'The facility was abandoned after incident Sigma.', relevance_score: 0.95 },
    { content: 'Security logs show unauthorized access on cycle 742.', relevance_score: 0.72 },
  ];
}

describe('composePrompt', () => {
  it('should include location information', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('Entrance Hall');
    expect(result.prompt).toContain('sector-7');
    expect(result.prompt).toContain('A dusty anteroom');
  });

  it('should include allowed actions', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('action-examine');
    expect(result.prompt).toContain('Examine Surroundings');
    expect(result.prompt).toContain('action-move-to-corridor-a');
  });

  it('should include inventory when present', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph({ inventory: ['item-keycard', 'item-medkit'] }),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('item-keycard');
    expect(result.prompt).toContain('item-medkit');
  });

  it('should show empty inventory message when no items', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph({ inventory: [] }),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('(empty)');
  });

  it('should include memory chunks', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: makeChunks(),
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('incident Sigma');
    expect(result.prompt).toContain('relevance: 0.95');
  });

  it('should show no-memory message when no chunks', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('no relevant memories');
  });

  it('should include the chosen action', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-move-to-corridor-a',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('action-move-to-corridor-a');
    expect(result.prompt).toContain('Go to Corridor Alpha');
  });

  it('should include system prompt with constraints', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.system).toContain('chosen_action_id');
    expect(result.system).toContain('Hydrone');
  });

  it('should include story flags', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph({ flags: { vault_accessed: true, data_retrieved: false } }),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('vault_accessed: true');
    expect(result.prompt).toContain('data_retrieved: false');
  });

  it('should include neighbors', () => {
    const ctx: TurnContext = {
      session_id: 'sess-1',
      subgraph: makeSubGraph(),
      allowed_actions: makeActions(),
      memory_chunks: [],
      action_id: 'action-examine',
    };

    const result = composePrompt(ctx);
    expect(result.prompt).toContain('Corridor Alpha');
  });
});
