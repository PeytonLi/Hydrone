import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initEngine,
  closeEngine,
  getDb,
  fetchSubGraph,
  commitMutationBlock,
  loadSeed,
} from '../db';
import { sessions, playerInventory, storyFlags, worldNodes } from '../../schema/postgres';
import { eq, and } from 'drizzle-orm';
import type { Mutation } from '../../schema/zod';

const DATABASE_URL = process.env.DATABASE_URL;

const describeIf = DATABASE_URL ? describe : describe.skip;

describeIf('Engine DB operations (requires DATABASE_URL)', () => {
  const TEST_SESSION = 'test-session-engine';

  beforeAll(async () => {
    initEngine(DATABASE_URL!);
    const db = getDb();

    // Load seed data (idempotent)
    await loadSeed();

    // Create a test session
    await db
      .insert(sessions)
      .values({
        session_id: TEST_SESSION,
        user_id: 'test-user',
        current_location_id: 'node-entrance',
      })
      .onConflictDoUpdate({
        target: sessions.session_id,
        set: { current_location_id: 'node-entrance', last_updated: new Date() },
      });

    // Clean up any leftover test data
    await db
      .delete(playerInventory)
      .where(eq(playerInventory.session_id, TEST_SESSION));
    await db
      .delete(storyFlags)
      .where(eq(storyFlags.session_id, TEST_SESSION));
  });

  afterAll(async () => {
    // Clean up test data
    try {
      const db = getDb();
      await db
        .delete(playerInventory)
        .where(eq(playerInventory.session_id, TEST_SESSION));
      await db
        .delete(storyFlags)
        .where(eq(storyFlags.session_id, TEST_SESSION));
      await db
        .delete(sessions)
        .where(eq(sessions.session_id, TEST_SESSION));
    } catch {
      // Ignore cleanup errors
    }
    await closeEngine();
  });

  describe('loadSeed', () => {
    it('loads seed data without error (idempotent)', async () => {
      await expect(loadSeed()).resolves.not.toThrow();
    });

    it('seed nodes are queryable after load', async () => {
      const db = getDb();
      const nodes = await db.select().from(worldNodes);
      expect(nodes.length).toBeGreaterThanOrEqual(6);
      expect(nodes.some((n) => n.node_id === 'node-vault')).toBe(true);
    });
  });

  describe('fetchSubGraph', () => {
    it('loads the current node, inventory, and flags', async () => {
      const sg = await fetchSubGraph(TEST_SESSION);
      expect(sg.session_id).toBe(TEST_SESSION);
      expect(sg.current_node.node_id).toBe('node-entrance');
      expect(sg.current_node.name).toBe('Entrance Hall');
      expect(sg.inventory).toEqual([]);
      expect(sg.flags).toEqual({});
    });

    it('reflects inventory after adding an item', async () => {
      const effects: Mutation[] = [{ type: 'add_item', item_id: 'item-keycard' }];
      await commitMutationBlock(TEST_SESSION, effects);

      const sg = await fetchSubGraph(TEST_SESSION);
      expect(sg.inventory).toContain('item-keycard');
    });

    it('reflects flags after setting a flag', async () => {
      const effects: Mutation[] = [{ type: 'set_flag', key: 'vault_accessed', value: true }];
      await commitMutationBlock(TEST_SESSION, effects);

      const sg = await fetchSubGraph(TEST_SESSION);
      expect(sg.flags['vault_accessed']).toBe(true);
    });

    it('throws for unknown session', async () => {
      await expect(fetchSubGraph('nonexistent-session')).rejects.toThrow(
        /Session not found/,
      );
    });
  });

  describe('commitMutationBlock', () => {
    it('commits add_item and returns updated WorldState', async () => {
      const effects: Mutation[] = [{ type: 'add_item', item_id: 'item-medkit' }];
      const result = await commitMutationBlock(TEST_SESSION, effects);

      expect(result.session_id).toBe(TEST_SESSION);
      expect(result.inventory).toContain('item-medkit');
    });

    it('commits move_to and updates current location', async () => {
      const effects: Mutation[] = [
        { type: 'move_to', node_id: 'node-security' },
      ];
      const result = await commitMutationBlock(TEST_SESSION, effects);

      expect(result.current_location_id).toBe('node-security');
    });

    it('commits set_flag and updates flags', async () => {
      const effects: Mutation[] = [
        { type: 'set_flag', key: 'data_retrieved', value: true },
      ];
      const result = await commitMutationBlock(TEST_SESSION, effects);

      expect(result.flags['data_retrieved']).toBe(true);
    });

    it('handles multiple effects in one transaction', async () => {
      const effects: Mutation[] = [
        { type: 'add_item', item_id: 'item-data-chip' },
        { type: 'set_flag', key: 'vault_accessed', value: true },
        { type: 'move_to', node_id: 'node-vault' },
      ];
      const result = await commitMutationBlock(TEST_SESSION, effects);

      expect(result.inventory).toContain('item-data-chip');
      expect(result.flags['vault_accessed']).toBe(true);
      expect(result.current_location_id).toBe('node-vault');
    });

    it('removes item with remove_item effect', async () => {
      // First add an item
      await commitMutationBlock(TEST_SESSION, [
        { type: 'add_item', item_id: 'item-keycard' },
      ]);

      // Then remove it
      const effects: Mutation[] = [
        { type: 'remove_item', item_id: 'item-keycard' },
      ];
      const result = await commitMutationBlock(TEST_SESSION, effects);

      expect(result.inventory).not.toContain('item-keycard');
    });

    it('unlocks a node with unlock_node effect', async () => {
      // Reset vault to locked
      const db = getDb();
      await db
        .update(worldNodes)
        .set({ is_unlocked: false })
        .where(eq(worldNodes.node_id, 'node-vault'));

      const effects: Mutation[] = [
        { type: 'unlock_node', node_id: 'node-vault' },
      ];
      await commitMutationBlock(TEST_SESSION, effects);

      const sg = await fetchSubGraph(TEST_SESSION);
      // Query the vault node directly
      const [vault] = await db
        .select()
        .from(worldNodes)
        .where(eq(worldNodes.node_id, 'node-vault'));
      expect(vault.is_unlocked).toBe(true);
    });
  });
});
