import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PanelB } from "@/components/PanelB";
import { useGameStore } from "@/store/game-store";
import type { WorldNode, ActionTemplate } from "@hydrone/core";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const mockNode: WorldNode = {
  node_id: "node-entrance",
  zone: "sector-7",
  name: "Entrance Hall",
  description: "A dusty room with flickering lights and an unsteady hum.",
  is_unlocked: true,
  is_corrupted: false,
  allowed_actions: ["action-examine", "action-open-door"],
};

const mockNodeAlternate: WorldNode = {
  node_id: "node-vault",
  zone: "sector-9",
  name: "Cryo Vault",
  description: "Frost-covered walls. A faint blue glow pulses in the corner.",
  is_unlocked: true,
  is_corrupted: false,
  allowed_actions: ["action-scan"],
};

const mockActions: ActionTemplate[] = [
  {
    template_id: "action-examine",
    label: "Examine Surroundings",
    narrative_hint: "You carefully scan the room.",
    requires: { items: [], flags: {} },
    effects: [],
  },
  {
    template_id: "action-open-door",
    label: "Open Bulkhead Door",
    narrative_hint: "The door groans open.",
    requires: { items: ["item-keycard"], flags: { power_on: true } },
    effects: [],
  },
  {
    template_id: "action-scan",
    label: "Run Bioscan",
    narrative_hint: "The scanner beeps rhythmically.",
    requires: { items: ["item-medkit", "item-data-chip"], flags: {} },
    effects: [],
  },
];

