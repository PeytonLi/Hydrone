import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGameStore } from "@/store/game-store";
import { PanelC } from "@/components/PanelC";

describe("PanelC", () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it("renders THE PROOF header", () => {
    render(<PanelC />);
    expect(screen.getByText("THE PROOF")).toBeInTheDocument();
  });

  it("shows Postgres State Inspector with JSON data", () => {
    useGameStore.setState({
      currentNode: {
        node_id: "node-entrance",
        zone: "sector-7",
        name: "Entrance Hall",
        description: "A dusty room.",
        is_unlocked: true,
        is_corrupted: false,
        allowed_actions: ["action-examine"],
      },
    });
    render(<PanelC />);

    expect(screen.getByText(/Postgres State Inspector/i)).toBeInTheDocument();
    // The inspector shows current_location_id (the node_id), not full node details
    expect(screen.getByText(/node-entrance/)).toBeInTheDocument();
  });

  it("shows current node ID in state inspector", () => {
    useGameStore.setState({
      currentNode: {
        node_id: "node-vault-42",
        zone: "zone-x",
        name: "Vault",
        description: "A secure vault.",
        is_unlocked: false,
        is_corrupted: true,
        allowed_actions: [],
      },
    });
    render(<PanelC />);

    // The node ID is inside a JSON pre block; use regex for partial match
    expect(screen.getByText(/node-vault-42/)).toBeInTheDocument();
  });

  it("renders HydraDB Memory section", () => {
    render(<PanelC />);
    expect(screen.getByText(/HydraDB Memory/i)).toBeInTheDocument();
  });

  it("shows memory chunks when available", () => {
    useGameStore.setState({
      memoryChunks: [
        { content: "First memory chunk", relevance_score: 0.9 },
        { content: "Second memory chunk", relevance_score: 0.5 },
      ],
    });
    render(<PanelC />);

    expect(screen.getByText("First memory chunk")).toBeInTheDocument();
    expect(screen.getByText("Second memory chunk")).toBeInTheDocument();
  });

  it('shows "No memory indexed yet" when empty', () => {
    useGameStore.setState({ memoryChunks: [] });
    render(<PanelC />);

    // Component renders: "No memory indexed yet." (with period)
    expect(screen.getByText(/No memory indexed yet/)).toBeInTheDocument();
  });

  it("renders Simulate Device Destruction button", () => {
    render(<PanelC />);
    // The button label is "DESTROY & RESTORE"; the section heading contains the text
    expect(
      screen.getByText(/Simulate Device Destruction/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /destroy/i }),
    ).toBeInTheDocument();
  });

  it("shows determinism claim text", () => {
    render(<PanelC />);
    expect(screen.getByText(/Same actions, same state/i)).toBeInTheDocument();
    expect(screen.getByText(/single Postgres query/i)).toBeInTheDocument();
  });
});
