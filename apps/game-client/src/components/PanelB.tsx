"use client";

import { useGameStore } from "@/store/game-store";
import {
  MapPin,
  Package,
  Terminal,
  Play,
  Loader2,
  Heart,
  Zap,
  Skull,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ITEM_LABELS: Record<string, string> = {
  "item-keycard": "Security Keycard",
  "item-medkit": "Medical Kit",
  "item-data-chip": "Data Chip",
  "item-emp-device": "EMP Device",
};

const MOOD_EMOJI: Record<string, string> = {
  neutral: "\u{1F610}",
  excited: "\u{1F929}",
  worried: "\u{1F630}",
  triumphant: "\u{1F3C6}",
  defeated: "\u{1F614}",
};

interface PanelBProps {
  onAction: (actionId: string) => void;
}

export function PanelB({ onAction }: PanelBProps) {
  const currentNode = useGameStore((s) => s.currentNode);
  const neighbors = useGameStore((s) => s.neighbors);
  const inventory = useGameStore((s) => s.inventory);
  const flags = useGameStore((s) => s.flags);
  const allowedActions = useGameStore((s) => s.allowedActions);
  const narrativeText = useGameStore((s) => s.narrativeText);
  const systemLogMessage = useGameStore((s) => s.systemLogMessage);
  const characterMood = useGameStore((s) => s.characterMood);
  const isLoading = useGameStore((s) => s.isLoading);
  const flashedFields = useGameStore((s) => s.flashedFields);
  const stats = useGameStore((s) => s.stats);

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  // Typing effect for narrative text
  useEffect(() => {
    if (!narrativeText) {
      setDisplayedText("");
      return;
    }
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;
    const speed = 15;
    const type = () => {
      if (i < narrativeText.length) {
        setDisplayedText(narrativeText.slice(0, i + 1));
        i++;
        typingRef.current = setTimeout(type, speed);
      } else {
        setIsTyping(false);
      }
    };
    type();
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [narrativeText]);

  if (!currentNode) {
    return (
      <div className="text-slate-500 text-sm text-center py-8">
        No location data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Play className="w-4 h-4 text-green-400" />
        <h2 className="text-green-400 font-semibold text-sm tracking-wide">
          THE ACTION
        </h2>
      </div>

      {/* Location card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-start gap-2 mb-2">
          <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-cyan-400 font-semibold text-sm">
              {currentNode.name}
            </h3>
            <p className="text-[10px] text-slate-500">
              Zone: {currentNode.zone} | ID: {currentNode.node_id}
            </p>
          </div>
          <span className="ml-auto text-lg">
            {MOOD_EMOJI[characterMood] || MOOD_EMOJI.neutral}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {currentNode.description}
        </p>
        {Object.keys(flags).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(flags).map(([key, val]) => (
              <span
                key={key}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono"
              >
                {key}: {String(val)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Neighbors */}
      {neighbors.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
          <h4 className="text-[10px] text-slate-500 mb-2">NEARBY LOCATIONS</h4>
          <div className="flex flex-wrap gap-1">
            {neighbors.map((n) => (
              <span
                key={n.node_id}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400"
              >
                {n.name}
                {!n.is_unlocked && " \u{1F512}"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-red-400" />
              <div className="flex-1">
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-red-400">HP</span>
                  <span className="text-slate-400 font-mono">
                    {stats.health}/{stats.max_health}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(stats.health / stats.max_health) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <div className="flex-1">
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-yellow-400">EN</span>
                  <span className="text-slate-400 font-mono">
                    {stats.energy}/{stats.max_energy}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(stats.energy / stats.max_energy) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Skull className="w-3 h-3 text-purple-400" />
              <div className="flex-1">
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-purple-400">COR</span>
                  <span className="text-slate-400 font-mono">
                    {stats.corruption}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${stats.corruption}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-yellow-400" />
          <h3 className="text-yellow-400 text-xs font-semibold">INVENTORY</h3>
        </div>
        {inventory.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">[empty]</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {inventory.map((itemId) => (
              <span
                key={itemId}
                className={
                  "text-[10px] px-2 py-1 rounded font-mono border " +
                  (flashedFields.includes("inventory")
                    ? "flash-row border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
                    : "border-cyan-800 text-cyan-300 bg-cyan-500/10")
                }
              >
                {ITEM_LABELS[itemId] || itemId}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <h3 className="text-xs text-slate-500 font-semibold">ACTIONS</h3>
        {allowedActions.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic">
            No actions available.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {allowedActions.map((action) => (
              <button
                key={action.template_id}
                onClick={() => onAction(action.template_id)}
                disabled={isLoading}
                className="text-left text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-cyan-700 text-slate-300 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-[10px] text-slate-500 font-mono w-5 shrink-0">
                  &gt;
                </span>
                <span>{action.label}</span>
                {action.requires.items.length > 0 && (
                  <span className="text-[9px] text-yellow-500 ml-auto">
                    needs:{" "}
                    {action.requires.items
                      .map((id: string) => ITEM_LABELS[id] || id)
                      .join(", ")}
                  </span>
                )}
                {isLoading && (
                  <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Retro typing terminal */}
      <div className="bg-black border border-slate-700 rounded-lg p-4 min-h-[100px]">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-3 h-3 text-green-500" />
          <span className="text-[10px] text-green-500 font-mono">
            NARRATIVE FEED
          </span>
        </div>
        <div className="text-xs text-green-400 font-mono leading-relaxed">
          {displayedText || (
            <span className="text-slate-600 italic">Awaiting input...</span>
          )}
          {isTyping && <span className="typing-cursor text-green-400" />}
        </div>
        {systemLogMessage && (
          <div className="mt-2 pt-2 border-t border-slate-800">
            <p className="text-[9px] text-slate-500 font-mono">
              {systemLogMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