const mockNeighbors: WorldNode[] = [
  {
    node_id: "node-server",
    zone: "sector-7",
    name: "Server Room",
    description: "Rows of humming servers stacked floor to ceiling.",
    is_unlocked: true,
    is_corrupted: false,
    allowed_actions: [],
  },
  {
    node_id: "node-vault-locked",
    zone: "sector-9",
    name: "Armory",
    description: "A sealed blast door with a retinal scanner.",
    is_unlocked: false,
    is_corrupted: true,
    allowed_actions: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to its initial (empty) state before each test. */
function resetStore() {
  useGameStore.setState(useGameStore.getInitialState());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PanelB", () => {
  beforeEach(() => {
    resetStore();
  });

  // -- 1. Empty state (no currentNode) -------------------------------------

  it("shows empty state when no location data is present", () => {
    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("No location data...")).toBeInTheDocument();
  });

  // -- 2. Location card ---------------------------------------------------

  it("renders the location card with current node name, description, and zone", () => {
    useGameStore.setState({ currentNode: mockNode });

    render(<PanelB onAction={vi.fn()} />);

    // Section header
    expect(screen.getByText("THE ACTION")).toBeInTheDocument();

    // Name
    expect(screen.getByText("Entrance Hall")).toBeInTheDocument();

    // Zone / ID line
    expect(
      screen.getByText(/Zone: sector-7 \| ID: node-entrance/),
    ).toBeInTheDocument();

    // Description
    expect(
      screen.getByText(/A dusty room with flickering lights/),
    ).toBeInTheDocument();
  });

  it("renders the mood emoji next to the location name", () => {
    useGameStore.setState({
      currentNode: mockNode,
      characterMood: "triumphant",
    });

    render(<PanelB onAction={vi.fn()} />);

    // The triumph emoji
    expect(screen.getByText("\u{1F3C6}")).toBeInTheDocument();
  });

  it("defaults to neutral emoji for an unrecognised mood", () => {
    useGameStore.setState({
      currentNode: mockNode,
      characterMood: "neutral",
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("\u{1F610}")).toBeInTheDocument();
  });

  // -- 3. Flags -----------------------------------------------------------

  it("shows flags on the location card when flags are present", () => {
    useGameStore.setState({
      currentNode: mockNode,
      flags: { vault_accessed: true, alarm_triggered: false },
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText(/vault_accessed: true/)).toBeInTheDocument();
    expect(screen.getByText(/alarm_triggered: false/)).toBeInTheDocument();
  });

  it("does not show flag badges when flags are empty", () => {
    useGameStore.setState({
      currentNode: mockNode,
      flags: {},
    });

    render(<PanelB onAction={vi.fn()} />);

    // The flag container should not render
    expect(screen.queryByText(/vault_accessed/)).not.toBeInTheDocument();
  });

  // -- 4. Neighbors -------------------------------------------------------

  it("renders neighbor location names when neighbors are available", () => {
    useGameStore.setState({
      currentNode: mockNode,
      neighbors: mockNeighbors,
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("NEARBY LOCATIONS")).toBeInTheDocument();
    expect(screen.getByText("Server Room")).toBeInTheDocument();
    expect(screen.getByText(/Armory/)).toBeInTheDocument();
  });

  it("shows a lock icon for locked neighbor nodes", () => {
    useGameStore.setState({
      currentNode: mockNode,
      neighbors: mockNeighbors,
    });

    render(<PanelB onAction={vi.fn()} />);

    // Armory is locked
    const armorySpan = screen.getByText(/Armory/);
    expect(armorySpan.textContent).toContain("\u{1F512}");
  });

  it("does not render the neighbors section when neighbors list is empty", () => {
    useGameStore.setState({
      currentNode: mockNode,
      neighbors: [],
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.queryByText("NEARBY LOCATIONS")).not.toBeInTheDocument();
  });

  // -- 5. Inventory -------------------------------------------------------

  it("renders inventory items with human-readable labels", () => {
    useGameStore.setState({
      currentNode: mockNode,
      inventory: ["item-keycard", "item-medkit", "item-data-chip"],
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("INVENTORY")).toBeInTheDocument();
    expect(screen.getByText("Security Keycard")).toBeInTheDocument();
    expect(screen.getByText("Medical Kit")).toBeInTheDocument();
    expect(screen.getByText("Data Chip")).toBeInTheDocument();
  });

  it("falls back to the raw item id when no label exists", () => {
    useGameStore.setState({
      currentNode: mockNode,
      inventory: ["item-unknown-gizmo"],
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("item-unknown-gizmo")).toBeInTheDocument();
  });

  it("shows an empty placeholder when inventory is empty", () => {
    useGameStore.setState({
      currentNode: mockNode,
      inventory: [],
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("[empty]")).toBeInTheDocument();
  });

  it("applies flash styling when inventory is in flashedFields", () => {
    useGameStore.setState({
      currentNode: mockNode,
      inventory: ["item-keycard"],
      flashedFields: ["inventory"],
    });

    render(<PanelB onAction={vi.fn()} />);

    const itemSpan = screen.getByText("Security Keycard");
    expect(itemSpan.className).toContain("flash-row");
  });

  // -- 6. Action buttons --------------------------------------------------

  it("renders action buttons for each allowed action", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: mockActions,
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /Examine Surroundings/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Open Bulkhead Door/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Run Bioscan/ }),
    ).toBeInTheDocument();
  });

  it("shows a fallback message when no actions are available", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: [],
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("No actions available.")).toBeInTheDocument();
  });

  it("calls onAction with the correct template_id when an action button is clicked", () => {
    const onAction = vi.fn();
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: mockActions,
    });

    render(<PanelB onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: /Open Bulkhead Door/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("action-open-door");
  });

  it("calls onAction for multiple different buttons", () => {
    const onAction = vi.fn();
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: mockActions,
    });

    render(<PanelB onAction={onAction} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Examine Surroundings/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Run Bioscan/ }));

    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenCalledWith("action-examine");
    expect(onAction).toHaveBeenCalledWith("action-scan");
  });

  // -- 7. Loading state ---------------------------------------------------

  it("disables action buttons when isLoading is true", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: mockActions,
      isLoading: true,
    });

    render(<PanelB onAction={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });

  it("does NOT call onAction when a disabled button is clicked", () => {
    const onAction = vi.fn();
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: mockActions,
      isLoading: true,
    });

    render(<PanelB onAction={onAction} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Examine Surroundings/ }),
    );
    expect(onAction).not.toHaveBeenCalled();
  });

  it("does not show spinners when isLoading is false", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: mockActions,
      isLoading: false,
    });

    const { container } = render(<PanelB onAction={vi.fn()} />);

    // Loader2 renders an SVG with animate-spin class
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners).toHaveLength(0);
  });

  // -- 8. Item requirements on actions ------------------------------------

  it("shows 'needs:' label for actions that require items", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: [mockActions[1]], // Open Bulkhead Door needs keycard
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText(/needs: Security Keycard/)).toBeInTheDocument();
  });

  it("shows multiple required items separated by commas", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: [mockActions[2]], // Run Bioscan needs medkit, data-chip
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(
      screen.getByText(/needs: Medical Kit, Data Chip/),
    ).toBeInTheDocument();
  });

  it("does not show 'needs:' text when an action has no item requirements", () => {
    useGameStore.setState({
      currentNode: mockNode,
      allowedActions: [mockActions[0]], // Examine has no requirements
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.queryByText(/needs:/)).not.toBeInTheDocument();
  });

  // -- 9. Narrative terminal (typing effect) -----------------------------

  it("shows placeholder text when there is no narrative", () => {
    useGameStore.setState({
      currentNode: mockNode,
      narrativeText: "",
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("Awaiting input...")).toBeInTheDocument();
  });

  it("renders narrative text in the terminal with typing effect", async () => {
    useGameStore.setState({
      currentNode: mockNode,
      narrativeText: "The blast doors part with a heavy groan.",
    });

    render(<PanelB onAction={vi.fn()} />);

    // The typing effect runs at 15 ms per character.  Use waitFor to poll
    // until the beginning of the text (or the full text) appears.
    await waitFor(() => {
      expect(screen.getByText(/The blast doors/)).toBeInTheDocument();
    });
  });

  it("eventually types the full narrative text", async () => {
    const narrative = "Hydraulic locks disengage one by one.";
    useGameStore.setState({
      currentNode: mockNode,
      narrativeText: narrative,
    });

    render(<PanelB onAction={vi.fn()} />);

    // 15 ms/char * ~38 chars = ~570 ms; default waitFor timeout is 1000 ms
    await waitFor(() => {
      expect(screen.getByText(narrative)).toBeInTheDocument();
    });
  });

  it("clears displayed text when narrativeText is set back to empty", async () => {
    useGameStore.setState({
      currentNode: mockNode,
      narrativeText: "Old narrative.",
    });

    const { rerender } = render(<PanelB onAction={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Old narrative/)).toBeInTheDocument();
    });

    // Clear narrative
    useGameStore.setState({ narrativeText: "" });
    rerender(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("Awaiting input...")).toBeInTheDocument();
  });

  it("displays the system log message when present", () => {
    useGameStore.setState({
      currentNode: mockNode,
      systemLogMessage: "Turn 3 processed.  Bounded cost: 1200.",
    });

    render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText(/Turn 3 processed/)).toBeInTheDocument();
  });

  it("does not show system log section when message is empty", () => {
    useGameStore.setState({
      currentNode: mockNode,
      systemLogMessage: "",
    });

    render(<PanelB onAction={vi.fn()} />);

    // The system log paragraph should not be rendered
    const terminalContainer = screen.getByText("NARRATIVE FEED").closest("div");
    const logParagraphs =
      terminalContainer?.querySelectorAll("p.text-\\[9px\\]");
    expect(logParagraphs?.length ?? 0).toBe(0);
  });

  // -- 10. Typing cursor --------------------------------------------------

  it("shows a typing cursor while the effect is still running", () => {
    useGameStore.setState({
      currentNode: mockNode,
      narrativeText:
        "A long story that takes a while to type out completely...",
    });

    const { container } = render(<PanelB onAction={vi.fn()} />);

    // Immediately after render the typing cursor should be present
    const cursorSpan = container.querySelector(".typing-cursor");
    expect(cursorSpan).toBeInTheDocument();
  });

  it("hides the typing cursor after typing finishes", async () => {
    useGameStore.setState({
      currentNode: mockNode,
      narrativeText: "Hi", // 2 chars finishes in ~30 ms
    });

    const { container } = render(<PanelB onAction={vi.fn()} />);

    await waitFor(() => {
      const cursor = container.querySelector(".typing-cursor");
      expect(cursor).not.toBeInTheDocument();
    });
  });

  // -- 11. Edge cases ----------------------------------------------------

  it("updates location card when currentNode changes", () => {
    useGameStore.setState({ currentNode: mockNode });

    const { rerender } = render(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("Entrance Hall")).toBeInTheDocument();

    // Switch to a different node
    useGameStore.setState({ currentNode: mockNodeAlternate });
    rerender(<PanelB onAction={vi.fn()} />);

    expect(screen.getByText("Cryo Vault")).toBeInTheDocument();
    expect(
      screen.getByText(/Zone: sector-9 \| ID: node-vault/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Frost-covered walls/)).toBeInTheDocument();
  });
});
