"use client";

import { useGameStore } from "@/store/game-store";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MapPin, Lock, AlertTriangle } from "lucide-react";

interface MapNode {
  nodeId: string;
  name: string;
  description: string;
  x: number;
  y: number;
  isCurrent: boolean;
  isNeighbor: boolean;
  isVisited: boolean;
  isUnlocked: boolean;
  isCorrupted: boolean;
}

const ZONE_COLORS: Record<
  string,
  { bg: string; border: string; glow: string }
> = {
  "sector-7": {
    bg: "fill-cyan-500/20",
    border: "stroke-cyan-500",
    glow: "rgba(6,182,212,0.4)",
  },
  "neon-alleyways": {
    bg: "fill-purple-500/20",
    border: "stroke-purple-500",
    glow: "rgba(168,85,247,0.4)",
  },
  "corporate-tower": {
    bg: "fill-yellow-500/20",
    border: "stroke-yellow-500",
    glow: "rgba(234,179,8,0.4)",
  },
  "server-vault": {
    bg: "fill-red-500/20",
    border: "stroke-red-500",
    glow: "rgba(239,68,68,0.4)",
  },
};

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  "node-entrance": { x: 400, y: 480 },
  "node-corridor-a": { x: 300, y: 360 },
  "node-security": { x: 200, y: 240 },
  "node-storage": { x: 420, y: 280 },
  "node-maintenance-shaft": { x: 560, y: 420 },
  "node-corridor-b": { x: 320, y: 120 },
  "node-vault": { x: 200, y: 60 },
  "node-alley-entrance": { x: 640, y: 300 },
  "node-market-stall": { x: 720, y: 240 },
  "node-back-alley": { x: 700, y: 360 },
  "node-server-room": { x: 780, y: 280 },
  "node-tower-lobby": { x: 620, y: 120 },
  "node-exec-level": { x: 520, y: 40 },
  "node-r-d-lab": { x: 700, y: 60 },
  "node-core-gateway": { x: 100, y: 300 },
  "node-hydrone-core": { x: 80, y: 420 },
};

const EDGES: Array<{ from: string; to: string }> = [
  { from: "node-entrance", to: "node-corridor-a" },
  { from: "node-entrance", to: "node-maintenance-shaft" },
  { from: "node-corridor-a", to: "node-security" },
  { from: "node-corridor-a", to: "node-storage" },
  { from: "node-security", to: "node-corridor-b" },
  { from: "node-corridor-b", to: "node-vault" },
  { from: "node-maintenance-shaft", to: "node-corridor-b" },
  { from: "node-alley-entrance", to: "node-market-stall" },
  { from: "node-alley-entrance", to: "node-back-alley" },
  { from: "node-back-alley", to: "node-server-room" },
  { from: "node-tower-lobby", to: "node-exec-level" },
  { from: "node-tower-lobby", to: "node-r-d-lab" },
  { from: "node-core-gateway", to: "node-hydrone-core" },
  { from: "node-vault", to: "node-core-gateway" },
  { from: "node-market-stall", to: "node-tower-lobby" },
];

function getZone(nodeId: string): string {
  if (
    nodeId.includes("alley") ||
    nodeId.includes("market") ||
    nodeId.includes("server-room")
  )
    return "neon-alleyways";
  if (
    nodeId.includes("tower") ||
    nodeId.includes("exec") ||
    nodeId.includes("r-d-lab")
  )
    return "corporate-tower";
  if (
    nodeId.includes("core") ||
    nodeId.includes("gateway") ||
    nodeId.includes("hydrone-core")
  )
    return "server-vault";
  return "sector-7";
}

