import { create } from "zustand";
import type { WorldNode, ActionTemplate, Chunk } from "@hydrone/core";

// --- Types ---

export interface ServerHydrationPayload {
  sessionId: string;
  currentNode: WorldNode;
  neighbors: WorldNode[];
  inventory: string[];
  flags: Record<string, boolean>;
  allowedActions: ActionTemplate[];
  narrativeText: string;
  systemLogMessage: string;
  characterMood: "neutral" | "excited" | "worried" | "triumphant" | "defeated";
  memoryChunks: Chunk[];
  boundedCost: number;
  linearCost: number;
  promptTokens?: number;
  completionTokens?: number;
  stats?: {
    health: number;
    max_health: number;
    energy: number;
    max_energy: number;
    corruption: number;
  };
}

export interface GameStore {
  // State
  sessionId: string | null;
  currentNode: WorldNode | null;
  neighbors: WorldNode[];
  inventory: string[];
  flags: Record<string, boolean>;
  allowedActions: ActionTemplate[];
  narrativeText: string;
  systemLogMessage: string;
  characterMood: "neutral" | "excited" | "worried" | "triumphant" | "defeated";
  memoryChunks: Chunk[];
  isLoading: boolean;
  flashedFields: string[];
  showDriftTranscript: boolean;
  boundedCost: number;
  linearCost: number;
  promptTokens: number;
  completionTokens: number;
  stats: {
    health: number;
    max_health: number;
    energy: number;
    max_energy: number;
    corruption: number;
  };

  // Actions
  getInitialState: () => Partial<GameStore>;
  hydrateFromServer: (payload: ServerHydrationPayload) => void;
  startTurn: () => void;
  markFieldsFlash: (fields: string[]) => void;
  clearFlash: () => void;
  simulateDeviceDestruction: () => void;
  toggleDriftTranscript: () => void;
}

const initialState = {
  sessionId: null,
  currentNode: null,
  neighbors: [],
  inventory: [],
  flags: {},
  allowedActions: [],
  narrativeText: "",
  systemLogMessage: "",
  characterMood: "neutral" as const,
  memoryChunks: [],
  isLoading: false,
  flashedFields: [],
  showDriftTranscript: false,
  boundedCost: 0,
  linearCost: 0,
  promptTokens: 0,
  completionTokens: 0,
  stats: {
    health: 100,
    max_health: 100,
    energy: 100,
    max_energy: 100,
    corruption: 0,
  },
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  getInitialState: () => ({ ...initialState }),

  hydrateFromServer: (payload: ServerHydrationPayload) =>
    set({
      sessionId: payload.sessionId,
      currentNode: payload.currentNode,
      neighbors: payload.neighbors,
      inventory: payload.inventory,
      flags: payload.flags,
      allowedActions: payload.allowedActions,
      narrativeText: payload.narrativeText,
      systemLogMessage: payload.systemLogMessage,
      characterMood: payload.characterMood,
      memoryChunks: payload.memoryChunks,
      boundedCost: payload.boundedCost,
      linearCost: payload.linearCost,
      promptTokens: payload.promptTokens ?? 0,
      completionTokens: payload.completionTokens ?? 0,
      stats: payload.stats ?? {
        health: 100,
        max_health: 100,
        energy: 100,
        max_energy: 100,
        corruption: 0,
      },
      isLoading: false,
    }),

  startTurn: () =>
    set({
      isLoading: true,
      narrativeText: "",
    }),

  markFieldsFlash: (fields: string[]) => {
    set({ flashedFields: fields });
    setTimeout(() => {
      set({ flashedFields: [] });
    }, 850);
  },

  clearFlash: () => set({ flashedFields: [] }),

  simulateDeviceDestruction: () => {
    localStorage.removeItem("hydrone-session-id");
    set({
      ...initialState,
      flashedFields: ["all"],
    });
    setTimeout(() => {
      set({ flashedFields: [] });
    }, 850);
  },

  toggleDriftTranscript: () =>
    set((s) => ({ showDriftTranscript: !s.showDriftTranscript })),
}));
