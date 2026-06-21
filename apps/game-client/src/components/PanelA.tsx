"use client";

import { useGameStore } from "@/store/game-store";
import { BarChart3, Zap, TrendingUp, History } from "lucide-react";

const DRIFT_TRANSCRIPT = [
  {
    speaker: "SYSTEM",
    text: "RESTORE: session-7b3f, last location: Security Checkpoint.",
  },
  {
    speaker: "NARRATOR",
    text: "You stand in the Vault Chamber. Wait — weren't you just in the entrance?",
  },
  {
    speaker: "SYSTEM",
    text: "WARNING: Inconsistency detected. Node mismatch: expected 'node-security', got 'node-vault'.",
  },
  {
    speaker: "NARRATOR",
    text: "You notice the keycard is still in your inventory, but the door is already open behind you.",
  },
  {
    speaker: "SYSTEM",
    text: "Item duplication detected: 'item-medkit' appears twice in inventory. Rolling back.",
  },
  {
    speaker: "NARRATOR",
    text: "The medkit flickers out of existence. The blown-open door flickers too — then it's intact again.",
  },
  {
    speaker: "SYSTEM",
    text: "State diverged. Context window overflow. Narrative coherence: 43%. Drift severity: HIGH.",
  },
  {
    speaker: "NARRATOR",
    text: "Where... where am I? This doesn't make sense anymore. The walls keep changing.",
  },
];

export function PanelA() {
  const boundedCost = useGameStore((s) => s.boundedCost);
  const linearCost = useGameStore((s) => s.linearCost);
  const promptTokens = useGameStore((s) => s.promptTokens);
  const completionTokens = useGameStore((s) => s.completionTokens);
  const showDrift = useGameStore((s) => s.showDriftTranscript);
  const toggleDrift = useGameStore((s) => s.toggleDriftTranscript);

  const maxCost = Math.max(boundedCost, linearCost, 1);
  const boundedPct = (boundedCost / maxCost) * 100;
  const linearPct = (linearCost / maxCost) * 100;

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Zap className="w-4 h-4 text-cyan-400" />
        <h2 className="text-cyan-400 font-semibold text-sm tracking-wide">
          THE CAUSE
        </h2>
      </div>

      {/* Architecture copy */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-2">
        <p>
          <span className="text-cyan-400 font-semibold">Postgres</span> holds
          authoritative state — every item, flag, and location is an exact row.
          The deterministic engine validates every action against authored gates
          before a single write.
        </p>
        <p>
          <span className="text-purple-400 font-semibold">HydraDB</span> is the
          long-term memory layer — episodic events and lore are ingested
          async-indexed. It enriches narration but never gates state.
        </p>
        <p className="text-slate-500 italic">
          &ldquo;State is Postgres. Flavor is HydraDB.&rdquo;
        </p>
      </div>

      {/* Cost chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-yellow-400" />
          <h3 className="text-yellow-400 text-xs font-semibold tracking-wide">
            TOKEN COST PER TURN
          </h3>
        </div>

        <div className="space-y-3">
          {/* Bounded bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-cyan-400">Bounded (structured output)</span>
              <span className="text-cyan-400 font-mono">
                ~{(boundedCost || 1200).toLocaleString()} tokens
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: boundedPct + "%" }}
              />
            </div>
          </div>

          {/* Linear bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-400">Linear (growing chat log)</span>
              <span className="text-red-400 font-mono">
                ~{(linearCost || 4500).toLocaleString()} tokens
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full transition-all duration-500"
                style={{ width: linearPct + "%" }}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mt-2">
            Constant per-turn cost vs. linearly growing chat history.
            {promptTokens > 0 && (
              <span className="text-cyan-400 ml-1">
                (Last turn: {promptTokens} in / {completionTokens} out)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Memory Drift toggle + transcript */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <button
          onClick={toggleDrift}
          className="flex items-center gap-2 w-full text-left mb-3"
        >
          <History className="w-4 h-4 text-orange-400" />
          <h3 className="text-orange-400 text-xs font-semibold tracking-wide">
            SIMULATE MEMORY DRIFT
          </h3>
          <span className="ml-auto text-[10px] text-slate-500">
            {showDrift ? "[ON]" : "[OFF]"}
          </span>
        </button>

        {showDrift && (
          <div className="space-y-2 max-h-64 overflow-y-auto border-t border-slate-800 pt-3">
            {DRIFT_TRANSCRIPT.map((line, i) => (
              <div key={i} className="text-[10px] leading-relaxed">
                <span
                  className={
                    line.speaker === "SYSTEM"
                      ? "text-red-400 font-semibold"
                      : "text-orange-300 italic"
                  }
                >
                  [{line.speaker}]
                </span>{" "}
                <span className="text-slate-400">{line.text}</span>
              </div>
            ))}
            <div className="text-[10px] text-red-500 font-bold mt-2 animate-pulse">
              !!! NARRATIVE COHERENCE LOST !!!
            </div>
          </div>
        )}
      </div>

      {/* Comparison note */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3 h-3 text-green-400" />
          <span className="text-green-400 text-[10px] font-semibold">
            HYDRONE ADVANTAGE
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Bounded architecture keeps per-turn token cost constant. A linear chat
          system grows cost with every message — the longer you play, the more
          expensive each turn becomes.
        </p>
      </div>
    </div>
  );
}