function formatLabel(id: string): string {
  return id
    .replace("node-", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GameMap({
  onAction,
}: {
  onAction: (actionId: string) => void;
}) {
  const currentNode = useGameStore((s) => s.currentNode);
  const neighbors = useGameStore((s) => s.neighbors);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  // Build a lookup from node_id to the move action template_id

  useEffect(() => {
    if (currentNode) {
      setVisitedNodes((prev) => new Set([...prev, currentNode.node_id]));
    }
  }, [currentNode?.node_id]);

  const neighborIds = useMemo(
    () => new Set(neighbors.map((n) => n.node_id)),
    [neighbors],
  );

  // Track positions for dynamically generated nodes
  const [dynamicPositions, setDynamicPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const mapNodes = useMemo<MapNode[]>(() => {
    const currentId = currentNode?.node_id ?? "";
    const currentPos = currentNode ? NODE_POSITIONS[currentNode.node_id] : null;

    // Seed nodes with known positions
    const nodes: MapNode[] = Object.entries(NODE_POSITIONS).map(
      ([nodeId, pos]) => {
        // Try to find the actual node data from neighbors or currentNode
        const nodeData =
          currentNode?.node_id === nodeId
            ? currentNode
            : neighbors.find((n) => n.node_id === nodeId);
        return {
          nodeId,
          name: nodeData?.name || formatLabel(nodeId),
          description: nodeData?.description || "",
          x: pos.x,
          y: pos.y,
          isCurrent: nodeId === currentId,
          isNeighbor: neighborIds.has(nodeId),
          isVisited: visitedNodes.has(nodeId),
          isUnlocked:
            nodeId === currentId ||
            neighborIds.has(nodeId) ||
            visitedNodes.has(nodeId),
          isCorrupted: nodeData?.is_corrupted || false,
        };
      },
    );

    // Add dynamic neighbors not in NODE_POSITIONS
    for (const n of neighbors) {
      if (NODE_POSITIONS[n.node_id]) continue;
      if (!currentPos) continue;

      // Assign a position if not already set
      if (!dynamicPositions[n.node_id]) {
        const angle =
          (Object.keys(dynamicPositions).length * 1.2 + 0.5) * Math.PI;
        const dist = 60 + Math.random() * 40;
        const newPos = {
          x: currentPos.x + Math.cos(angle) * dist,
          y: currentPos.y + Math.sin(angle) * dist,
        };
        setDynamicPositions((prev) => ({ ...prev, [n.node_id]: newPos }));
      }

      const pos = dynamicPositions[n.node_id] || {
        x: currentPos.x + 50,
        y: currentPos.y + 50,
      };
      nodes.push({
        nodeId: n.node_id,
        name: n.name,
        description: n.description,
        x: pos.x,
        y: pos.y,
        isCurrent: n.node_id === currentId,
        isNeighbor: true,
        isVisited: visitedNodes.has(n.node_id),
        isUnlocked: n.is_unlocked,
        isCorrupted: n.is_corrupted,
      });
    }

    return nodes;
  }, [
    currentNode?.node_id,
    neighborIds,
    visitedNodes,
    neighbors,
    dynamicPositions,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      setHasDragged(false);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    },
    [offset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.x - offset.x;
      const dy = e.clientY - dragStart.y - offset.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setHasDragged(true);
      }
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [dragging, dragStart, offset],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (hasDragged) return; // Don't navigate if user was panning
      if (!onAction) return;
      // Find the move_to action for this node
      const moveActionId = `action-move-to-${nodeId.replace("node-", "")}`;
      // Try the action — the engine will validate if it's allowed
      onAction(moveActionId);
    },
    [hasDragged, onAction],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.3, Math.min(3, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
        <h3 className="text-cyan-400 text-xs font-semibold tracking-wide">
          WORLD MAP
        </h3>
        <div className="ml-auto flex items-center gap-3 text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> You
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Near
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-700" /> Seen
          </span>
          <span className="flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Locked
          </span>
        </div>
      </div>

      <svg
        viewBox={`${-offset.x / scale} ${-offset.y / scale} ${880 / scale} ${560 / scale}`}
        className="w-full h-[400px] cursor-grab active:cursor-grabbing bg-slate-950/50"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(51,65,85,0.12)"
              strokeWidth="0.5"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="880" height="560" fill="url(#grid)" />

        {/* Zone backgrounds */}
        {["sector-7", "neon-alleyways", "corporate-tower", "server-vault"].map(
          (zone) => (
            <text
              key={zone}
              x={
                zone === "sector-7"
                  ? 380
                  : zone === "neon-alleyways"
                    ? 680
                    : zone === "corporate-tower"
                      ? 620
                      : 100
              }
              y={zone === "server-vault" ? 500 : 20}
              className="fill-slate-700 text-[10px] font-mono uppercase tracking-widest"
              opacity={0.4}
            >
              {zone.replace(/-/g, " ")}
            </text>
          ),
        )}

        {/* Edges */}
        {EDGES.map((edge) => {
          const from = NODE_POSITIONS[edge.from];
          const to = NODE_POSITIONS[edge.to];
          if (!from || !to) return null;
          const highlight =
            (currentNode?.node_id === edge.from && neighborIds.has(edge.to)) ||
            (currentNode?.node_id === edge.to && neighborIds.has(edge.from));
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={highlight ? "rgba(6,182,212,0.5)" : "rgba(51,65,85,0.3)"}
              strokeWidth={highlight ? 2 : 1}
              strokeDasharray={highlight ? undefined : "4 4"}
            />
          );
        })}

        {/* Dynamic edges to generated nodes */}
        {neighbors
          .filter((n) => !NODE_POSITIONS[n.node_id])
          .map((n) => {
            const currentPos = currentNode
              ? NODE_POSITIONS[currentNode.node_id]
              : null;
            const toPos = dynamicPositions[n.node_id];
            if (!currentPos || !toPos) return null;
            return (
              <line
                key={`dyn-${currentNode?.node_id}-${n.node_id}`}
                x1={currentPos.x}
                y1={currentPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="rgba(168,85,247,0.5)"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            );
          })}

        {/* Nodes */}
        {mapNodes.map((mn) => {
          const zone = getZone(mn.nodeId);
          const colors = ZONE_COLORS[zone] || ZONE_COLORS["sector-7"];
          const radius = mn.isCurrent ? 14 : mn.isNeighbor ? 10 : 7;
          const hovered = hoveredNode === mn.nodeId;

          return (
            <g
              key={mn.nodeId}
              onMouseEnter={() => setHoveredNode(mn.nodeId)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: mn.isNeighbor ? "pointer" : "default" }}
            >
              {/* Glow ring for current */}
              {mn.isCurrent && (
                <circle
                  cx={mn.x}
                  cy={mn.y}
                  r={26}
                  fill="none"
                  stroke={colors.glow}
                  strokeWidth="2"
                  opacity="0.4"
                  filter="url(#glow)"
                  className="animate-pulse"
                />
              )}

              {/* Outer ring */}
              <circle
                cx={mn.x}
                cy={mn.y}
                r={radius}
                className={`${colors.bg} ${colors.border} stroke-[1.5]`}
              />

              {/* Center fill */}
              <circle
                cx={mn.x}
                cy={mn.y}
                r={radius - 2.5}
                className={
                  mn.isCurrent
                    ? "fill-cyan-500"
                    : mn.isNeighbor
                      ? "fill-yellow-500/60"
                      : mn.isVisited
                        ? "fill-slate-500/40"
                        : "fill-slate-800"
                }
              />

              {/* Lock icon */}
              {!mn.isUnlocked && !mn.isCurrent && (
                <foreignObject x={mn.x - 4} y={mn.y - 4} width={8} height={8}>
                  <Lock
                    className="text-red-400"
                    style={{ width: 8, height: 8 }}
                  />
                </foreignObject>
              )}

              {/* Corruption indicator */}
              {mn.isCorrupted && (
                <foreignObject x={mn.x + 3} y={mn.y - 8} width={8} height={8}>
                  <AlertTriangle
                    className="text-purple-400"
                    style={{ width: 8, height: 8 }}
                  />
                </foreignObject>
              )}

              {/* Label */}
              <text
                x={mn.x}
                y={mn.y + radius + 12}
                textAnchor="middle"
                className={`${
                  mn.isCurrent
                    ? "fill-cyan-300"
                    : mn.isNeighbor
                      ? "fill-yellow-300"
                      : "fill-slate-500"
                } text-[8px] font-mono select-none`}
              >
                {mn.name || formatLabel(mn.nodeId)}
              </text>

              {/* Tooltip on hover */}
              {hovered && (
                <g>
                  <rect
                    x={mn.x - 60}
                    y={mn.y - 56}
                    width={120}
                    height={mn.description ? 44 : 34}
                    rx={4}
                    className="fill-slate-800 stroke-slate-600 stroke-[0.5]"
                  />
                  <text
                    x={mn.x}
                    y={mn.y - 40}
                    textAnchor="middle"
                    className="fill-slate-300 text-[8px] font-mono"
                  >
                    {mn.name || formatLabel(mn.nodeId)}
                  </text>
                  {mn.description && (
                    <text
                      x={mn.x}
                      y={mn.y - 28}
                      textAnchor="middle"
                      className="fill-slate-400 text-[7px]"
                    >
                      {mn.description.slice(0, 40)}
                    </text>
                  )}
                  <text
                    x={mn.x}
                    y={mn.y - (mn.description ? 16 : 24)}
                    textAnchor="middle"
                    className="fill-slate-500 text-[7px]"
                  >
                    {!mn.isUnlocked
                      ? "LOCKED"
                      : mn.isCurrent
                        ? "YOU ARE HERE"
                        : mn.isNeighbor
                          ? "ADJACENT"
                          : mn.isVisited
                            ? "VISITED"
                            : "UNKNOWN"}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-slate-800 text-[8px] text-slate-500">
        {Object.entries(ZONE_COLORS).map(([zone, colors]) => (
          <span key={zone} className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border}`}
            />
            {zone.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
        <span className="ml-auto">Drag to pan · Scroll to zoom</span>
      </div>
    </div>
  );
}
