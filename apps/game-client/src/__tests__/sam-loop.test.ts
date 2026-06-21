// @ts-nocheck -- test file with extensive mocking; implicit any types in callbacks are intentional
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  SubGraph,
  ActionTemplate,
  LLMGameResponse,
  Mutation,
  WorldNode,
  NodeSpec,
  LoreDoc,
} from "@hydrone/core";

// Hoisted mock functions (referenced inside vi.mock factories)

const {
  mockFetchSubGraph,
  mockComputeAllowedActions,
  mockValidateAction,
  mockCommitMutationBlock,
  mockCreateNode,
} = vi.hoisted(() => ({
  mockFetchSubGraph: vi.fn(),
  mockComputeAllowedActions: vi.fn(),
  mockValidateAction: vi.fn(),
  mockCommitMutationBlock: vi.fn(),
  mockCreateNode: vi.fn(),
}));

const {
  mockGenerateTurn,
  mockMemoryQuery,
  mockMemoryIngest,
  mockMemorySeedLore,
} = vi.hoisted(() => ({
  mockGenerateTurn: vi.fn(),
  mockMemoryQuery: vi.fn(),
  mockMemoryIngest: vi.fn(),
  mockMemorySeedLore: vi.fn(),
}));

const { mockHydradbIngest, mockHydradbStatus } = vi.hoisted(() => ({
  mockHydradbIngest: vi.fn(),
  mockHydradbStatus: vi.fn(),
}));

// Module mocks

vi.mock("@hydrone/core", () => ({
  fetchSubGraph: mockFetchSubGraph,
  computeAllowedActions: mockComputeAllowedActions,
  validateAction: mockValidateAction,
  commitMutationBlock: mockCommitMutationBlock,
  createNode: mockCreateNode,
}));

vi.mock("@hydrone/llm-service", () => ({
  generateTurn: mockGenerateTurn,
  memory: {
    query: mockMemoryQuery,
    ingestEpisode: mockMemoryIngest,
    seedLore: mockMemorySeedLore,
  },
}));

vi.mock("@hydradb/sdk", () => ({
  HydraDBClient: vi.fn().mockImplementation(() => ({
    tenants: {
      create: vi.fn(),
      status: vi.fn(),
    },
    context: {
      ingest: mockHydradbIngest,
      status: mockHydradbStatus,
    },
    query: vi.fn(),
  })),
  HydraDBError: class HydraDBError extends Error {
    statusCode: number;
    body: { error: { code: string } };
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "HydraDBError";
      this.statusCode = statusCode;
      this.body = { error: { code: "TEST_ERROR" } };
    }
  },
  buildString: vi.fn((result: any) => {
    return result?.data?.chunks
      ? result.data.chunks.map((c: any) => c.chunk_content).join("\n")
      : "";
  }),
}));

import { executeSamLoop, resetTurnCounter } from "../lib/sam-loop";

// Test helpers

function makeNode(overrides: Partial<WorldNode> = {}): WorldNode {
  return {
    node_id: "node-security",
    zone: "sector-7",
    name: "Security Checkpoint",
    description: "A keycard sits on the desk.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: ["action-pick-up-keycard", "action-examine"],
    ...overrides,
  };
}

function makeSubGraph(overrides: Partial<SubGraph> = {}): SubGraph {
  return {
    session_id: "test-session",
    current_node: makeNode(),
    neighbors: [],
    inventory: [],
    flags: {},
    ...overrides,
  };
}

function makeLLMResponse(
  overrides: Partial<LLMGameResponse> = {},
): LLMGameResponse {
  return {
    narrative_text: "You pick up the keycard from the desk.",
    character_portrait_mood: "neutral",
    system_log_message: "ITEM_ADDED: keycard acquired.",
    chosen_action_id: "action-pick-up-keycard",
    suggested_action_buttons: [],
    ...overrides,
  };
}

function makeKeycardPickupAction(): ActionTemplate {
  return {
    template_id: "action-pick-up-keycard",
    label: "Pick Up Keycard",
    narrative_hint: "Retrieve the magnetic security badge from the floor.",
    requires: { items: [], flags: { keycard_taken: false } },
    effects: [
      { type: "add_item", item_id: "item-keycard" },
      { type: "set_flag", key: "keycard_taken", value: true },
    ],
  };
}

