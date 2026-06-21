import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TurnContext, LLMGameResponse } from "@hydrone/core";

const { mockGenerateObject, mockAnthropic, mockCreateOpenAI } = vi.hoisted(
  () => ({
    mockGenerateObject: vi.fn(),
    mockAnthropic: vi.fn(),
    mockCreateOpenAI: vi.fn(() => vi.fn()),
  }),
);

vi.mock("ai", function () {
  return { generateObject: mockGenerateObject };
});

vi.mock("@ai-sdk/anthropic", function () {
  return { anthropic: mockAnthropic };
});

vi.mock("@ai-sdk/openai", function () {
  return { createOpenAI: mockCreateOpenAI };
});

vi.mock("../prompt-composer", () => ({
  composePrompt: vi.fn((ctx: TurnContext) => ({
    system: "You are a test narrator.",
    prompt: "Test prompt for action: " + ctx.action_id,
  })),
}));

import { generateTurn } from "../generate-turn";

function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
  return {
    session_id: "sess-1",
    subgraph: {
      session_id: "sess-1",
      current_node: {
        node_id: "node-entrance",
        zone: "sector-7",
        name: "Entrance Hall",
        description: "A dusty room.",
        is_unlocked: true,
        is_corrupted: false,
        allowed_actions: ["action-examine"],
      },
      neighbors: [],
      inventory: [],
      flags: {},
    },
    allowed_actions: [
      {
        template_id: "action-examine",
        label: "Examine",
        narrative_hint: "Look around.",
        requires: { items: [], flags: {} },
        effects: [],
      },
    ],
    memory_chunks: [],
    action_id: "action-examine",
    ...overrides,
  };
}

describe("generateTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force Anthropic path for tests
    delete (process.env as any).DEEPSEEK_API_KEY;
    (process.env as any).ANTHROPIC_API_KEY = "test-key";
  });

  it("should call generateObject with Anthropic model and Zod schema", async () => {
    const mockResponse: LLMGameResponse = {
      narrative_text: "You look around the dusty entrance hall.",
      character_portrait_mood: "neutral",
      system_log_message: "SENSOR_SWEEP: No threats detected.",
      chosen_action_id: "action-examine",
      suggested_action_buttons: [
        {
          button_label: "Go to Corridor",
          action_id: "action-move-to-corridor-a",
        },
      ],
    };

    mockAnthropic.mockReturnValue("claude-model-instance");
    mockGenerateObject.mockResolvedValueOnce({ object: mockResponse });

    const ctx = makeContext();
    const result = await generateTurn(ctx);

    expect(mockAnthropic).toHaveBeenCalledWith("claude-sonnet-4-6");
    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-model-instance");
    expect(callArgs.schema).toBeDefined();
    expect(callArgs.system).toBe("You are a test narrator.");
    expect(callArgs.prompt).toContain("action-examine");
    expect(result).toEqual(mockResponse);
  });

  it("should return a valid LLMGameResponse on success", async () => {
    const mockResponse: LLMGameResponse = {
      narrative_text: "The vault door hisses open.",
      character_portrait_mood: "triumphant",
      system_log_message: "VAULT_ACCESS: Biometric scan accepted.",
      chosen_action_id: "action-access-vault",
      suggested_action_buttons: [
        { button_label: "Enter Vault", action_id: "action-move-to-vault" },
      ],
    };

    mockAnthropic.mockReturnValue("claude-model-instance");
    mockGenerateObject.mockResolvedValueOnce({ object: mockResponse });

    const ctx = makeContext({ action_id: "action-access-vault" });
    const result = await generateTurn(ctx);

    expect(result.narrative_text).toBeTruthy();
    expect(result.character_portrait_mood).toBe("triumphant");
    expect(result.chosen_action_id).toBe("action-access-vault");
    expect(result.suggested_action_buttons).toHaveLength(1);
  });

  it("should return fallback response when generateObject throws", async () => {
    mockAnthropic.mockReturnValue("claude-model-instance");
    mockGenerateObject.mockRejectedValueOnce(new Error("API rate limit"));

    const ctx = makeContext();
    const result = await generateTurn(ctx);

    expect(result.narrative_text).toContain("stutters");
    expect(result.character_portrait_mood).toBe("neutral");
    expect(result.chosen_action_id).toBe("action-examine");
    expect(result.suggested_action_buttons.length).toBeGreaterThan(0);
  });

  it("should include new_node_spec when LLM returns one", async () => {
    const mockResponse: LLMGameResponse = {
      narrative_text: "A new corridor materializes from the static.",
      character_portrait_mood: "excited",
      system_log_message: "TOPO_UPDATE: New node generated.",
      chosen_action_id: "action-examine",
      new_node_spec: {
        node_name: "Generated Corridor Gamma",
        zone: "sector-7",
        edges: ["node-entrance"],
        action_template_ids: ["action-examine"],
        item_ids: [],
      },
      suggested_action_buttons: [],
    };

    mockAnthropic.mockReturnValue("claude-model-instance");
    mockGenerateObject.mockResolvedValueOnce({ object: mockResponse });

    const ctx = makeContext();
    const result = await generateTurn(ctx);

    expect(result.new_node_spec).toBeDefined();
    expect(result.new_node_spec!.node_name).toBe("Generated Corridor Gamma");
  });
});
