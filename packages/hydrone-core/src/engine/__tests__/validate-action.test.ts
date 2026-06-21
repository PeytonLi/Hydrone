import { describe, it, expect } from "vitest";
import { validateAction } from "../validate-action";
import type { SubGraph, NodeSpec } from "../../schema/zod";

function makeState(overrides: Partial<SubGraph> = {}): SubGraph {
  return {
    session_id: "test-session",
    current_node: {
      node_id: "node-corridor-b",
      zone: "sector-7",
      name: "Corridor Beta",
      description: "The vault looms ahead.",
      is_unlocked: true,
      is_corrupted: false,
      allowed_actions: ["action-examine", "action-access-vault"],
    },
    neighbors: [],
    inventory: [],
    flags: {},
    stats: {
      health: 100,
      max_health: 100,
      energy: 100,
      max_energy: 100,
      corruption: 0,
    },
    ...overrides,
  };
}

describe("validateAction", () => {
  describe("gate pass", () => {
    it("returns ok with effects for a valid no-requirement action", () => {
      const state = makeState();
      const result = validateAction(state, "action-examine");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.effects).toEqual([]);
      }
    });

    it("returns ok with effects for the keycard gate when requirements are met", () => {
      const state = makeState({ inventory: ["item-keycard"] });
      const result = validateAction(state, "action-access-vault");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.effects.length).toBe(3);
        expect(result.effects).toContainEqual({
          type: "unlock_node",
          node_id: "node-vault",
        });
        expect(result.effects).toContainEqual({
          type: "set_flag",
          key: "vault_accessed",
          value: true,
        });
        expect(result.effects).toContainEqual({
          type: "move_to",
          node_id: "node-vault",
        });
      }
    });
  });

  describe("gate failure (setback)", () => {
    it("returns setback when action is not in the allowed set (lacks keycard)", () => {
      const state = makeState({ inventory: [] });
      const result = validateAction(state, "action-access-vault");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.setback).toEqual([]);
      }
    });

    it("returns setback when action template does not exist", () => {
      const state = makeState();
      const result = validateAction(state, "action-hack-mainframe");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.setback).toEqual([]);
      }
    });

    it("returns setback with zero writable effects", () => {
      const state = makeState({ inventory: [] });
      const result = validateAction(state, "action-access-vault");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // The setback should contain NO effects that would write to Postgres
        expect(result.setback.every((m) => m.type !== "add_item")).toBe(true);
        expect(result.setback.every((m) => m.type !== "set_flag")).toBe(true);
        expect(result.setback.every((m) => m.type !== "unlock_node")).toBe(
          true,
        );
      }
    });
  });

  describe("new_node_spec validation", () => {
    const validSpec: NodeSpec = {
      node_name: "Hidden Lab",
      zone: "sector-7",
      edges: ["node-vault"],
      action_template_ids: ["action-examine"],
      item_ids: ["item-data-chip"],
    };

    it("passes when new_node_spec references valid template_ids and item_ids", () => {
      const state = makeState();
      const result = validateAction(state, "action-examine", validSpec);
      expect(result.ok).toBe(true);
    });

    it("returns setback when new_node_spec references unknown template_id", () => {
      const spec: NodeSpec = {
        ...validSpec,
        action_template_ids: ["action-fake"],
      };
      const state = makeState();
      const result = validateAction(state, "action-examine", spec);
      expect(result.ok).toBe(false);
    });

    it("returns setback when new_node_spec references unknown item_id", () => {
      const spec: NodeSpec = { ...validSpec, item_ids: ["item-fake"] };
      const state = makeState();
      const result = validateAction(state, "action-examine", spec);
      expect(result.ok).toBe(false);
    });

    it("returns setback when new_node_spec has unknown template_id even if parent action is valid", () => {
      const spec: NodeSpec = {
        ...validSpec,
        action_template_ids: ["action-nonexistent"],
      };
      const state = makeState({ inventory: ["item-keycard"] });
      const result = validateAction(state, "action-access-vault", spec);
      expect(result.ok).toBe(false);
    });

    it("passes valid new_node_spec with allowed gated action", () => {
      const state = makeState({ inventory: ["item-keycard"] });
      const result = validateAction(state, "action-access-vault", validSpec);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.effects.length).toBe(3);
      }
    });
  });
});