function makeVaultAccessAction(): ActionTemplate {
  return {
    template_id: "action-access-vault",
    label: "Access Vault",
    narrative_hint:
      "Swipe the security keycard to unlock the biometric vault door.",
    requires: { items: ["item-keycard"], flags: {} },
    effects: [
      { type: "unlock_node", node_id: "node-vault" },
      { type: "set_flag", key: "vault_accessed", value: true },
      { type: "move_to", node_id: "node-vault" },
    ],
  };
}

function makeExamineAction(): ActionTemplate {
  return {
    template_id: "action-examine",
    label: "Examine Surroundings",
    narrative_hint: "Carefully survey the area for clues.",
    requires: { items: [], flags: {} },
    effects: [],
  };
}

function makeRetrieveChipAction(): ActionTemplate {
  return {
    template_id: "action-retrieve-data-chip",
    label: "Retrieve Data Chip",
    narrative_hint: "Extract the critical data chip from the server tray.",
    requires: { items: [], flags: { vault_accessed: true } },
    effects: [
      { type: "add_item", item_id: "item-data-chip" },
      { type: "set_flag", key: "data_retrieved", value: true },
    ],
  };
}

describe("executeSamLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTurnCounter();

    mockMemoryQuery.mockResolvedValue([]);
    mockMemoryIngest.mockReturnValue(undefined);
    mockCreateNode.mockReturnValue({
      node_id: "node-dynamic-001",
      zone: "sector-7",
      name: "Dynamic Node",
      description: "",
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: [],
    });
  });

  it("completes the keycard gate: pickup keycard then access vault (full happy path)", async () => {
    const stateAtSecurity = makeSubGraph({
      current_node: makeNode({
        node_id: "node-security",
        name: "Security Checkpoint",
        description: "A keycard sits on the desk.",
        allowed_actions: ["action-pick-up-keycard", "action-examine"],
      }),
      inventory: [],
      flags: { keycard_taken: false },
    });

    const pickupAction = makeKeycardPickupAction();

    const updatedStateAtSecurity = makeSubGraph({
      current_node: makeNode({
        node_id: "node-security",
        name: "Security Checkpoint",
        description: "A keycard sits on the desk.",
        allowed_actions: ["action-examine"],
      }),
      inventory: ["item-keycard"],
      flags: { keycard_taken: true },
    });

    const llmResponse1 = makeLLMResponse({
      narrative_text: "You carefully pick up the keycard from the desk.",
      character_portrait_mood: "neutral",
      system_log_message: "ITEM_ADDED: keycard acquired.",
      chosen_action_id: "action-pick-up-keycard",
    });

    mockFetchSubGraph.mockResolvedValueOnce(stateAtSecurity);
    mockComputeAllowedActions.mockReturnValueOnce([pickupAction]);
    mockGenerateTurn.mockResolvedValueOnce(llmResponse1);
    mockValidateAction.mockReturnValueOnce({
      ok: true,
      effects: pickupAction.effects,
    });
    mockCommitMutationBlock.mockResolvedValueOnce({
      session_id: "test-session",
      current_location_id: "node-security",
      inventory: ["item-keycard"],
      flags: { keycard_taken: true },
    });
    mockFetchSubGraph.mockResolvedValueOnce(updatedStateAtSecurity);
    mockComputeAllowedActions.mockReturnValueOnce([makeExamineAction()]);

    const result1 = await executeSamLoop({
      sessionId: "test-session",
      actionId: "action-pick-up-keycard",
    });

    expect(mockCommitMutationBlock).toHaveBeenCalledTimes(1);
    const commitEffects1 = mockCommitMutationBlock.mock.calls[0][1];
    expect(commitEffects1).toContainEqual({
      type: "add_item",
      item_id: "item-keycard",
    });
    expect(commitEffects1).toContainEqual({
      type: "set_flag",
      key: "keycard_taken",
      value: true,
    });

    expect(result1.currentNode.node_id).toBe("node-security");
    expect(result1.inventory).toContain("item-keycard");
    expect(result1.flags.keycard_taken).toBe(true);
    expect(result1.wasSetback).toBe(false);
    expect(result1.narrativeText).not.toContain("[SETBACK]");
    expect(result1.characterMood).toBe("neutral");

    vi.clearAllMocks();

    mockMemoryQuery.mockResolvedValue([]);
    mockMemoryIngest.mockReturnValue(undefined);
    mockCreateNode.mockReturnValue({
      node_id: "node-dynamic-001",
      zone: "sector-7",
      name: "Dynamic Node",
      description: "",
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: [],
    });

    const stateAtCorridorB = makeSubGraph({
      current_node: makeNode({
        node_id: "node-corridor-b",
        name: "Corridor Beta",
        description: "The vault looms ahead.",
        allowed_actions: ["action-access-vault", "action-examine"],
      }),
      inventory: ["item-keycard"],
      flags: { keycard_taken: true },
    });

    const vaultAction = makeVaultAccessAction();

    const updatedStateAtVault = makeSubGraph({
      current_node: makeNode({
        node_id: "node-vault",
        name: "Biometric Vault",
        description: "The vault door hisses open.",
        allowed_actions: ["action-retrieve-data-chip", "action-examine"],
      }),
      inventory: ["item-keycard"],
      flags: { keycard_taken: true, vault_accessed: true },
    });

    const llmResponse2 = makeLLMResponse({
      narrative_text: "You swipe the keycard and the vault door hisses open.",
      character_portrait_mood: "triumphant",
      system_log_message: "VAULT_ACCESS: Biometric scan accepted.",
      chosen_action_id: "action-access-vault",
    });

    mockFetchSubGraph.mockResolvedValueOnce(stateAtCorridorB);
    mockComputeAllowedActions.mockReturnValueOnce([vaultAction]);
    mockGenerateTurn.mockResolvedValueOnce(llmResponse2);
    mockValidateAction.mockReturnValueOnce({
      ok: true,
      effects: vaultAction.effects,
    });
    mockCommitMutationBlock.mockResolvedValueOnce({
      session_id: "test-session",
      current_location_id: "node-vault",
      inventory: ["item-keycard"],
      flags: { keycard_taken: true, vault_accessed: true },
    });
    mockFetchSubGraph.mockResolvedValueOnce(updatedStateAtVault);
    mockComputeAllowedActions.mockReturnValueOnce([makeRetrieveChipAction()]);

    const result2 = await executeSamLoop({
      sessionId: "test-session",
      actionId: "action-access-vault",
    });

    expect(mockValidateAction).toHaveBeenCalledTimes(1);
    const validateCall = mockValidateAction.mock.calls[0];
    const subgraphArg = validateCall[0];
    expect(subgraphArg.inventory).toContain("item-keycard");
    expect(validateCall[1]).toBe("action-access-vault");

    const vaultEffects = mockCommitMutationBlock.mock.calls[0][1];
    expect(vaultEffects).toContainEqual({
      type: "unlock_node",
      node_id: "node-vault",
    });
    expect(vaultEffects).toContainEqual({
      type: "set_flag",
      key: "vault_accessed",
      value: true,
    });

    expect(result2.currentNode.node_id).toBe("node-vault");
    expect(result2.flags.vault_accessed).toBe(true);
    expect(result2.wasSetback).toBe(false);
    expect(result2.characterMood).toBe("triumphant");
    expect(result2.narrativeText).not.toContain("[SETBACK]");
  });

  it("handles vault access without keycard as setback with zero writes", async () => {
    const stateAtCorridorB = makeSubGraph({
      current_node: makeNode({
        node_id: "node-corridor-b",
        name: "Corridor Beta",
        description: "The vault looms ahead.",
        allowed_actions: ["action-access-vault"],
      }),
      inventory: [],
      flags: {},
    });

    const llmResponse = makeLLMResponse({
      narrative_text: "You try to access the vault but nothing happens.",
      character_portrait_mood: "worried",
      system_log_message: "VAULT_ACCESS: Access denied.",
      chosen_action_id: "action-access-vault",
    });

    mockFetchSubGraph.mockResolvedValueOnce(stateAtCorridorB);
    mockComputeAllowedActions.mockReturnValueOnce([]);
    mockGenerateTurn.mockResolvedValueOnce(llmResponse);
    mockValidateAction.mockReturnValueOnce({ ok: false, setback: [] });
    mockCommitMutationBlock.mockResolvedValueOnce({
      session_id: "test-session",
      current_location_id: "node-corridor-b",
      inventory: [],
      flags: {},
    });
    mockFetchSubGraph.mockResolvedValueOnce(stateAtCorridorB);
    mockComputeAllowedActions.mockReturnValueOnce([]);

    const result = await executeSamLoop({
      sessionId: "test-session",
      actionId: "action-access-vault",
    });

    expect(mockCommitMutationBlock).toHaveBeenCalledTimes(1);
    const commitEffects = mockCommitMutationBlock.mock.calls[0][1];
    expect(commitEffects).toEqual([]);

    expect(result.wasSetback).toBe(true);
    expect(result.narrativeText).toContain("[SETBACK]");
    expect(result.systemLogMessage).toContain("VALIDATION_FAILED");
    expect(result.systemLogMessage).toContain("0 writes");
    expect(result.characterMood).toBe("worried");
    expect(result.inventory).toEqual([]);
    expect(result.flags).toEqual({});
    expect(result.currentNode.node_id).toBe("node-corridor-b");
  });

  it("returns byte-identical state from fetchSubGraph across restore calls", async () => {
    const state = makeSubGraph({
      current_node: makeNode({
        node_id: "node-entrance",
        name: "Entrance Hall",
        description: "A dusty anteroom with emergency lights.",
        allowed_actions: ["action-examine", "action-move-to-corridor-a"],
      }),
      inventory: ["item-keycard"],
      flags: { keycard_taken: true },
    });

    mockFetchSubGraph.mockResolvedValue(state);

    const result1 = await mockFetchSubGraph("test-session");
    const result2 = await mockFetchSubGraph("test-session");

    expect(result1).toEqual(result2);
    expect(result1.current_node.node_id).toBe("node-entrance");
    expect(result2.current_node.node_id).toBe("node-entrance");
    expect(result1.inventory).toEqual(["item-keycard"]);
    expect(result2.inventory).toEqual(["item-keycard"]);
    expect(result1.flags).toEqual({ keycard_taken: true });
    expect(result2.flags).toEqual({ keycard_taken: true });
    expect(mockFetchSubGraph).toHaveBeenCalledTimes(2);
  });

  it("produces identical computeAllowedActions results for identical state", () => {
    const state = makeSubGraph({
      current_node: makeNode({
        node_id: "node-corridor-b",
        allowed_actions: ["action-access-vault", "action-examine"],
      }),
      inventory: ["item-keycard"],
    });

    const allowedActions = [makeVaultAccessAction(), makeExamineAction()];

    mockComputeAllowedActions.mockReturnValue(allowedActions);

    const result1 = mockComputeAllowedActions(state);
    const result2 = mockComputeAllowedActions(state);

    expect(result1).toEqual(result2);
    expect(result1).toHaveLength(2);
    expect(
      result1.map(function (a) {
        return a.template_id;
      }),
    ).toContain("action-access-vault");
    expect(
      result1.map(function (a) {
        return a.template_id;
      }),
    ).toContain("action-examine");
    expect(mockComputeAllowedActions).toHaveBeenCalledTimes(2);
  });

  it("produces identical validateAction results for identical state", () => {
    const state = makeSubGraph({
      current_node: makeNode({
        node_id: "node-corridor-b",
        allowed_actions: ["action-access-vault"],
      }),
      inventory: ["item-keycard"],
    });

    const effects = makeVaultAccessAction().effects;

    mockValidateAction.mockReturnValue({ ok: true, effects: effects });

    const result1 = mockValidateAction(state, "action-access-vault");
    const result2 = mockValidateAction(state, "action-access-vault");

    expect(result1).toEqual(result2);
    expect(result1.ok).toBe(true);
    if (result1.ok) {
      expect(result1.effects).toEqual(effects);
    }
    expect(mockValidateAction).toHaveBeenCalledTimes(2);
  });

  it("rejects new_node_spec with unknown template_id", () => {
    const state = makeSubGraph();

    const badSpec = {
      node_name: "Bad Dynamic Node",
      zone: "sector-7",
      edges: ["node-entrance"],
      action_template_ids: ["action-nonexistent"],
      item_ids: [],
    };

    mockValidateAction.mockReturnValue({ ok: false, setback: [] });

    const result = mockValidateAction(state, "action-examine", badSpec);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.setback).toEqual([]);
    }
    expect(mockValidateAction).toHaveBeenCalledWith(
      state,
      "action-examine",
      badSpec,
    );
  });

  it("rejects new_node_spec with unknown item_id as well", () => {
    const state = makeSubGraph();

    const badSpec = {
      node_name: "Bad Item Node",
      zone: "sector-7",
      edges: ["node-entrance"],
      action_template_ids: ["action-examine"],
      item_ids: ["item-fake"],
    };

    mockValidateAction.mockReturnValue({ ok: false, setback: [] });

    const result = mockValidateAction(state, "action-examine", badSpec);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.setback).toEqual([]);
    }
    expect(mockValidateAction).toHaveBeenCalledWith(
      state,
      "action-examine",
      badSpec,
    );
  });
});

