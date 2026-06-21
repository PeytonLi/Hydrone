import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoreDoc, LedgerEntry, Chunk } from '@hydrone/core';

const mockIngest = vi.fn();
const mockStatus = vi.fn();
const mockQuery = vi.fn();
const mockCreateTenant = vi.fn();
const mockTenantStatus = vi.fn();

vi.mock('@hydradb/sdk', function() {
  return {
    HydraDBClient: vi.fn().mockImplementation(function() {
      return {
        tenants: {
          create: mockCreateTenant,
          status: mockTenantStatus,
        },
        context: {
          ingest: mockIngest,
          status: mockStatus,
        },
        query: mockQuery,
      };
    }),
    HydraDBError: class HydraDBError extends Error {
      constructor(message, statusCode) {
        super(message);
        this.name = 'HydraDBError';
        this.statusCode = statusCode;
        this.body = { error: { code: 'TEST_ERROR' } };
      }
    },
    buildString: vi.fn(function(result) {
      var r = result;
      return (r && r.data && r.data.chunks) ? r.data.chunks.map(function(c) { return c.chunk_content; }).join('\n') : '';
    }),
  };
});

import {
  initHydraDB,
  memory,
  resetHydraDB,
} from '../hydradb-client';

var TEST_TOKEN = 'hydra-test-token';
var TEST_TENANT = 'hydrone-demo';

function makeLore(overrides) {
  overrides = overrides || {};
  return [
    {
      type: 'knowledge',
      title: overrides.title || 'Test Lore',
      content: overrides.content || 'This is test world lore.',
    },
  ];
}

function makeLedgerEntry(overrides) {
  overrides = overrides || {};
  return {
    session_id: overrides.session_id || 'sess-1',
    ts: overrides.ts || new Date(),
    action: overrides.action || 'action-examine',
    narrative_summary: overrides.narrative_summary || 'The player examined the room.',
  };
}

function makeQueryChunks() {
  return [
    {
      chunk_uuid: 'chunk-1',
      source_title: 'Test Lore',
      chunk_content: 'The vault is protected by a biometric scanner.',
      relevancy_score: 1.09,
    },
    {
      chunk_uuid: 'chunk-2',
      source_title: 'Security Log',
      chunk_content: 'The keycard was last used on cycle 742.',
      relevancy_score: 0.85,
    },
  ];
}

