import { test, expect, beforeAll, afterAll } from "vitest";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
try { loadEnvFile(resolve(__dirname, "../../../../../.env.local")); } catch {}

import { initEngine, closeEngine, getDb, fetchSubGraph, commitMutationBlock, loadSeed } from "../db";
import { sessions, playerInventory, storyFlags, worldNodes } from "../../schema/postgres";
import { eq } from "drizzle-orm";

const DB_URL = process.env.DATABASE_URL!;
if (!DB_URL) throw new Error("DATABASE_URL required");

async function makeSession(d: ReturnType<typeof getDb>, sid: string) {
  await d.insert(sessions).values({
    session_id: sid, user_id: "test", current_location_id: "node-entrance",
  });
}

async function cleanSession(d: ReturnType<typeof getDb>, sid: string) {
  try {
    await d.delete(playerInventory).where(eq(playerInventory.session_id, sid));
    await d.delete(storyFlags).where(eq(storyFlags.session_id, sid));
    await d.delete(sessions).where(eq(sessions.session_id, sid));
  } catch {}
}

// Per-test setup
async function withEngine(fn: (db: ReturnType<typeof getDb>, sid: string) => Promise<void>) {
  initEngine(DB_URL);
  const db = getDb();
  await loadSeed();
  const sid = `t-${Date.now()}`;
  await makeSession(db, sid);
  try {
    await fn(db, sid);
  } finally {
    await cleanSession(db, sid);
    await closeEngine();
  }
}

test("add_item", async () => {
  await withEngine(async (db, sid) => {
    const r = await commitMutationBlock(sid, [{ type: "add_item", item_id: "item-keycard" }]);
    expect(r.inventory).toContain("item-keycard");
  });
}, 30000);

test("move_to", async () => {
  await withEngine(async (db, sid) => {
    const r = await commitMutationBlock(sid, [{ type: "move_to", node_id: "node-security" }]);
    expect(r.current_location_id).toBe("node-security");
  });
}, 30000);

test("set_flag", async () => {
  await withEngine(async (db, sid) => {
    const r = await commitMutationBlock(sid, [{ type: "set_flag", key: "x", value: true }]);
    expect(r.flags["x"]).toBe(true);
  });
}, 30000);

test("multi-effect", async () => {
  await withEngine(async (db, sid) => {
    const r = await commitMutationBlock(sid, [
      { type: "add_item", item_id: "item-data-chip" },
      { type: "set_flag", key: "vault_accessed", value: true },
    ]);
    expect(r.inventory).toContain("item-data-chip");
    expect(r.flags["vault_accessed"]).toBe(true);
  });
}, 30000);

test("remove_item", async () => {
  await withEngine(async (db, sid) => {
    await commitMutationBlock(sid, [{ type: "add_item", item_id: "item-keycard" }]);
    const r = await commitMutationBlock(sid, [{ type: "remove_item", item_id: "item-keycard" }]);
    expect(r.inventory).not.toContain("item-keycard");
  });
}, 30000);

test("unlock_node", async () => {
  await withEngine(async (db, sid) => {
    await db.update(worldNodes).set({ is_unlocked: false }).where(eq(worldNodes.node_id, "node-vault"));
    await commitMutationBlock(sid, [{ type: "unlock_node", node_id: "node-vault" }]);
    const [vault] = await db.select().from(worldNodes).where(eq(worldNodes.node_id, "node-vault"));
    expect(vault.is_unlocked).toBe(true);
  });
}, 30000);