describe("memory.seedLore (HydraDB integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("polls status until indexingStatus reaches completed", async () => {
    const lore = [
      {
        type: "knowledge",
        title: "World Backstory",
        content:
          "The facility was abandoned after incident Sigma in cycle 741.",
      },
      {
        type: "knowledge",
        title: "Security Protocol",
        content:
          "Vault access requires biometric keycard verification at all checkpoints.",
      },
    ];

    mockHydradbIngest.mockResolvedValueOnce({
      data: {
        results: [{ id: "lore-1" }, { id: "lore-2" }],
        success_count: 2,
        failed_count: 0,
      },
    });

    let pollCount = 0;
    mockHydradbStatus.mockImplementation(function () {
      pollCount++;
      if (pollCount < 3) {
        return Promise.resolve({
          data: {
            statuses: [
              { indexingStatus: "processing" },
              { indexingStatus: "processing" },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          statuses: [
            { indexingStatus: "completed" },
            { indexingStatus: "completed" },
          ],
        },
      });
    });

    mockMemorySeedLore.mockImplementation(async function (docs) {
      var ids = docs.map(function (_, i) {
        return "doc-" + i;
      });

      await mockHydradbIngest({
        type: "knowledge",
        tenantId: "hydrone-demo",
        appKnowledge: docs.map(function (d) {
          return {
            title: d.title,
            content: d.content,
            source_type: "lore",
          };
        }),
      });

      while (true) {
        var statusRes = await mockHydradbStatus(ids);
        var statuses = statusRes.data.statuses;

        var hasError = statuses.some(function (s) {
          return s.indexingStatus === "errored";
        });
        if (hasError) {
          var errored = statuses.find(function (s) {
            return s.indexingStatus === "errored";
          });
          throw new Error(
            (errored && errored.errorMessage) ||
              "Indexing failed with unknown error",
          );
        }

        var allCompleted = statuses.every(function (s) {
          return s.indexingStatus === "completed";
        });
        if (allCompleted) {
          return;
        }

        await new Promise(function (r) {
          return setTimeout(r, 10);
        });
      }
    });

    await expect(mockMemorySeedLore(lore)).resolves.not.toThrow();

    expect(mockHydradbIngest).toHaveBeenCalledTimes(1);
    var ingestCall = mockHydradbIngest.mock.calls[0][0];
    expect(ingestCall.type).toBe("knowledge");
    expect(ingestCall.tenantId).toBe("hydrone-demo");
    expect(ingestCall.appKnowledge).toHaveLength(2);
    expect(ingestCall.appKnowledge[0].title).toBe("World Backstory");

    expect(mockHydradbStatus).toHaveBeenCalledTimes(3);
  });

  it("throws when indexingStatus reaches errored", async () => {
    var lore = [
      { type: "knowledge", title: "Bad Lore", content: "Corrupted data." },
    ];

    mockHydradbIngest.mockResolvedValueOnce({
      data: {
        results: [{ id: "bad-lore-1" }],
        success_count: 1,
        failed_count: 0,
      },
    });

    mockHydradbStatus.mockResolvedValueOnce({
      data: {
        statuses: [
          {
            indexingStatus: "errored",
            errorMessage: "Failed to parse document: invalid encoding",
          },
        ],
      },
    });

    mockMemorySeedLore.mockImplementation(async function (docs) {
      var ids = docs.map(function (_, i) {
        return "doc-" + i;
      });

      await mockHydradbIngest({
        type: "knowledge",
        tenantId: "hydrone-demo",
        appKnowledge: docs.map(function (d) {
          return {
            title: d.title,
            content: d.content,
            source_type: "lore",
          };
        }),
      });

      while (true) {
        var statusRes = await mockHydradbStatus(ids);
        var statuses = statusRes.data.statuses;

        var hasError = statuses.some(function (s) {
          return s.indexingStatus === "errored";
        });
        if (hasError) {
          var errored = statuses.find(function (s) {
            return s.indexingStatus === "errored";
          });
          throw new Error(
            (errored && errored.errorMessage) || "Indexing failed",
          );
        }

        if (
          statuses.every(function (s) {
            return s.indexingStatus === "completed";
          })
        ) {
          return;
        }
        await new Promise(function (r) {
          return setTimeout(r, 10);
        });
      }
    });

    await expect(mockMemorySeedLore(lore)).rejects.toThrow(
      /Failed to parse document/,
    );

    expect(mockHydradbIngest).toHaveBeenCalledTimes(1);
    expect(mockHydradbStatus).toHaveBeenCalledTimes(1);
  });
});
