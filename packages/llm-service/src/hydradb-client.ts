import { HydraDBClient } from "@hydradb/sdk";
import type { LoreDoc, LedgerEntry, Chunk } from "@hydrone/core";

let client: HydraDBClient | null = null;
let tenantId: string | null = null;

export function initHydraDB(token: string, tenant: string): void {
  client = new HydraDBClient({ token });
  tenantId = tenant;
}

export function resetHydraDB(): void {
  client = null;
  tenantId = null;
}

function ensureClient(): HydraDBClient {
  if (!client || !tenantId) {
    throw new Error("HydraDB not initialized. Call initHydraDB first.");
  }
  return client;
}

function getTenantId(): string {
  if (!tenantId) throw new Error("HydraDB not initialized. Call initHydraDB first.");
  return tenantId;
}

export const memory = {
  async seedLore(lore: LoreDoc[]): Promise<void> {
    const c = ensureClient();
    const tid = getTenantId();

    const result = await c.context.ingest({
      type: "knowledge",
      tenantId: tid,
      appKnowledge: JSON.stringify(
        lore.map((doc) => ({
          id: "lore-" + doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          tenant_id: tid,
          title: doc.title,
          type: "text",
          content: { text: doc.content },
        }))
      ),
    });

    const results = result.data?.results ?? [];
    const ids: string[] = results.map((r) => r.id!).filter((id): id is string => !!id);
    if (ids.length === 0) return;

    while (true) {
      const status = await c.context.status({ tenantId: tid, ids });
      const statuses = status.data?.statuses ?? [];
      const allDone = statuses.every(
        (s) =>
          s.indexingStatus === "completed" || s.indexingStatus === "graph_creation"
      );
      const anyErrored = statuses.find(
        (s) => s.indexingStatus === "errored"
      );
      if (anyErrored) {
        throw new Error(
          "Lore indexing failed: " + ((anyErrored as { errorMessage?: string }).errorMessage || "unknown error")
        );
      }
      if (allDone) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  },

  ingestEpisode(sessionId: string, event: LedgerEntry): void {
    const c = ensureClient();
    const tid = getTenantId();

    void (async () => {
      try {
        await c.context.ingest({
          type: "memory",
          tenantId: tid,
          subTenantId: sessionId,
          memories: JSON.stringify([
            {
              title: event.action + " - " + sessionId,
              text: event.narrative_summary,
              infer: false,
            },
          ]),
        });
      } catch {
        // Fire-and-forget: silently ignore errors
      }
    })();
  },

  async query(sessionId: string, q: string): Promise<Chunk[]> {
    const c = ensureClient();
    const tid = getTenantId();

    const result = await c.query({
      tenantId: tid,
      subTenantId: sessionId,
      query: q,
      type: "all",
      queryBy: "hybrid",
      mode: "fast",
      maxResults: 10,
      graphContext: false,
    });

    const chunks = (result.data?.chunks || []) as Array<{
      chunk_content: string;
      relevancy_score: number;
    }>;
    return chunks.map((raw) => ({
      content: raw.chunk_content,
      relevance_score: raw.relevancy_score,
    }));
  },
};