describe('HydraDB client wrapper', function() {
  beforeEach(function() {
    vi.clearAllMocks();
    resetHydraDB();
    initHydraDB(TEST_TOKEN, TEST_TENANT);
  });

  afterEach(function() {
    resetHydraDB();
  });

  describe('initHydraDB', function() {
    it('should throw if memory is used before initialization', async function() {
      resetHydraDB();
      await expect(memory.seedLore(makeLore())).rejects.toThrow(
        'HydraDB not initialized'
      );
    });
  });

  describe('memory.seedLore', function() {
    it('should ingest lore as type:knowledge via app_knowledge', async function() {
      mockIngest.mockResolvedValueOnce({
        data: {
          results: [{ id: 'lore-1' }],
          success_count: 1,
          failed_count: 0,
        },
      });

      mockStatus.mockResolvedValueOnce({
        data: {
          statuses: [{ indexingStatus: 'completed' }],
        },
      });

      var lore = makeLore({ title: 'World Backstory' });
      await memory.seedLore(lore);

      expect(mockIngest).toHaveBeenCalledTimes(1);
      var call = mockIngest.mock.calls[0][0];
      expect(call.type).toBe('knowledge');
      expect(call.tenantId).toBe(TEST_TENANT);
    });

    it('should wait until indexing reaches completed', async function() {
      mockIngest.mockResolvedValueOnce({
        data: {
          results: [{ id: 'lore-1' }, { id: 'lore-2' }],
          success_count: 2,
          failed_count: 0,
        },
      });

      var callCount = 0;
      mockStatus.mockImplementation(function() {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            data: {
              statuses: [
                { indexingStatus: 'processing' },
                { indexingStatus: 'processing' },
              ],
            },
          });
        }
        return Promise.resolve({
          data: {
            statuses: [
              { indexingStatus: 'completed' },
              { indexingStatus: 'completed' },
            ],
          },
        });
      });

      var lore = [
        { type: 'knowledge', title: 'L1', content: 'Content 1' },
        { type: 'knowledge', title: 'L2', content: 'Content 2' },
      ];
      await memory.seedLore(lore);
      expect(mockStatus).toHaveBeenCalledTimes(3);
    });

    it('should throw if indexing fails with errored', async function() {
      mockIngest.mockResolvedValueOnce({
        data: {
          results: [{ id: 'bad-lore' }],
          success_count: 1,
          failed_count: 0,
        },
      });

      mockStatus.mockResolvedValueOnce({
        data: {
          statuses: [
            { indexingStatus: 'errored', errorMessage: 'Failed to parse document' },
          ],
        },
      });

      await expect(memory.seedLore(makeLore())).rejects.toThrow(/Failed to parse/);
    });
  });

  describe('memory.ingestEpisode', function() {
    it('should be fire-and-forget returning void', function() {
      mockIngest.mockResolvedValueOnce({
        data: { results: [{ id: 'ep-1' }], success_count: 1, failed_count: 0 },
      });

      var event = makeLedgerEntry();
      var result = memory.ingestEpisode('sess-1', event);
      expect(result).toBeUndefined();
    });

    it('should ingest as type:memory with subTenantId', async function() {
      var resolveIngest;
      var ingestPromise = new Promise(function(resolve) {
        resolveIngest = resolve;
      });
      mockIngest.mockReturnValueOnce(ingestPromise);

      var event = makeLedgerEntry({ session_id: 'sess-42' });
      memory.ingestEpisode('sess-42', event);

      await new Promise(function(r) { setTimeout(r, 10); });

      expect(mockIngest).toHaveBeenCalledTimes(1);
      var call = mockIngest.mock.calls[0][0];
      expect(call.type).toBe('memory');
      expect(call.tenantId).toBe(TEST_TENANT);
      expect(call.subTenantId).toBe('sess-42');

      resolveIngest({
        data: { results: [{ id: 'ep-1' }], success_count: 1, failed_count: 0 },
      });
      await ingestPromise;
    });

    it('should silently catch errors', async function() {
      mockIngest.mockRejectedValueOnce(new Error('Network failure'));

      var event = makeLedgerEntry();
      expect(function() { memory.ingestEpisode('sess-1', event); }).not.toThrow();

      await new Promise(function(r) { setTimeout(r, 10); });
      expect(mockIngest).toHaveBeenCalledTimes(1);
    });
  });

  describe('memory.query', function() {
    it('should query with type:all and map chunks', async function() {
      var rawChunks = makeQueryChunks();
      mockQuery.mockResolvedValueOnce({
        data: {
          chunks: rawChunks,
          graph_context: { query_paths: [] },
          additional_context: {},
        },
      });

      var chunks = await memory.query('sess-1', 'What is the vault?');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      var call = mockQuery.mock.calls[0][0];
      expect(call.tenantId).toBe(TEST_TENANT);
      expect(call.subTenantId).toBe('sess-1');
      expect(call.type).toBe('all');

      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe(rawChunks[0].chunk_content);
      expect(chunks[0].relevance_score).toBe(rawChunks[0].relevancy_score);
    });

    it('should return empty array when no chunks', async function() {
      mockQuery.mockResolvedValueOnce({
        data: {
          chunks: [],
          graph_context: { query_paths: [] },
          additional_context: {},
        },
      });

      var chunks = await memory.query('sess-1', 'nothing');
      expect(chunks).toEqual([]);
    });

    it('should throw if not initialized', async function() {
      resetHydraDB();
      await expect(memory.query('sess-1', 'test')).rejects.toThrow(
        'HydraDB not initialized'
      );
    });
  });
});
