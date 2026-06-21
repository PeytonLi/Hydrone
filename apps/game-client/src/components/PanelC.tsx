"use client";

import { useGameStore } from "@/store/game-store";
import { Database, Brain, Trash2, RefreshCw, ShieldCheck } from "lucide-react";

export function PanelC() {
  const currentNode = useGameStore((s) => s.currentNode);
  const inventory = useGameStore((s) => s.inventory);
  const flags = useGameStore((s) => s.flags);
  const memoryChunks = useGameStore((s) => s.memoryChunks);
  const sessionId = useGameStore((s) => s.sessionId);
  const flashedFields = useGameStore((s) => s.flashedFields);
  const simulateDeviceDestruction = useGameStore(
    (s) => s.simulateDeviceDestruction
  );

  const pgState = {
    session_id: sessionId,
    current_location_id: currentNode?.node_id ?? null,
    inventory,
    flags,
    node_count: 6,
    last_updated: new Date().toISOString(),
  };

  const handleReset = () => {
    simulateDeviceDestruction();
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <ShieldCheck className="w-4 h-4 text-purple-400" />
        <h2 className="text-purple-400 font-semibold text-sm tracking-wide">
          THE PROOF
        </h2>
      </div>

      {/* Postgres State Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-cyan-400 text-xs font-semibold">
            POSTGRES STATE INSPECTOR
          </h3>
        </div>
        <div className="bg-slate-950 rounded-lg p-3 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
          <pre
            className={
              "text-slate-400 " +
              (flashedFields.includes("all") ? "flash-row" : "")
            }
          >
            {JSON.stringify(pgState, null, 2)}
          </pre>
        </div>
        <p className="text-[9px] text-slate-600 mt-2">
          Live Postgres state. Mutated rows flash yellow on each turn.
        </p>
      </div>

      {/* HydraDB Memory Readout */}
      <div className="bg-slate-900 border border-purple-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-purple-400" />
          <h3 className="text-purple-400 text-xs font-semibold">
            HYDRADB MEMORY
          </h3>
        </div>
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {memoryChunks.length === 0 ? (
            <p className="text-[10px] text-slate-600 italic">
              No memory indexed yet.
            </p>
          ) : (
            memoryChunks.map((chunk, i) => (
              <div
                key={i}
                className="text-[10px] leading-relaxed bg-slate-950 rounded p-2 border border-slate-800"
              >
                <p className="text-slate-400">{chunk.content}</p>
                <p className="text-[8px] text-purple-500 mt-0.5">
                  relevance: {chunk.relevance_score.toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
        <p className="text-[9px] text-slate-600 mt-2">
          Episodic count: {memoryChunks.length}. Async-indexed. Never gates state.
        </p>
      </div>

      {/* Simulate Device Destruction */}
      <div className="bg-slate-900 border border-red-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h3 className="text-red-400 text-xs font-semibold">
            SIMULATE DEVICE DESTRUCTION
          </h3>
        </div>
        <p className="text-[10px] text-slate-500 mb-3">
          Clears all local state (Zustand + localStorage) then reloads. State
          re-hydrates from Postgres in a single query &mdash; no embedding
          round-trip.
        </p>
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 border border-red-800 hover:bg-red-900/50 text-red-300 text-xs transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          DESTROY &amp; RESTORE
        </button>
      </div>

      {/* Determinism claim */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
        <p className="text-[10px] text-slate-600 text-center">
          Same actions, same state. Always.{"\n"}
          Restore: single Postgres query. No embedding round-trip.
        </p>
      </div>
    </div>
  );
}
