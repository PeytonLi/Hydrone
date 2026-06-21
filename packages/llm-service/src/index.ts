// NOTE for Agent C: add the HydraDB TS SDK package to package.json after
// looking up the correct npm package name at https://docs.hydradb.com
// (it is too new to be in Context7 and was not found as "hydradb" on npm).

import type {
  TurnContext,
  LLMGameResponse,
  LoreDoc,
  LedgerEntry,
  Chunk,
} from '@hydrone/core';

export class NotImplementedError extends Error {
  constructor(fn: string) {
    super(`Not implemented: ${fn}`);
    this.name = 'NotImplementedError';
  }
}

/**
 * Call Claude via Vercel AI SDK generateObject + LLMGameResponseSchema.
 * Validates output; repairs or rejects malformed responses.
 */
export async function generateTurn(
  _ctx: TurnContext
): Promise<LLMGameResponse> {
  throw new NotImplementedError('generateTurn');
}

export const memory = {
  /**
   * Ingest authored lore as type:"knowledge" into HydraDB.
   * Called once at seed time; awaits indexing_status:"completed" before resolving.
   */
  seedLore: async (_lore: LoreDoc[]): Promise<void> => {
    throw new NotImplementedError('memory.seedLore');
  },

  /**
   * Fire-and-forget: ingest a turn's event into HydraDB episodic memory.
   * Never blocks the turn's critical path. Indexing lag is acceptable.
   */
  ingestEpisode: (_sessionId: string, _event: LedgerEntry): void => {
    throw new NotImplementedError('memory.ingestEpisode');
  },

  /**
   * Query HydraDB for relevant memory/lore chunks.
   * Returns recall context for narrative enrichment only — never a gate.
   */
  query: async (_sessionId: string, _q: string): Promise<Chunk[]> => {
    throw new NotImplementedError('memory.query');
  },
};
