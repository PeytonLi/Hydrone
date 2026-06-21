import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore, type GameStore } from "../store/game-store";

describe("GameStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.setState(useGameStore.getInitialState());
  });

  it("has correct initial state", () => {
    const state = useGameStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.currentNode).toBeNull();
    expect(state.neighbors).toEqual([]);
    expect(state.inventory).toEqual([]);
    expect(state.flags).toEqual({});
    expect(state.allowedActions).toEqual([]);
    expect(state.narrativeText).toBe("");
    expect(state.systemLogMessage).toBe("");
    expect(state.characterMood).toBe("neutral");
    expect(state.memoryChunks).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.flashedFields).toEqual([]);
    expect(state.showDriftTranscript).toBe(false);
    expect(state.boundedCost).toBe(0);
    expect(state.linearCost).toBe(0);
  });

  it("hydrateFromServer sets state from WorldState + LLMGameResponse", () => {
    const serverState = {
      sessionId: "sess-1",
      currentNode: {
        node_id: "node-entrance",
        zone: "sector-7",
        name: "Entrance Hall",
        description: "A dusty room.",
        is_unlocked: true,
        is_corrupted: false,
        allowed_actions: ["action-examine"],
      },
      neighbors: [],
      inventory: ["item-keycard"],
      flags: { vault_accessed: true },
      allowedActions: [
        {
          template_id: "action-examine",
          label: "Examine",
          narrative_hint: "Look around.",
          requires: { items: [], flags: {} },
          effects: [],
        },
      ],
      narrativeText: "You enter the hall.",
      systemLogMessage: "Turn 1 processed.",
      characterMood: "neutral" as const,
      memoryChunks: [{ content: "lore chunk", relevance_score: 0.9 }],
      boundedCost: 1200,
      linearCost: 4500,
      promptTokens: 0,
      completionTokens: 0,
    };

    useGameStore.getState().hydrateFromServer(serverState);

    const state = useGameStore.getState();
    expect(state.sessionId).toBe("sess-1");
    expect(state.currentNode?.node_id).toBe("node-entrance");
    expect(state.inventory).toEqual(["item-keycard"]);
    expect(state.flags).toEqual({ vault_accessed: true });
    expect(state.allowedActions).toHaveLength(1);
    expect(state.narrativeText).toBe("You enter the hall.");
    expect(state.memoryChunks).toHaveLength(1);
    expect(state.boundedCost).toBe(1200);
    expect(state.isLoading).toBe(false);
  });

  it("markFieldsFlash sets flashedFields for 800ms then clears", async () => {
    useGameStore.getState().markFieldsFlash(["inventory", "flags"]);

    expect(useGameStore.getState().flashedFields).toEqual([
      "inventory",
      "flags",
    ]);

    // Wait for flash to clear
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(useGameStore.getState().flashedFields).toEqual([]);
  });

  it("simulateDeviceDestruction clears state and localStorage", () => {
    // Set some state first
    useGameStore.setState({
      sessionId: "sess-1",
      inventory: ["item-keycard"],
      flags: { vault_accessed: true },
    });
    localStorage.setItem("hydrone-session-id", "sess-1");

    useGameStore.getState().simulateDeviceDestruction();

    const state = useGameStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.currentNode).toBeNull();
    expect(state.inventory).toEqual([]);
    expect(state.flags).toEqual({});
    expect(localStorage.getItem("hydrone-session-id")).toBeNull();
    expect(state.flashedFields).toContain("all");
  });

  it("startTurn sets isLoading and resets narrative", () => {
    useGameStore.setState({ narrativeText: "old", isLoading: false });
    useGameStore.getState().startTurn();

    const state = useGameStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.narrativeText).toBe("");
  });

  it("clearFlash clears flashedFields", () => {
    useGameStore.setState({ flashedFields: ["inventory", "flags"] });
    useGameStore.getState().clearFlash();

    expect(useGameStore.getState().flashedFields).toEqual([]);
  });

  it("toggleDriftTranscript toggles showDriftTranscript", () => {
    expect(useGameStore.getState().showDriftTranscript).toBe(false);
    useGameStore.getState().toggleDriftTranscript();
    expect(useGameStore.getState().showDriftTranscript).toBe(true);
    useGameStore.getState().toggleDriftTranscript();
    expect(useGameStore.getState().showDriftTranscript).toBe(false);
  });

  it("only valid actions are present in allowedActions after hydration", () => {
    // This test verifies that the store only exposes valid, gated actions
    // (The actual gating is engine-side; the store just reflects what the server sends)
    const action1 = {
      template_id: "action-examine",
      label: "Examine",
      narrative_hint: "Look.",
      requires: { items: [], flags: {} },
      effects: [],
    };
    const action2 = {
      template_id: "action-access-vault",
      label: "Access Vault",
      narrative_hint: "Swipe keycard.",
      requires: { items: ["item-keycard"], flags: {} },
      effects: [],
    };

    useGameStore.getState().hydrateFromServer({
      sessionId: "sess-1",
      currentNode: null as any,
      neighbors: [],
      inventory: ["item-keycard"],
      flags: {},
      allowedActions: [action1, action2],
      narrativeText: "",
      systemLogMessage: "",
      characterMood: "neutral",
      memoryChunks: [],
      boundedCost: 0,
      linearCost: 0,
      promptTokens: 0,
      completionTokens: 0,
    });

    const state = useGameStore.getState();
    // Both actions should be present since the server already gated them
    expect(state.allowedActions).toHaveLength(2);
    expect(state.allowedActions.map((a) => a.template_id)).toContain(
      "action-examine",
    );
    expect(state.allowedActions.map((a) => a.template_id)).toContain(
      "action-access-vault",
    );
  });
});
