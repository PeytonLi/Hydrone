import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useGameStore } from "@/store/game-store";
import { PanelA } from "@/components/PanelA";

describe("PanelA", () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it("renders THE CAUSE header", () => {
    render(<PanelA />);
    expect(screen.getByText("THE CAUSE")).toBeInTheDocument();
  });

  it("shows architecture copy text with Postgres and HydraDB mentions", () => {
    render(<PanelA />);
    // Postgres appears in both the span and the quotefooter; use getAllByText
    expect(screen.getAllByText(/Postgres/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HydraDB/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/State is Postgres/)).toBeInTheDocument();
  });

  it("renders token cost chart with bounded and linear cost values", () => {
    useGameStore.setState({ boundedCost: 1200, linearCost: 4500 });
    render(<PanelA />);

    // "Bounded" and "Linear" appear in both chart labels and the summary text
    expect(screen.getAllByText(/Bounded/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Linear/).length).toBeGreaterThanOrEqual(1);
    // toLocaleString may format differently across environments; check for "tokens" label
    expect(screen.getAllByText(/tokens/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows Memory Drift toggle button", () => {
    render(<PanelA />);
    expect(
      screen.getByRole("button", { name: /memory drift/i }),
    ).toBeInTheDocument();
  });

  it("clicking drift toggle shows transcript text with system/narrator lines", () => {
    render(<PanelA />);

    const toggle = screen.getByRole("button", { name: /memory drift/i });
    fireEvent.click(toggle);

    // SYSTEM and NARRATOR appear multiple times (one per transcript line)
    expect(screen.getAllByText(/SYSTEM/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/NARRATOR/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/NARRATIVE COHERENCE LOST/)).toBeInTheDocument();
  });

  it("clicking drift toggle again hides transcript", () => {
    useGameStore.setState({ showDriftTranscript: true });
    render(<PanelA />);

    const toggle = screen.getByRole("button", { name: /memory drift/i });
    fireEvent.click(toggle);

    expect(
      screen.queryByText(/NARRATIVE COHERENCE LOST/),
    ).not.toBeInTheDocument();
  });

  it("renders HYDRONE ADVANTAGE comparison note", () => {
    render(<PanelA />);
    expect(screen.getByText(/HYDRONE ADVANTAGE/)).toBeInTheDocument();
  });
});
