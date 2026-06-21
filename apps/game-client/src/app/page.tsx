"use client";

import { useEffect, useCallback, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PanelA } from "@/components/PanelA";
import { PanelB } from "@/components/PanelB";
import { PanelC } from "@/components/PanelC";

const FALLBACK_STATE = {
  sessionId: "demo-1",
  currentNode: {
    node_id: "node-entrance",
    zone: "sector-7",
    name: "Entrance Hall",
    description:
      "A dusty anteroom. Emergency lights cast red shadows on the peeling walls. The air smells of burnt circuits.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: ["action-examine", "action-move-to-corridor-a"],
  },
  neighbors: [
    {
      node_id: "node-corridor-a",
      zone: "sector-7",
      name: "Corridor Alpha",
      description:
        "A long hallway. Sparking wires hang from a collapsed ceiling panel.",
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: [
        "action-examine",
        "action-move-to-entrance",
        "action-move-to-security",
        "action-move-to-storage",
      ],
    },
  ],
  inventory: [] as string[],
  flags: {} as Record<string, boolean>,
  allowedActions: [
    {
      template_id: "action-examine",
      label: "Examine Surroundings",
      narrative_hint: "Carefully survey the area for clues.",
      requires: { items: [], flags: {} },
      effects: [],
    },
    {
      template_id: "action-move-to-corridor-a",
      label: "Go to Corridor Alpha",
      narrative_hint: "Move into the main corridor.",
      requires: { items: [], flags: {} },
      effects: [{ type: "move_to", node_id: "node-corridor-a" }] as any,
    },
  ] as any[],
  narrativeText:
    "The emergency lights flicker overhead as you step into the abandoned Hydrone facility. Your mission: retrieve the data chip from the vault.",
  systemLogMessage: "Session initialized. State restored from Postgres (12ms).",
  characterMood: "neutral" as const,
  memoryChunks: [
    {
      content:
        "Hydrone Systems was developing classified research before the facility was abandoned.",
      relevance_score: 0.87,
    },
  ],
  boundedCost: 1200,
  linearCost: 4500,
};

/** Try to fetch initial state from the server. Falls back to hardcoded demo state. */
async function fetchInitialState(): Promise<typeof FALLBACK_STATE> {
  let sessionId = "";
  try {
    const createRes = await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "__create__" }),
    });
    const createData = await createRes.json();
    if (createData.sessionId) {
      sessionId = createData.sessionId;
    }
  } catch {
    // Server not ready - use fallback
  }

  if (sessionId) {
    try {
      const stateRes = await fetch(
        `/api/turn?sessionId=${encodeURIComponent(sessionId)}`,
      );
      const stateData = await stateRes.json();
      if (!stateData.error && stateData.currentNode) {
        localStorage.setItem("hydrone-session-id", sessionId);
        return stateData;
      }
    } catch {
      // Server state fetch failed - use fallback
    }
  }

  localStorage.setItem("hydrone-session-id", FALLBACK_STATE.sessionId);
  return FALLBACK_STATE;
}

export default function Home() {
  const hydrate = useGameStore((s) => s.hydrateFromServer);
  const sessionId = useGameStore((s) => s.sessionId);
  const startTurn = useGameStore((s) => s.startTurn);
  const [initialized, setInitialized] = useState(false);

  // Hydrate from server on mount, falling back to hardcoded state
  useEffect(() => {
    let cancelled = false;
    fetchInitialState().then((state) => {
      if (!cancelled) {
        hydrate(state as any);
        setInitialized(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const handleAction = useCallback(
    async (actionId: string) => {
      if (!sessionId) return;
      startTurn();
      try {
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, actionId }),
        });
        const data = await res.json();
        if (!data.error) {
          hydrate(data);
          useGameStore.getState().markFieldsFlash(["inventory", "flags"]);
        }
      } catch (err) {
        console.error("Turn failed:", err);
      }
    },
    [sessionId, hydrate, startTurn],
  );

  if (!initialized || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400 font-mono">
        <div className="text-center">
          <h1 className="text-2xl mb-4">HYDRONE</h1>
          <p className="animate-pulse">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 font-mono">
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-cyan-400 font-bold tracking-widest text-sm">
            HYDRONE
          </h1>
          <span className="text-slate-600 text-xs">
            Persistent-State Graph RPG
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Session: {sessionId.slice(0, 8)}...
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 max-w-[1600px] mx-auto">
        <section className="lg:col-span-1">
          <PanelA />
        </section>
        <section className="lg:col-span-1">
          <PanelB onAction={handleAction} />
        </section>
        <section className="lg:col-span-1">
          <PanelC />
        </section>
      </div>
    </main>
  );
}
