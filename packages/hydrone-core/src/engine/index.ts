import type {
  SubGraph,
  ActionTemplate,
  NodeSpec,
  Mutation,
  WorldState,
  WorldNode,
} from '../schema/zod';

export class NotImplementedError extends Error {
  constructor(fn: string) {
    super(`Not implemented: ${fn}`);
    this.name = 'NotImplementedError';
  }
}

/** Load current node + neighbors + inventory + flags for a session. */
export async function fetchSubGraph(_sessionId: string): Promise<SubGraph> {
  throw new NotImplementedError('fetchSubGraph');
}

/** Pure: compute which action templates are unlocked by the current state. */
export function computeAllowedActions(_state: SubGraph): ActionTemplate[] {
  throw new NotImplementedError('computeAllowedActions');
}

/**
 * Pure: assert actionId ∈ allowed set and resolve its authored effects.
 * On failure returns a tactical-setback effect block with zero state written.
 */
export function validateAction(
  _state: SubGraph,
  _actionId: string,
  _newNodeSpec?: NodeSpec
): { ok: true; effects: Mutation[] } | { ok: false; setback: Mutation[] } {
  throw new NotImplementedError('validateAction');
}

/** Commit a block of authored effects as a single Postgres transaction. */
export async function commitMutationBlock(
  _sessionId: string,
  _effects: Mutation[]
): Promise<WorldState> {
  throw new NotImplementedError('commitMutationBlock');
}

/** Validate a new node spec against the item catalog and action templates, then construct the node. */
export function createNode(_spec: NodeSpec): WorldNode {
  throw new NotImplementedError('createNode');
}

/** Insert seed data (world_nodes, item_catalog, action_templates) into Postgres. */
export async function loadSeed(): Promise<void> {
  throw new NotImplementedError('loadSeed');
}
